# Client configuration

`app.config.ts` configures both Main and Vision with SvelteKit, the static adapter, Tailwind and existing SDK aliases. Its `envDir` points to the client root so both apps share public configuration. `deployment.ts` turns those public values into the client service configuration.

The client keeps the Deno workspace and adds one root `package.json`/lockfile for reproducible standalone commands. App/package `deno.json` files and existing SDK names remain. `npm run sync` generates the SvelteKit 3 `$app/tsconfig` exports before checking either application.

`product-test.config.ts` tests the new service contract/runtime and a legacy payout regression. The former `vitest.config.ts` and sample SDK tests remain source references; the new test command does not claim to execute every legacy or server test.

See `../README.md` for setup and `../docs/CLIENT_SERVICE_CONTRACT.md` for the service adapter boundary. The uploaded snapshot omitted the shared `src/cli` dependency used by the older repository CLI; the root client npm/Deno tasks work independently of that CLI.
