# dev.just — run, live preview, and prepare workspace

[doc('Run an app on the dev server')]
[group('dev')]
[positional-arguments]
run *flags:
    ^{{ CLI }} exec {{ flags }} --title DEV --select one --cwd 'apps/*' -- deno run -A npm:vite dev

[doc('Prune generated dependencies and build outputs; retain the lockfile')]
[group('dev')]
[positional-arguments]
prune *flags:
    ^{{ CLI }} rm --glob '**/node_modules' '**/.svelte-kit' '**/.vite' '**/build' '**/dist' '**/paraglide' {{ flags }}

[doc('Install dependencies and sync generated app code')]
[group('dev')]
[positional-arguments]
prepare *flags:
    ^deno install
    ^{{ CLI }} exec {{ flags }} --title SYNC --select all --cwd 'apps/*' -- deno run -A npm:@sveltejs/kit/svelte-kit sync
