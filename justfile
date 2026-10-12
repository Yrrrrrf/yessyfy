# GWA · Monorepo Root

import 'scripts/_shared.just'
import 'scripts/dev.just'
import 'scripts/check.just'
import 'scripts/test.just'
import 'scripts/deploy.just'

mod client 'src/client/justfile'
mod server 'src/server/server.just'
