import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { generateContract, generatedDir } from './contract.ts'

async function main() {
  const files = await generateContract()
  // Start from an empty folder, so a file the build no longer makes does not linger.
  await rm(generatedDir, { recursive: true, force: true })
  await mkdir(generatedDir)
  for (const [name, contents] of Object.entries(files))
    await writeFile(join(generatedDir, name), contents)
}

main()
