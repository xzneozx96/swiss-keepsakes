import process from 'node:process'
import { Pool } from 'pg'
import { createPlatformAdminRepository } from '../src/modules/identity/adapters/platform-admin-repository.ts'
import { createUserDirectory } from '../src/modules/identity/adapters/user-directory.ts'
import { makeGrantSuperAdmin } from '../src/modules/identity/index.ts'
import { createDatabase } from '../src/platform/db/client.ts'
import { createUnitOfWork } from '../src/platform/db/unit-of-work.ts'

// `pnpm --filter @sk/api admin:grant <email> --database <name>` makes the first Super Admin
// (docs/ops/admin-grant.md). It reads only DATABASE_URL_UNPOOLED from the shell and loads no env file, so it
// never reaches a database by accident. It acts only when `--database` names the database it connected to, and
// it prints that database and role before it grants. It prints the user id and never a URL or a credential.
const messages = {
  'user-not-found': 'No user has this email. The person must sign in once first, so Better Auth makes the user.',
  'already-admin': 'This user is already a Super Admin. Nothing changed.',
}

const usage = 'Usage: pnpm --filter @sk/api admin:grant <email> --database <name>\n'

function parseArguments(args: string[]): { email: string, database: string } | undefined {
  const [email, flag, database, ...extra] = args
  return email && !email.startsWith('--') && flag === '--database' && database && extra.length === 0 ? { email, database } : undefined
}

async function main(): Promise<number> {
  const parsed = parseArguments(process.argv.slice(2))
  if (!parsed) {
    process.stderr.write(usage)
    return 2
  }
  const url = process.env.DATABASE_URL_UNPOOLED
  if (!url) {
    process.stderr.write('DATABASE_URL_UNPOOLED is not set. Set it in the shell for the database you mean.\n')
    return 2
  }
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5_000 })
  try {
    const { rows } = await pool.query<{ database: string, role: string }>('select current_database() as database, current_user as role')
    const target = rows[0]
    if (target?.database !== parsed.database) {
      process.stderr.write(`Refused. --database is ${parsed.database}, but DATABASE_URL_UNPOOLED connects to ${target?.database ?? 'an unknown database'}. Nothing changed.\n`)
      return 2
    }
    process.stdout.write(`Target database ${target.database}, role ${target.role}.\n`)
    const grant = makeGrantSuperAdmin({ uow: createUnitOfWork(createDatabase(pool)), users: createUserDirectory(), admins: createPlatformAdminRepository() })
    const result = await grant(parsed.email)
    if (!result.ok) {
      process.stderr.write(`${messages[result.reason]}\n`)
      return 1
    }
    process.stdout.write(`Granted Super Admin to user ${result.userId}.\n`)
    return 0
  }
  finally {
    await pool.end()
  }
}

main().then(
  (code) => {
    process.exitCode = code
  },
  (error) => {
    // The error's message can quote the connection string, so only its type and code are printed.
    const { name, code } = error as { name?: string, code?: string }
    process.stderr.write(`The grant failed: ${name ?? 'Error'}${code ? ` ${code}` : ''}\n`)
    process.exitCode = 1
  },
)
