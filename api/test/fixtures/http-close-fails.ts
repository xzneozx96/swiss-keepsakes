import { Server } from 'node:http'

// Preloaded by integration/main.test.ts: closing the HTTP server closes it but reports an error.
const close = Server.prototype.close
Server.prototype.close = function (this: Server, callback?: (error?: Error) => void) {
  close.call(this)
  callback?.(new Error('close failed'))
  return this
}
