import { describe, it, expect, beforeEach } from "vitest";
import { FixtureService } from "../fixtures/service.ts";
import {
  CONTRACT_VERSION,
  ClientError,
  cents,
  money,
  integerInput,
  safePath,
  validateResult,
  type Booking,
  type Operation,
  type Order,
  type Quote,
  type Profile,
  type Offer,
} from "../../sdk/core/src/product/contracts.ts";
import { createClient } from "../../sdk/api/src/product/client.ts";
let s: FixtureService,
  customer: string,
  field: string,
  ops: string,
  other: string;
async function login(phone: string) {
  const q: any = await s.execute("requestOtp", { phone });
  const result: any = await s.execute("verifyOtp", {
    challenge_id: q.challenge_id,
    code: "111111",
  });
  return result.token;
}
const booking: Booking = {
  service_id: "plomeria",
  mode: "diagnostic",
  category: "plomeria",
  location_type: "premium",
  urgency: "mismo_dia",
  description: "Reparar fuga en el lavabo del baño",
  address: {
    label: "Casa",
    street: "Calle de prueba 123",
    city: "CDMX",
    postal_code: "01000",
    access: "Entrada lateral",
  },
  date: "2026-10-20",
  slot: "12:00-15:00",
  timezone: "America/Mexico_City",
  preferred_collaborator: "collaborator-1",
};
const command = (
  payload: object,
  revision?: number,
  key = crypto.randomUUID(),
) => ({ request_key: key, expected_revision: revision, payload });
async function newOrder() {
  const q = (await s.execute("previewQuote", { booking }, customer)) as Quote;
  return (await s.execute(
    "createOrder",
    command({ booking, quote_id: q.id }, q.revision),
    customer,
  )) as Order;
}
async function assign(o: Order) {
  const offer = (await s.execute(
    "offer",
    command({ id: o.id, collaborator_id: "collaborator-1" }, o.revision),
    ops,
  )) as Offer;
  return (await s.execute(
    "acceptOffer",
    command({ id: offer.id }, offer.revision),
    field,
  )) as Order;
}
async function evidence(o: Order, phase: string) {
  const t: any = await s.execute(
    "beginUpload",
    command({ order_id: o.id, type: "image/png", name: "real.png", size: 8 }),
    field,
  );
  s.upload(
    t.id,
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    "image/png",
  );
  const a: any = await s.execute(
    "completeUpload",
    command({ upload_id: t.id }),
    field,
  );
  return (await s.execute(
    "attachEvidence",
    command(
      { id: o.id, asset_id: a.asset_id, phase, source: "file" },
      o.revision,
    ),
    field,
  )) as Order;
}
beforeEach(async () => {
  s = new FixtureService();
  [customer, field, ops, other] = await Promise.all(
    ["5511111111", "5522222222", "5533333333", "5544444444"].map(login),
  );
});
describe("Shared order contract", () => {
  it("W01/W02 carries every booking option into one confirmed order", async () => {
    const o = await newOrder();
    expect(o.booking).toEqual(booking);
    expect(o.status).toBe("pending_triage");
    expect(o.collaborator_id).toBeUndefined();
    expect(s.orders).toHaveLength(1);
    expect(validateResult("order", o)).toEqual(o);
  });
  it("W03/W04/W06 separates dispatch, acceptance and permitted execution", async () => {
    let o = await assign(await newOrder());
    expect(o.status).toBe("accepted");
    expect(o.allowed_actions).toContain("order.start_transit");
    await expect(
      s.execute(
        "qa",
        command({ id: o.id, decision: "accept" }, o.revision),
        ops,
      ),
    ).rejects.toMatchObject({ kind: "forbidden" });
    o = (await s.execute(
      "progress",
      command({ id: o.id, action: "order.start_transit" }, o.revision),
      field,
    )) as Order;
    o = (await s.execute(
      "progress",
      command({ id: o.id, action: "order.arrive" }, o.revision),
      field,
    )) as Order;
    expect(o.status).toBe("in_progress");
    expect(o.allowed_actions).not.toContain("order.request_review");
  });
  it("W06/W14 rejects another collaborator taking an assigned offer", async () => {
    const o = await newOrder();
    const a = (await s.execute(
      "offer",
      command({ id: o.id, collaborator_id: "collaborator-1" }, o.revision),
      ops,
    )) as Offer;
    const current = (await s.execute("order", { id: o.id }, ops)) as Order;
    const b = (await s.execute(
      "offer",
      command(
        { id: o.id, collaborator_id: "collaborator-2" },
        current.revision,
      ),
      ops,
    )) as Offer;
    await s.execute("acceptOffer", command({ id: a.id }, 1), field);
    await expect(
      s.execute("acceptOffer", command({ id: b.id }, 1), other),
    ).rejects.toMatchObject({ kind: "conflict" });
  });
  it("W13 requires explicit supplementary approval and rejects stale revisions", async () => {
    let o = await assign(await newOrder());
    o = (await s.execute(
      "progress",
      command({ id: o.id, action: "order.start_transit" }, o.revision),
      field,
    )) as Order;
    o = (await s.execute(
      "progress",
      command({ id: o.id, action: "order.arrive" }, o.revision),
      field,
    )) as Order;
    const previous = o.quote.total_cents;
    o = (await s.execute(
      "propose",
      command(
        {
          id: o.id,
          reason: "Cambiar una válvula adicional",
          labor_cents: 10000,
          parts_cents: 5000,
        },
        o.revision,
      ),
      field,
    )) as Order;
    expect(o.quote.total_cents).toBe(previous);
    await expect(
      s.execute(
        "decideQuote",
        command(
          {
            id: o.id,
            decision: "approve",
            quote_id: o.proposal!.id,
            quote_revision: 2,
          },
          o.revision,
        ),
        customer,
      ),
    ).rejects.toMatchObject({ kind: "conflict" });
    o = (await s.execute(
      "decideQuote",
      command(
        {
          id: o.id,
          decision: "approve",
          quote_id: o.proposal!.id,
          quote_revision: 1,
        },
        o.revision,
      ),
      customer,
    )) as Order;
    expect(o.quote.total_cents).toBe(previous + 15000);
  });
  it("W09–W12 separates evidence, review, QA, payment and payout", async () => {
    let o = await assign(await newOrder());
    for (const action of ["order.start_transit", "order.arrive"])
      o = (await s.execute(
        "progress",
        command({ id: o.id, action }, o.revision),
        field,
      )) as Order;
    o = await evidence(o, "diagnostic_before");
    o = await evidence(o, "proof_finished");
    o = (await s.execute(
      "progress",
      command({ id: o.id, action: "order.request_review" }, o.revision),
      field,
    )) as Order;
    expect(o.status).toBe("pending_validation");
    expect(o.finance.payment).toBe("reserved");
    o = (await s.execute(
      "review",
      command({ id: o.id, rating: 5, text: "Muy buen trabajo" }, o.revision),
      customer,
    )) as Order;
    o = (await s.execute(
      "qa",
      command({ id: o.id, decision: "accept" }, o.revision),
      ops,
    )) as Order;
    expect(o.status).toBe("validated");
    o = (await s.execute(
      "reconcileFinance",
      command({ id: o.id }, o.revision),
      ops,
    )) as Order;
    expect(o.status).toBe("completed");
    expect(o.finance.payout).toBe("pending");
    expect(await s.execute("warranties", {}, customer)).toHaveLength(1);
    expect(((await s.execute("payouts", {}, field)) as any[])[0].status).toBe(
      "pending",
    );
  });
  it("W03/W15 records one immutable receipt and rejects a reused key with changed payload", async () => {
    const q = (await s.execute("previewQuote", { booking }, customer)) as Quote;
    const c = command({ booking, quote_id: q.id }, q.revision);
    const a = await s.execute("createOrder", c, customer);
    expect(await s.execute("createOrder", c, customer)).toEqual(a);
    expect(s.orders).toHaveLength(1);
    expect(
      await s.execute("receipt", { request_key: c.request_key }, customer),
    ).toMatchObject({ operation: "createOrder", result: a });
    await expect(
      s.execute(
        "createOrder",
        { ...c, payload: { ...c.payload, extra: true } },
        customer,
      ),
    ).rejects.toMatchObject({ kind: "conflict" });
  });
  it("W14 expired offers cannot be accepted", async () => {
    const o = await newOrder();
    const f = (await s.execute(
      "offer",
      command({ id: o.id, collaborator_id: "collaborator-1" }, o.revision),
      ops,
    )) as Offer;
    s.offers[0].expires_at = "2000-01-01T00:00:00Z";
    await expect(
      s.execute("acceptOffer", command({ id: f.id }, 1), field),
    ).rejects.toMatchObject({ kind: "conflict" });
  });
  it("W21 draft cancellation is read-only until a separate confirmed action", async () => {
    const o = await newOrder();
    await s.execute(
      "cancelPreview",
      { id: o.id, reason: "customer_request" },
      customer,
    );
    expect(s.orders[0].status).toBe("pending_triage");
    await s.execute(
      "cancelOrder",
      command({ id: o.id, reason: "customer_request" }, o.revision),
      customer,
    );
    expect(s.orders[0].status).toBe("cancelled");
  });
  it("Account-scoped receipt and order access are scoped to the verified principal", async () => {
    const o = await newOrder();
    await expect(s.execute("order", { id: o.id }, other)).rejects.toMatchObject(
      { kind: "forbidden" },
    );
    await expect(
      s.execute("orders", { view: "ops" }, customer),
    ).rejects.toMatchObject({ kind: "forbidden" });
    expect(
      await s.execute(
        "receipt",
        { request_key: [...s.receipts.keys()][0].split(":")[1] },
        other,
      ),
    ).toBeNull();
  });
  it("W17 expired sessions cannot mutate records", async () => {
    s.sessions.get(customer)!.expires = 0;
    await expect(newOrder()).rejects.toMatchObject({ kind: "unauthenticated" });
  });
  it("document readiness cannot be fabricated by its request", async () => {
    const o = await newOrder();
    const d: any = await s.execute(
      "requestDocument",
      command({ order_id: o.id, kind: "report" }),
      customer,
    );
    expect(d.status).toBe("processing");
    expect(d.url).toBeUndefined();
    await expect(
      s.execute("document", { id: d.id }, other),
    ).rejects.toMatchObject({ kind: "forbidden" });
  });
  it("private verification documents cannot be attached to another principal", async () => {
    const t: any = await s.execute(
      "beginUpload",
      command({
        purpose: "verification",
        document_kind: "identity",
        type: "image/png",
        name: "id.png",
        size: 8,
      }),
      field,
    );
    s.upload(
      t.id,
      Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
      "image/png",
    );
    await expect(
      s.execute(
        "attachVerification",
        command({ asset_id: t.id, kind: "identity" }),
        other,
      ),
    ).rejects.toMatchObject({ kind: "forbidden" });
    const p = (await s.execute(
      "attachVerification",
      command({ asset_id: t.id, kind: "identity" }),
      field,
    )) as Profile;
    expect(p.verification_documents).toHaveLength(1);
  });
});
describe("Amounts and transport boundaries", () => {
  it("formats centavos exactly and rejects malformed money inputs", () => {
    expect(money(integerInput("1234567.89"))).toBe("$1,234,567.89 MXN");
    for (const n of [NaN, Infinity, -1, 1.5, Number.MAX_SAFE_INTEGER])
      expect(() => cents(n)).toThrow();
    for (const str of ["1.001", "-2", "1e3", "1,00"])
      expect(() => integerInput(str)).toThrow();
  });
  it("rejects unsafe return paths and resource links", () => {
    for (const p of ["//evil.test", "https://evil.test", "/\\evil.test"])
      expect(safePath(p)).toBeNull();
    expect(() =>
      validateResult("document", {
        id: "doc",
        status: "ready",
        url: "javascript:alert(1)",
      }),
    ).toThrow();
    expect(() => validateResult("manifest", { version: "wrong" })).toThrow();
  });
  it("production transport has no fixture fallback", async () => {
    const c = createClient({
      apiOrigin: "",
      environment: "production",
      mainOrigin: "",
      visionOrigin: "",
    });
    await expect(c.call("manifest", {})).rejects.toMatchObject({
      kind: "configuration",
    });
  });
  it("mutation acknowledgement loss remains uncertain, read loss is unavailable", async () => {
    const c = createClient(
      {
        apiOrigin: "https://service.invalid",
        environment: "test",
        mainOrigin: "",
        visionOrigin: "",
      },
      async () => {
        throw new TypeError("Disconnected");
      },
    );
    await expect(c.call("createOrder", command({}))).rejects.toMatchObject({
      kind: "uncertain",
    });
    await expect(c.call("catalog", {})).rejects.toMatchObject({
      kind: "unavailable",
    });
  });
});
it("W16 an expired booking quote requires a fresh preview and confirmation", async () => {
  const q = (await s.execute("previewQuote", { booking }, customer)) as Quote;
  s.quotes.get(q.id)!.quote.expires_at = "2000-01-01T00:00:00Z";
  await expect(
    s.execute(
      "createOrder",
      command({ booking, quote_id: q.id }, q.revision),
      customer,
    ),
  ).rejects.toMatchObject({ kind: "conflict" });
  expect(s.orders).toHaveLength(0);
  const next = (await s.execute(
    "previewQuote",
    { booking },
    customer,
  )) as Quote;
  expect(next.id).not.toBe(q.id);
  await s.execute(
    "createOrder",
    command({ booking, quote_id: next.id }, next.revision),
    customer,
  );
  expect(s.orders).toHaveLength(1);
});
