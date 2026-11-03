import { Label, Switch } from '@heroui/react'

import { useLocale } from '@/contexts/locale-context'

/** "This keepsake has SKU codes" (as Shopify's "This product has a SKU or barcode"): the code fields show only while it is on. */
export function SkuSwitch({ isOn, onChange }: { isOn: boolean, onChange: (on: boolean) => void }) {
  const { t } = useLocale()

  return (
    <Switch className="min-h-11 lg:min-h-9" isSelected={isOn} onChange={onChange}>
      <Switch.Content className="items-center">
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <Label className="text-sm">{t('keepsakes.sku.switch')}</Label>
      </Switch.Content>
    </Switch>
  )
}
