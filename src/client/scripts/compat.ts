import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

/** Locate the installed native compiler without patching dependency sources. */
export function ensureNodeCompat(): void {
  if (Deno.env.get("TSGO_BIN")) return;
  const platform = Deno.build.os === "windows" ? "win32" : Deno.build.os;
  const architecture = Deno.build.arch === "x86_64"
    ? "x64"
    : Deno.build.arch === "aarch64"
    ? "arm64"
    : Deno.build.arch;
  const require = createRequire(import.meta.url);
  const preview = require.resolve("@typescript/native-preview/package.json");
  const nativeRequire = createRequire(preview);
  const native = nativeRequire.resolve(
    `@typescript/native-preview-${platform}-${architecture}/package.json`,
  );
  const binary = resolve(
    dirname(native),
    "lib",
    platform === "win32" ? "tsgo.exe" : "tsgo",
  );
  if (!Deno.statSync(binary).isFile) {
    throw new Error("Native TypeScript compiler is missing");
  }
  Deno.env.set("TSGO_BIN", binary);
}

if (import.meta.main) {
  ensureNodeCompat();
  const args = Deno.args[0] === "--" ? Deno.args.slice(1) : Deno.args;
  if (args.length) {
    const status = await new Deno.Command(args[0], {
      args: args.slice(1),
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    }).spawn().status;
    Deno.exit(status.code);
  }
}
