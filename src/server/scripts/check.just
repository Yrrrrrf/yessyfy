fmt:
    cargo fmt --manifest-path engine/Cargo.toml
    deno fmt --config tests/deno.json tests

fmt-check:
    cargo fmt --manifest-path engine/Cargo.toml --check
    deno fmt --check --config tests/deno.json tests

lint:
    cargo clippy --locked --manifest-path engine/Cargo.toml --all-targets -- -D warnings
    deno lint --config tests/deno.json tests
types:
    cargo check --locked --manifest-path engine/Cargo.toml --all-targets
    deno check --config tests/deno.json --frozen ...(glob 'tests/**/*_test.ts')
contracts:
    deno test --config tests/deno.json --frozen --allow-read --allow-run --allow-env tests/contracts_test.ts
audit:
    cargo audit --file engine/Cargo.lock
    deno audit --config tests/deno.json --frozen
check: fmt-check lint types contracts audit
# Tests finish before checks; build follows CI without recursive test/build dependencies.
ci: test-unit test check
build: ci
    just _images dev
