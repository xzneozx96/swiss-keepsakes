/** The words of the lab page: one note per design, in plain English. Labs are not product code, so the copy lives here. */
import type { DesignId } from './keepsake-options-data'

export interface Source { label: string, url?: string, checked: boolean }

export interface DesignNote {
  idea: string
  why: string
  sources: Source[]
  german: string
  where: string
  phone: string
  keyboard: string
  tradeoff: string
}

const medusaOptions: Source = { label: 'Medusa admin guide, product options: Title, comma-separated Values, “Organize rankings” by drag and drop', url: 'https://docs.medusajs.com/user-guide/products/options', checked: true }
const medusaVariants: Source = { label: 'Medusa admin guide, variants: the form takes a title, an optional SKU and one value per option; a variant can only be created while an option combination is still free', url: 'https://docs.medusajs.com/user-guide/products/variants', checked: true }
const shopifyAdd: Source = { label: 'Shopify Help, adding variants: option name and values, “Add another value”, Done, then Save; a manual variant can’t duplicate an existing combination; Duplicate copies a variant and asks you to change one value', url: 'https://help.shopify.com/en/manual/products/variants/add-variants', checked: true }
const woo: Source = { label: 'WooCommerce, variable products: values typed as “Medium | Large | XL”, then “Generate variations” or “Add manually”', url: 'https://woocommerce.com/document/variable-product', checked: true }
const saleor: Source = { label: 'Saleor docs, product configuration: a dropdown attribute set as a variant selection maps a variant to one value, and variants are added one by one', url: 'https://docs.saleor.io/developer/products/configuration', checked: true }
const memory = (label: string): Source => ({ label, checked: false })

export const notes: Record<DesignId, DesignNote> = {
  a1: {
    idea: 'One box to type values into. Enter or a comma makes a value, a pasted list makes several. The rows below are the order: grip, optional colour, the text, delete. Options sit in the block with thin dividers, not in boxes.',
    why: 'The owner’s Medusa reference, with the double list collapsed into one: Medusa shows the values as chips and again as ranking rows. Here the rows are the only list, so nothing is shown twice. Typing stays the fast path (12 themes in one paste).',
    sources: [medusaOptions, shopifyAdd, memory('Shopify’s empty “Add another value” row')],
    german: 'One language switch (the shared LanguageVersionSwitch) for the whole block. EN adds and edits English. DE turns the same rows into a translation list: the English text next to a German field, and a status line “2 German texts missing, English shows instead”. No doubled fields; the cost is that the two languages are never visible together on a phone.',
    where: 'Inline in the Options step (white block, ADR-027 save bar at its foot). No sheet. A save is still one write: the bar shows Discard and Save options.',
    phone: 'Rows are 44 px with the input full width. In DE the English text is hidden on a phone (the field’s placeholder shows it). The swatch picker is a popover.',
    keyboard: 'Tab to a row’s grip, ArrowUp and ArrowDown move the value and keep focus on the grip, and a live region says “Small moved to position 2 of 3”. A pointer drags the grip. Same pattern as the photo list (PhotoOrder).',
    tradeoff: 'Fast to type and to read; the German pass is a second visit. A value’s colour needs the Colours button first. Reordering is a drag handle on every row, which is heavier than chips for 3 values.',
  },
  a2: {
    idea: 'The step shows each option as one flat row (name, German name, small chips, “Used by 6 variants”, Edit, Delete). Edit opens the shared sheet with a values table: English and German side by side, an empty last row to add, Enter walks down the column.',
    why: 'Keeps today’s approved “save whole in a sheet” flow, and fixes the look: one table instead of a grey box per value, no “Value 1” titles, no two-field pairs stacked. A spreadsheet is the most familiar way to enter two translations.',
    sources: [medusaOptions, shopifyAdd, saleor, memory('A table with an empty last row for adding: the common spreadsheet pattern')],
    german: 'A second column. Both languages are always visible, “German on 2 of 3” sits in the header, and an empty German cell is the optional state. Doubles the inputs, but as one aligned column, not a second box.',
    where: 'The shared SheetFrame (bottom sheet on a phone; the product opens it as a centred dialog from 1024 px under /store). The step itself stays read only.',
    phone: 'Below 640 px each row stacks English over German next to the grip and the delete button. The header row is hidden and the placeholders say English and German (optional).',
    keyboard: 'Same grip pattern as A1 (arrows move, live region). Enter in a cell moves to the same cell of the next row, and from the last row into the empty row; leaving the empty row with text, or Enter, makes the value.',
    tradeoff: 'Clear and complete, and the sheet keeps the whole-save rule obvious. But it takes a tap to open, and the table is the widest of the three, so a phone shows two inputs per value.',
  },
  a3: {
    idea: 'Values are chips in one wrapping line. Tap a chip to open a small editor: English, German, colour (8 presets, optional), Earlier, Later, Delete. The last chip, “Add value”, becomes a field. German name of the option is behind a “German name” button.',
    why: 'The lightest picture of an option: what guests will see. Colour needs no switch, because every value can have one. An orange dot marks a value with no German, so the gap is visible without a second field.',
    sources: [shopifyAdd, medusaOptions, memory('A chip with its own editor popover: the select-option editors of Airtable and Notion')],
    german: 'Inside each chip’s editor, one German field under the English one, plus an orange dot on the chip when German is empty and a count under the chips. The option’s German name opens on demand.',
    where: 'Inline in the Options step; the editor is a popover (a bottom-anchored popover on a phone), not the sheet.',
    phone: 'Chips are 44 px high and wrap. The editor popover is 288 px wide. Reorder by touch is Earlier and Later in the editor, because a dragged chip would fight scrolling.',
    keyboard: 'A focused chip: Enter opens the editor, Alt and ArrowLeft or ArrowRight move it and keep focus, with a live region. A mouse can drag a chip (native drag; it does not work on touch). Earlier and Later in the editor are the screen-reader and touch route.',
    tradeoff: 'The most compact and the least boxy. Costs one tap per edit, hides the German text until you open a chip, and drag reorder is mouse only. Poor for 20 values with long names.',
  },
  b1: {
    idea: 'Create opens the shared sheet. A select per option in a two-column grid, a live line that says whether the combination is free, SKU and price side by side, On sale as a bordered switch row with one help line, and stock as plain text.',
    why: 'Medusa’s variant form, made stricter: it already knows the sold combinations, so the select marks a value “sold” and the status line answers before Create. The code follows the choice (VX-M-EDELWEISS) until typed over.',
    sources: [medusaVariants, shopifyAdd, saleor],
    german: 'Nothing to hold: a variant has no German text. Only the option values do, and they show in the reading language.',
    where: 'The shared SheetFrame (centred dialog from 1024 px under /store, bottom sheet on a phone), as the approved design has it.',
    phone: 'The two-column grid of selects and the code/price pair stay two columns at 343 px. Selects open as a popover list; the footer buttons are 44 px.',
    keyboard: 'A normal form: Tab through selects, code, price, the switch; Enter submits. The status line is a live region, so choosing a sold combination is announced.',
    tradeoff: 'Familiar and safe on a phone, and the live line stops a wasted Create. It still asks you to pick every option from a list each time, and it hides the other variants while open.',
  },
  b2: {
    idea: 'The combinations as a grid: option one down the side, option two across. A sold cell shows its code; a free cell is a plus. Press a free cell and the details of the new variant open under the grid. A third option becomes a chip choice above the grid; one option becomes one column.',
    why: 'Shows what is sold and what is not in one look, so a duplicate can’t be made by accident. This is the idea behind Medusa’s “only if a combination is still free”, and Shopify’s “can’t duplicate a combination”, drawn instead of explained.',
    sources: [medusaVariants, shopifyAdd, woo],
    german: 'Nothing to hold: a variant has no German text; headers use the reading language.',
    where: 'Inline in the Variants step; no sheet. The details form opens under the grid.',
    phone: 'The grid is a real table with 44 px cells and scrolls sideways inside the block past about 3 columns. The rest stacks.',
    keyboard: 'The table has row and column headers; each cell is a button named “Create Medium, Edelweiss” or “Small, Lucerne: sold as VX-S-LUCERNE”. Tab walks the cells; pressing a sold cell shows the refusal and keeps Create off.',
    tradeoff: 'The clearest picture of the sparse combinations. Grows badly with 12+ values on one option, and the sold cells show a code, not the price or stock, so it does not replace the variants table.',
  },
  b3: {
    idea: 'The variants list ends in an open row: a select per option, code, price, On sale and Add variant. Tab walks the row, Enter adds, and the row keeps the price and every option but the last, so the next variant is one choice away. The twin of a sold combination is highlighted in the list.',
    why: 'For a merchant who adds many variants in a row (a new theme in three sizes), a sheet per variant is a lot of opening and closing. This is the Shopify “Duplicate” idea (copy, change one value) turned into a row that stays.',
    sources: [shopifyAdd, saleor, woo],
    german: 'Nothing to hold: a variant has no German text.',
    where: 'Inline in the Variants step. No sheet and no page.',
    phone: 'The row becomes two columns of 44 px controls (selects in pairs, then code and price, the switch and Add full width). Long lists scroll the page, not the row.',
    keyboard: 'A form: Tab order is option selects, code, price, the switch, Add. Enter submits and focus goes to the last select. A sold combination is announced by the status line.',
    tradeoff: 'The fastest for many variants, and everything stays on one screen. The row is dense, so a first-timer has more to read at once, and an error shows under the row, not at one field.',
  },
}

export const intro = [
  'Two controls of the keepsake editor, redesigned: how the merchant manages an option and its values (A), and how they create one variant (B). Pick a control and a design in the bar; each design runs on the mock keepsakes below, in the white block of the place editor’s layout (a step list on the left from 1024 px, the block on the right).',
  'The rules do not change: options belong to the keepsake, every variant has exactly one value of every option, a combination is sold once, a value that a variant uses can’t be deleted, and a new option needs a value on every variant in the same save (ADR-017, ADR-027).',
]

export const summary = {
  a: 'A: type and drag (A1), a table in a sheet (A2), chips with a small editor (A3).',
  b: 'B: a sheet with a live check (B1), a grid of free cells (B2), an open row under the table (B3).',
}

export const droppedIdeas = [
  'A text box with one value per line (like WooCommerce’s “Small | Medium | Large”), the line order being the value order. Dropped: renaming or moving a line changes which value it means, and a value that variants use must keep its identity (ADR-027).',
  'A wizard that takes one question per step for a variant. Dropped: a variant is five fields; steps add taps and hide the sold combinations.',
]
