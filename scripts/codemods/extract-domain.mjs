// One-off codemod for E1.2: moves the pure prototype types and rules into packages/domain
// and rewrites every import of a moved file. Run from the repo root on the E1.1 base commit:
//   node scripts/codemods/extract-domain.mjs
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import process from 'node:process'

const root = resolve(import.meta.dirname, '../..')
const src = join(root, 'front-end/src')
const domain = join(root, 'packages/domain/src')

/** Old path under front-end/src → new path under packages/domain/src. */
const MOVES = {
  'features/catalog/types.ts': 'catalog/types.ts',
  'features/catalog/lib/pickup.ts': 'catalog/pickup.ts',
  'features/catalog/lib/stock.ts': 'catalog/stock.ts',
  'features/catalog/lib/publish.ts': 'catalog/publish.ts',
  'features/reviews/lib/review.ts': 'catalog/review.ts',
  'features/merchant/products/lib/completeness.ts': 'catalog/completeness.ts',
  'features/merchant/products/lib/validation.ts': 'catalog/validation.ts',
  'features/orders/types.ts': 'orders/types.ts',
  'features/cart/types.ts': 'orders/cart.ts',
  'features/checkout/types.ts': 'orders/trip.ts',
  'features/orders/lib/selectors.ts': 'orders/selectors.ts',
  'features/orders/lib/format.ts': 'orders/format.ts',
  'features/cart/lib/group-cart.ts': 'orders/group-cart.ts',
  'features/tours/types.ts': 'bookings/types.ts',
  'features/tours/lib/selectors.ts': 'bookings/selectors.ts',
  'features/tours/booking/calendar.ts': 'bookings/calendar.ts',
  'lib/payments.ts': 'payments/duplicate.ts',
  'features/partners/types.ts': 'partners/types.ts',
  'features/reports/types.ts': 'reporting/types.ts',
  'lib/analytics.ts': 'reporting/analytics.ts',
  'features/merchant/sales/lib/periods.ts': 'reporting/periods.ts',
  'features/content/types.ts': 'content/types.ts',
  'features/requests/types.ts': 'requests/types.ts',
  'features/requests/lib/answers.ts': 'requests/answers.ts',
  'features/notifications/types.ts': 'notifications/types.ts',
  'lib/format.ts': 'shared/format.ts',
  'lib/localized.ts': 'shared/localized.ts',
  'lib/slug.ts': 'shared/slug.ts',
  'lib/rich-text.ts': 'shared/rich-text.ts',
}

const LANGUAGE_SOURCE = 'contexts/locale-context'

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)

    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

function resolveSpec(spec, from) {
  const base = spec.startsWith('@/') ? join(src, spec.slice(2)) : spec.startsWith('.') ? resolve(dirname(from), spec) : null

  if (!base)
    return null

  return [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')].find(p => existsSync(p) && statSync(p).isFile()) ?? null
}

const movedAbs = new Map(Object.entries(MOVES).map(([from, to]) => [join(src, from), to]))
const SPEC = /(from\s+|import\(\s*|vi\.mock\(\s*)'([^']+)'/g

function rewrite(text, file, replace) {
  return text.replace(SPEC, (whole, lead, spec) => {
    const next = replace(spec, resolveSpec(spec, file))

    return next ? `${lead}'${next}'` : whole
  })
}

const frontFiles = [...walk(src), ...walk(join(root, 'front-end/tests'))].filter(f => /\.tsx?$/.test(f) && !f.endsWith('routeTree.gen.ts'))
const edits = new Map()

for (const file of frontFiles) {
  const text = readFileSync(file, 'utf8')
  const isMoved = movedAbs.has(file)
  const next = rewrite(text, file, (spec, target) => {
    if (isMoved) {
      const newFile = join(domain, movedAbs.get(file))

      if (spec === `@/${LANGUAGE_SOURCE}`) {
        const rel = relative(dirname(newFile), join(domain, 'shared/language'))

        return rel.startsWith('.') ? rel : `./${rel}`
      }
      if (!target || !movedAbs.has(target))
        throw new Error(`${file} imports ${spec}, which is not moved`)
      const rel = relative(dirname(newFile), join(domain, movedAbs.get(target)).replace(/\.ts$/, ''))

      return rel.startsWith('.') ? rel : `./${rel}`
    }
    if (target && movedAbs.has(target))
      return `@sk/domain/${movedAbs.get(target).split('/')[0]}`

    return null
  })

  edits.set(file, next)
}

for (const [oldRel, newRel] of Object.entries(MOVES)) {
  const to = join(domain, newRel)

  mkdirSync(dirname(to), { recursive: true })
  execFileSync('git', ['mv', join(src, oldRel), to], { cwd: root })
}
for (const [file, text] of edits) {
  const target = movedAbs.has(file) ? join(domain, movedAbs.get(file)) : file

  writeFileSync(target, text)
}
console.log(`moved ${Object.keys(MOVES).length} files`)
