/** The words of the v2 variant lab: one note per design. Labs are not product code, so the copy lives here. */
import type { VDesignId } from './variant-design-data'

export interface VSource { label: string, url?: string, checked: boolean }

export interface VNote {
  idea: string
  removed: string
  phone: string
  keyboard: string
  newKeepsake: string
  tradeoff: string
  sources: VSource[]
}

const shopifyEdit: VSource = { label: 'Shopify Help, editing variants: the redesigned product page manages variants on the product page itself, groups them by an option, and lets you click a price in the list to change it', url: 'https://help.shopify.com/en/manual/products/variants/edit-variants', checked: true }
const shopifyAdd: VSource = { label: 'Shopify Help, adding variants: a variant can’t repeat an existing combination', url: 'https://help.shopify.com/en/manual/products/variants/add-variants', checked: true }
const stripePrices: VSource = { label: 'Stripe Docs, manage prices: “Add another price” on the product page, each price with its own ⋯ menu, archive instead of delete', url: 'https://docs.stripe.com/products-prices/manage-prices', checked: true }
const medusa: VSource = { label: 'Medusa admin guide, variants: title, optional SKU, one value per option, created only while the combination is free (the owner’s reference)', url: 'https://docs.medusajs.com/user-guide/products/variants', checked: true }
const linear: VSource = { label: 'Linear: an issue’s properties are small pills you press to change in place, no form around them', checked: false }
const vercel: VSource = { label: 'Vercel (Geist): one filled button per view, everything else quiet text or ghost buttons; space instead of lines', checked: false }
const appleLists: VSource = { label: 'Apple Settings and the HIG grouped list: label on the left, value on the right, a row opens a picker; the page title is the thing itself', checked: false }

export const vNotes: Record<VDesignId, VNote> = {
  v1: {
    idea: 'The variants are plain rows grouped under the first option (Small, Medium, Large), so a row only says what differs: “Lucerne · CHF 29.00”. Pressing a row opens it right there into a soft grey panel with the values as pills and the price. SKU and On sale sit behind one “Details” line. Add variant opens the same panel at the top.',
    removed: 'From B1: the sheet, the two-column select grid, the bordered On sale row, the SKU and price side by side and the stock box. From B2: the grid. From B3: the always-open row of five controls. A new variant asks for two things you must decide (values and price); the SKU is made for you and On sale is the default, so both wait behind Details. The list lost its tinted box and dividers: grouping and space separate the rows.',
    phone: 'Rows are 56 px high and full width; the price keeps a fixed column so prices line up. Pills wrap and are 44 px high. The panel buttons stack, Add variant on top. Nothing scrolls sideways.',
    keyboard: 'Each row is one button (“Lucerne, CHF 29.00. Edit”). In the panel each option is a real radio group with a legend: Tab enters, arrows choose, Tab leaves. A sold combination is struck through and its radio says “already sold as VX-S-LUCERNE”; the line under the pills is an alert and offers “Edit VX-S-LUCERNE”. Enter saves. Notices are a polite live region.',
    newKeepsake: 'Same rows, empty, with Add variant. For the create flow (choose what to sell before the keepsake exists) the natural version is the same grouped rows listing all 9 combinations, each with a tick and a price, unticked ones faint: one list, no second design.',
    tradeoff: 'The calmest list and the least to read when adding. Editing happens inside the list, so a long list moves under you a little, and the full combination is never on one line on laptop (the group label holds the first value).',
    sources: [shopifyEdit, linear, vercel, shopifyAdd],
  },
  v2: {
    idea: 'O3’s list and detail, for variants. From 1024 px the variants are a short list on the left (name over price and status, the open one tinted) and the chosen variant fills the right: its name large in the product serif, then two small groups of rows, label left and value right: Size, Theme; Price, SKU, On sale. On a phone the list is one screen and the variant another, with an “All variants” back link, exactly as O3 does for options.',
    removed: 'From B1: the sheet over the page, the labels above every field, the field boxes and the switch card. A value is the app’s shared select, labelled above its field; sold combinations stay in the list, disabled, with “Medium · Chapel Bridge already exists” beneath. Price and SKU are typed straight into their row. From B2 and B3: the grid and the add row. The name at the top builds itself as you choose, so no Title field (Medusa has one).',
    phone: 'Feels like a phone settings page: the app’s own select for values (sold ones greyed out with their SKU), Save full width under the rows, Archive as a quiet red ghost button under it. The list rows are 56 px with a chevron, as in O3.',
    keyboard: 'List rows are buttons. In the detail the values are the shared HeroUI select with its label, so screen readers announce “Size, Medium, button”; sold values are disabled options with “Small · Lucerne already exists” as their description. Price and SKU are labelled inputs. Problems sit under their group as alerts. In the product the swap would move focus to the title and Back would return it to the row.',
    newKeepsake: 'The list starts empty with Add variant. In the create flow, the list would show every combination with a tick; pressing one opens the same detail. Good when each variant needs care, slow for nine at once.',
    tradeoff: 'The clearest single variant, the most phone-native, and the same shape as the chosen O3, so Options and Variants feel like one editor. On a phone it hides the other variants while you work, and adding several in a row means Back each time. The borderless inputs are a lab hand-roll; the product would need a shared “row field” in components.',
    sources: [appleLists, stripePrices, medusa, vercel],
  },
  v3: {
    idea: 'One sentence at the top of the block: “Sell [Medium] [Edelweiss] for [CHF 39.00]”, and Add variant. Each pill is a select or the price. The variants sit under it as quiet tiles; pressing a tile loads it into the same sentence to edit. SKU and On sale wait behind Details. A sold combination says so under the sentence and offers “Edit that one”.',
    removed: 'From B1: every label, the sheet and the switch card; the sentence is the label. From B2: the grid (the tiles show only what is sold). From B3: the table and the row of five boxed controls: the same three choices, but read as words. No row menus: a tile opens for edit, and Archive is inside.',
    phone: 'The sentence wraps (“Sell [Medium] [Edelweiss] / for [CHF 39.00]”), pills are 44 px, Add variant is full width. Tiles are two per row.',
    keyboard: 'The pills are native selects and an input, each with the option’s name as its label, read in order with the words between. Enter adds. Tiles are buttons; the one being edited has aria-current. The “already sold” line is an alert with a button to open that variant.',
    newKeepsake: 'The sentence is ready on an empty keepsake, so the first variant is three choices and Add. For the create flow, the sentence suits one at a time; for “sell all nine” it would need a “Sell every combination at CHF __” sentence beside it.',
    tradeoff: 'The fastest to read and to add, and very little chrome. Words between pills need care in German (word order changes), and with three options the sentence gets long on a phone. Editing in the top composer means the edited tile is away from the form on a long list.',
    sources: [linear, stripePrices, shopifyAdd, vercel],
  },
}

export const vIntro = [
  'The owner turned down B1 to B3 (“things are still very dense and hard to see”). These three start again from calm: few borders, one filled button, details only when asked. Each runs on the mock keepsakes in the Variants step of the editor (step list on the left from 1024 px, the white block on the right).',
  'The rules do not change (ADR-017, ADR-027): a combination is sold once, every variant has exactly one value of every option, a keepsake with no options is one variant, a variant with reserved units can’t be archived, and an archived variant can’t come back. A new variant starts with 0 in stock; stock is set in Inventory.',
]

export const vDropped = [
  'A stepper that asks one option per screen. Dropped: three screens for three choices, and the sold combinations disappear from view.',
  'Inline price editing straight in the list (Shopify’s redesigned page). Kept out of all three: it puts an input in every row, which is the density the owner rejected. V1 is one press away from it.',
]
