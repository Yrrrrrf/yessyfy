# Server stack components are started individually in development mode (e.g. `just server::db::run`, `just server::engine::run`, etc.).
[doc('Run development environment (pass -A or --all to run all apps)')]
[group('dev')]
run *flags:
    just client::run {{ flags }}

[doc('Run development environment (alias for run)')]
[group('dev')]
dev *flags:
    just client::dev {{ flags }}

[doc('Build all namespaces (pass -A or --all for all apps)')]
[group('dev')]
build *flags:
    just client::build {{ flags }}
    just server::build
    just cli::build

[doc('Clear cache. Remove and reinstall dependencies')]
[group('dev')]
prepare: client::prepare server::prepare cli::prepare

[doc('Use the pi agent to create an skill based on the pkg')]
[group('ai')]
create-skill:
    #!/usr/bin/env nu
    # todo: Use the pi command -p to pass a prompt for the agent to use azathoth then create the skills for the current pkg!
    uvx azathoth ingest .  # this creates a new file with the content of the current repo! :D
    # then this project must handle the pipeline to create the skill from this new file.
    deno run -A npm:@earendil-works/pi-coding-agent -p "prompt"
