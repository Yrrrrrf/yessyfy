import { assert, id, Runtime, sleep } from "../helpers/runtime.ts";
const encoder = new TextEncoder();
Deno.test("real Main and Vision workflow, ownership, recovery and provider outcomes", async (t) => {
  const r = await new Runtime().start();
  let customer = "", operator = "", field = "", loser = "", outsider = "";
  let order: Record<string, unknown>;
  let winnerId = "";
  let quote: Record<string, unknown>;
  let request: Record<string, unknown>;
  let receiptKey = "";
  let image: Uint8Array<ArrayBuffer>;
  let privateUrl = "";
  async function step(name: string, fn: () => Promise<void>) {
    assert(await t.step(name, fn), name);
  }
  async function current() {
    return await r.call("order", { id: order.id }, customer);
  }
  async function upload(phase: string) {
    order = await current();
    const ticket = await r.command("beginUpload", {
      order_id: order.id,
      name: "evidence.png",
      size: image.length,
      type: "image/png",
    }, field);
    const response = await fetch(ticket.url, {
      method: "PUT",
      headers: ticket.headers,
      body: image,
    });
    assert(response.status === 204, await response.text());
    const asset = await r.command("completeUpload", { upload_id: ticket.id }, field);
    order = await r.command(
      "attachEvidence",
      { id: order.id, asset_id: asset.asset_id, phase, source: "file" },
      field,
      Number(order.revision),
    );
    return { ticket, asset };
  }
  try {
    await step(
      "manifest matches all 51 client operations; discovery excludes private fields",
      async () => {
        const m = await r.call("manifest");
        assert(m.operations.length === 51);
        const catalog = await r.call("catalog");
        assert(catalog.length === 6);
        const pros = await r.call("collaborators");
        assert(
          pros.every((p: Record<string, unknown>) =>
            !("phone" in p) && !("fiscal" in p) && !("verification_documents" in p)
          ),
        );
        const day = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        assert(
          (await r.call("slots", {
            service_id: "plomeria",
            date: day,
            city: "CDMX",
            urgency: "normal",
          })).length === 3,
        );
      },
    );
    await step("OTP creates live sessions; product roles cannot use system utilities", async () => {
      customer = (await r.login("5511111111")).token;
      operator = (await r.login("5533333333")).token;
      const first = await r.login("5522222222");
      field = first.token;
      const second = await r.login("5544444444");
      loser = second.token;
      outsider = (await r.login("5510101010")).token;
      assert((await r.call("session", {}, customer)).roles.includes("customer"));
      const utility = await fetch(r.origin + "/api/report/generate", {
        method: "POST",
        headers: { authorization: "Bearer " + customer, "content-type": "application/json" },
        body: '{"title":"x","content":"x","format":"html"}',
      });
      assert(utility.status === 403);
      await utility.arrayBuffer();
      const forged = await r.raw("updateProfile", {
        request_key: id(),
        payload: { roles: ["admin"] },
      }, customer);
      assert(forged.status === 400);
    });
    await step(
      "authoritative quote preserves date-only strings and immutable booking",
      async () => {
        const booking = {
          service_id: "plomeria",
          category: "plomeria",
          mode: "fixed",
          location_type: "residencial",
          urgency: "normal",
          description: "Reparar una fuga en la cocina principal",
          address: {
            label: "Casa",
            street: "Calle Uno 10",
            city: "CDMX",
            postal_code: "01000",
            access: "Portón azul",
          },
          date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
          slot: "09-11",
          timezone: "America/Mexico_City",
        };
        quote = await r.call("previewQuote", { booking }, customer);
        receiptKey = id();
        request = {
          request_key: receiptKey,
          expected_revision: quote.revision,
          payload: { booking, quote_id: quote.id },
        };
        order = await r.call("createOrder", request, customer);
        assert((order.booking as Record<string, unknown>).date === booking.date);
        assert((order.finance as Record<string, unknown>).payment === "pending");
      },
    );
    await step(
      "retries return one order; changed payload and cross-actor receipt are rejected",
      async () => {
        const replay = await r.call("createOrder", request, customer);
        assert(replay.id === order.id);
        const changed = await r.raw("createOrder", {
          ...request,
          payload: { ...(request.payload as object), extra: true },
        }, customer);
        assert(changed.status === 409);
        assert(await r.call("receipt", { request_key: receiptKey }, outsider) === null);
        assert(
          (await r.call("receipt", { request_key: receiptKey }, customer)).operation ===
            "createOrder",
        );
        assert((await r.call("orders", { view: "customer" }, customer)).total === 1);
        assert((await r.raw("order", { id: order.id }, outsider)).status === 403);
        assert((await r.raw("orders", { view: "ops" }, customer)).status === 403);
      },
    );
    await step("competing offer acceptance assigns exactly one collaborator", async () => {
      const candidates = await r.call("candidates", { order_id: order.id }, operator);
      assert(candidates.length === 2);
      let opsOrder = await r.call("order", { id: order.id }, operator);
      const first = await r.command(
        "offer",
        { id: order.id, collaborator_id: "collaborator1" },
        operator,
        opsOrder.revision,
      );
      opsOrder = await r.call("order", { id: order.id }, operator);
      const second = await r.command(
        "offer",
        { id: order.id, collaborator_id: "collaborator2" },
        operator,
        opsOrder.revision,
      );
      const results = await Promise.all([
        r.raw("acceptOffer", {
          request_key: id(),
          expected_revision: first.revision,
          payload: { id: first.id },
        }, field),
        r.raw("acceptOffer", {
          request_key: id(),
          expected_revision: second.revision,
          payload: { id: second.id },
        }, loser),
      ]);
      assert(results.filter((r) => r.status === 200).length === 1, JSON.stringify(results));
      assert(results.filter((r) => r.status === 409).length === 1);
      order = await current();
      winnerId = String(order.collaborator_id);
      if (winnerId === "collaborator2") [field, loser] = [loser, field];
      assert((await r.raw("order", { id: order.id }, loser)).status === 403);
      const winner = await r.call("profile", {}, field);
      assert(winner.roles.includes("collaborator"));
      assert(
        (await r.call("offers", {}, loser)).every((o: Record<string, unknown>) =>
          o.allowed_actions instanceof Array
        ),
      );
    });
    await step("role checks and stale revisions gate progress", async () => {
      assert(
        (await r.raw("progress", {
          request_key: id(),
          expected_revision: order.revision,
          payload: { id: order.id, action: "order.start_transit" },
        }, customer)).status === 403,
      );
      order = await r.command(
        "progress",
        { id: order.id, action: "order.start_transit" },
        field,
        Number(order.revision),
      );
      const stale = await r.raw("progress", {
        request_key: id(),
        expected_revision: 1,
        payload: { id: order.id, action: "order.arrive" },
      }, field);
      assert(stale.status === 409);
      order = await r.command(
        "progress",
        { id: order.id, action: "order.arrive" },
        field,
        Number(order.revision),
      );
      assert(order.status === "in_progress");
    });
    await step(
      "real bytes are validated; renew preserves identity and evidence is separately attached",
      async () => {
        image = await Deno.readFile(new URL("../fixtures/evidence.png", import.meta.url));
        const bad = await r.command("beginUpload", {
          order_id: order.id,
          name: "bad.png",
          size: 3,
          type: "image/png",
        }, field);
        const badBytes = await fetch(bad.url, {
          method: "PUT",
          headers: bad.headers,
          body: encoder.encode("bad"),
        });
        assert(badBytes.status === 400);
        await badBytes.arrayBuffer();
        const ticket = await r.command("beginUpload", {
          order_id: order.id,
          name: "evidence.png",
          size: image.length,
          type: "image/png",
        }, field);
        const renewed = await r.command("renewUpload", { upload_id: ticket.id }, field);
        assert(renewed.id === ticket.id);
        const revoked = await fetch(ticket.url, {
          method: "PUT",
          headers: ticket.headers,
          body: image,
        });
        assert(revoked.status === 403);
        await revoked.arrayBuffer();
        const put = await fetch(renewed.url, {
          method: "PUT",
          headers: renewed.headers,
          body: image,
        });
        assert(put.status === 204, await put.text());
        const complete = await r.command("completeUpload", { upload_id: ticket.id }, field);
        const foreign = await r.raw("attachEvidence", {
          request_key: id(),
          expected_revision: order.revision,
          payload: {
            id: order.id,
            asset_id: complete.asset_id,
            phase: "diagnostic_before",
            source: "file",
          },
        }, loser);
        assert(foreign.status === 403);
        order = await r.command(
          "attachEvidence",
          { id: order.id, asset_id: complete.asset_id, phase: "diagnostic_before", source: "file" },
          field,
          Number(order.revision),
        );
        privateUrl = (order.evidence as Record<string, unknown>[])[0].url as string;
        const imageResponse = await fetch(privateUrl);
        assert(imageResponse.ok);
        assert((await imageResponse.arrayBuffer()).byteLength === image.length);
      },
    );
    await step(
      "required evidence gates review; supplements bind quote ID and revision",
      async () => {
        assert(
          (await r.raw("progress", {
            request_key: id(),
            expected_revision: order.revision,
            payload: { id: order.id, action: "order.request_review" },
          }, field)).status === 403,
        );
        order = await r.command(
          "propose",
          {
            id: order.id,
            labor_cents: 10000,
            parts_cents: 5000,
            reason: "Cambiar una conexión dañada",
          },
          field,
          Number(order.revision),
        );
        const proposal = order.proposal as Record<string, unknown>;
        assert(order.status === "pending_quote_approval");
        const stale = await r.raw("decideQuote", {
          request_key: id(),
          expected_revision: order.revision,
          payload: {
            id: order.id,
            quote_id: id(),
            quote_revision: proposal.revision,
            decision: "approve",
          },
        }, customer);
        assert(stale.status === 409);
        order = await r.command(
          "decideQuote",
          {
            id: order.id,
            quote_id: proposal.id,
            quote_revision: proposal.revision,
            decision: "approve",
          },
          customer,
          Number(order.revision),
        );
        assert((order.finance as Record<string, unknown>).total_cents === 60000);
        await upload("work_progress");
        await upload("proof_finished");
        order = await r.command(
          "progress",
          { id: order.id, action: "order.request_review" },
          field,
          Number(order.revision),
        );
        assert(order.status === "pending_validation");
      },
    );
    await step("chat, inbox, read receipts and monotonic feed are scoped", async () => {
      const message = await r.command("sendMessage", {
        order_id: order.id,
        text: "El trabajo está listo para revisión",
      }, field);
      assert(
        (await r.call("conversation", { order_id: order.id }, customer)).some((
          m: Record<string, unknown>,
        ) => m.id === message.id),
      );
      assert((await r.raw("conversation", { order_id: order.id }, outsider)).status === 403);
      const inbox = await r.call("inbox", {}, customer);
      assert(inbox.items.length > 0);
      await r.command(
        "markRead",
        { ids: inbox.items.map((n: Record<string, unknown>) => n.id) },
        customer,
      );
      const feed = await r.call("events", { cursor: 0 }, customer);
      assert(feed.length > 0);
      assert(
        feed.every((e: Record<string, unknown>, i: number) =>
          i === 0 || Number(e.cursor) > Number(feed[i - 1].cursor)
        ),
      );
      assert((await r.call("events", { cursor: 0 }, outsider)).length === 0);
    });
    await step("customer acceptance, QA and money are independent", async () => {
      assert(
        (await r.raw("qa", {
          request_key: id(),
          expected_revision: order.revision,
          payload: { id: order.id, decision: "accept" },
        }, operator)).status === 403,
      );
      order = await r.command(
        "review",
        { id: order.id, rating: 5, text: "La fuga quedó reparada" },
        customer,
        Number(order.revision),
      );
      order = await r.command(
        "qa",
        { id: order.id, decision: "accept" },
        operator,
        Number(order.revision),
      );
      assert(order.status === "validated");
      assert((order.finance as Record<string, unknown>).payment === "pending");
      assert(
        (await r.raw("reconcileFinance", {
          request_key: id(),
          expected_revision: order.revision,
          payload: { id: order.id },
        }, operator)).status === 409,
      );
    });
    await step("signed provider callbacks deduplicate and conserve ledger balances", async () => {
      const attempts = (await r.sql(
        `SELECT * FROM payment_attempt WHERE order_id=type::record('job_order','${order.id}');`,
      )).at(-1) as { data: Record<string, unknown> }[];
      assert(attempts.length === 2);
      for (const a of attempts) {
        const event = {
          event_id: id(),
          kind: "payment",
          resource_id: a.data.id,
          status: "confirmed",
          receipt: "test-confirmation-" + a.data.id,
          currency: "MXN",
          amount_cents: a.data.amount_cents,
        };
        assert((await r.callback(event)).status === 200);
        assert((await r.callback(event)).status === 200);
        assert(
          (await r.callback({ ...event, amount_cents: Number(event.amount_cents) + 1 })).status ===
            409,
        );
      }
      order = await current();
      assert((order.finance as Record<string, unknown>).payment === "confirmed");
      order = await r.command(
        "reconcileFinance",
        { id: order.id },
        operator,
        Number(order.revision),
      );
      assert(order.status === "completed");
      assert((order.finance as Record<string, unknown>).payout === "pending");
      const payouts = await r.call("payouts", {}, field);
      assert(payouts.length === 1);
      const event = {
        event_id: id(),
        kind: "payout",
        resource_id: payouts[0].id,
        status: "confirmed",
        receipt: "test-payout-confirmed",
        currency: "MXN",
        amount_cents: payouts[0].net_cents,
      };
      assert((await r.callback(event)).status === 200);
      order = await current();
      assert((order.finance as Record<string, unknown>).payout === "confirmed");
      const accounts = (await r.sql("SELECT VALUE data.balance_cents FROM escrow_account;")).at(
        -1,
      ) as number[];
      assert(accounts.reduce((a, b) => a + b, 0) === 0);
      const immutable = await fetch(r.dbOrigin + "/sql", {
        method: "POST",
        headers: {
          accept: "application/json",
          authorization: "Basic " + btoa("maintenance:" + r.rootPassword),
          "surreal-ns": "yessyfy",
          "surreal-db": "main",
        },
        body: "UPDATE escrow_entry SET data.amount_cents=1;",
      });
      assert((await immutable.json()).some((s: Record<string, unknown>) => s.status === "ERR"));
    });
    await step(
      "Brand generates real report, warranty and stamped-provider invoice bytes",
      async () => {
        await r.command("updateProfile", {
          fiscal: {
            rfc: "AAA010101AAA",
            name: "Cliente de prueba",
            postal_code: "01000",
            regime: "616",
            use: "S01",
          },
        }, customer);
        const warranties = await r.call("warranties", {}, customer);
        assert(warranties.length === 1);
        await r.call("warranty", { id: warranties[0].id }, customer);
        for (const kind of ["report", "warranty", "invoice"]) {
          const requested = await r.command(
            "requestDocument",
            { order_id: order.id, kind },
            customer,
          );
          let doc = requested;
          for (let n = 0; n < 150; n++) {
            doc = await r.call("document", { id: requested.id }, customer);
            if (doc.status !== "processing") break;
            await sleep(100);
          }
          assert(doc.status === "ready", JSON.stringify(doc));
          const response = await fetch(doc.url);
          assert(response.ok);
          const bytes = new Uint8Array(await response.arrayBuffer());
          assert(new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-");
          await Deno.writeFile(r.directory + `/${kind}.pdf`, bytes);
          if (kind === "invoice") {
            const again = await r.command(
              "requestDocument",
              { order_id: order.id, kind },
              customer,
            );
            assert(again.id === requested.id);
          }
        }
        assert((await r.call("documents", { order_id: order.id }, customer)).length === 3);
        await r.command("updateProfile", {
          fiscal: {
            rfc: "BBB010101BBB",
            name: "Profesional de prueba",
            postal_code: "01000",
            regime: "612",
            use: "S01",
          },
        }, field);
        const retention = await r.command("requestDocument", {
          order_id: order.id,
          kind: "invoice",
        }, field);
        let retentionReady = retention;
        for (let n = 0; n < 150; n++) {
          retentionReady = await r.call("document", { id: retention.id }, field);
          if (retentionReady.status !== "processing") break;
          await sleep(100);
        }
        assert(retentionReady.status === "ready", JSON.stringify(retentionReady));
        assert((await r.raw("document", { id: retention.id }, customer)).status === 403);
        assert((await r.call("documents", { order_id: order.id }, customer)).length === 3);
        const retentionBytes = await fetch(retentionReady.url);
        assert(retentionBytes.ok);
        await Deno.writeFile(
          r.directory + "/retention.pdf",
          new Uint8Array(await retentionBytes.arrayBuffer()),
        );
      },
    );
    await step("warranty claims and case resolution preserve the completed service", async () => {
      const c = await r.command("createCase", {
        order_id: order.id,
        claim: true,
        category: "warranty",
        description: "Solicitar revisión de la conexión reparada",
      }, customer);
      assert((await r.call("case", { id: c.id }, customer)).status === "open");
      assert((await r.call("cases", {}, operator)).length === 1);
      const resolved = await r.command(
        "resolveCase",
        {
          id: c.id,
          resolved: true,
          resolution: "Revisión realizada y explicación entregada al cliente",
        },
        operator,
        c.revision,
      );
      assert(resolved.status === "resolved");
      assert((await current()).status === "completed");
    });
    await step("sessions, receipts, assets and completed jobs survive engine restart", async () => {
      await r.restart();
      assert((await r.call("session", {}, customer)).id === "customer1");
      assert((await current()).status === "completed");
      assert(
        (await r.call("receipt", { request_key: receiptKey }, customer)).result.id === order.id,
      );
      const read = await fetch(privateUrl);
      assert(read.ok);
      await read.arrayBuffer();
      assert(
        (await r.call("documents", { order_id: order.id }, customer)).every((
          d: Record<string, unknown>,
        ) => d.status === "ready"),
      );
    });
    await step("logout revokes private URLs and authenticated operations", async () => {
      await r.call("logout", {}, field);
      assert((await r.raw("session", {}, field)).status === 401);
      const imageResponse = await fetch(privateUrl);
      assert(imageResponse.status === 401);
      await imageResponse.arrayBuffer();
    });
  } finally {
    await r.close();
    console.log("Native validation artifacts:", r.directory);
  }
});
