import { assert } from "./helpers/runtime.ts";
Deno.test("client contract, capability registry and Brand bundle stay in sync", async () => {
  const base = new URL("../", import.meta.url);
  const spec = JSON.parse(
    await Deno.readTextFile(new URL("config/contracts/yessyfy/operations.json", base)),
  );
  const source = await Deno.readTextFile(new URL("engine/src/service/product/mod.rs", base));
  const block = source.split("pub const OPERATIONS:")[1].split("];", 1)[0];
  const operations = [...block.matchAll(/"(\w+)"/g)].map((m) => m[1]);
  assert(
    spec.version === "YESSYFY-CLIENT/1" && operations.length === 51 &&
      JSON.stringify(operations) === JSON.stringify(spec.operations),
  );
  const serverDto = await Deno.readTextFile(new URL("config/contracts/yessyfy/contracts.ts", base));
  const clientDto = await Deno.readTextFile(
    new URL("../client/sdk/core/src/product/contracts.ts", base),
  );
  assert(serverDto === clientDto, "client/server contract drift");
  const docs = new URL("engine/documents/", base);
  const manifest = JSON.parse(await Deno.readTextFile(new URL("bundle-manifest.json", docs)));
  assert(manifest.brand_version === "0.0.1" && manifest.schema === "brand.render/1");
  for (const [name, expected] of Object.entries(manifest.files)) {
    assert(!name.startsWith("/") && !name.includes("..") && !name.includes("\\"));
    const bytes = await Deno.readFile(new URL(name, docs));
    const digest = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (v) => v.toString(16).padStart(2, "0"),
    ).join("");
    assert(digest === expected, name);
  }
});
