import { fileURLToPath } from "node:url";
import { type Operation, validateResult } from "../../config/contracts/yessyfy/contracts.ts";
export function assert(value: unknown, message = "assertion failed"): asserts value {
  if (!value) throw new Error(message);
}
export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
export const id = () => crypto.randomUUID().replaceAll("-", "");
const root = fileURLToPath(new URL("../../", import.meta.url));
function port(): number {
  const listener = Deno.listen({ hostname: "127.0.0.1", port: 0 });
  const port = (listener.addr as Deno.NetAddr).port;
  listener.close();
  return port;
}
type Child = { process: Deno.ChildProcess; output: Promise<Deno.CommandOutput>; name: string };
export class Runtime {
  directory = "";
  dbOrigin = "";
  origin = "";
  providerKey = id() + id();
  systemToken = id() + id();
  rootPassword = id() + id();
  requests: Record<string, unknown>[] = [];
  children: Child[] = [];
  engine?: Child;
  provider?: Deno.HttpServer<Deno.NetAddr>;
  config = "";
  grpcPort = 0;
  env: Record<string, string> = {};
  async start(): Promise<this> {
    await Deno.mkdir(root + ".state", { recursive: true });
    this.directory = await Deno.makeTempDir({ dir: root + ".state", prefix: "native-test-" });
    this.dbOrigin = `http://127.0.0.1:${port()}`;
    this.origin = `http://127.0.0.1:${port()}`;
    this.provider = Deno.serve(
      { hostname: "127.0.0.1", port: 0, onListen: () => {} },
      async (request) => {
        const bytes = new Uint8Array(await request.arrayBuffer());
        const at = request.headers.get("x-yessyfy-timestamp") ?? "";
        const sig = await this.signature(bytes, at);
        if (sig !== request.headers.get("x-yessyfy-signature")) {
          return Response.json({
            error: "signature",
          }, { status: 403 });
        }
        const body = JSON.parse(new TextDecoder().decode(bytes));
        this.requests.push(body);
        if (new URL(request.url).pathname === "/fiscal") {
          const xml = new TextEncoder().encode(
            `<?xml version="1.0"?><cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4" Version="4.0" Total="${body.total}"/>`,
          );
          const digest = await crypto.subtle.digest("SHA-256", xml);
          const sha256 = Array.from(new Uint8Array(digest), (x) => x.toString(16).padStart(2, "0"))
            .join("");
          const responseBytes = new TextEncoder().encode(JSON.stringify({
            status: "stamped",
            cfdi_type: body.cfdi_type,
            document_id: body.document_id,
            currency: "MXN",
            total: body.total,
            recipient_rfc: body.recipient.rfc,
            issuer_rfc: "AAA010101AAA",
            uuid: `${body.document_id.slice(0, 8)}-${body.document_id.slice(8, 12)}-4${
              body.document_id.slice(13, 16)
            }-a${body.document_id.slice(17, 20)}-${body.document_id.slice(20, 32)}`,
            stamped_at: "2026-10-12T21:00:00Z",
            sha256,
            xml_base64: btoa(String.fromCharCode(...xml)),
          }));
          const time = String(Math.floor(Date.now() / 1000));
          return new Response(responseBytes, {
            headers: {
              "content-type": "application/json",
              "x-yessyfy-timestamp": time,
              "x-yessyfy-signature": await this.signature(responseBytes, time),
            },
          });
        }
        return Response.json({
          status: "accepted",
          receipt: `test-provider:${request.headers.get("x-yessyfy-idempotency-key")}`,
        });
      },
    );
    const providerOrigin = `http://127.0.0.1:${this.provider.addr.port}`;
    this.env = {
      GWA_API_TOKEN: this.systemToken,
      YESSYFY_DB_USER: "engine",
      YESSYFY_DB_PASSWORD: id() + id(),
      YESSYFY_SIGNING_KEY: id() + id(),
      YESSYFY_JOB_KEY: id() + id(),
      YESSYFY_PROVIDER_KEY: this.providerKey,
    };
    const surreal = Deno.env.get("YESSYFY_SURREAL_BINARY") ?? "surreal";
    this.spawn(surreal, [
      "start",
      "--bind",
      new URL(this.dbOrigin).host,
      "--user",
      "maintenance",
      "--pass",
      this.rootPassword,
      "--deny-guests",
      `surrealkv:${this.directory}/database`,
    ], "database");
    await this.ready(this.dbOrigin + "/health");
    await this.initialize();
    const base = await Deno.readTextFile(root + "config/server.toml");
    const profile = await Deno.readTextFile(root + "config/profiles/dev.toml");
    this.grpcPort = port();
    this.config = (base + "\n" + profile).replace("0.0.0.0:8080", new URL(this.origin).host)
      .replace("0.0.0.0:50051", `127.0.0.1:${this.grpcPort}`).replace(
        'artifacts_dir = "/artifacts"',
        `artifacts_dir = "${this.directory}/artifacts"`,
      ).replace("http://db:8000", this.dbOrigin).replace("http://127.0.0.1:8080", this.origin)
      .replace("/opt/typst/typst", Deno.env.get("YESSYFY_TYPST_BINARY") ?? "/usr/local/bin/typst")
      .replace("/opt/yessyfy/documents", root + "engine/documents").replace(
        'finance_provider = "disabled"',
        'finance_provider = "webhook"',
      ).replace('finance_webhook = ""', `finance_webhook = "${providerOrigin}/finance"`).replace(
        'fiscal_provider = "disabled"',
        'fiscal_provider = "webhook"',
      ).replace('fiscal_webhook = ""', `fiscal_webhook = "${providerOrigin}/fiscal"`);
    await Deno.writeTextFile(this.directory + "/runtime.toml", this.config, { mode: 0o600 });
    this.env.GWA_CONFIG = this.directory + "/runtime.toml";
    await this.startEngine();
    return this;
  }
  spawn(command: string, args: string[], name: string): Child {
    const process = new Deno.Command(command, {
      args,
      cwd: root,
      env: this.env,
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const child = { process, output: process.output(), name };
    this.children.push(child);
    return child;
  }
  async ready(url: string) {
    for (let i = 0; i < 150; i++) {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
        await response.arrayBuffer();
        if (response.ok) return;
      } catch { /* startup */ }
      await sleep(100);
    }
    throw new Error("service failed readiness: " + url);
  }
  async stopChild(child: Child) {
    try {
      child.process.kill("SIGTERM");
    } catch { /* already exited */ }
    const deadline = setTimeout(() => {
      try {
        child.process.kill("SIGKILL");
      } catch { /* reaped */ }
    }, 15000);
    try {
      const output = await child.output;
      await Deno.writeFile(this.directory + `/${child.name}.stdout.log`, output.stdout);
      await Deno.writeFile(this.directory + `/${child.name}.stderr.log`, output.stderr);
    } finally {
      clearTimeout(deadline);
    }
    this.children = this.children.filter((x) => x !== child);
  }
  async startEngine() {
    this.engine = this.spawn(
      Deno.env.get("YESSYFY_ENGINE_BINARY") ?? root + "engine/target/debug/gwa-server",
      [],
      "engine",
    );
    await this.ready(this.origin + "/ready");
  }
  async restart() {
    if (this.engine) await this.stopChild(this.engine);
    await this.startEngine();
  }
  async close() {
    for (const child of [...this.children].reverse()) await this.stopChild(child);
    if (this.provider) {
      await this.provider.shutdown();
      await this.provider.finished;
    }
  }
  async sql(query: string): Promise<unknown[]> {
    const response = await fetch(this.dbOrigin + "/sql", {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: "Basic " + btoa("maintenance:" + this.rootPassword),
        "surreal-ns": "yessyfy",
        "surreal-db": "main",
      },
      body: query,
    });
    const rows = await response.json();
    assert(response.ok, JSON.stringify(rows));
    assert(
      rows.every((r: { status: string }) => r.status === "OK"),
      JSON.stringify(rows.filter((r: { status: string }) => r.status !== "OK")),
    );
    return rows.map((r: { result: unknown }) => r.result);
  }
  async initialize() {
    await this.sql(
      (await Deno.readTextFile(root + "db/operations/bootstrap.surql")).replaceAll(
        "__NS_IDENT__",
        "yessyfy",
      ).replaceAll("__DB_IDENT__", "main"),
    );
    let baseline = "";
    for (const category of ["tables", "fields", "indexes", "functions", "events", "access"]) {
      const files = [];
      for await (const f of Deno.readDir(root + `db/definitions/${category}`)) {
        if (f.isFile && f.name.endsWith(".surql")) files.push(f.name);
      }
      for (const name of files.sort()) {
        baseline += "\n" + await Deno.readTextFile(root + `db/definitions/${category}/${name}`);
      }
    }
    const checksum = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(baseline))),
      (x) => x.toString(16).padStart(2, "0"),
    ).join("");
    const apply = await Deno.readTextFile(root + "db/operations/apply.surql");
    await this.sql(
      apply.replaceAll("__BODY__", baseline).replaceAll(
        "__VERSION__",
        JSON.stringify("0001-baseline"),
      ).replaceAll("__CHECKSUM__", JSON.stringify(checksum)),
    );
    await this.sql(await Deno.readTextFile(root + "db/seeds/test.surql"));
    await this.sql(
      `DEFINE USER engine ON DATABASE PASSWORD ${
        JSON.stringify(this.env.YESSYFY_DB_PASSWORD)
      } ROLES EDITOR;`,
    );
  }
  async raw(op: string, input: unknown = {}, token?: string) {
    const response = await fetch(this.origin + "/client/operations/" + op, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: "Bearer " + token } : {}),
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(15000),
    });
    return { status: response.status, body: await response.json() };
  }
  async call(op: Operation, input: unknown = {}, token?: string) {
    const r = await this.raw(op, input, token);
    assert(r.status === 200, `${op}: ${r.status} ${JSON.stringify(r.body)}`);
    validateResult(op, r.body);
    return r.body;
  }
  async command(op: Operation, payload: unknown, token: string, revision?: number, key = id()) {
    return await this.call(op, {
      request_key: key,
      ...(revision === undefined ? {} : { expected_revision: revision }),
      payload,
    }, token);
  }
  async login(phone: string) {
    const c = await this.call("requestOtp", { phone });
    const path = this.directory + `/artifacts/product/otp-spool/${c.challenge_id}.json`;
    let code = "";
    for (let i = 0; i < 100; i++) {
      try {
        code = JSON.parse(await Deno.readTextFile(path)).code;
        break;
      } catch { /* worker */ }
      await sleep(100);
    }
    assert(code, "OTP was not spooled");
    return this.call("verifyOtp", { challenge_id: c.challenge_id, code });
  }
  async signature(bytes: Uint8Array, at: string) {
    const secret = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(this.providerKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const prefix = new TextEncoder().encode(at + ".");
    const data = new Uint8Array(prefix.length + bytes.length);
    data.set(prefix);
    data.set(bytes, prefix.length);
    const mac = new Uint8Array(await crypto.subtle.sign("HMAC", secret, data));
    return btoa(String.fromCharCode(...mac)).replaceAll("+", "-").replaceAll("/", "_").replaceAll(
      "=",
      "",
    );
  }
  async callback(body: unknown) {
    const bytes = new TextEncoder().encode(JSON.stringify(body));
    const at = String(Math.floor(Date.now() / 1000));
    const response = await fetch(this.origin + "/providers/events", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-yessyfy-timestamp": at,
        "x-yessyfy-signature": await this.signature(bytes, at),
      },
      body: bytes,
    });
    return { status: response.status, body: await response.json() };
  }
}
