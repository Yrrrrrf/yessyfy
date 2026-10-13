import { createServer } from "node:http";
import { FixtureService } from "./service.ts";
import {
  ClientError,
  type Operation,
} from "../../sdk/core/src/product/contracts.ts";
const port = Number(process.env.FIXTURE_PORT ?? 7777);
const service = new FixtureService(`http://127.0.0.1:${port}`);
createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  try {
    const url = new URL(req.url ?? "/", service.origin);
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(Buffer.from(c));
    const bytes = Buffer.concat(chunks);
    const input =
      bytes.length && !url.pathname.startsWith("/uploads/")
        ? JSON.parse(bytes.toString() || "{}")
        : {};
    if (url.pathname === "/health") {
      res.end("ok");
      return;
    }
    if (url.pathname === "/__test/reset") {
      service.reset();
      res.end("{}");
      return;
    }
    if (url.pathname === "/__test/expire") {
      for (const session of service.sessions.values()) session.expires = 0;
      res.end("{}");
      return;
    }
    if (url.pathname === "/__test/document") {
      const d = service.documents.find((d) => d.id === input.id);
      if (d) {
        d.status = input.status;
        d.url =
          input.status === "ready"
            ? `${service.origin}/__test/document-download`
            : undefined;
        d.error =
          input.status === "failed"
            ? "Synthetic document processing failure"
            : undefined;
      }
      res.end("{}");
      return;
    }
    if (url.pathname === "/__test/document-download") {
      res.setHeader("Content-Type", "application/pdf");
      res.end("%PDF-1.4\n% test document");
      return;
    }
    if (url.pathname === "/__test/fault") {
      service.fault = input;
      res.end("{}");
      return;
    }
    if (url.pathname === "/__test/snapshot") {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          orders: service.orders,
          offers: service.offers,
          cases: service.cases,
          receipts: service.receipts.size,
        }),
      );
      return;
    }
    if (url.pathname.startsWith("/uploads/")) {
      const asset = service.assets.get(url.pathname.split("/").at(-1)!);
      if (
        !asset ||
        url.searchParams.get("cap") !== asset.capability ||
        asset.expires < Date.now()
      )
        throw new ClientError("forbidden", "Invalid upload capability");
      service.upload(
        url.pathname.split("/").at(-1)!,
        bytes,
        String(req.headers["content-type"]),
      );
      res.end("{}");
      return;
    }
    if (url.pathname.startsWith("/assets/")) {
      const a = service.assets.get(url.pathname.split("/").at(-1)!);
      if (a && url.searchParams.get("cap") !== a.capability)
        throw new ClientError("forbidden", "Private asset capability required");
      if (!a?.bytes) throw new ClientError("not_found", "Asset unavailable");
      res.setHeader("Content-Type", a.mime);
      res.setHeader("Cache-Control", "private, no-store");
      res.end(a.bytes);
      return;
    }
    const operation = url.pathname.split("/").at(-1) as Operation;
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    const result = await service.execute(operation, input, token);
    if (service.fault.drop_operation === operation) {
      delete service.fault.drop_operation;
      req.socket.destroy();
      return;
    }
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(result));
  } catch (e) {
    const error =
      e instanceof ClientError
        ? e
        : new ClientError(
            "validation",
            e instanceof Error ? e.message : "Fixture error",
          );
    const status = {
      validation: 400,
      unauthenticated: 401,
      forbidden: 403,
      not_found: 404,
      conflict: 409,
      unavailable: 503,
      uncertain: 503,
      configuration: 400,
    }[error.kind];
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ kind: error.kind, message: error.message }));
  }
}).listen(port, "127.0.0.1", () =>
  process.stdout.write(`Test contract service listening on ${port}\n`),
);
