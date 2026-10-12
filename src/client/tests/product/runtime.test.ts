import { describe, it, expect } from "vitest";
import { Runtime } from "../../sdk/state/src/product/runtime.svelte.ts";
import {
  ClientError,
  type ClientPort,
  type Profile,
  type Order,
} from "../../sdk/core/src/product/contracts.ts";
import { FixtureService } from "../fixtures/service.ts";
import type {
  PhotoPersistence,
  PendingPhoto,
} from "../../sdk/state/src/product/persistence.ts";
const service = new FixtureService();
const user = service.users[0];
function memory() {
  const entries = new Map<string, string>();
  return {
    get: (k: string) => entries.get(k) ?? null,
    set: (k: string, v: string) => {
      entries.set(k, v);
    },
    remove: (k: string) => {
      entries.delete(k);
    },
  };
}
function photos() {
  const entries = new Map<string, PendingPhoto>();
  return {
    list: async (owner: string) =>
      [...entries.values()].filter((p) => p.owner === owner),
    put: async (p: PendingPhoto) => {
      entries.set(p.id, p);
    },
    remove: async (id: string) => {
      entries.delete(id);
    },
    close: () => {},
  } satisfies PhotoPersistence;
}
function port(call: (op: string, input: any) => Promise<any>): ClientPort {
  return { token: null, call: call as ClientPort["call"], dispose: () => {} };
}
describe("Runtime interruption and ownership", () => {
  it("W17 old principal reads cannot populate a new session", async () => {
    let resolve: (v: unknown) => void = () => {};
    const r = new Runtime(
      port(async (op) =>
        op === "logout"
          ? { confirmed: true }
          : new Promise((done) => (resolve = done)),
      ),
      "test",
      memory(),
      photos(),
    );
    r.user = { ...user };
    const pending = r.read("private", () => r.client.call("profile", {}));
    await r.logout();
    resolve(user);
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(r.user).toBeNull();
    r.dispose();
  });
  it("W20 later navigation makes the old resource response obsolete", async () => {
    let older: (v: unknown) => void = () => {},
      newer: (v: unknown) => void = () => {};
    const r = new Runtime(
      port(async () => null),
      "test",
      memory(),
      photos(),
    );
    const a = r.read(
      "active-order",
      () => new Promise((done) => (older = done)),
    );
    const b = r.read(
      "active-order",
      () => new Promise((done) => (newer = done)),
    );
    newer("second");
    expect(await b).toBe("second");
    older("first");
    await expect(a).rejects.toMatchObject({ name: "AbortError" });
    r.dispose();
  });
  it("W03 duplicate clicks share one network command and one request identity", async () => {
    let calls = 0,
      finish: (v: unknown) => void = () => {};
    const r = new Runtime(
      port(async () => {
        calls++;
        return new Promise((done) => (finish = done));
      }),
      "test",
      memory(),
      photos(),
    );
    r.user = { ...user };
    const a = r.command("profile", "updateProfile", { name: "Mariana" }),
      b = r.command("profile", "updateProfile", { name: "Mariana" });
    expect(calls).toBe(1);
    finish({ ...user, name: "Mariana" });
    await Promise.all([a, b]);
    expect(r.user?.name).toBe("Mariana");
    expect(r.intents.profile).toBeUndefined();
    r.dispose();
  });
  it("W15 uncertain requests retain the unchanged payload until receipt recovery", async () => {
    let calls = 0;
    const result = { ...user, name: "Saved" };
    const r = new Runtime(
      port(async (op) => {
        calls++;
        if (op === "receipt") return { operation: "updateProfile", result };
        throw new ClientError("uncertain", "Acknowledgement lost");
      }),
      "test",
      memory(),
      photos(),
    );
    r.user = { ...user };
    await expect(
      r.command("profile", "updateProfile", { name: "Saved" }),
    ).rejects.toMatchObject({ kind: "uncertain" });
    const key = r.intents.profile.command.request_key;
    await expect(
      r.command("profile", "updateProfile", { name: "Changed" }),
    ).rejects.toMatchObject({ kind: "uncertain" });
    expect(r.intents.profile.command.request_key).toBe(key);
    await r.recover("profile");
    expect(calls).toBe(2);
    expect(r.user?.name).toBe("Saved");
    expect(r.commandStates.profile).toBe("confirmed");
    r.dispose();
  });
  it("W18 photos persist as binary data under the originating principal", async () => {
    const db = photos();
    const r = new Runtime(
      port(async () => null),
      "test",
      memory(),
      db,
    );
    r.user = { ...user };
    r.manifest = service.manifest();
    const file = new File([new Uint8Array([1, 2, 3])], "real.png", {
      type: "image/png",
    });
    const queued = await r.queuePhoto("order-1", "diagnostic_before", file);
    expect(await db.list(user.id)).toHaveLength(1);
    expect(await db.list("other")).toHaveLength(0);
    expect(await queued.file.arrayBuffer()).toEqual(await file.arrayBuffer());
    r.dispose();
  });
  it("operator verification updates its target without replacing the active actor", async () => {
    const operator = service.users[2],
      target = service.users[1];
    const r = new Runtime(
      port(async () => ({ ...target, eligibility: "verified" })),
      "test",
      memory(),
      photos(),
    );
    r.user = { ...operator };
    r.profiles = [{ ...target }];
    await r.command("verify", "submitVerification", {
      id: target.id,
      decision: "verify",
    });
    expect(r.user?.id).toBe(operator.id);
    expect(r.canOps).toBe(true);
    r.dispose();
  });
});

describe("Scoped draft recovery", () => {
  it("keeps order drafts separate across principal and resource", () => {
    const store = memory();
    const r = new Runtime(
      port(async () => null),
      "test",
      store,
      photos(),
    );
    r.user = { ...user };
    r.saveDraft("order:one", { text: "Private draft" });
    expect(r.readDraft("order:two")).toBeNull();
    r.user = { ...user, id: "other" };
    expect(r.readDraft("order:one")).toBeNull();
    r.user = { ...user };
    expect(r.readDraft("order:one")).toEqual({ text: "Private draft" });
    r.dispose();
  });
});

it("W23 revoked resource access removes cached order, conversation and documents", async () => {
  const r = new Runtime(
    port(async () => {
      throw new ClientError("forbidden", "Assignment changed");
    }),
    "test",
    memory(),
    photos(),
  );
  r.user = { ...user };
  r.orders = { private: { id: "private", revision: 1 } as Order };
  r.messages = { private: [] };
  r.documents = { private: [] };
  await expect(r.loadOrder("private")).rejects.toMatchObject({
    kind: "forbidden",
  });
  expect(r.orders.private).toBeUndefined();
  expect(r.messages.private).toBeUndefined();
  expect(r.documents.private).toBeUndefined();
  r.dispose();
});
it("W17 an expired old request cannot clear a newly signed-in principal", async () => {
  let reject: (e: unknown) => void = () => {};
  const r = new Runtime(
    port(async (op) =>
      op === "logout"
        ? { confirmed: true }
        : new Promise((_, fail) => (reject = fail)),
    ),
    "test",
    memory(),
    photos(),
  );
  r.user = { ...user };
  const pending = r.read("private", () => r.client.call("profile", {}));
  await r.logout();
  r.user = { ...user, id: "new-principal" };
  reject(new ClientError("unauthenticated", "Old session expired"));
  await expect(pending).rejects.toMatchObject({ kind: "unauthenticated" });
  expect(r.user?.id).toBe("new-principal");
  r.dispose();
});
it("W16 a stale booking response clears the old quote while preserving the draft", async () => {
  const r = new Runtime(
    port(async () => {
      throw new ClientError("conflict", "Quotation changed");
    }),
    "test",
    memory(),
    photos(),
  );
  r.user = { ...user };
  r.booking.description = "Keep my request";
  r.quote = { id: "old" } as any;
  await expect(
    r.command("booking", "createOrder", { quote_id: "old" }, 1),
  ).rejects.toMatchObject({ kind: "conflict" });
  expect(r.quote).toBeNull();
  expect(r.booking.description).toBe("Keep my request");
  r.dispose();
});
