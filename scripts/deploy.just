[doc('Run full CI pipeline (check + test)')]
[group('deploy')]
ci: check test

[doc('Deploy application stack')]
[group('deploy')]
deploy:
    error make {msg: "Root deploy is currently blocked on the root docker-compose.yml rewrite. Please see docs/todo.md for details."}

[doc('Preview production build for applications (pass -A or --all for all apps)')]
[group('deploy')]
preview *flags:
    just client::preview {{ flags }}

[doc('Build and deploy all 3 applications to GitHub Pages (gh-pages)')]
[group('deploy')]
pages *flags:
    just client::pages {{ flags }}

[doc('Publish full release (CI + GitHub Pages deployment)')]
[group('deploy')]
publish *flags:
    just client::publish {{ flags }}

