import { assert, Runtime } from "../helpers/runtime.ts";
import { fileURLToPath } from "node:url";
Deno.test("HTTP, JSON-RPC, WebSocket and gRPC share actor-aware capabilities", async (t) => {
  const r = await new Runtime().start();
  try {
    const session = await r.login("5511111111");
    assert(
      await t.step("HTTP alias and canonical HTTP adapter return the same profile", async () => {
        const a = await r.call("profile", {}, session.token);
        const response = await fetch(r.origin + "/api/yessyfy/profile", {
          method: "POST",
          headers: { authorization: "Bearer " + session.token, "content-type": "application/json" },
          body: "{}",
        });
        assert(response.ok);
        const b = await response.json();
        assert(a.id === b.id && a.phone === b.phone);
      }),
    );
    assert(
      await t.step("JSON-RPC preserves IDs and checks actor permissions", async () => {
        const response = await fetch(r.origin + "/rpc", {
          method: "POST",
          headers: { authorization: "Bearer " + session.token, "content-type": "application/json" },
          body: JSON.stringify([
            { jsonrpc: "2.0", id: null, method: "yessyfy.profile", params: {} },
            { jsonrpc: "2.0", id: "forbidden", method: "yessyfy.profiles", params: {} },
          ]),
        });
        const replies = await response.json();
        assert(replies[0].id === null && replies[0].result.id === "customer1");
        assert(replies[1].id === "forbidden" && replies[1].error.data.code === "forbidden");
      }),
    );
    assert(
      await t.step("WebSocket rejects empty auth and rechecks a verified session", async () => {
        const empty = new WebSocket(r.origin.replace("http:", "ws:") + "/ws");
        const closed = new Promise<CloseEvent>((resolve) =>
          empty.addEventListener("close", resolve, { once: true })
        );
        empty.addEventListener("open", () => empty.send('{"auth":""}'), { once: true });
        assert((await closed).code === 1008);
        const ws = new WebSocket(r.origin.replace("http:", "ws:") + "/ws");
        let state = 0;
        const result = new Promise<string>((resolve, reject) => {
          ws.addEventListener("error", () => reject(new Error("socket failed")), { once: true });
          ws.addEventListener("message", (event) => {
            const message = JSON.parse(String(event.data));
            if (state++ === 0) {
              assert(message.authenticated === true);
              ws.send(
                JSON.stringify({
                  jsonrpc: "2.0",
                  id: "profile",
                  method: "yessyfy.profile",
                  params: {},
                }),
              );
            } else {
              assert(message.id === "profile");
              resolve(message.result.id);
            }
          });
        });
        ws.addEventListener("open", () => ws.send(JSON.stringify({ auth: session.token })), {
          once: true,
        });
        assert(await result === "customer1");
        const ended = new Promise<void>((resolve) =>
          ws.addEventListener("close", () => resolve(), { once: true })
        );
        ws.close();
        await ended;
      }),
    );
    assert(
      await t.step("gRPC uses the canonical generated Rust client and live principal", async () => {
        const binary = Deno.env.get("YESSYFY_GRPC_PROBE") ??
          fileURLToPath(new URL("../../engine/target/debug/examples/probe-grpc", import.meta.url));
        const result = await new Deno.Command(binary, {
          env: {
            YESSYFY_TEST_GRPC: `127.0.0.1:${r.grpcPort}`,
            YESSYFY_TEST_SESSION: session.token,
          },
          stdout: "piped",
          stderr: "piped",
        }).output();
        assert(result.success, new TextDecoder().decode(result.stderr));
        const value = JSON.parse(new TextDecoder().decode(result.stdout));
        assert(value.profile.id === "customer1" && value.missing_auth === "unauthenticated");
      }),
    );
  } finally {
    await r.close();
  }
});
