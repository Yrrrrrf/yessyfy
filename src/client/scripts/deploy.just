# deploy.just — ship · build, preview, publish, and release

[doc('Run quality gate (check + test) (pass -v for detailed logs)')]
[group('ci')]
ci *flags:
    {{ CLI }} ci {{ flags }}

[doc('Build applications: deno.json -> build/ (pass -v for detailed logs, -A or --all for all apps)')]
[group('deploy')]
build *flags:
    {{ CLI }} build {{ flags }}

[doc('Preview production build (pass -v for detailed build logs, -A or --all for all apps)')]
[group('deploy')]
preview *flags:
    {{ CLI }} preview {{ flags }}

[doc('Publish build release')]
[group('deploy')]
publish *flags:
    {{ CLI }} publish {{ flags }}
