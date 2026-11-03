import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const PRODUCTS = join(__dirname, '..', 'src', 'features', 'merchant', 'products')
const read = (file: string) => readFileSync(join(PRODUCTS, file), 'utf8')

describe('[E6.6][AC26] the Pickup points screen no longer reads the demo store', () => {
  it.each(['components/pickup-points.tsx', 'components/pickup-point-sheet.tsx', 'components/merchant-products.tsx', 'hooks/use-pickup-points.tsx'])('%s does not use the demo savePickupPlace command', (file) => {
    expect(read(file)).not.toContain('savePickupPlace')
  })

  it('the pickup tab reads its points from the API hooks, not the demo catalog', () => {
    const hook = read('hooks/use-pickup-points.tsx')

    expect(hook).toContain('@/features/pickup/api/queries')
    expect(hook).toContain('usePickupPlaces')
    for (const file of ['components/merchant-products.tsx', 'components/pickup-points.tsx', 'hooks/use-merchant-products.ts', 'hooks/use-pickup-points.tsx'])
      expect(read(file), file).not.toMatch(/usePickupPlaces[^\n]*from '@\/features\/catalog/)
  })
})
