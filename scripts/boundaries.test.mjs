import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import tsParser from '@typescript-eslint/parser'
import { ESLint } from 'eslint'
import { beforeAll, describe, expect, it } from 'vitest'
import { zones } from '../eslint.boundaries.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixtures = join(root, 'scripts', 'fixtures', 'boundaries')

const RULE = 'boundaries/dependencies'
const DOMAIN = 'The domain may import only packages/domain'
const I18N = 'The i18n package may import only packages/i18n'
const APPLICATION = 'The application layer must not import adapters or platform code'
const PORTS = 'A ports file may import only the domain'
const COMPOSITION = 'Adapters must not import the composition root'
const MODULE = 'A module may import another module only through its index.ts'
const CONTRACT = 'The API contract may import only itself, zod and openapi-fetch'
const CONTRACT_USERS = 'Only adapters and platform code may import the API contract'

let byFile

beforeAll(async () => {
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: [{ languageOptions: { parser: tsParser } }, zones],
  })
  const results = await eslint.lintFiles([`${fixtures}/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}`])
  byFile = new Map(results.map(r => [relative(fixtures, r.filePath), r.messages]))
}, 60_000)

function expectOneError(file, message) {
  const messages = byFile.get(file)
  expect(messages, `${file} was not linted`).toBeDefined()
  expect(messages.map(m => [m.ruleId, m.message])).toEqual([[RULE, message]])
}

describe('[E1.7] layer boundary lint zones', () => {
  it('[E1.7] the domain importing react is one error', () => {
    expectOneError('packages/domain/src/orders/violates-domain-react.ts', DOMAIN)
  })

  it('[E1.7] the domain importing a front-end path is one error', () => {
    expectOneError('packages/domain/src/orders/violates-domain-front-end.ts', DOMAIN)
  })

  it('[E1.7] the domain importing the @/ alias is one error', () => {
    expectOneError('packages/domain/src/orders/violates-domain-alias.ts', DOMAIN)
  })

  it('[E1.7] the domain importing api code is one error', () => {
    expectOneError('packages/domain/src/orders/violates-domain-api.ts', DOMAIN)
  })

  it('[E1.7] the domain importing packages/i18n is one error', () => {
    expectOneError('packages/domain/src/orders/violates-domain-i18n.ts', DOMAIN)
  })

  it('[E1.7] packages/i18n importing react is one error', () => {
    expectOneError('packages/i18n/src/violates-i18n-react.ts', I18N)
  })

  it('[E1.7] packages/i18n importing a front-end path is one error', () => {
    expectOneError('packages/i18n/src/violates-i18n-front-end.ts', I18N)
  })

  it('[E1.7] an application file importing adapters is one error', () => {
    expectOneError('api/src/modules/orders/application/violates-application-adapters.ts', APPLICATION)
  })

  it('[E1.7] an application file importing platform code is one error', () => {
    expectOneError('api/src/modules/orders/application/violates-application-platform.ts', APPLICATION)
  })

  it('[E1.7] an application file importing another module application is one error', () => {
    expectOneError('api/src/modules/orders/application/violates-cross-module-application.ts', MODULE)
  })

  it('[E1.7] an adapter importing another module adapters is one error', () => {
    expectOneError('api/src/modules/orders/adapters/violates-cross-module-adapters.ts', MODULE)
  })

  it('[E1.7] a domain .tsx file importing react is one error', () => {
    expectOneError('packages/domain/src/orders/violates-domain-react-component.tsx', DOMAIN)
  })

  it('[E1.7] a domain .mjs file importing react is one error', () => {
    expectOneError('packages/domain/src/orders/violates-domain-react-script.mjs', DOMAIN)
  })

  it('[E1.7] an api .tsx file importing another module application is one error', () => {
    expectOneError('api/src/modules/catalog/application/violates-cross-module-application.tsx', MODULE)
  })

  it('[E1.7] an application file importing another module ports is one error', () => {
    expectOneError('api/src/modules/catalog/application/violates-cross-module-ports.ts', MODULE)
  })

  it('[E1.7] a ports file importing its adapters is one error', () => {
    expectOneError('api/src/modules/violates-ports-adapters/ports.ts', PORTS)
  })

  it('[E1.7] a ports file importing application code is one error', () => {
    expectOneError('api/src/modules/violates-ports-application/ports.ts', PORTS)
  })

  it('[E1.7] a ports file importing platform code is one error', () => {
    expectOneError('api/src/modules/violates-ports-platform/ports.ts', PORTS)
  })

  it('[E1.7] a ports file importing another module ports is one error', () => {
    expectOneError('api/src/modules/violates-ports-other-ports/ports.ts', MODULE)
  })

  it('[E1.7] an adapter importing the composition root is one error', () => {
    expectOneError('api/src/modules/orders/adapters/violates-adapters-composition.ts', COMPOSITION)
  })

  it('[E1.7] every other fixture, including the clean ones and a cross-module import through index.ts, has zero errors', () => {
    const others = [...byFile].filter(([file]) => !file.includes('violates-'))
    expect(others.map(([file]) => file)).toEqual(expect.arrayContaining([
      'packages/domain/src/orders/clean-domain.ts',
      'packages/i18n/src/clean-i18n.ts',
      'api/src/modules/orders/application/clean-use-case.ts',
      'api/src/modules/orders/adapters/clean-adapter.ts',
      'api/src/modules/clean-ports/ports.ts',
    ]))
    for (const [file, messages] of others)
      expect(messages, file).toEqual([])
  })
})

describe('[E1.10] the API contract zone', () => {
  it.each([
    ['another package', 'packages/api-contract/src/violates-contract-hono.ts'],
    ['a Node built-in', 'packages/api-contract/src/violates-contract-node.ts'],
    ['api code', 'packages/api-contract/src/violates-contract-api.ts'],
    ['the domain', 'packages/api-contract/src/violates-contract-domain.ts'],
    ['a front-end path', 'packages/api-contract/src/violates-contract-front-end.ts'],
  ])('[E1.10] the contract importing %s is one error', (_, file) => {
    expectOneError(file, CONTRACT)
  })

  it('[E1.10] the domain importing the contract is one error', () => {
    expectOneError('packages/domain/src/orders/violates-domain-api-contract.ts', DOMAIN)
  })

  it('[E1.10] an application file importing the contract is one error', () => {
    expectOneError('api/src/modules/orders/application/violates-application-api-contract.ts', CONTRACT_USERS)
  })

  it('[E1.10] a ports file importing the contract is one error', () => {
    expectOneError('api/src/modules/violates-ports-api-contract/ports.ts', PORTS)
  })

  it('[E1.10] the contract importing zod, openapi-fetch, its own files and generated/, and an adapter importing the contract, have zero errors', () => {
    for (const file of ['packages/api-contract/src/clean-contract.ts', 'packages/api-contract/src/support.ts', 'api/src/modules/orders/adapters/clean-contract-route.ts'])
      expect(byFile.get(file), file).toEqual([])
  })
})
