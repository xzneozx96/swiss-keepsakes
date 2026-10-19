import type { DestinationStream, Logger } from 'pino'
import type { Config } from './config.ts'
import { pino } from 'pino'

// Architecture section 13: logs never hold emails, phone numbers, tokens or engraving text.
// Redaction is the safety net for a field logged by mistake: these keys at the top level, one and two
// levels down, and in arrays of objects at the top level or one level down. Anything deeper is not covered.
const sensitiveKeys = [
  'email',
  'guestEmail',
  'phone',
  'phoneNumber',
  'token',
  'accessToken',
  'refreshToken',
  'password',
  'authorization',
  'Authorization',
  'cookie',
  'Cookie',
  'engraving',
  'engravingText',
]
const redactPaths = sensitiveKeys.flatMap(key => [key, `*.${key}`, `*.*.${key}`, `*[*].${key}`, `*.*[*].${key}`])

const stackFrame = /^\s+at /

interface SerializedError {
  type: string
  code?: unknown
  constraint?: unknown
  table?: unknown
  stack?: string
  cause?: SerializedError
}

// An error's message and enumerable fields can quote the data that failed, such as a pg `detail` or a
// Drizzle `params:` list, so errors are logged through an allow-list. The stack keeps only its `at` frames.
function serializeError(error: unknown, depth = 0): SerializedError {
  if (!(error instanceof Error))
    return { type: typeof error }
  const { code, constraint, table } = error as Error & Record<'code' | 'constraint' | 'table', unknown>
  return {
    type: error.constructor.name,
    code,
    constraint,
    table,
    stack: error.stack?.split('\n').filter(line => stackFrame.test(line)).join('\n'),
    cause: error.cause !== undefined && depth < 3 ? serializeError(error.cause, depth + 1) : undefined,
  }
}

export function createLogger(level: Config['LOG_LEVEL'], destination?: DestinationStream): Logger {
  const options = {
    level,
    redact: { paths: redactPaths, censor: '[redacted]' },
    serializers: { err: (error: unknown) => serializeError(error) },
  }
  return destination ? pino(options, destination) : pino(options)
}
