// Runs in place of a web server's command when E2E_REUSE=1 and that server is not up (playwright.config.ts),
// so a reuse run stops at once with this message instead of starting servers and a database of its own.
import process from 'node:process'

process.stderr.write(`\nE2E_REUSE=1 but the ${process.argv[2]} is not running. Start the servers with \`pnpm e2e:servers\` in front-end/ (add --api-only to skip the demo server), or run without E2E_REUSE=1.\n\n`)
process.exit(1)
