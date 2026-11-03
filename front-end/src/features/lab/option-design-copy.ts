/** The words of the lab v2 page: one note per design, in plain English. Labs are not product code, so the copy lives here. */
import type { DesignId } from './option-design-data'

export interface Source { label: string, url?: string, checked: boolean }

export interface DesignNote {
  idea: string
  removed: string
  german: string
  phone: string
  keyboard: string
  tradeoff: string
  sources: Source[]
}

const shopify: Source = { label: 'Shopify Help, adding variants: an option shows as a summary, Edit opens it, “Add another value”, Done', url: 'https://help.shopify.com/en/manual/products/variants/add-variants', checked: true }
const medusa: Source = { label: 'Medusa admin guide, product options: title, values, “Organize rankings” (the owner’s reference)', url: 'https://docs.medusajs.com/user-guide/products/options', checked: true }
const appleSplit: Source = { label: 'Apple HIG, split views: a list on the leading side, the chosen item’s detail beside it; on a phone it collapses to a list that pushes the detail', url: 'https://developer.apple.com/design/human-interface-guidelines/split-views', checked: false }
const memory = (label: string): Source => ({ label, checked: false })

export const intro = [
  'The owner turned down A1 to A3 (“still very dense and hard to see”). These three start from what was heavy there: every field open at once, a red delete button on every row, a language switch on top, a box per value.',
  'Shared by all three: English only until you ask for German; delete is a quiet × or a menu item, never a red button per row; one filled button on the block (Save, or Add option when empty); a refused delete is one line under the value, not a box; options still save whole (ADR-027).',
]

export const notes: Record<DesignId, DesignNote> = {
  o1: {
    idea: 'Each option is one quiet row: its name and its values as soft pills, the way a guest reads them. Tap a row and that option opens in place; only one is open. Inside: the name, the values with a grip and a small ×, and an empty “Add another value” field last. Done closes it.',
    removed: 'A1 kept every option open with its fields, a separate “Add values” box, a Colours button and a red delete per row. Here the closed rows are text, and fields exist only for the one option you are editing. The delete per value is a muted ×; Delete option is a text button next to Done.',
    german: 'Inside the open option, a text toggle “Add German · 2 missing”. On, each field gets a lighter filled field under it (German, optional). Off by default, so most merchants never see German fields.',
    phone: 'Rows stack name over pills. The open option is full width; inputs are 44 px; grip and × are 44 px targets. Nothing sits side by side except grip, field and ×.',
    keyboard: 'Rows are buttons (“Edit Size”). In the open option: Tab to a value’s grip, ArrowUp and ArrowDown move it, focus stays, a live region says “Small moved to position 2 of 3”. Enter in “Add another value” adds; a pasted list adds several.',
    tradeoff: 'The calmest overview and the most familiar pattern (Shopify). Costs a tap to edit, and two options cannot be edited side by side.',
    sources: [shopify, medusa, memory('Vercel dashboard settings: one quiet row per item, details only when opened (from memory)')],
  },
  o2: {
    idea: 'A plain page. The option name is a heading you click into; the values are a numbered list of plain lines with no field boxes until you point or type. Enter starts the next value, Backspace on an empty line removes it, a pasted list becomes lines. Colours and Delete sit in the option’s ⋯ menu.',
    removed: 'All borders on fields, the Values label, the “Add values” box, the Colours button and every delete button. The numbers are the ranking (Medusa’s “Organize rankings” without a second list). The grip appears only on hover or focus with a mouse; on touch it stays.',
    german: 'One switch for the page, top right: “German names · 9 missing”. On, each name and value gets a smaller grey line under it to type the German. Off, nothing German shows.',
    phone: 'The page is a single column; lines are 44 px; the grip is always visible on touch. The ⋯ menu holds the rare actions, so the row stays one line.',
    keyboard: 'Every line is a text input with its keys announced (aria-keyshortcuts): Enter, Backspace, Alt+ArrowUp and Alt+ArrowDown to move the line with focus kept. The grip button also moves with the arrow keys and a live region speaks the new position.',
    tradeoff: 'The fewest visible controls and the fastest typing. But hidden affordances: a new merchant may not know Enter adds a line, and inputs that look like text need a shared inline-text field in components (the product has none).',
    sources: [medusa, memory('Linear issue editor: the title is borderless text you click into (from memory)'), memory('Notion lists: Enter for a new item, Backspace on an empty one removes it (from memory)')],
  },
  o3: {
    idea: 'List and detail. The options are a short list on the left, each with its values as one grey line; the chosen option fills the right. Values read as plain rows (tap one to rename), new values come from one field at the top, and each row says how many variants use it, so the delete rule is visible before it bites.',
    removed: 'A2’s sheet and its EN/DE table, A3’s chip popovers. Nothing opens over the page; the detail is always beside the list on a laptop. Values are text, not fields, until tapped.',
    german: 'A closed section at the foot of each option: “German names (optional) · 2 missing”. Open, it is a small translation list: the English on the left, a German field on the right, the option name first.',
    phone: 'Two screens: the list, then the option with an “All options” back link (the iOS Settings pattern). The detail is one column; the German list keeps English and German on one line.',
    keyboard: 'The list is a nav with aria-current on the chosen option. Values: the grip moves with ArrowUp and ArrowDown and a live region; a value’s text is a “Rename Small” button that becomes a field, Enter or Escape closes it.',
    tradeoff: 'Best for a keepsake with many options or many values, and it shows the variant count per value. On a laptop it uses two columns for what is often one option; on a phone the back-and-forth is one more tap than O1.',
    sources: [appleSplit, medusa, memory('Stripe dashboard product editor: secondary settings behind “More options” (from memory)')],
  },
}
