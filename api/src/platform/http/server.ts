import type { AddressInfo } from 'node:net'
import type { Logger } from 'pino'
import { serve } from '@hono/node-server'

export interface HttpServer {
  close: () => Promise<void>
}

export function startHttpServer(fetch: (request: Request) => Response | Promise<Response>, host: string, port: number, logger: Logger): Promise<HttpServer> {
  return new Promise((resolve, reject) => {
    const server = serve({ fetch, hostname: host, port }, (info: AddressInfo) => {
      logger.info({ address: info.address, port: info.port }, 'api listening')
      resolve({
        close: () => new Promise((done, fail) => server.close((error) => {
          if (error)
            return fail(error)
          logger.info('api stopped')
          done()
        })),
      })
    })
    server.once('error', reject)
  })
}
