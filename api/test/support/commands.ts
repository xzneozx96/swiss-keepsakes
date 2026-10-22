import type { CommandDeps } from '../../src/platform/http/app.ts'

// For tests that need createApp but send no command: no Idempotency-Key check and no module routes.
export const noCommands: CommandDeps = {
  idempotency: async (_c, next) => {
    await next()
  },
  routes: [],
}
