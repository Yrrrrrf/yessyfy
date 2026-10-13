# Native command discovery; no separate CLI package is needed.
list:
    just --list
menu:
    just --choose

[private, script]
_environment profile="dev":
    def main [profile: string] {
        if $profile not-in [dev prod] { error make {msg: "profile must be dev or prod"} }
        mut cfg = {}
        for file in [server database] { $cfg = ($cfg | merge deep (open ($"config/($file).toml"))) }
        $cfg = ($cfg | merge deep (open ($"config/profiles/($profile).toml")))
        let project = ($env.GWA_PROJECT? | default $cfg.profile.project)
        if $project !~ '^yessyfy-(dev|prod|test-[a-z0-9-]+)$' { error make {msg: "invalid project name"} }
        if ($profile == prod and $project != yessyfy-prod) or ($profile == dev and $project == yessyfy-prod) { error make {msg: "profile/project mismatch"} }
        mut token = ($env | get -o $cfg.auth.token_env | default "")
        mut password = ($env | get -o $cfg.database.password_env | default "")
        if $profile == dev {
            if ($token | str trim | is-empty) { $token = $cfg.profile.dev_api_token }
            if ($password | str trim | is-empty) { $password = $cfg.profile.dev_db_password }
        } else {
            let dev = (open config/profiles/dev.toml).profile
            if ($token | str length) < 24 or ($password | str length) < 24 or $token == $dev.dev_api_token or $password == $dev.dev_db_password { error make {msg: "production requires explicit non-development credentials of at least 24 characters"} }
        }
        if $token =~ '[\r\n]' or $password =~ '[\r\n]' { error make {msg: "credentials cannot contain newlines"} }
        let host = ($env.GWA_HOST? | default $cfg.network.host)
        if $host not-in [127.0.0.1 localhost] { error make {msg: "published ports must remain loopback; use a TLS proxy for remote access"} }
        let dbport = ($env.GWA_DB_PORT? | default ($cfg.database.bind | split row ':' | last) | into int)
        let httpport = ($env.GWA_HTTP_PORT? | default ($cfg.server.http_bind | split row ':' | last) | into int)
        let grpcport = ($env.GWA_GRPC_PORT? | default ($cfg.server.grpc_bind | split row ':' | last) | into int)
        let ports = [$dbport $httpport $grpcport]
        if ($ports | any {|p| $p < 1 or $p > 65535 }) or ($ports | uniq | length) != 3 { error make {msg: "ports must be distinct and within 1..65535"} }
        let ns = ($env.GWA_DB_NS? | default $cfg.database.namespace)
        let database = ($env.GWA_DB_NAME? | default $cfg.database.database)
        for identifier in [$ns $database] { if $identifier !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' { error make {msg: "invalid database identifier"} } }
        let dev = (open config/profiles/dev.toml).profile
        mut product = {}
        for pair in [[YESSYFY_DB_PASSWORD dev_runtime_password] [YESSYFY_SIGNING_KEY dev_signing_key] [YESSYFY_JOB_KEY dev_job_key] [YESSYFY_PROVIDER_KEY dev_provider_key]] {
            let name = $pair.0
            let fallback = ($dev | get $pair.1)
            let value = ($env | get -o $name | default (if $profile == dev {$fallback} else {""}))
            if ($value | str length) < 32 or ($profile == prod and $value == $fallback) or $value =~ '[\r\n]' { error make {msg: $"invalid or missing ($name)"} }
            $product = ($product | insert $name $value)
        }
        let runtime_user = ($env.YESSYFY_DB_USER? | default engine)
        if $runtime_user !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' or $runtime_user == $cfg.database.user { error make {msg: "separate runtime user required"} }
        $product = ($product | insert YESSYFY_DB_USER $runtime_user)
        $cfg.application.namespace = $ns
        $cfg.application.database = $database
        $cfg.application.public_origin = ($env.YESSYFY_PUBLIC_ORIGIN? | default $"http://($host):($httpport)")
        $cfg.application.main_origin = ($env.YESSYFY_MAIN_ORIGIN? | default $cfg.application.main_origin)
        $cfg.application.vision_origin = ($env.YESSYFY_VISION_ORIGIN? | default $cfg.application.vision_origin)
        $cfg.application.otp_webhook = ($env.YESSYFY_OTP_WEBHOOK? | default $cfg.application.otp_webhook)
        $cfg.application.finance_webhook = ($env.YESSYFY_FINANCE_WEBHOOK? | default $cfg.application.finance_webhook)
        $cfg.application.fiscal_webhook = ($env.YESSYFY_FISCAL_WEBHOOK? | default $cfg.application.fiscal_webhook)
        let package = (open engine/Cargo.toml).package
        mkdir .state
        let runtime = ($".state/($project).toml" | path expand)
        $cfg | select server worker auth services profile application | to toml | save --force $runtime
        let vars = {
            GWA_PROJECT: $project, GWA_VERSION: $package.version, GWA_RUST_VERSION: $package.rust-version,
            GWA_NU_VERSION: $cfg.toolchains.nushell, GWA_DB_VERSION: $cfg.toolchains.surrealdb,
            GWA_API_TOKEN: $token, GWA_API_TOKEN_ENV: $cfg.auth.token_env, GWA_DB_PASSWORD: $password,
            GWA_DB_USER: $cfg.database.user, GWA_DB_NS: $ns, GWA_DB_NAME: $database,
            GWA_DB_BIND: $cfg.database.bind, GWA_DB_PATH: $cfg.database.path,
            GWA_DB_INTERNAL_PORT: ($cfg.database.bind | split row ':' | last),
            GWA_HTTP_INTERNAL_PORT: ($cfg.server.http_bind | split row ':' | last),
            GWA_GRPC_INTERNAL_PORT: ($cfg.server.grpc_bind | split row ':' | last),
            GWA_DB_PORT: ($dbport | into string), GWA_HTTP_PORT: ($httpport | into string), GWA_GRPC_PORT: ($grpcport | into string),
            GWA_HOST: $host, GWA_DB_URL: $"http://($host):($dbport)", GWA_HTTP_URL: $"http://($host):($httpport)", GWA_GRPC_ADDR: $"($host):($grpcport)",
            GWA_DB_VOLUME: $"($project)-database", GWA_ARTIFACT_VOLUME: $"($project)-artifacts", GWA_CONFIG: $runtime
        }
        let vars = ($vars | merge $product)
        {config: $cfg, env: $vars} | to json | save --force $".state/($project).json"
        ^chmod 600 $runtime $".state/($project).json"
    }

[private, script]
_compose profile="dev" *argv:
    def --wrapped main [profile: string, ...argv: string] {
        ^just _environment $profile
        let project = ($env.GWA_PROJECT? | default (open $"config/profiles/($profile).toml").profile.project)
        let state = (open $".state/($project).json")
        load-env $state.env
        ^podman-compose --podman-path podman -f compose.yaml -p $project ...$argv
    }

[private, script]
_images profile="dev":
    def main [profile: string] {
        ^just _environment $profile
        let project = ($env.GWA_PROJECT? | default (open $"config/profiles/($profile).toml").profile.project)
        let vars = (open $".state/($project).json").env
        let db = $"localhost/yessyfy-db:($vars.GWA_VERSION)"
        ^podman build --build-arg $"DB_VERSION=($vars.GWA_DB_VERSION)" --build-arg $"NU_VERSION=($vars.GWA_NU_VERSION)" -f db/db.Dockerfile -t $db .
        ^podman build --build-arg $"DB_IMAGE=($db)" --build-arg $"RUST_VERSION=($vars.GWA_RUST_VERSION)" -f engine/engine.Dockerfile -t $"localhost/yessyfy-engine:($vars.GWA_VERSION)" .
    }

[private, script]
_volumes profile="dev":
    def main [profile: string] {
        ^just _environment $profile
        let project = ($env.GWA_PROJECT? | default (open $"config/profiles/($profile).toml").profile.project)
        let vars = (open $".state/($project).json").env
        for volume in [$vars.GWA_DB_VOLUME $vars.GWA_ARTIFACT_VOLUME] {
            let exists = (^podman volume exists $volume | complete).exit_code == 0
            if $exists {
                let owner = (^podman volume inspect $volume | from json | first | get Labels.gwa_project?)
                if $owner != $project { error make {msg: $"refusing unowned volume ($volume)"} }
            } else { ^podman volume create --label $"gwa_project=($project)" $volume | ignore }
        }
    }

[private, script]
_reset profile="dev" recreate="yes":
    def main [profile: string, recreate: string] {
        let project = ($env.GWA_PROJECT? | default (open $"config/profiles/($profile).toml").profile.project)
        if $profile == prod and ($env.GWA_RESET_PROJECT? | default "") != $project { error make {msg: "production reset requires the explicit deploy confirmation"} }
        ^just _down $profile
        ^just _volumes $profile
        let vars = (open $".state/($project).json").env
        for volume in [$vars.GWA_DB_VOLUME $vars.GWA_ARTIFACT_VOLUME] { ^podman volume rm $volume | ignore }
        if $recreate == yes { ^just _volumes $profile }
    }

[private, script]
_up profile="dev" unit="db":
    def main [profile: string, unit: string] { ^just _volumes $profile; ^just _compose $profile up -d $unit }

[private, script]
_down profile="dev":
    def main [profile: string] { ^just _compose $profile down }

[private, script]
_ready profile="dev" unit="db":
    def main [profile: string, unit: string] {
        if $unit not-in [db engine] { error make {msg: "unknown unit"} }
        let project = ($env.GWA_PROJECT? | default (open $"config/profiles/($profile).toml").profile.project)
        let state = (open $".state/($project).json")
        let url = if $unit == db { $"($state.env.GWA_DB_URL)/health" } else { $"($state.env.GWA_HTTP_URL)/ready" }
        for attempt in 1..$state.config.database.readiness_attempts {
            let ready = (try { let reply = (http get --max-time 2sec $url); if $unit == db {true} else {$reply.ready} } catch {false})
            if $ready { return }
            sleep ($state.config.database.readiness_delay_ms | into duration --unit ms)
        }
        error make {msg: $"readiness deadline exceeded: ($unit)"}
    }

[private, script]
_sql file project params="{}":
    def main [file: string, project: string, params: string] {
        let vars = (open $".state/($project).json").env
        mut body = (open --raw $file)
        let values = ($params | from json)
        for key in ($values | columns) {
            let value = ($values | get $key)
            let rendered = if ($key | str ends-with '_IDENT') {
                if $value !~ '^[a-zA-Z_][a-zA-Z0-9_]*$' { error make {msg: "unsafe SQL identifier"} }
                $value
            } else if $key == BODY { $value } else { $value | to json --raw }
            $body = ($body | str replace --all $"__($key)__" $rendered)
        }
        if $body =~ '__[A-Z_]+__' { error make {msg: "unresolved SQL placeholders"} }
        let auth = ($"($vars.GWA_DB_USER):($vars.GWA_DB_PASSWORD)" | encode base64)
        let reply = (http post --max-time 30sec --headers {Authorization: $"Basic ($auth)", Accept: application/json, surreal-ns: $vars.GWA_DB_NS, surreal-db: $vars.GWA_DB_NAME} --content-type text/plain $"($vars.GWA_DB_URL)/sql" $body)
        let failures = ($reply | where status != OK)
        if ($failures | is-not-empty) { error make {msg: ($failures | to json --raw)} }
        $reply | to json --raw | print
    }

[private, script]
_runtime-user profile="dev":
    def main [profile: string] {
        ^just _environment $profile
        let project = ($env.GWA_PROJECT? | default (open $"config/profiles/($profile).toml").profile.project)
        let vars = (open $".state/($project).json").env
        ^just _sql db/operations/runtime-user.surql $project ({RUNTIME_IDENT: $vars.YESSYFY_DB_USER, PASSWORD: $vars.YESSYFY_DB_PASSWORD} | to json --raw) | ignore
    }
