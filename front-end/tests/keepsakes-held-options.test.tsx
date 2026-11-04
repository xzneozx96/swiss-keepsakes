import type { Call } from './keepsakes-harness'

import { createBrowserHistory } from '@tanstack/react-router'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { list, listItem, product, productId, renderKeepsakes, setUpHarness, state, storeId, variantId, writes } from './keepsakes-harness'

vi.hoisted(() => vi.stubEnv('VITE_API_ENABLED', 'true'))

afterEach(() => vi.restoreAllMocks())

const base = `/api/store/${storeId}/products`
const detail = `${base}/${productId}`
const SLOW = { timeout: 8000 }
const id = (n: number) => `0198a000-0000-7000-8000-0000000000${n.toString(16).padStart(2, '0')}`

interface Variant { id: string, skuCode: string | null, mediaId: string | null, photo: object | null, priceRappen: number, status: 'published' | 'draft' | 'archived', values: Record<string, string> }
interface OptionBody { ref: string, name: { en?: string, de?: string }, values: { ref: string, label: { en?: string, de?: string } }[] }
interface OptionsPut { options: OptionBody[], variantValues?: { variantId: string, values: Record<string, string> }[], newVariants?: { skuCode: string | null, mediaId?: string | null, priceRappen: number, values: Record<string, string> }[] }

let current: ReturnType<typeof product>
let madeIds = 0

/** A small fake of the keepsake API: reads answer with `current`; the options save builds the keepsake the way the API does. */
function serve(extra: (call: Call) => Response | undefined = () => undefined) {
  state.answer = (call) => {
    const custom = extra(call)

    if (custom)
      return custom
    if (call.method === 'GET' && call.path === detail)
      return Response.json(current)
    if (call.method === 'GET' && call.path === base)
      return Response.json(list([listItem()]))
    if (call.method === 'PUT' && call.path === `${detail}/options`) {
      const body = call.body as OptionsPut
      const known = new Set(current.options.flatMap(option => [option.id, ...option.values.map(value => value.id)]))
      const ids = new Map<string, string>()
      const saved = (ref: string) => {
        if (!known.has(ref) && !ids.has(ref))
          ids.set(ref, id(0x40 + madeIds++))

        return ids.get(ref) ?? ref
      }
      const options = body.options.map(option => ({ id: saved(option.ref), name: option.name, values: option.values.map(value => ({ id: saved(value.ref), label: value.label })) }))
      const remap = (values: Record<string, string>) => Object.fromEntries(Object.entries(values).map(([option, value]) => [saved(option), saved(value)]))
      const variants: Variant[] = [
        ...current.variants.map(variant => ({ ...variant, values: { ...variant.values, ...remap(body.variantValues?.find(row => row.variantId === variant.id)?.values ?? {}) } })),
        ...(body.newVariants ?? []).map((row, index) => ({ id: id(0xE0 + current.variants.length + index), skuCode: row.skuCode, mediaId: null, photo: null, priceRappen: row.priceRappen, status: 'published' as const, values: remap(row.values) })),
      ]

      current = product({ ...current, options, variants, rowVersion: current.rowVersion + 1 })

      return Response.json(current)
    }

    return undefined
  }
}

beforeEach(async () => {
  madeIds = 0
  current = product()
  await setUpHarness()
  serve()
})

async function openStep() {
  renderKeepsakes(`/store/products/${productId}?step=options`)
  await screen.findByRole('region', { name: 'Options' }, SLOW)
}

const optionsBlock = () => screen.getByRole('region', { name: 'Options' })
const variantsBlock = () => screen.getByRole('region', { name: 'Variants' })
const rows = () => within(variantsBlock()).getAllByTestId('variant-row')
const puts = () => writes().filter(call => call.method === 'PUT')
const patches = () => writes().filter(call => call.method === 'PATCH')
const done = () => userEvent.click(within(optionsBlock()).getByRole('button', { name: 'Done' }))
const next = () => userEvent.click(screen.getByRole('button', { name: 'Next' }))

async function startOption(name: string, values: string[]) {
  await userEvent.click(screen.getAllByRole('button', { name: /^Add (another )?option$/ })[0]!)
  await userEvent.type(await screen.findByLabelText('Option name in English', { selector: 'input' }), name)
  for (const value of values)
    await userEvent.type(screen.getByLabelText(/^Add values to/), value)
}

describe('[T-018][AC1] Done holds the option in the browser', () => {
  it('[T-018][AC1] Done folds the option with no request, the rows to come show, and the bar says Unsaved changes', async () => {
    await openStep()
    await startOption('Size', ['XS', 'S', 'M'])
    await done()

    expect(await within(optionsBlock()).findByTestId('option-row')).toHaveTextContent('XSSM')
    await waitFor(() => expect(rows()).toHaveLength(3))
    expect(screen.queryByRole('region', { name: 'Price' })).not.toBeInTheDocument()
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })

  it('[T-018][AC1] Add another option runs Done at once with no request and opens the next option', async () => {
    await openStep()
    await startOption('Size', ['XS', 'S'])
    await userEvent.click(within(optionsBlock()).getByRole('button', { name: 'Add another option' }))

    expect(await within(optionsBlock()).findByTestId('option-row')).toHaveTextContent('Size')
    expect(await screen.findAllByLabelText('Option name in English', { selector: 'input' })).toHaveLength(1)
    expect(writes()).toHaveLength(0)
  })
})

describe('[T-018][AC2] one save when the merchant leaves the step', () => {
  it('[T-018][AC2] Next sends exactly one options request with the combinations, then opens Review', async () => {
    await openStep()
    await startOption('Size', ['XS', 'S', 'M'])
    await done()
    await waitFor(() => expect(rows()).toHaveLength(3))
    await next()

    expect(await screen.findByTestId('review-screen', undefined, SLOW)).toBeInTheDocument()
    expect(puts()).toHaveLength(1)
    expect(writes()).toHaveLength(1)
    const body = puts()[0]!.body as OptionsPut
    const [ref] = body.options

    expect(puts()[0]).toMatchObject({ path: `${detail}/options`, ifMatch: '1' })
    expect(body.variantValues).toEqual([{ variantId, values: { [ref!.ref]: ref!.values[0]!.ref } }])
    expect(body.newVariants).toEqual([
      { skuCode: 'VX-1-S', mediaId: null, priceRappen: 3900, values: { [ref!.ref]: ref!.values[1]!.ref } },
      { skuCode: 'VX-1-M', mediaId: null, priceRappen: 3900, values: { [ref!.ref]: ref!.values[2]!.ref } },
    ])
  })

  it('[T-018][AC2] Back to Details and a jump in the step list save the same way', async () => {
    await openStep()
    await startOption('Size', ['XS', 'S'])
    await done()
    expect(writes()).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Previous step' }))

    expect(await screen.findByRole('region', { name: 'Name and text' })).toBeVisible()
    expect(puts()).toHaveLength(1)
    // Saved: nothing is held any more, so leaving the step again sends nothing.
    await next()
    await screen.findByRole('region', { name: 'Options' })
    await next()
    await screen.findByTestId('review-screen', undefined, SLOW)
    expect(puts()).toHaveLength(1)
  })

  it('[T-018] a new value on an option that was there and a new option, done one after the other, save together with every combination', async () => {
    const optSize = id(0xC1)
    const [xs, s] = [id(0xC2), id(0xD2)]

    current = product({
      options: [{ id: optSize, name: { en: 'Size' }, values: [{ id: xs, label: { en: 'XS' } }, { id: s, label: { en: 'S' } }] }],
      variants: [xs, s].map((value, index) => ({ id: id(0xA0 + index), skuCode: null, mediaId: null, photo: null, priceRappen: 4000, status: 'published' as const, values: { [optSize]: value } })),
    })
    serve()
    await openStep()
    await userEvent.click(within(optionsBlock()).getByRole('button', { name: /^Edit / }))
    await userEvent.type(screen.getByLabelText(/^Add values to/), 'M')
    await done()
    await waitFor(() => expect(rows()).toHaveLength(3))
    await startOption('Colour', ['Red', 'Blue'])
    await done()
    await waitFor(() => expect(rows()).toHaveLength(6))
    expect(writes()).toHaveLength(0)
    await next()
    await screen.findByTestId('review-screen', undefined, SLOW)

    const body = puts()[0]!.body as OptionsPut
    const colour = body.options[1]!

    expect(puts()).toHaveLength(1)
    // The two saved variants take Red; M x Red, and Blue for each of the three sizes, are new.
    expect(body.variantValues).toHaveLength(2)
    expect(body.newVariants).toHaveLength(4)
    expect(body.newVariants!.filter(made => made.values[colour.ref] === colour.values[0]!.ref)).toHaveLength(1)
    expect(body.newVariants!.filter(made => made.values[colour.ref] === colour.values[1]!.ref)).toHaveLength(3)
    expect(body.newVariants!.every(made => Object.keys(made.values).length === 2)).toBe(true)
  }, 20_000)

  it('[T-018] the arrow keys on an option\'s grip reorder the held options with no request; the order is saved when the step is left', async () => {
    await openStep()
    await startOption('Size', ['XS'])
    await userEvent.click(within(optionsBlock()).getByRole('button', { name: 'Add another option' }))
    await userEvent.type(await screen.findByLabelText('Option name in English', { selector: 'input' }), 'Colour')
    await userEvent.type(screen.getByLabelText(/^Add values to/), 'Red')
    await done()
    const grips = within(optionsBlock()).getAllByRole('button', { name: /^Move/ })

    grips[1]!.focus()
    await userEvent.keyboard('{ArrowUp}')
    expect(writes()).toHaveLength(0)
    await next()
    await screen.findByTestId('review-screen', undefined, SLOW)

    expect((puts()[0]!.body as OptionsPut).options.map(option => option.name.en)).toEqual(['Colour', 'Size'])
  }, 20_000)
})

describe('[T-018][AC3] a refused save stays on the step', () => {
  it('[T-018][AC3] the step stays, the option the refusal names opens with its errors, and nothing moves on', async () => {
    // The API names the option by the ref it was sent under.
    serve(call => (call.method === 'PUT'
      ? Response.json({ type: 'validation-failed', status: 422, title: 'x', instance: '/x', requestId: 'r', errors: [{ path: `options.${(call.body as OptionsPut).options[0]!.ref}`, code: 'option-name-required' }] }, { status: 422 })
      : undefined))
    await openStep()
    await startOption('Size', ['XS', 'S'])
    await done()
    await next()

    expect(await screen.findByText('Name the option in English or German.')).toBeInTheDocument()
    expect(screen.getByTestId('option-editor')).toBeInTheDocument()
    expect(screen.queryByTestId('review-screen')).not.toBeInTheDocument()
    expect(puts()).toHaveLength(1)
  })

  it('[T-018][AC3] a refusal that names no option shows in an alert on the step', async () => {
    serve(call => (call.method === 'PUT' ? Response.json({ type: 'internal-error', status: 500, title: 'x', instance: '/x', requestId: 'r' }, { status: 500 }) : undefined))
    await openStep()
    await startOption('Size', ['XS', 'S'])
    await done()
    await next()

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByTestId('review-screen')).not.toBeInTheDocument()
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
  })

  it('[T-018] Next with an option still open asks to finish it with Done and sends nothing', async () => {
    await openStep()
    await startOption('Size', ['XS', 'S'])
    await next()

    expect(await screen.findByText('Finish the option with Done first.')).toBeInTheDocument()
    expect(screen.queryByTestId('review-screen')).not.toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })
})

describe('[T-018][AC4] leaving the editor with held options', () => {
  it('[T-018][AC4] asks first; Keep editing sends nothing; Save and leave saves the options, then goes to the list', async () => {
    await openStep()
    await startOption('Size', ['XS', 'S'])
    await done()
    await userEvent.click(screen.getByRole('button', { name: 'Back to Keepsakes' }))
    const dialog = await screen.findByRole('alertdialog')

    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(writes()).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Back to Keepsakes' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Save and leave' }))

    expect(await screen.findByTestId('keepsake-list')).toBeInTheDocument()
    expect(puts()).toHaveLength(1)
    expect((puts()[0]!.body as OptionsPut).newVariants).toHaveLength(1)
  })

  it('[T-018][AC4] a refused save keeps the merchant in the editor', async () => {
    serve(call => (call.method === 'PUT' ? Response.json({ type: 'internal-error', status: 500, title: 'x', instance: '/x', requestId: 'r' }, { status: 500 }) : undefined))
    await openStep()
    await startOption('Size', ['XS', 'S'])
    await done()
    await userEvent.click(screen.getByRole('button', { name: 'Back to Keepsakes' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Save and leave' }))

    await waitFor(() => expect(puts()).toHaveLength(1))
    expect(screen.queryByTestId('keepsake-list')).not.toBeInTheDocument()
    expect(screen.getByTestId('keepsake-editor')).toBeInTheDocument()
  })
})

describe('[T-019][AC0] leaving the held options by any route', () => {
  it('[T-019][AC0] the dialog says that the changes are saved on leaving', async () => {
    await openStep()
    await startOption('Size', ['XS', 'S'])
    await done()
    await userEvent.click(screen.getByRole('button', { name: 'Back to Keepsakes' }))
    const dialog = await screen.findByRole('alertdialog')

    expect(dialog).toHaveTextContent('Save your changes?')
    expect(dialog).toHaveTextContent('Your changes are saved when you leave.')
    expect(within(dialog).queryByText(/lost/)).not.toBeInTheDocument()
  })

  it('[T-019][AC0] a link to another page asks first; Keep editing stays; Save and leave sends one save, then goes', async () => {
    await openStep()
    const router = state.router!

    await startOption('Size', ['XS', 'S'])
    await done()
    void router.navigate({ to: '/store/products' })
    const dialog = await screen.findByRole('alertdialog')

    expect(screen.queryByTestId('keepsake-list')).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep editing' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(writes()).toHaveLength(0)
    void router.navigate({ to: '/store/products' })
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Save and leave' }))

    expect(await screen.findByTestId('keepsake-list')).toBeInTheDocument()
    expect(puts()).toHaveLength(1)
  })

  it('[T-019][AC0] browser Back asks first', async () => {
    // Only the browser's history is asked about a Back; the memory history of the other tests runs the blocker for links only.
    const router = renderKeepsakes('/store/products', createBrowserHistory())

    await screen.findByTestId('keepsake-list', undefined, SLOW)
    await router.navigate({ to: '/store/products/$productId', params: { productId }, search: { step: 'options' } })
    await screen.findByRole('region', { name: 'Options' }, SLOW)
    await startOption('Size', ['XS', 'S'])
    await done()
    window.history.back()

    expect(await screen.findByRole('alertdialog')).toHaveTextContent('Save your changes?')
    expect(screen.queryByTestId('keepsake-list')).not.toBeInTheDocument()
  })

  it('[T-019][AC0] changing the step of the editor asks nothing from the blocker', async () => {
    await openStep()
    await startOption('Size', ['XS', 'S'])
    await done()
    await next()

    expect(await screen.findByTestId('review-screen', undefined, SLOW)).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('[T-019][AC0] closing the tab with held options asks the browser; with nothing held it does not', { timeout: 20_000 }, async () => {
    const router = renderKeepsakes('/store/products', createBrowserHistory())

    await screen.findByTestId('keepsake-list', undefined, SLOW)
    await router.navigate({ to: '/store/products/$productId', params: { productId }, search: { step: 'options' } })
    await screen.findByRole('region', { name: 'Options' }, SLOW)
    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true })

      window.dispatchEvent(event)

      return event.defaultPrevented
    }

    expect(unload()).toBe(false)
    await startOption('Size', ['XS', 'S'])
    await done()
    await waitFor(() => expect(unload()).toBe(true))
  })

  it('[T-019][AC0] Save and leave finishes an open option first and saves it with the rest', async () => {
    await openStep()
    await startOption('Size', ['XS', 'S'])
    await userEvent.click(screen.getByRole('button', { name: 'Back to Keepsakes' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Save and leave' }))

    expect(await screen.findByTestId('keepsake-list', undefined, SLOW)).toBeInTheDocument()
    expect(puts()).toHaveLength(1)
    expect((puts()[0]!.body as OptionsPut).newVariants).toHaveLength(1)
    expect((puts()[0]!.body as OptionsPut).options[0]!.values).toHaveLength(2)
  })

  it('[T-019][AC0] a Done that is refused keeps the merchant on the open option with its errors', async () => {
    await openStep()
    await startOption('Size', [])
    // The name field's suggestions are open and hide the page from the roles; Escape closes them.
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Back to Keepsakes' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Save and leave' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.getByTestId('keepsake-editor')).toBeInTheDocument()
    expect(within(optionsBlock()).getByRole('button', { name: 'Done' })).toBeInTheDocument()
    expect(writes()).toHaveLength(0)
  })
})

describe('[T-018][AC5][AC6] rows to come', () => {
  it('[T-019][AC2] the Delete icon of a row to come removes it with no request, and its combination is Not sold', async () => {
    await openStep()
    await startOption('Size', ['XS', 'S'])
    await done()
    // The saved variant takes XS; S is the row to come.
    await waitFor(() => expect(rows()).toHaveLength(2))
    await userEvent.click(within(rows()[1]!).getByRole('button', { name: 'Delete S' }))
    const dialog = await screen.findByRole('alertdialog')

    expect(dialog).toHaveTextContent('Remove S?')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove variant' }))

    await waitFor(() => expect(rows()).toHaveLength(1))
    expect(await screen.findByTestId('not-sold')).toHaveTextContent('Not sold: 1')
    expect(writes()).toHaveLength(0)
  })

  it('[T-018][AC5] removing rows to come and adding them back sends no archive, and the save carries the rows that are left', async () => {
    await openStep()
    await startOption('Size', ['XS', 'S', 'M'])
    await done()
    await waitFor(() => expect(rows()).toHaveLength(3))
    await userEvent.click(within(variantsBlock()).getByRole('checkbox', { name: 'Select M' }))
    await userEvent.click(within(screen.getByRole('toolbar')).getByRole('button', { name: 'Remove variant' }))
    await userEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Remove variant' }))
    await waitFor(() => expect(rows()).toHaveLength(2))
    expect(await screen.findByTestId('not-sold')).toHaveTextContent('Not sold: 1')
    await userEvent.click(within(screen.getByTestId('not-sold')).getByRole('button', { name: 'Add back' }))
    await waitFor(() => expect(rows()).toHaveLength(3))
    expect(screen.queryByTestId('not-sold')).not.toBeInTheDocument()
    expect(writes()).toHaveLength(0)
    await next()
    await screen.findByTestId('review-screen', undefined, SLOW)

    expect(patches()).toHaveLength(0)
    expect((puts()[0]!.body as OptionsPut).newVariants).toHaveLength(2)
    expect(JSON.stringify(puts()[0]!.body)).not.toContain('archived')
  })

  it('[T-018][AC6] the price set on a row to come goes into the save; a row to come has no For sale or Hidden', async () => {
    await openStep()
    await startOption('Size', ['XS', 'S'])
    await done()
    await waitFor(() => expect(rows()).toHaveLength(2))
    const price = within(variantsBlock()).getByLabelText('Price of S, CHF')

    await userEvent.clear(price)
    await userEvent.type(price, '45')
    await userEvent.tab()
    expect(writes()).toHaveLength(0)
    await userEvent.click(within(variantsBlock()).getByRole('checkbox', { name: 'Select S' }))
    expect(within(screen.getByRole('toolbar')).queryByRole('button', { name: 'Hidden' })).not.toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('toolbar')).getByRole('button', { name: 'Clear selection' }))
    await next()
    await screen.findByTestId('review-screen', undefined, SLOW)

    expect((puts()[0]!.body as OptionsPut).newVariants![0]).toMatchObject({ priceRappen: 4500 })
  })

  it('[T-018] a saved row keeps saving at once while options are held', async () => {
    await openStep()
    await startOption('Size', ['XS', 'S'])
    await done()
    await waitFor(() => expect(rows()).toHaveLength(2))
    const price = within(variantsBlock()).getByLabelText('Price of XS, CHF')

    await userEvent.clear(price)
    await userEvent.type(price, '41')
    await userEvent.tab()

    await waitFor(() => expect(patches()).toHaveLength(1))
    expect(patches()[0]).toMatchObject({ path: `${detail}/variants/${variantId}`, body: { priceRappen: 4100 } })
    expect(puts()).toHaveLength(0)
  })
})
