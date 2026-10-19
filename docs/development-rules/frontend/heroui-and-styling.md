# HeroUI and styling

Read this before you build or restyle UI. There is no shadcn/ui in this project. UI is HeroUI v3 components styled with Tailwind CSS 4 and the theme tokens.

## Reference material

`docs/ux/heroui-reference/` holds the specs. Start with `docs/ux/heroui-reference/README.md`, which has the mapping from our approved tokens to HeroUI's theme and the list of facts that affect our screens.

| File | Read it for |
| :-- | :-- |
| `docs/ux/heroui-reference/README.md` | Token mapping, accepted design decisions, gaps, component to spec mapping |
| `docs/ux/heroui-reference/01-actions.md` | Button, Link, Dropdown, Toolbar and the other action components |
| `docs/ux/heroui-reference/02-forms.md` | Input, TextField, NumberField, SearchField, InputOTP, Checkbox, Radio, Switch, Slider |
| `docs/ux/heroui-reference/03-selection-navigation.md` | Select, ComboBox, ListBox, TagGroup, Tabs, Accordion, Breadcrumbs, Pagination |
| `docs/ux/heroui-reference/04-date-data-display.md` | Calendar, DatePicker, Table, Badge, Chip, Avatar |
| `docs/ux/heroui-reference/05-feedback-overlays-layout.md` | Alert, Modal, Drawer, Popover, Toast, Skeleton, Card, ProgressBar |
| `docs/ux/heroui-reference/source-variables.css` and `source-theme.css` | HeroUI's own token values, saved verbatim. The source of truth |

Where a spec and HeroUI's CSS disagree, the CSS wins. Every spec file ends with a "values not found" list. Do not guess those values. Decide them, and record the decision in `docs/ux/decisions.tsv`.

## Rules

- **Use the real HeroUI component.** Do not hand-roll a button, field, tab, table or overlay that HeroUI already has. Import from `@heroui/react`.
- **Customize with tokens first.** Change colour and font through the CSS variables in `front-end/src/styles/theme.css` (for example `--accent`, `--field-border`, `--background`). Do not override a component's colours with one-off classes.
- **Read HeroUI's CSS before you add a `className` override.** HeroUI's sub-parts usually ship their own background, border, radius, shadow and states. Look in `node_modules/@heroui/styles` first. This rule comes from the owner's agentic-rag project (`frontend/CLAUDE.md`).
- **Where HeroUI has no component, build one in `front-end/src/components`.** The reference README lists them: pull-to-refresh, bottom tab bar, stepper, timeline, quantity stepper, image carousel, star rating, map. Use theme tokens, not hard-coded values.
- **No hard-coded colours.** Use semantic tokens such as `bg-background` and `text-foreground`. There is no `tailwind.config` file. Tailwind 4 reads CSS variables through `@tailwindcss/vite`.
- **Tailwind classes, not inline `style`.** Use `style` only for a value that is computed at runtime, such as a progress transform.
- **Icons.** Import only from `front-end/src/components/icons.ts`. HeroUI ships no icons.

## Facts that bite

These come from the reference README. They are known HeroUI v3 behaviour, so plan for them.

- Overlays (Drawer, Modal, Popover) ignore `env(safe-area-inset-*)`. Add bottom padding for the home indicator on phone sheets.
- `SearchField` and `NumberField` are fixed at 36px high, while `Input` is 40px. Check clipping at 375px.
- Read-only has no styling. Design a read-only treatment, or show plain text instead of a disabled field.
- For overdue and failed states use the `danger-soft` variants. Do not use a large solid danger fill.
- Show money with `tabular-nums`.
- Disabled opacity is 0.5. Check that disabled text still reads.

## Not covered yet

Dark mode is out of scope (the UX spec defines only light). Accessibility rules beyond the contrast and focus choices in the reference are not written yet.
