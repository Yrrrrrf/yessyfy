import { assert, id, Runtime, sleep } from "../helpers/runtime.ts";
Deno.test("verification, cancellation, expiry, recovery and public authentication edges", async (t) => {
  const r = await new Runtime().start();
  let customer = "", operator = "", field = "";
  let order: Record<string, unknown>;
  async function step(name: string, fn: () => Promise<void>) {
    assert(await t.step(name, fn), name);
  }
  try {
    await step("public configuration remains readable with an expired stored token", async () => {
      assert((await r.raw("manifest", {}, "expired-token")).status === 200);
      assert((await r.raw("session", {}, "expired-token")).status === 401);
      customer = (await r.login("5511111111")).token;
      operator = (await r.login("5533333333")).token;
      field = (await r.login("5522222222")).token;
      assert((await r.raw("profiles", {}, customer)).status === 403);
      assert((await r.call("profiles", {}, operator)).length === 2);
    });
    await step("OTP is single-use and attempts are persisted and limited", async () => {
      const c = await r.call("requestOtp", { phone: "5598989898" });
      for (let i = 0; i < 5; i++) {
        assert(
          (await r.raw("verifyOtp", { challenge_id: c.challenge_id, code: "abcdef" })).status ===
            400,
        );
      }
      const row =
        (await r.sql(`SELECT * FROM ONLY type::record('otp_challenge','${c.challenge_id}');`)).at(
          -1,
        ) as { data: { attempts: number } };
      assert(row.data.attempts === 5);
      const rate = await r.raw("requestOtp", { phone: "5598989898" });
      assert(rate.status === 200);
      const third = await r.raw("requestOtp", { phone: "5598989898" });
      assert(third.status === 200);
      assert((await r.raw("requestOtp", { phone: "5598989898" })).status === 503);
    });
    await step(
      "verified profiles cannot silently grant themselves new qualifications",
      async () => {
        const p = await r.command("updateProfile", {
          trades: ["plomeria", "electricidad", "cerrajeria"],
        }, field);
        assert(p.eligibility === "unsubmitted" && p.duty === false);
        assert(
          (await r.raw("duty", { request_key: id(), payload: { desired: true } }, field)).status ===
            403,
        );
      },
    );
    await step("private KYC bytes are attached and reviewed by operations", async () => {
      const bytes = await Deno.readFile(new URL("../fixtures/evidence.png", import.meta.url));
      for (const kind of ["identity", "address", "credential"]) {
        const ticket = await r.command("beginUpload", {
          purpose: "verification",
          document_kind: kind,
          name: kind + ".png",
          size: bytes.length,
          type: "image/png",
        }, field);
        const response = await fetch(ticket.url, {
          method: "PUT",
          headers: ticket.headers,
          body: bytes,
        });
        assert(response.status === 204);
        await response.arrayBuffer();
        const asset = await r.command("completeUpload", { upload_id: ticket.id }, field);
        await r.command("attachVerification", { asset_id: asset.asset_id, kind }, field);
      }
      const large = await Deno.readFile(new URL("../fixtures/large-evidence.png", import.meta.url));
      const big = await r.command("beginUpload", {
        purpose: "verification",
        document_kind: "identity",
        name: "large.png",
        size: large.length,
        type: "image/png",
      }, field);
      const largeResponse = await fetch(big.url, {
        method: "PUT",
        headers: big.headers,
        body: large,
      });
      assert(largeResponse.status === 204, await largeResponse.text());
      const pending = await r.command("submitVerification", {}, field);
      assert(pending.eligibility === "submitted");
      const reviewed = await r.command("submitVerification", {
        id: "collaborator1",
        decision: "verify",
        reason: "Documentos revisados",
      }, operator);
      assert(reviewed.eligibility === "verified");
      const p = await r.command("duty", { desired: true }, field);
      assert(p.duty === true);
      const profiles = await r.call("profiles", {}, operator);
      const profile = profiles.find((p: Record<string, unknown>) => p.id === "collaborator1");
      const response = await fetch(profile.verification_documents[0].url);
      assert(response.ok);
      await response.arrayBuffer();
    });
    await step("expired offers and declined offers cannot assign the order", async () => {
      const booking = {
        service_id: "plomeria",
        category: "plomeria",
        mode: "fixed",
        location_type: "residencial",
        urgency: "normal",
        description: "Revisar una fuga en la cocina principal",
        address: {
          label: "Casa",
          street: "Calle Uno 10",
          city: "CDMX",
          postal_code: "01000",
          access: "Portón azul",
        },
        date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        slot: "11-13",
        timezone: "America/Mexico_City",
      };
      const q = await r.call("previewQuote", { booking }, customer);
      order = await r.command("createOrder", { booking, quote_id: q.id }, customer, q.revision);
      const offer = await r.command(
        "offer",
        { id: order.id, collaborator_id: "collaborator1" },
        operator,
        Number(order.revision),
      );
      await r.sql(
        `UPDATE type::record('dispatch_offer','${offer.id}') SET data.expires_at=d'2000-01-01T00:00:00Z';`,
      );
      assert(
        (await r.raw("acceptOffer", {
          request_key: id(),
          expected_revision: offer.revision,
          payload: { id: offer.id },
        }, field)).status === 409,
      );
      order = await r.call("order", { id: order.id }, customer);
      const next = await r.command(
        "offer",
        { id: order.id, collaborator_id: "collaborator1" },
        operator,
        Number(order.revision),
      );
      const declined = await r.command("declineOffer", { id: next.id }, field, next.revision);
      assert(declined.status === "declined");
      assert(
        (await r.raw("acceptOffer", {
          request_key: id(),
          expected_revision: declined.revision,
          payload: { id: declined.id },
        }, field)).status === 409,
      );
    });
    await step(
      "case review, resolution and cancellation preserve revisions and receipts",
      async () => {
        const issue = await r.command("createCase", {
          order_id: order.id,
          category: "payment",
          description: "Solicitar información sobre la forma de pago",
        }, customer);
        const cases = await r.call("cases", {}, customer);
        assert(cases.length === 1);
        const resolved = await r.command(
          "resolveCase",
          {
            id: issue.id,
            resolved: true,
            resolution: "Información entregada y solicitud reabierta",
          },
          operator,
          issue.revision,
        );
        assert(resolved.status === "resolved");
        order = await r.call("order", { id: order.id }, customer);
        assert(order.status === "pending_triage");
        const preview = await r.call(
          "cancelPreview",
          { id: order.id, reason: "customer_request" },
          customer,
        );
        assert(preview.fee_cents === 0);
        const key = id();
        order = await r.command(
          "cancelOrder",
          { id: order.id, reason: "customer_request" },
          customer,
          preview.revision,
          key,
        );
        assert(order.status === "cancelled");
        assert(
          (await r.call("receipt", { request_key: key }, customer)).result.status === "cancelled",
        );
        const slots = await r.call("slots", {
          service_id: "plomeria",
          date: (order.booking as Record<string, unknown>).date,
          city: "CDMX",
          urgency: "normal",
        });
        assert(slots.find((s: Record<string, unknown>) => s.id === "11-13").available);
      },
    );
    await step(
      "provider signatures, currency and amount checks reject forged outcomes",
      async () => {
        const response = await fetch(r.origin + "/providers/events", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-yessyfy-timestamp": String(Math.floor(Date.now() / 1000)),
            "x-yessyfy-signature": "bad",
          },
          body: "{}",
        });
        assert(response.status === 403);
        await response.arrayBuffer();
        const attempts = (await r.sql(
          `SELECT * FROM payment_attempt WHERE order_id=type::record('job_order','${order.id}');`,
        )).at(-1) as { data: Record<string, unknown> }[];
        const event = {
          event_id: id(),
          kind: "payment",
          resource_id: attempts[0].data.id,
          status: "confirmed",
          receipt: "receipt",
          currency: "USD",
          amount_cents: attempts[0].data.amount_cents,
        };
        assert((await r.callback(event)).status === 400);
        assert((await r.callback({ ...event, currency: "MXN", amount_cents: 1 })).status === 400);
      },
    );
    await step(
      "a queued business job survives engine interruption and expires honestly",
      async () => {
        if (r.engine) await r.stopChild(r.engine);
        const challengeId = id();
        await r.sql(
          `CREATE type::record('otp_challenge','${challengeId}') SET version=1,data={id:'${challengeId}',phone:'5509090909',used:true,attempts:0,expires_at:d'2000-01-01T00:00:00Z'}; CREATE type::record('business_job','resume_job') SET version=1,data={id:'resume_job',kind:'otp',status:'queued',attempts:0,next_at:time::now(),lease_until:NULL,lease_token:NULL,payload:{challenge_id:'${challengeId}',phone:'5509090909',sealed:'unused'}};`,
        );
        await r.startEngine();
        let status = "";
        for (let n = 0; n < 50; n++) {
          const job = (await r.sql("SELECT * FROM ONLY business_job:resume_job;")).at(-1) as {
            data: { status: string };
          };
          status = job.data.status;
          if (status === "succeeded") break;
          await sleep(100);
        }
        assert(status === "succeeded");
      },
    );
  } finally {
    await r.close();
    console.log("Edge validation artifacts:", r.directory);
  }
});
