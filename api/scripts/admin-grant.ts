import process from 'node:process'
import { Pool } from 'pg'
import { createPlatformAdminRepository } from '../src/modules/identity/adapters/platform-admin-repository.ts'
import { createUserDirectory } from '../src/modules/identity/adapters/user-directory.ts'
import { makeGrantSuperAdmin } from '../src/modules/identity/index.ts'
import { createDatabase } from '../src/platform/db/client.ts'
import { createUnitOfWork } from '../src/platform/db/unit-of-work.ts'

// `pnpm --filter @sk/api admin:grant <email>` makes the first Super Admin (docs/ops/admin-grant.md). It reads
// only DATABASE_URL_UNPOOLED from the shell and loads no env file, so it never reaches a database by accident.
// It prints the user id and never a URL or a credential.
const messages = {
  'user-not-found': 'No user has this email. The person must sign in once first, so Better Auth makes the user.',
  'already-admin': 'This user is already a Super Admin. Nothing changed.',
}

async function main(): Promise<number> {
  const [email, ...extra] = process.argv.slice(2)
  if (!email || extra.length > 0) {
    process.stderr.write('Usage: pnpm --filter @sk/api admin:grant <email>\n')
    return 2
  }
  const url = process.env.DATABASE_URL_UNPOOLED
  if (!url) {
    process.stderr.write('DATABASE_URL_UNPOOLED is not set. Set it in the shell for the database you mean.\n')
    return 2
  }
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 5_000 })
  try {
    const grant = makeGrantSuperAdmin({ uow: createUnitOfWork(createDatabase(pool)), users: createUserDirectory(), admins: createPlatformAdminRepository() })
    const result = await grant(email)
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
