import type { Tx } from '../../../platform/db/client.ts'
import type { Localized, OptionInput, ProductOption } from '../ports.ts'
import { sql } from 'drizzle-orm'

// SQL for options, values and the values of SKUs. The deferred triggers of migration 0010 check at commit that every SKU
// has one value of every option and compute the combination key, so the order of these statements does not matter.

// Only the languages that have text: product_options_name_check wants a key, and a blank label is no label.
const labelJson = (label: Localized) => JSON.stringify({
  ...(label.en?.trim() && { en: label.en.trim() }),
  ...(label.de?.trim() && { de: label.de.trim() }),
})

export interface WrittenOptions {
  // Ref to id, for options and values. An existing one maps to its own id.
  optionIds: Map<string, string>
  valueIds: Map<string, string>
}

// Writes the options as they should be: updates the ones that exist, inserts the new ones, and deletes the ones left out
// (the rules refused a delete that a SKU still needs). Position is the index in the list, from 1.
export async function writeOptions(tx: Tx, storeId: string, productId: string, existing: ProductOption[], options: OptionInput[], at: Date): Promise<WrittenOptions> {
  const optionIds = new Map<string, string>()
  const valueIds = new Map<string, string>()
  const existingOptions = new Map(existing.map(option => [option.id, option]))
  const keptOptions = new Set(options.map(option => option.ref))
  const keptValues = new Set(options.flatMap(option => option.values.map(value => value.ref)))

  const goneValues = existing.flatMap(option => option.values.filter(value => !keptValues.has(value.id)).map(value => value.id))
  if (goneValues.length > 0)
    await tx.execute(sql`delete from catalog.product_option_values where store_id = ${storeId} and product_id = ${productId} and id = any(${sql.param(goneValues)}::uuid[])`)
  const goneOptions = existing.filter(option => !keptOptions.has(option.id)).map(option => option.id)
  if (goneOptions.length > 0)
    await tx.execute(sql`delete from catalog.product_options where store_id = ${storeId} and product_id = ${productId} and id = any(${sql.param(goneOptions)}::uuid[])`)

  for (const [index, option] of options.entries()) {
    const position = index + 1
    const before = existingOptions.get(option.ref)

    if (before) {
      await tx.execute(sql`
        update catalog.product_options set name = ${labelJson(option.name)}::jsonb, position = ${position}, updated_at = ${at}
        where store_id = ${storeId} and product_id = ${productId} and id = ${before.id}`)
      optionIds.set(option.ref, before.id)
    }
    else {
      const inserted = await tx.execute<{ id: string }>(sql`
        insert into catalog.product_options (store_id, product_id, name, position, created_at, updated_at)
        values (${storeId}, ${productId}, ${labelJson(option.name)}::jsonb, ${position}, ${at}, ${at})
        returning id`)
      optionIds.set(option.ref, inserted.rows[0]!.id)
    }
    const optionId = optionIds.get(option.ref)!
    const existingValueIds = new Set(before?.values.map(value => value.id))
    const fresh: { ref: string, position: number, label: Localized, swatch: string | null }[] = []

    for (const [valueIndex, value] of option.values.entries()) {
      const valuePosition = valueIndex + 1

      if (existingValueIds.has(value.ref)) {
        await tx.execute(sql`
          update catalog.product_option_values set label = ${labelJson(value.label)}::jsonb, swatch = ${value.swatch}, position = ${valuePosition}, updated_at = ${at}
          where store_id = ${storeId} and product_id = ${productId} and option_id = ${optionId} and id = ${value.ref}`)
        valueIds.set(value.ref, value.ref)
      }
      else {
        fresh.push({ ref: value.ref, position: valuePosition, label: value.label, swatch: value.swatch })
      }
    }
    if (fresh.length > 0) {
      const rows = sql.join(fresh.map(value => sql`(${storeId}, ${productId}, ${optionId}, ${labelJson(value.label)}::jsonb, ${value.swatch}, ${value.position}, ${at}, ${at})`), sql`, `)
      const inserted = await tx.execute<{ id: string, position: number }>(sql`
        insert into catalog.product_option_values (store_id, product_id, option_id, label, swatch, position, created_at, updated_at)
        values ${rows} returning id, position`)
      const byPosition = new Map(inserted.rows.map(row => [row.position, row.id]))

      for (const value of fresh)
        valueIds.set(value.ref, byPosition.get(value.position)!)
    }
  }

  return { optionIds, valueIds }
}

// Gives a SKU its values, one row per option. `values` maps option ids to value ids.
export async function writeSkuValues(tx: Tx, storeId: string, productId: string, skuId: string, values: Record<string, string>): Promise<void> {
  const entries = Object.entries(values)

  if (entries.length === 0)
    return
  const rows = sql.join(entries.map(([optionId, valueId]) => sql`(${skuId}, ${optionId}, ${valueId}, ${productId}, ${storeId})`), sql`, `)

  await tx.execute(sql`insert into catalog.sku_option_values (sku_id, option_id, value_id, product_id, store_id) values ${rows}`)
}
