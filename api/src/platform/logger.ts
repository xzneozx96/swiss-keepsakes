import type { DestinationStream, Logger } from 'pino'
import type { Config } from './config.ts'
import { pino } from 'pino'

// Architecture section 13: logs never hold emails, phone numbers, tokens or engraving text.
// Redaction is the safety net for a field logged by mistake, at the top level or one level down.
const sensitiveKeys = ['email', 'phone', 'token', 'accessToken', 'authorization', 'cookie', 'engraving']

export function createLogger(level: Config['LOG_LEVEL'], destination?: DestinationStream): Logger {
  const options = { level, redact: { paths: sensitiveKeys.flatMap(key => [key, `*.${key}`]), censor: '[redacted]' } }
  return destination ? pino(options, destination) : pino(options)
}
