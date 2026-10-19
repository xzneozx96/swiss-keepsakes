import type { AddressInfo } from 'node:net'
import type { Logger } from 'pino'
import { serve } from '@hono/node-server'

export interface HttpServer {
  close: () => Promise<void>
}

export function startHttpServer(fetch: (request: Request) => Response | Promise<Response>, port: number, logger: Logger): Promise<HttpServer> {
  return new Promise((resolve, reject) => {
    const server = serve({ fetch, port }, (info: AddressInfo) => {
      logger.info({ port: info.port }, 'api listening')
      resolve({ close: () => new Promise((done, fail) => server.close(error => (error ? fail(error) : done()))) })
    })
    server.once('error', reject)
  })
}
