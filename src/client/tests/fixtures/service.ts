/** Stateful, test-only contract service. Never imported by either application. */
import { createHash, randomUUID } from "node:crypto";
import {
  CONTRACT_VERSION,
  ClientError,
  bookingErrors,
  cents,
  type Action,
  type Booking,
  type Case,
  type Collaborator,
  type Command,
  type Document,
  type Evidence,
  type FeedEvent,
  type Manifest,
  type Message,
  type Notice,
  type Offer,
  type Operation,
  type Order,
  type Payout,
  type Profile,
  type Quote,
  type Service,
  type Warranty,
} from "../../sdk/core/src/product/contracts.ts";
const clone = <T>(v: T): T => structuredClone(v);
const now = () => new Date().toISOString();
export class FixtureService {
  users: Profile[] = [];
  services: Service[] = [];
  orders: Order[] = [];
  offers: Offer[] = [];
  cases: Case[] = [];
  warranties: Warranty[] = [];
  payouts: Payout[] = [];
  documents: Document[] = [];
  messages: Message[] = [];
  notices: (Notice & { user_id: string })[] = [];
  events: (FeedEvent & { user_id: string })[] = [];
  receipts = new Map<
    string,
    { body: string; operation: Operation; result: unknown }
  >();
  sessions = new Map<string, { id: string; expires: number }>();
  challenges = new Map<string, string>();
  quotes = new Map<string, { booking: Booking; quote: Quote }>();
  assets = new Map<
    string,
    {
      owner: string;
      order_id: string;
      bytes?: Uint8Array;
      mime: string;
      name: string;
      size: number;
      sha?: string;
      expires: number;
      purpose?: string;
      document_kind?: string;
      capability: string;
    }
  >();
  fault: {
    drop_operation?: string;
    delay_operation?: string;
    delay_ms?: number;
    gap?: boolean;
    gap_user_id?: string;
  } = {};
  private count = 0;
  constructor(public origin = "http://127.0.0.1:7777") {
    this.reset();
  }
  reset() {
    this.count = 0;
    this.orders = [];
    this.offers = [];
    this.cases = [];
    this.warranties = [];
    this.payouts = [];
    this.documents = [];
    this.messages = [];
    this.notices = [];
    this.events = [];
    this.receipts.clear();
    this.sessions.clear();
    this.challenges.clear();
    this.quotes.clear();
    this.assets.clear();
    this.fault = {};
    const fiscal = { rfc: "", name: "", postal_code: "", regime: "", use: "" };
    this.users = [
      ["customer-1", "Mariana Garza", "5511111111", "customer"],
      ["collaborator-1", "Roberto Morales", "5522222222", "collaborator"],
      ["operator-1", "Mesa de operaciones", "5533333333", "operator"],
      ["collaborator-2", "Ignacio Fuentes", "5544444444", "collaborator"],
    ].map(([id, name, phone, role]) => ({
      id,
      name,
      phone,
      roles: [role] as Profile["roles"],
      locale: "es",
      currency: "MXN",
      eligibility: role === "collaborator" ? "verified" : "unsubmitted",
      trades: ["plomeria", "electricidad"],
      area: "CDMX",
      vehicle: role === "collaborator" ? "Motocicleta registrada" : "",
      fiscal: clone(fiscal),
      addresses: [],
      membership: { active: false },
      duty: role === "collaborator",
    }));
    this.services = [
      ["plomeria", "Plomería", "🔧", "Fugas, grifería y mantenimiento"],
      [
        "electricidad",
        "Electricidad",
        "⚡",
        "Instalaciones y fallas eléctricas",
      ],
      ["cerrajeria", "Cerrajería", "🔑", "Cerraduras y accesos"],
      ["jardineria", "Jardinería", "🌿", "Cuidado y mantenimiento del jardín"],
      [
        "mantenimiento_hogar",
        "Mantenimiento",
        "🏠",
        "Reparaciones para tu hogar",
      ],
      ["albanileria", "Albañilería", "🧱", "Reparaciones y acabados"],
    ].map(([id, name, icon, description], i) => ({
      id,
      name,
      icon,
      category: id,
      description,
      included: ["Trabajo indicado en la cotización", "Revisión del resultado"],
      excluded: [
        "Materiales no aprobados",
        "Trabajos adicionales sin autorización",
      ],
      modes: ["fixed", "diagnostic"],
      estimate_cents: 45000 + i * 5000,
      area: "CDMX",
    }));
  }
  manifest(): Manifest {
    return {
      version: CONTRACT_VERSION,
      operations: [
        "manifest",
        "requestOtp",
        "verifyOtp",
        "session",
        "logout",
        "catalog",
        "slots",
        "collaborators",
        "profile",
        "profiles",
        "updateProfile",
        "submitVerification",
        "previewQuote",
        "createOrder",
        "orders",
        "order",
        "offers",
        "candidates",
        "offer",
        "acceptOffer",
        "declineOffer",
        "duty",
        "progress",
        "propose",
        "decideQuote",
        "review",
        "qa",
        "cancelPreview",
        "cancelOrder",
        "reconcileFinance",
        "beginUpload",
        "renewUpload",
        "completeUpload",
        "attachEvidence",
        "attachVerification",
        "conversation",
        "sendMessage",
        "inbox",
        "markRead",
        "events",
        "cases",
        "case",
        "createCase",
        "resolveCase",
        "warranties",
        "warranty",
        "documents",
        "requestDocument",
        "document",
        "payouts",
        "receipt",
      ],
      max_upload_bytes: 25_000_000,
      mime_types: ["image/png", "image/jpeg", "image/webp"],
      timezone: "America/Mexico_City",
      areas: ["CDMX"],
    };
  }
  actor(token?: string | null) {
    const s = token ? this.sessions.get(token) : null;
    if (!s || s.expires < Date.now())
      throw new ClientError("unauthenticated", "Session expired");
    const u = this.users.find((x) => x.id === s.id);
    if (!u) throw new ClientError("unauthenticated", "Account unavailable");
    return u;
  }
  ops(u: Profile) {
    if (!u.roles.some((r) => r === "operator" || r === "admin"))
      throw new ClientError("forbidden", "Operations permission required");
  }
  field(u: Profile) {
    if (!u.roles.includes("collaborator") || u.eligibility !== "verified")
      throw new ClientError(
        "forbidden",
        "Verified collaborator access required",
      );
  }
  authorized(o: Order, u: Profile) {
    if (
      o.customer_id !== u.id &&
      o.collaborator_id !== u.id &&
      !u.roles.some((r) => r === "operator" || r === "admin")
    )
      throw new ClientError(
        "forbidden",
        "This order is not available to your account",
      );
  }
  findOrder(id: string, u: Profile) {
    const o = this.orders.find((o) => o.id === id);
    if (!o) throw new ClientError("not_found", "Order unavailable");
    this.authorized(o, u);
    return o;
  }
  project(o: Order, u: Profile): Order {
    const r = clone(o);
    const a: Action[] = [];
    const customer = u.id === o.customer_id,
      field = u.id === o.collaborator_id,
      ops = u.roles.some((r) => r === "operator" || r === "admin");
    if (customer && !["completed", "cancelled", "disputed"].includes(o.status))
      a.push("order.cancel");
    if (ops && ["pending_triage", "dispatched"].includes(o.status))
      a.push("dispatch.offer");
    if (field && o.status === "accepted") a.push("order.start_transit");
    if (field && o.status === "in_transit")
      a.push("order.arrive", "order.report_no_show");
    if (field && o.status === "in_progress") {
      a.push("order.propose");
      if (
        o.evidence.some((p) => p.phase === "diagnostic_before") &&
        o.evidence.some((p) => p.phase === "proof_finished")
      )
        a.push("order.request_review");
    }
    if (
      customer &&
      o.status === "pending_validation" &&
      o.customer_review === "pending"
    )
      a.push("order.review");
    if (
      ops &&
      o.status === "pending_validation" &&
      o.customer_review === "accepted"
    )
      a.push("qa.accept", "qa.reject");
    if (customer && o.proposal?.status === "pending")
      a.push("quote.approve", "quote.reject");
    if (ops && o.status === "validated") a.push("finance.reconcile");
    r.allowed_actions = a;
    if (r.proposal)
      r.proposal.allowed_actions = a.filter(
        (x) => x === "quote.approve" || x === "quote.reject",
      );
    if (!field && !ops) {
      r.finance.net_cents = 0;
      r.finance.withholding_cents = 0;
    }
    return r;
  }
  publicCollaborators(): Collaborator[] {
    return this.users
      .filter((u) => u.roles.includes("collaborator"))
      .map((u) => ({
        id: u.id,
        name: u.name,
        trades: u.trades,
        area: u.area,
        rating: 4.8,
        completed: 0,
        verified: u.eligibility === "verified",
        available:
          u.duty &&
          !this.orders.some(
            (o) =>
              o.collaborator_id === u.id &&
              !["completed", "cancelled"].includes(o.status),
          ),
        updated_at: now(),
        bio: "Perfil sintético de pruebas del flujo de servicios.",
      }));
  }
  notify(
    user_id: string,
    title: string,
    body: string,
    surface: "main" | "vision",
    href: string,
  ) {
    const n = {
      id: `notice-${++this.count}`,
      revision: 1,
      title,
      body,
      at: now(),
      read: false,
      surface,
      href,
      user_id,
    };
    this.notices.push(n);
    this.event(user_id, "inbox");
  }
  event(user_id: string, kind: FeedEvent["kind"], resource_id?: string) {
    const cursor =
      (this.events.filter((e) => e.user_id === user_id).at(-1)?.cursor ?? 0) +
      1;
    this.events.push({ user_id, cursor, kind, resource_id });
  }
  changed(o: Order, u: Profile, text: string, kind = "status") {
    o.revision++;
    o.updated_at = now();
    o.timeline.push({ id: randomUUID(), kind, actor: u.name, at: now(), text });
    for (const p of this.users.filter(
      (x) =>
        x.id === o.customer_id ||
        x.id === o.collaborator_id ||
        x.roles.includes("operator"),
    ))
      this.event(p.id, "order", o.id);
  }
  requireRevision(o: { revision: number }, c: Command) {
    if (c.expected_revision !== o.revision)
      throw new ClientError(
        "conflict",
        "A newer version exists. Review the latest details before confirming.",
      );
  }
  requireAction(o: Order, u: Profile, key: Action) {
    if (!this.project(o, u).allowed_actions.includes(key))
      throw new ClientError(
        "forbidden",
        "This action is unavailable in the current state",
      );
  }
  async execute(
    operation: Operation,
    input: unknown,
    token?: string | null,
  ): Promise<unknown> {
    if (this.fault.delay_operation === operation)
      await new Promise((r) => setTimeout(r, this.fault.delay_ms ?? 250));
    const d = input as Record<string, any>; // Fixture JSON is validated by each operation before mutation.
    if (operation === "manifest") return this.manifest();
    if (operation === "catalog") return clone(this.services);
    if (operation === "slots") {
      if (
        !this.services.some((s) => s.id === d.service_id) ||
        !this.manifest().areas.includes(d.city) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(d.date)
      )
        throw new ClientError(
          "validation",
          "Select a supported service, date and area",
        );
      return ["09:00-12:00", "12:00-15:00", "15:00-18:00"].map((label) => ({
        id: label,
        label,
        date: d.date,
        timezone: "America/Mexico_City",
        available: true,
      }));
    }
    if (operation === "collaborators") {
      return this.publicCollaborators().filter(
        (c) =>
          (!d.category || c.trades.includes(d.category)) &&
          (!d.area || c.area === d.area) &&
          (!d.available || c.available) &&
          (!d.text ||
            c.name.toLowerCase().includes(String(d.text).toLowerCase())),
      );
    }
    if (operation === "requestOtp") {
      const phone = String(d.phone)
        .replace(/\D/g, "")
        .replace(/^52(?=\d{10}$)/, "");
      if (!/^\d{10}$/.test(phone))
        throw new ClientError("validation", "Enter a ten-digit phone number");
      const id = randomUUID();
      this.challenges.set(id, phone);
      return {
        challenge_id: id,
        expires_at: new Date(Date.now() + 300000).toISOString(),
      };
    }
    if (operation === "verifyOtp") {
      if (d.code !== "111111" || !this.challenges.has(d.challenge_id))
        throw new ClientError(
          "validation",
          "Incorrect or expired test challenge",
        );
      const phone = this.challenges.get(d.challenge_id)!;
      this.challenges.delete(d.challenge_id);
      let user = this.users.find((u) => u.phone === phone);
      if (!user) {
        user = {
          ...clone(this.users[0]),
          id: randomUUID(),
          name: "Nuevo cliente",
          phone,
        };
        this.users.push(user);
      }
      const t = randomUUID();
      this.sessions.set(t, { id: user.id, expires: Date.now() + 3600000 });
      return { token: t, profile: clone(user) };
    }
    const u = this.actor(token);
    if (operation === "session" || operation === "profile") return clone(u);
    if (operation === "logout") {
      this.sessions.delete(token!);
      return { confirmed: true };
    }
    if (operation === "receipt") {
      const r = this.receipts.get(`${u.id}:${d.request_key}`);
      return r ? { operation: r.operation, result: clone(r.result) } : null;
    }
    const c = d as Command,
      p = (c.payload ?? d) as Record<string, any>;
    const key = c.request_key ? `${u.id}:${c.request_key}` : null;
    const body = JSON.stringify(d);
    if (key) {
      const old = this.receipts.get(key);
      if (old) {
        if (old.body !== body || old.operation !== operation)
          throw new ClientError(
            "conflict",
            "The request key belongs to a different action",
          );
        return clone(old.result);
      }
    }
    const write = async (fn: () => unknown) => {
      if (!key)
        throw new ClientError("validation", "Request identity required");
      const result = await fn();
      this.receipts.set(key, { body, operation, result: clone(result) });
      return result;
    };
    if (operation === "profiles") {
      this.ops(u);
      return clone(this.users.filter((x) => x.roles.includes("collaborator")));
    }
    if (operation === "updateProfile")
      return write(() => {
        for (const name of [
          "name",
          "locale",
          "trades",
          "area",
          "vehicle",
          "fiscal",
          "addresses",
        ])
          if (name in p) (u as any)[name] = clone(p[name]);
        return clone(u);
      });
    if (operation === "submitVerification")
      return write(() => {
        if (u.roles.includes("operator")) {
          const target = this.users.find((x) => x.id === p.id);
          if (!target) throw new ClientError("not_found", "Profile missing");
          target.eligibility =
            p.decision === "verify" ? "verified" : "rejected";
          target.review_reason = String(p.reason ?? "");
          this.notify(
            target.id,
            "Verificación actualizada",
            target.eligibility,
            "vision",
            "/onboarding",
          );
          return clone(target);
        }
        if (!u.roles.includes("collaborator"))
          throw new ClientError("forbidden", "Collaborator account required");
        if (!u.verification_documents?.length)
          throw new ClientError(
            "validation",
            "Upload verification documents before submitting",
          );
        u.eligibility = "submitted";
        u.review_reason = "";
        return clone(u);
      });
    if (operation === "previewQuote") {
      const b = d.booking as Booking;
      const errors = bookingErrors(b);
      if (Object.keys(errors).length)
        throw new ClientError("validation", Object.values(errors)[0]);
      const s = this.services.find((s) => s.id === b.service_id);
      if (!s) throw new ClientError("not_found", "Service missing");
      const rate =
        b.urgency === "emergencia_24_7"
          ? 1.8
          : b.urgency === "mismo_dia"
            ? 1.3
            : 1;
      const total = Math.round(
        s.estimate_cents *
          rate *
          (b.location_type === "premium"
            ? 1.5
            : b.location_type === "comercial"
              ? 1.2
              : 1),
      );
      const discount = u.membership.active ? Math.round(total * 0.15) : 0;
      const q: Quote = {
        id: randomUUID(),
        revision: 1,
        expires_at: new Date(Date.now() + 600000).toISOString(),
        scope: b.description,
        currency: "MXN",
        base_cents: total,
        increment_cents: 0,
        total_cents: total - discount,
        discount_cents: discount,
        previous_total_cents: 0,
        labor_cents: total,
        parts_cents: 0,
        reason: "",
        status: "preview",
        allowed_actions: [],
      };
      this.quotes.set(q.id, { booking: clone(b), quote: q });
      return clone(q);
    }
    if (operation === "createOrder")
      return write(() => {
        if (!u.roles.includes("customer"))
          throw new ClientError("forbidden", "Customer account required");
        const q = this.quotes.get(p.quote_id);
        if (
          !q ||
          q.quote.revision !== c.expected_revision ||
          Date.parse(q.quote.expires_at) < Date.now()
        )
          throw new ClientError(
            "conflict",
            "The quotation expired. Review a new quote.",
          );
        if (JSON.stringify(q.booking) !== JSON.stringify(p.booking))
          throw new ClientError(
            "conflict",
            "The request changed after quotation",
          );
        const o: Order = {
          id: randomUUID(),
          code: `YSF-${String(this.orders.length + 1).padStart(5, "0")}`,
          revision: 1,
          customer_id: u.id,
          customer_name: u.name,
          booking: clone(q.booking),
          quote: { ...clone(q.quote), status: "approved" },
          status: "pending_triage",
          allowed_actions: [],
          evidence: [],
          timeline: [
            {
              id: randomUUID(),
              kind: "created",
              actor: u.name,
              at: now(),
              text: "Solicitud confirmada",
            },
          ],
          updated_at: now(),
          qa: "not_ready",
          customer_review: "pending",
          finance: {
            payment: "reserved",
            payout: "not_ready",
            total_cents: q.quote.total_cents,
            fee_cents: Math.round(q.quote.total_cents * 0.15),
            net_cents: Math.round(q.quote.total_cents * 0.75),
            withholding_cents: Math.round(q.quote.total_cents * 0.1),
          },
        };
        this.orders.push(o);
        for (const op of this.users.filter((x) => x.roles.includes("operator")))
          this.notify(
            op.id,
            "Nueva solicitud",
            o.code,
            "vision",
            `/ops/orders/${o.id}`,
          );
        this.event(u.id, "order", o.id);
        return this.project(o, u);
      });
    if (operation === "orders") {
      if (d.view === "ops") this.ops(u);
      if (d.view === "field") this.field(u);
      let rows = this.orders.filter(
        (o) =>
          d.view === "ops" ||
          (d.view === "field"
            ? o.collaborator_id === u.id
            : o.customer_id === u.id),
      );
      rows = rows.filter(
        (o) =>
          (!d.status || o.status === d.status) &&
          (!d.category || o.booking.category === d.category) &&
          (!d.urgency || o.booking.urgency === d.urgency) &&
          (!d.text ||
            `${o.code} ${o.booking.description}`
              .toLowerCase()
              .includes(String(d.text).toLowerCase())),
      );
      const page = Math.max(1, Number(d.page) || 1),
        limit = 12;
      return {
        items: rows
          .slice((page - 1) * limit, page * limit)
          .map((o) => this.project(o, u)),
        page,
        limit,
        total: rows.length,
        has_more: page * limit < rows.length,
      };
    }
    if (operation === "order") return this.project(this.findOrder(d.id, u), u);
    if (operation === "offers") {
      this.field(u);
      return clone(
        this.offers
          .filter((x) => x.collaborator_id === u.id)
          .map((o) => ({
            ...o,
            status:
              Date.parse(o.expires_at) < Date.now() && o.status === "pending"
                ? "expired"
                : o.status,
            allowed_actions:
              Date.parse(o.expires_at) > Date.now() && o.status === "pending"
                ? ["offer.accept", "offer.decline"]
                : [],
          })),
      );
    }
    if (operation === "candidates") {
      this.ops(u);
      return this.publicCollaborators().filter(
        (c) =>
          c.verified &&
          c.available &&
          c.trades.includes(this.findOrder(d.order_id, u).booking.category),
      );
    }
    if (operation === "duty")
      return write(() => {
        this.field(u);
        u.duty = p.desired === true;
        return clone(u);
      });
    if (operation === "offer")
      return write(() => {
        this.ops(u);
        const o = this.findOrder(p.id, u);
        this.requireRevision(o, c);
        this.requireAction(o, u, "dispatch.offer");
        const target = this.users.find((x) => x.id === p.collaborator_id);
        if (
          !target ||
          !this.publicCollaborators().some(
            (x) =>
              x.id === target.id &&
              x.verified &&
              x.available &&
              x.trades.includes(o.booking.category),
          )
        )
          throw new ClientError("conflict", "Collaborator no longer eligible");
        const offer: Offer = {
          id: randomUUID(),
          revision: 1,
          order_id: o.id,
          order_code: o.code,
          collaborator_id: target.id,
          expires_at: new Date(Date.now() + 45000).toISOString(),
          status: "pending",
          service: o.booking.category,
          area: o.booking.address.city,
          description: o.booking.description,
          net_cents: o.finance.net_cents,
          allowed_actions: ["offer.accept", "offer.decline"],
        };
        this.offers.push(offer);
        o.status = "dispatched";
        this.changed(o, u, "Oferta enviada");
        this.notify(target.id, "Nueva oferta", o.code, "vision", "/radar");
        return clone(offer);
      });
    if (operation === "acceptOffer" || operation === "declineOffer")
      return write(() => {
        this.field(u);
        const offer = this.offers.find(
          (x) => x.id === p.id && x.collaborator_id === u.id,
        );
        if (!offer) throw new ClientError("not_found", "Offer unavailable");
        this.requireRevision(offer, c);
        const o = this.orders.find((x) => x.id === offer.order_id)!;
        if (
          offer.status !== "pending" ||
          Date.parse(offer.expires_at) < Date.now() ||
          o.collaborator_id
        )
          throw new ClientError(
            "conflict",
            "Offer expired or already assigned",
          );
        offer.revision++;
        offer.status = operation === "acceptOffer" ? "accepted" : "declined";
        if (operation === "declineOffer") return clone(offer);
        o.collaborator_id = u.id;
        o.collaborator_name = u.name;
        o.status = "accepted";
        o.pass = {
          code: randomUUID().slice(0, 8),
          expires_at: new Date(Date.now() + 7200000).toISOString(),
          vehicle: u.vehicle,
        };
        this.changed(o, u, "Asignación aceptada");
        this.notify(
          o.customer_id,
          "Colaborador asignado",
          u.name,
          "main",
          `/orders/${o.id}`,
        );
        for (const other of this.offers.filter(
          (x) => x.order_id === o.id && x.id !== offer.id,
        ))
          other.status = "expired";
        return this.project(o, u);
      });
    if (
      [
        "progress",
        "propose",
        "decideQuote",
        "review",
        "qa",
        "cancelOrder",
        "reconcileFinance",
      ].includes(operation)
    )
      return write(() => {
        const o = this.findOrder(p.id, u);
        this.requireRevision(o, c);
        if (operation === "progress") {
          const action = p.action as Action;
          this.requireAction(o, u, action);
          o.status =
            action === "order.start_transit"
              ? "in_transit"
              : action === "order.arrive"
                ? "in_progress"
                : "pending_validation";
          if (action === "order.arrive")
            o.telemetry = {
              lat: 19.4326,
              lng: -99.1332,
              accuracy: 40,
              observed_at: now(),
            };
          if (action === "order.request_review") {
            o.qa = "pending";
            this.notify(
              o.customer_id,
              "Revisa el resultado",
              o.code,
              "main",
              `/orders/${o.id}/review`,
            );
          }
          this.changed(o, u, "Progreso confirmado");
        }
        if (operation === "propose") {
          this.requireAction(o, u, "order.propose");
          const labor = cents(p.labor_cents),
            parts = cents(p.parts_cents);
          if (!String(p.reason).trim() || labor + parts === 0)
            throw new ClientError(
              "validation",
              "Describe the additional work and amount",
            );
          o.proposal = {
            ...clone(o.quote),
            id: randomUUID(),
            revision: 1,
            order_id: o.id,
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            status: "pending",
            reason: p.reason,
            scope: p.reason,
            labor_cents: labor,
            parts_cents: parts,
            increment_cents: labor + parts,
            total_cents: o.quote.total_cents + labor + parts,
            previous_total_cents: o.quote.total_cents,
          };
          o.status = "pending_quote_approval";
          this.changed(o, u, "Propuesta adicional enviada");
          this.notify(
            o.customer_id,
            "Autoriza trabajo adicional",
            o.code,
            "main",
            `/orders/${o.id}/approvals/${o.proposal.id}`,
          );
        }
        if (operation === "decideQuote") {
          this.requireAction(
            o,
            u,
            p.decision === "approve" ? "quote.approve" : "quote.reject",
          );
          if (
            !o.proposal ||
            p.quote_id !== o.proposal.id ||
            p.quote_revision !== o.proposal.revision ||
            Date.parse(o.proposal.expires_at) < Date.now()
          )
            throw new ClientError("conflict", "Proposal changed or expired");
          o.proposal.status =
            p.decision === "approve" ? "approved" : "rejected";
          o.proposal.revision++;
          if (p.decision === "approve") {
            o.quote = clone(o.proposal);
            o.finance.total_cents = o.quote.total_cents;
            o.finance.fee_cents = Math.round(o.quote.total_cents * 0.15);
            o.finance.net_cents = Math.round(o.quote.total_cents * 0.75);
          }
          o.status = "in_progress";
          this.changed(o, u, "Decisión de cotización confirmada");
        }
        if (operation === "review") {
          this.requireAction(o, u, "order.review");
          if (!Number.isInteger(p.rating) || p.rating < 1 || p.rating > 5)
            throw new ClientError("validation", "Choose a rating");
          o.rating = p.rating;
          o.review_text = String(p.text ?? "");
          o.customer_review = "accepted";
          this.changed(o, u, "Cliente aceptó el resultado");
        }
        if (operation === "qa") {
          this.requireAction(
            o,
            u,
            p.decision === "accept" ? "qa.accept" : "qa.reject",
          );
          if (
            !o.evidence.some((e) => e.phase === "diagnostic_before") ||
            !o.evidence.some((e) => e.phase === "proof_finished")
          )
            throw new ClientError("validation", "Required evidence missing");
          o.qa = p.decision === "accept" ? "accepted" : "rejected";
          o.status = p.decision === "accept" ? "validated" : "disputed";
          this.changed(o, u, "Dictamen QA registrado");
        }
        if (operation === "cancelOrder") {
          if (p.reason === "no_show") {
            this.requireAction(o, u, "order.report_no_show");
          } else this.requireAction(o, u, "order.cancel");
          o.status = "cancelled";
          this.changed(o, u, "Cancelación confirmada");
        }
        if (operation === "reconcileFinance") {
          this.requireAction(o, u, "finance.reconcile");
          o.status = "completed";
          o.finance.payment = "confirmed";
          o.finance.payout = "pending";
          this.payouts.push({
            id: randomUUID(),
            order_id: o.id,
            code: o.code,
            status: "pending",
            gross_cents: o.finance.total_cents,
            fee_cents: o.finance.fee_cents,
            withholding_cents: o.finance.withholding_cents,
            net_cents: o.finance.net_cents,
            at: now(),
            receipt: "fixture-payout-request",
          });
          const w: Warranty = {
            id: randomUUID(),
            order_id: o.id,
            code: `YSF-WAR-${this.orders.indexOf(o) + 1}`,
            customer_id: o.customer_id,
            starts_at: now(),
            ends_at: new Date(Date.now() + 30 * 86400000).toISOString(),
            status: "active",
            terms:
              "Fixture de pruebas: cobertura del trabajo descrito en la orden.",
            document_id: "",
          };
          this.warranties.push(w);
          this.changed(o, u, "Liquidación solicitada; garantía emitida");
          this.notify(
            o.customer_id,
            "Servicio completado",
            o.code,
            "main",
            `/orders/${o.id}`,
          );
        }
        return this.project(o, u);
      });
    if (operation === "cancelPreview") {
      const o = this.findOrder(d.id, u);
      return {
        fee_cents: o.status === "in_transit" ? 15000 : 0,
        reason: String(d.reason),
        revision: o.revision,
      };
    }
    if (operation === "beginUpload")
      return write(() => {
        let order_id = "";
        if (p.purpose === "verification") {
          if (!u.roles.includes("collaborator"))
            throw new ClientError("forbidden", "Collaborator required");
        } else {
          const o = this.findOrder(p.order_id, u);
          if (o.collaborator_id !== u.id && !u.roles.includes("operator"))
            throw new ClientError(
              "forbidden",
              "Assigned collaborator required",
            );
          order_id = o.id;
        }
        if (
          !this.manifest().mime_types.includes(p.type) ||
          p.size <= 0 ||
          p.size > 25_000_000
        )
          throw new ClientError("validation", "Invalid image");
        const id = randomUUID(),
          capability = randomUUID();
        this.assets.set(id, {
          owner: u.id,
          order_id,
          mime: p.type,
          name: p.name,
          size: p.size,
          purpose: p.purpose,
          document_kind: p.document_kind,
          capability,
          expires: Date.now() + 900000,
        });
        return {
          id,
          url: `${this.origin}/uploads/${id}?cap=${capability}`,
          expires_at: new Date(Date.now() + 900000).toISOString(),
          method: "PUT",
          headers: { "Content-Type": p.type },
        };
      });
    if (operation === "renewUpload")
      return write(() => {
        const a = this.assets.get(p.upload_id);
        if (!a || a.owner !== u.id)
          throw new ClientError("forbidden", "Upload unavailable");
        a.expires = Date.now() + 900000;
        a.capability = randomUUID();
        return {
          id: p.upload_id,
          url: `${this.origin}/uploads/${p.upload_id}?cap=${a.capability}`,
          expires_at: new Date(a.expires).toISOString(),
          method: "PUT",
          headers: { "Content-Type": a.mime },
        };
      });
    if (operation === "completeUpload")
      return write(() => {
        const a = this.assets.get(p.upload_id);
        if (!a || a.owner !== u.id || !a.bytes || !a.sha)
          throw new ClientError("conflict", "Photo transfer not confirmed");
        return { asset_id: p.upload_id };
      });
    if (operation === "attachVerification")
      return write(() => {
        const a = this.assets.get(p.asset_id);
        if (
          !a ||
          a.owner !== u.id ||
          a.purpose !== "verification" ||
          !a.bytes ||
          !a.sha
        )
          throw new ClientError("forbidden", "Invalid private document");
        if (!["identity", "address", "credential"].includes(p.kind))
          throw new ClientError("validation", "Invalid document kind");
        u.verification_documents = [
          ...(u.verification_documents ?? []).filter((d) => d.kind !== p.kind),
          {
            asset_id: p.asset_id,
            kind: p.kind,
            name: a.name,
            url: `${this.origin}/assets/${p.asset_id}?cap=${a.capability}`,
          },
        ];
        return clone(u);
      });
    if (operation === "attachEvidence")
      return write(() => {
        const o = this.findOrder(p.id, u);
        this.requireRevision(o, c);
        const a = this.assets.get(p.asset_id);
        if (!a || a.owner !== u.id || a.order_id !== o.id || !a.bytes || !a.sha)
          throw new ClientError("forbidden", "Invalid evidence association");
        if (
          !["diagnostic_before", "work_progress", "proof_finished"].includes(
            p.phase,
          )
        )
          throw new ClientError("validation", "Invalid evidence phase");
        const e: Evidence = {
          id: p.asset_id,
          order_id: o.id,
          phase: p.phase,
          url: `${this.origin}/assets/${p.asset_id}?cap=${a.capability}`,
          sha256: a.sha,
          name: a.name,
          size: a.size,
          received_at: now(),
          captured_at: p.captured_at,
          coordinates: p.coordinates,
          source: p.source,
        };
        o.evidence.push(e);
        this.changed(o, u, "Evidencia adjunta", "evidence");
        return this.project(o, u);
      });
    if (operation === "conversation") {
      this.findOrder(d.order_id, u);
      return clone(this.messages.filter((m) => m.order_id === d.order_id));
    }
    if (operation === "sendMessage")
      return write(() => {
        const o = this.findOrder(p.order_id, u);
        if (!String(p.text).trim())
          throw new ClientError("validation", "Enter a message");
        const m: Message = {
          id: randomUUID(),
          order_id: o.id,
          sender_id: u.id,
          sender_name: u.name,
          text: String(p.text).slice(0, 5000),
          at: now(),
        };
        this.messages.push(m);
        for (const user of this.users.filter(
          (x) =>
            x.id === o.customer_id ||
            x.id === o.collaborator_id ||
            x.roles.includes("operator"),
        ))
          this.event(user.id, "conversation", o.id);
        return clone(m);
      });
    if (operation === "inbox")
      return {
        items: clone(this.notices.filter((n) => n.user_id === u.id).reverse()),
        cursor:
          this.events.filter((e) => e.user_id === u.id).at(-1)?.cursor ?? 0,
      };
    if (operation === "markRead")
      return write(() => {
        for (const n of this.notices.filter(
          (n) => n.user_id === u.id && p.ids.includes(n.id),
        )) {
          n.read = true;
          n.revision++;
          this.event(u.id, "inbox");
        }
        return clone(this.notices.filter((n) => n.user_id === u.id));
      });
    if (operation === "events") {
      const list = this.events.filter(
        (e) => e.user_id === u.id && e.cursor > Number(d.cursor),
      );
      if (
        this.fault.gap &&
        (!this.fault.gap_user_id || this.fault.gap_user_id === u.id)
      ) {
        this.fault.gap = false;
        return [
          {
            cursor:
              this.events.filter((e) => e.user_id === u.id).at(-1)?.cursor ??
              Number(d.cursor),
            kind: "gap",
          },
        ];
      }
      return clone(list);
    }
    if (operation === "cases")
      return clone(
        this.cases.filter(
          (c) => c.customer_id === u.id || u.roles.includes("operator"),
        ),
      );
    if (operation === "case") {
      const c = this.cases.find((c) => c.id === d.id);
      if (!c) throw new ClientError("not_found", "Case unavailable");
      this.findOrder(c.order_id, u);
      return clone(c);
    }
    if (operation === "createCase")
      return write(() => {
        const o = this.findOrder(p.order_id, u);
        if (
          p.claim &&
          this.cases.some(
            (c) =>
              c.order_id === o.id &&
              c.category === "warranty" &&
              c.status !== "resolved",
          )
        )
          throw new ClientError(
            "conflict",
            "An active warranty claim already exists",
          );
        const issue: Case = {
          id: randomUUID(),
          revision: 1,
          order_id: o.id,
          customer_id: o.customer_id,
          category: p.claim ? "warranty" : String(p.category),
          description: String(p.description),
          status: "open",
          timeline: [
            {
              id: randomUUID(),
              kind: "case",
              actor: u.name,
              at: now(),
              text: "Caso registrado",
            },
          ],
        };
        if (issue.description.trim().length < 10)
          throw new ClientError("validation", "Describe the issue");
        this.cases.push(issue);
        if (p.claim) {
          const w = this.warranties.find((w) => w.order_id === o.id);
          if (w) w.status = "claimed";
        } else {
          o.status = "disputed";
          this.changed(o, u, "Incidencia registrada");
        }
        for (const operator of this.users.filter((x) =>
          x.roles.includes("operator"),
        ))
          this.notify(
            operator.id,
            "Caso requiere atención",
            o.code,
            "vision",
            `/ops/cases/${issue.id}`,
          );
        return clone(issue);
      });
    if (operation === "resolveCase")
      return write(() => {
        this.ops(u);
        const cse = this.cases.find((x) => x.id === p.id);
        if (!cse) throw new ClientError("not_found", "Case missing");
        this.requireRevision(cse, c);
        cse.status = p.resolved ? "resolved" : "reviewing";
        cse.revision++;
        cse.resolution = String(p.resolution ?? "");
        cse.timeline.push({
          id: randomUUID(),
          kind: "resolution",
          actor: u.name,
          at: now(),
          text: cse.resolution,
        });
        return clone(cse);
      });
    if (operation === "warranties")
      return clone(
        this.warranties.filter(
          (w) => w.customer_id === u.id || u.roles.includes("operator"),
        ),
      );
    if (operation === "warranty") {
      const w = this.warranties.find((w) => w.id === d.id);
      if (!w) throw new ClientError("not_found", "Warranty unavailable");
      this.findOrder(w.order_id, u);
      return clone(w);
    }
    if (operation === "documents") {
      this.findOrder(d.order_id, u);
      return clone(this.documents.filter((x) => x.order_id === d.order_id));
    }
    if (operation === "requestDocument")
      return write(() => {
        this.findOrder(p.order_id, u);
        if (!["report", "warranty", "invoice"].includes(p.kind))
          throw new ClientError("validation", "Unknown document type");
        const doc: Document = {
          id: randomUUID(),
          order_id: p.order_id,
          kind: p.kind,
          status: "processing",
          filename: `yessyfy-${p.kind}.pdf`,
          mime: "application/pdf",
          receipt: "fixture-document-request",
        };
        this.documents.push(doc);
        return clone(doc);
      });
    if (operation === "document") {
      const doc = this.documents.find((x) => x.id === d.id);
      if (!doc) throw new ClientError("not_found", "Document unavailable");
      this.findOrder(doc.order_id, u);
      return clone(doc);
    }
    if (operation === "payouts")
      return clone(
        this.payouts.filter(
          (p) =>
            this.orders.find((o) => o.id === p.order_id)?.collaborator_id ===
              u.id || u.roles.includes("operator"),
        ),
      );
    throw new ClientError(
      "not_found",
      `Unsupported fixture operation: ${operation}`,
    );
  }
  upload(id: string, bytes: Uint8Array, mime: string) {
    const a = this.assets.get(id);
    if (!a || a.expires < Date.now())
      throw new ClientError("forbidden", "Upload authority expired");
    if (bytes.length !== a.size || mime !== a.mime)
      throw new ClientError("validation", "Image size/type mismatch");
    const png = bytes[0] === 137 && bytes[1] === 80,
      jpeg = bytes[0] === 255 && bytes[1] === 216,
      webp = Buffer.from(bytes.slice(0, 4)).toString() === "RIFF";
    if (!png && !jpeg && !webp)
      throw new ClientError("validation", "Invalid test image");
    const sha = createHash("sha256").update(bytes).digest("hex");
    if (a.sha && a.sha !== sha)
      throw new ClientError("conflict", "Upload replay bytes changed");
    a.bytes = bytes;
    a.sha = sha;
  }
}
