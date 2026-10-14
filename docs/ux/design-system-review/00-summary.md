# Design system review: summary

Four reviews of the Swiss Keepsakes design system (Design System artifact https://claude.ai/artifact/NGk4iuk65iGFfZeySFbYLK, files in `docs/ux/design-system/project/`), 2026-10-13.

| Review | File | Verdict |
| --- | --- | --- |
| HeroUI fidelity | `01-heroui-fidelity.md` | No blockers. 8 major, 16 minor, 8 nit. All 72 HeroUI components mapped. |
| Agreed theme | `02-theme-adherence.md` | Palette exact, Swiss German correct, but the red/brick separation by form is weakened. 4 high, 7 medium, 11 low. |
| Accessibility and mobile | `03-accessibility-mobile.md` | Text contrast passes everywhere. Fails WCAG 2.2 AA on non-text contrast, colour-only states and narrow layouts. 5 high, 11 medium, 9 low. |
| Visual craft | `04-visual-craft.md` | Foundations sound. Cards not yet safe to build from; most fixes are global. 14 findings. |

## Decisions for the owner

1. **Field border.** Your soft `#C4C4BF` is 1.75:1 on white and fails WCAG 1.4.11; inputs without a placeholder (OTP, number, date, filled fields) then have no visible edge. Options: (a) keep soft and accept the failure; (b) `#8F8F8B`, the lightest that passes on white and the page ground; (c) soft sides and top with a 3:1 bottom edge.
2. **Focus ring.** All three reviewers that judged it recommend ink `#1A1A1A`: red focus looks like the brick invalid state (nearly identical for red-blind users); blue already means "waiting".
3. **Selected state.** The red tint `#FCE9E7` is almost the overdue tint `#FDECE5` and differs from unselected grey by hue only. Options: (a) ink fill, as in the approved type-and-colour draft (departs from HeroUI); (b) keep HeroUI's soft red but add a check icon and a 3:1 outline (HeroUI-faithful, fixes accessibility, still close to overdue in colour).
4. **Destructive buttons.** Solid brick on "Stornieren" breaks "brick is never a solid fill". Options: log it as the one exception, or use an ink destructive button.
5. **40px phone height** for NumberField, SearchField and date fields: still pending in `decisions.tsv`; approve or revert to HeroUI 36px.
6. **Cover.** Uses the red as a large decorative block and is generic. Redo with a quieter composition (ink and neutrals, red only as a small action mark)?

## Fixes that need no decision (I can apply)

Global (bundle.css and tokens):
- Add `box-sizing: border-box` (components currently render 2–12px too large).
- Add a field border width token (`1px`); set field vertical padding so all fields are exactly 40px with the border.
- Darken `color-accent-hover` to about `#C12D20` (white text was 4.43:1).
- One annotation style distinct from component text; remove state names from labels and dashed outlines that are not part of components.
- One card background; one icon stroke (1.5px).

Per card:
- Chip: every status chip gets its icon; one status-label spec (lg, 14px icon) used everywhere, including Table.
- Secondary vs tertiary: label or redraw Alert retry, EmptyState action, Disclosure trigger consistently.
- One rule for money actions: cancel and refund in AlertDialog (tertiary + danger); record or adjust payment in Drawer (phone) / Modal (desktop).
- ScrollShadow: use TagGroup lg chips instead of invented pills; one owner card for the C01/C02 filter rail.
- InputGroup and NumberField: show the dividers HeroUI draws once the border width is 1px.
- Fix clipped Button and TextField cards and card heights.
- Typography: add `ui`, `caption`, `numbers`.
- 375px: Tabs overflow, four-segment toggle overflow, sheet footers at 320px (stack buttons), add a stacked order-row card for C14.
- Focus states on interactive Card and Breadcrumbs; draw focus on more cards.
- Hold timer (C12): role="timer", announcements at 10/5/2/1 min, expired Alert keeping data.
- SearchField clear button and Toast close: 24px+ targets, close visible without hover.
- Replace 19 hard-coded colours with tokens; use spacing/text tokens.

Inherited from HeroUI, flagged only: switch off-track contrast (1.07–1.15:1), 36px list rows, 24px close button.
