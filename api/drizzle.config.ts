import { defineConfig } from 'drizzle-kit'

// `pnpm db:generate` writes SQL migrations from the schema files. It needs no database.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/**/schema.ts',
  out: './migrations',
})
