# Test the pure contracts/adapters and the compiled Svelte state/UI projects.
[doc('Run SDK contracts, adapters, and Svelte unit tests')]
[group('test')]
[positional-arguments]
test *flags:
    ^deno test --allow-all sdk/core/src sdk/api/src
    ^{{ CLI }} exec {{ flags }} --title TEST -- deno run -A npm:vitest run --config config/vitest.config.ts

[doc('Svelte test coverage')]
[group('test')]
[positional-arguments]
coverage *flags:
    ^deno run -A npm:vitest run --coverage --config config/vitest.config.ts {{ flags }}
