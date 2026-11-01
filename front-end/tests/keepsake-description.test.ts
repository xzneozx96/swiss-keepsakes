import { productCreateBodySchema, productSaveBodySchema } from '@sk/api-contract'
import { descriptionFromPlain } from '@sk/domain/content'
import { Editor } from '@tiptap/react'
import { afterEach, describe, expect, it } from 'vitest'

import { cleanDescription, descriptionsBody, isTooLong, storedDescription } from '@/features/keepsakes/lib/description-doc'
import { clearDraft, readDraft } from '@/features/keepsakes/lib/draft-storage'
import { TEXT_MAX } from '@/features/keepsakes/lib/keepsake-rules'
import { editorExtensions } from '@/features/merchant/products/components/story-editor'

const accepted = (text: unknown) => productSaveBodySchema.safeParse({ text: { en: text } }).success

describe('[DESC-rich] what the description editor makes is what the API accepts', () => {
  function made() {
    const editor = new Editor({ extensions: editorExtensions('text'), content: '<p>Hand made in <a href="https://example.ch">Lucerne</a></p><ol><li><p>one</p></li></ol><ul><li><p>two</p></li></ul>' })

    editor.commands.selectAll()
    editor.commands.toggleBold()
    editor.commands.toggleItalic()
    const json = editor.getJSON()

    editor.destroy()

    return json
  }

  it('[DESC-rich] raw Tiptap JSON carries attributes the contract refuses, and cleaning it leaves a body the API takes', () => {
    const raw = made()

    expect(accepted(raw)).toBe(false)
    expect(accepted(cleanDescription(raw))).toBe(true)
    expect(JSON.stringify(cleanDescription(raw))).toContain('"bold"')
    expect(JSON.stringify(cleanDescription(raw))).toContain('"href":"https://example.ch"')
  })

  it('[DESC-rich] the text kit has no heading, quote or photo, so a typed ## or a pasted page cannot make one', () => {
    const editor = new Editor({ extensions: editorExtensions('text'), content: '<h2>Big</h2><blockquote><p>Quote</p></blockquote><img src="x.png"><p>Rest</p>' })
    const types = JSON.stringify(editor.getJSON())

    editor.destroy()
    expect(types).not.toMatch(/heading|blockquote|image/)
    expect(accepted(cleanDescription(JSON.parse(types)))).toBe(true)
  })

  it('[DESC-rich] only the languages with words are sent, and the create body takes them', () => {
    const body = descriptionsBody({ en: descriptionFromPlain('A knife.'), de: { type: 'doc', content: [{ type: 'paragraph' }] } })

    expect(Object.keys(body)).toEqual(['en'])
    expect(productCreateBodySchema.safeParse({ name: { en: 'K' }, text: body, variants: [{ skuCode: 'K-1', priceRappen: 100 }] }).success).toBe(true)
  })

  it('[DESC-rich] more than 1200 characters of text is too long, whatever the markup', () => {
    expect(isTooLong({ en: descriptionFromPlain('a'.repeat(TEXT_MAX)), de: undefined })).toBe(false)
    expect(isTooLong({ en: undefined, de: descriptionFromPlain(`${'a'.repeat(TEXT_MAX)}\n\nb`) })).toBe(true)
  })
})

describe('[DESC-rich] a new keepsake that a browser tab kept before descriptions were rich text', () => {
  afterEach(() => clearDraft('store-1'))

  it('[DESC-rich] loads: a string becomes paragraphs, an empty string becomes no text', () => {
    sessionStorage.setItem('sk:new-keepsake:store-1', JSON.stringify({ value: { name: { en: 'Knife', de: '' }, text: { en: 'One\nTwo\n\nThree', de: '' } }, photoIds: [], commission: 0, options: [], variants: [], step: 'details', reached: 0 }))

    const draft = readDraft('store-1')

    expect(draft?.value.text.en).toEqual(descriptionFromPlain('One\nTwo\n\nThree'))
    expect(draft?.value.text.de).toBeUndefined()
    expect(draft?.value.name.en).toBe('Knife')
  })

  it('[DESC-rich] a draft that holds documents loads as they are, and a bad value is dropped, not thrown', () => {
    const doc = descriptionFromPlain('Hello')

    expect(storedDescription(doc)).toEqual(doc)
    expect(storedDescription(42)).toBeUndefined()
    expect(storedDescription({ type: 'paragraph' })).toBeUndefined()
  })
})
