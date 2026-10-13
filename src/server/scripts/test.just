# Real Rust/SurrealDB/Typst processes with isolated retained storage.
[script]
test category="all":
    def main [category: string] {
        if $category =~ '(^/|\.\.|[^a-zA-Z0-9_/-])' { error make {msg: "invalid test category"} }
        let path = if $category == all {"tests"} else {$"tests/($category)"}
        if not ($path | path exists) { error make {msg: "unknown test category"} }
        ^cargo build --locked --manifest-path engine/Cargo.toml
        ^cargo build --locked --manifest-path engine/Cargo.toml --examples
        ^deno test --config tests/deno.json --frozen --allow-read --allow-write=.state --allow-env --allow-net=127.0.0.1 --allow-run $path
    }

test-unit:
    cargo test --locked --manifest-path engine/Cargo.toml

test-native: test-unit
    just test product
