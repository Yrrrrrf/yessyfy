# Client configuration

The Deno workspace retains eight members: SDK configuration, four SDK packages, Main, Vision and the minimal scaffold. `app.config.ts` and `sdk/sdk.config.ts` remain synchronous Vite factories; `aliases.ts` owns the shared SDK resolver. Main and Vision retain their inline SvelteKit configuration and static route fallback.

`deployment.ts` exports the configured local OpenHaus deployment and `createDeployment(overrides)`. It binds official SurrealDB `user_auth` record sessions to the Rust application operations. Native database and HTTP origins are chosen together. The HTTP environment uses `persist:false`, so a persisted transport choice cannot redirect only part of the application.

Configuration, endpoint defaults and Vite environment variable names are documented in `../README.md`. The exact wire contract and policy are in [H20-BINDINGS.md](H20-BINDINGS.md). Browser configuration contains neither root/database passwords nor the engine's privileged system token.

The Deno lock is generated on first installation and should be retained thereafter. Main and Vision's SvelteKit imports use the same versions. `just prepare` installs dependencies and synchronizes generated app files; it no longer purges locks. The retained `prune` command removes generated caches/dependencies/build outputs explicitly.

The Vitest configuration has explicit state, UI and minimal-scaffold projects. It compiles Svelte runes without booting application routing servers. Main and Vision are checked separately with native Svelte diagnostics and real production builds. `scripts/compat.ts` locates the installed native compiler for the child process without patching installed package implementations.

Pure/adapter Deno tests and compiled Svelte unit tests are both included in `just test`. `just types` preserves the existing matrix and runs it through the native compiler helper. Other scaffold quality commands remain available, but full `just ci`, Biome/Fallow gates and deployment audits were not claimed passed in this pairing run. Lint failures propagate; the hosting command cannot report a publish that it did not perform.

No incremental application migrations are required by this client. The paired server's full initial definitions contain all current application tables, access rules, functions and events. Existing database upgrades require an explicitly planned later schema policy, not a hidden client-side write path.
