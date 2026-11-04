import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

// The demo catalog (seed, demo client, query hooks) is read by other screens that later stories move to the API.
const DEMO_CATALOG = /catalog\/seed|catalog\/victorinox|catalog\/categories|catalog\/api\/(queries|demo-client|client)|\/queries'|use-product-card|use-gift-detail|use-product-reviews|useProducts|useDemoNow|data-client\/(?!api-transport|errors)/

describe('[E6.4][AC52] AC-6 the keepsake list and page read only the API', () => {
  it('their files import nothing from the demo seed, the demo catalog hooks or a mock hook', () => {
    const files = [
      'src/routes/_guest/$lang/gifts/index.tsx',
      'src/routes/_guest/$lang/gifts/$slug.tsx',
      'src/features/catalog/api/keepsake.ts',
      'src/features/catalog/api/keepsakes.ts',
      'src/features/catalog/hooks/use-keepsake-detail.ts',
      'src/features/catalog/lib/keepsake-page.ts',
      'src/features/catalog/lib/keepsake-card.ts',
      'src/features/catalog/components/gift-detail.tsx',
      'src/features/catalog/components/gift-list.tsx',
    ]

    for (const file of files) {
      const imports = read(file).split('\n').filter(line => /^\s*(?:import|\} from)\b/.test(line)).join('\n')

      expect(imports, file).not.toMatch(DEMO_CATALOG)
    }
  })

  it('the demo keepsake page hook and the demo cart toast are gone', () => {
    const hooks = readdirSync(join(process.cwd(), 'src/features/catalog/hooks'))
    const lib = readdirSync(join(process.cwd(), 'src/features/catalog/lib'))

    expect(hooks).not.toContain('use-gift-detail.ts')
    expect(lib).not.toContain('cart-toast.ts')
  })
})
