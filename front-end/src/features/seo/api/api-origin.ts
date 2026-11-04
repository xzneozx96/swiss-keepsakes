import process from 'node:process'

/** The API's internal address, for code that runs on the server. Read per call, never at module scope. */
export function serverApiOrigin(): string {
  return process.env.API_ORIGIN || process.env.API_PROXY_TARGET || 'http://127.0.0.1:5002'
}
