# 03 Accessibility and mobile ergonomics

Review of the Swiss Keepsakes design system (`docs/ux/design-system/project/`: `tokens.json`, `README.md`, 48 component cards and a cover under `components/`). File paths below are relative to that folder. Reviewed 2026-10-13 against WCAG 2.2 AA and UX spec §5.5.

**Method.** Contrast ratios were computed by script from the `tokens.json` values with WCAG 2.2 relative luminance. Translucent fills and `opacity` were composited in sRGB over the ground each card actually uses. String widths were measured with Inter 400/500/600 font metrics, accurate to about ±2px. Nothing was rendered in a browser. HeroUI v3 baselines come from `docs/ux/heroui-reference/source-variables.css` (OKLCH converted to sRGB). Colour-vision checks use the Machado 2009 matrices at full severity.

**Severity.**

- **High:** fails a WCAG 2.2 AA criterion or a UX spec §5.5 rule in a customer purchase step or a money sheet, or across most form controls.
- **Medium:** an AA failure limited to secondary or merchant components, or a spec gap that will produce a failure in the build.
- **Low:** passes AA but falls short of the 44px guidance or outdoor legibility, plus documentation errors and items to verify in the build.

## Verdict

Text contrast is sound. Every text pair the cards render passes 4.5:1. The lowest are muted text on the hero sky at 4.98:1 and muted text on grey at 5.65:1. The theme also fixes HeroUI's two text failures: white on the accent rises from 3.59 to 5.01, and muted on grey rises from 4.05 to 5.65.

The system does not yet meet WCAG 2.2 AA. The failures are in non-text contrast, in how states are shown, and in narrow layouts.

Three problems come from our own theme:

- The softened field border (1.75:1) fails SC 1.4.11.
- The focus ring uses the same red family as the invalid state: 1.46:1 apart, and nearly identical under protanopia.
- The primary button's hover and pressed fill drops white text to 4.43:1.

A fourth is partly ours: the side-by-side sheet footer overflows at 320px because HeroUI button labels never wrap.

Several failures come from HeroUI, and our theme leaves them unfixed or makes them slightly worse:

- The selected state is a pink tint at 1.02:1 against unselected grey, and this includes the payment-method choice in the M08 money sheet.
- The switch off state, slider track and current page sit at 1.07 to 1.15:1.
- The SearchField clear button is 20px, and the Toast close button appears only on hover.

The 15-minute hold timer has no specification for announcing the time left. At 375px, four German primary tabs and a four-segment ToggleButtonGroup overflow.

None of this is structural. Most fixes are a token value or one extra cue that does not depend on colour. Fix the five High rows before screens are built on these cards.

## Contrast table

Text sizes in components run from 10 to 20px at weights up to 600, so every text pair below needs 4.5:1. Only `title` (24px) and `display` (34px) count as large text, and they appear only on page grounds. Disabled controls are exempt under SC 1.4.3, but their ratios are listed because one exempt pair still matters (finding M15).

### Text

| Pair (where it appears) | Colours | Ratio | Requirement | Result |
| --- | --- | --- | --- | --- |
| foreground on background (page text) | #1A1A1A / #F7F7F5 | 16.23 | 4.5 | Pass |
| foreground on default (tertiary button, tags, tab list) | #1A1A1A / #EFEFEC | 15.11 | 4.5 | Pass |
| muted on surface (descriptions, placeholders) | #5E5E5A / #FFFFFF | 6.51 | 4.5 | Pass |
| muted on background | #5E5E5A / #F7F7F5 | 6.07 | 4.5 | Pass |
| muted on default / surface-tertiary (unselected tab, Kbd, ComboBox ground) | #5E5E5A / #EFEFEC | 5.65 | 4.5 | Pass |
| muted on surface-secondary (Table header and footer) | #5E5E5A / #F2F2EF | 5.81 | 4.5 | Pass |
| muted on field hover fill (TextField hover) | #5E5E5A / #FAFAF9 | 6.24 | 4.5 | Pass |
| charcoal on background | #4A4A48 / #F7F7F5 | 8.28 | 4.5 | Pass |
| white on accent (primary button) | #FFFFFF / #D52B1E | 5.01 | 4.5 | Pass |
| **white on accent-hover (primary hover and touch pressed)** | #FFFFFF / #D94035 | **4.43** | 4.5 | **Fail** |
| accent-soft-foreground on accent-soft (selected tag, today, focused date segment) | #A3241A / #FCE9E7 | 6.35 | 4.5 | Pass |
| accent-soft-foreground on default (secondary button) | #A3241A / #EFEFEC | 6.45 | 4.5 | Pass |
| success-soft-foreground on success-soft (chip) | #17663A / #E3F1E8 | 6.01 | 4.5 | Pass |
| success-soft-foreground on surface (Alert, Toast title) | #17663A / #FFFFFF | 7.00 | 4.5 | Pass |
| warning-soft-foreground on warning-soft (chip) | #854D0E / #FEF3C7 | 6.15 | 4.5 | Pass |
| warning-soft-foreground on surface (hold-timer Alert title) | #854D0E / #FFFFFF | 6.85 | 4.5 | Pass |
| danger-soft-foreground on danger-soft (overdue chip) | #9A3412 / #FDECE5 | 6.37 | 4.5 | Pass |
| danger on surface (FieldError, danger menu item) | #9A3412 / #FFFFFF | 7.31 | 4.5 | Pass |
| danger on default (hovered danger item, secondary chip) | #9A3412 / #EFEFEC | 6.34 | 4.5 | Pass |
| info on info-soft (chip, avatar) | #1F5FA8 / #E6EEF8 | 5.51 | 4.5 | Pass |
| info on surface (Alert title) | #1F5FA8 / #FFFFFF | 6.44 | 4.5 | Pass |
| success on default (secondary chip) | #17663A / #EFEFEC | 6.08 | 4.5 | Pass |
| white on success / warning / danger (solid fills) | #FFFFFF / #17663A, #854D0E, #9A3412 | 7.00 / 6.85 / 7.31 | 4.5 | Pass |
| white on foreground (selected chip, ScrollShadow rail) | #FFFFFF / #1A1A1A | 17.40 | 4.5 | Pass |
| foreground on accent-soft (RangeCalendar band) | #1A1A1A / #FCE9E7 | 14.88 | 4.5 | Pass |
| muted on hero sky (Card "photo" label, hero meta) | #5E5E5A / #CFE4F5 | 4.98 | 4.5 | Pass |
| muted on hero cream | #5E5E5A / #FBF6E8 | 6.03 | 4.5 | Pass |
| foreground on hero sky | #1A1A1A / #CFE4F5 | 13.32 | 4.5 | Pass |
| white on hero sky (guidance; not rendered) | #FFFFFF / #CFE4F5 | 1.31 | 3.0 (any size) | Fail: never use |
| accent on hero sky (guidance; not rendered) | #D52B1E / #CFE4F5 | 3.83 | 4.5 | Fail for small text |
| disabled primary label (50% opacity over background) | #FFFFFF / #E6918A | 2.39 | exempt | Exempt |
| disabled label, foreground at 50% | #8C8C8C / #FFFFFF | 3.34 | exempt | Exempt |
| disabled-option reason, muted at 50% (RadioGroup, Select item) | #ABABA8 / #F7F7F5 | 2.16 (2.21 on white) | exempt | Exempt, see M15 |
| Calendar outside-month day, muted at 50% | #AEAEAC / #FFFFFF | 2.21 | exempt | Exempt |
| Calendar unavailable day, foreground at 50% | #8C8C8C / #FFFFFF | 3.34 | exempt | Exempt |

### Non-text (SC 1.4.11, 3:1)

| Pair (where it appears) | Colours | Ratio | Requirement | Result |
| --- | --- | --- | --- | --- |
| **field-border vs field fill** (all text-like fields) | #C4C4BF / #FFFFFF | **1.75** | 3.0 | **Fail** |
| field-border vs background | #C4C4BF / #F7F7F5 | 1.63 | 3.0 | Fail |
| field-border vs default ground (DatePicker, Select, ComboBox specimens) | #C4C4BF / #EFEFEC | 1.52 | 3.0 | Fail |
| field fill vs background (fill alone as boundary) | #FFFFFF / #F7F7F5 | 1.07 | 3.0 | Fail |
| field-border-hover vs field fill | #A6A6A1 / #FFFFFF | 2.44 | 3.0 | Fail |
| read-only dashed border vs its fill | #C4C4BF / #F2F2EF | 1.56 | 3.0 | Fail |
| control-border vs checkbox/radio white fill | #8E8E89 / #FFFFFF | 3.29 | 3.0 | Pass |
| control-border vs background | #8E8E89 / #F7F7F5 | 3.07 | 3.0 | Pass (0.07 margin) |
| control-border vs default / surface-tertiary | #8E8E89 / #EFEFEC | 2.86 | 3.0 | Fail (outer edge) |
| control-border vs surface-secondary (Table select-all) | #8E8E89 / #F2F2EF | 2.93 | 3.0 | Fail (outer edge) |
| checked fill vs background | #D52B1E / #F7F7F5 | 4.67 | 3.0 | Pass |
| check mark / radio dot vs accent | #FFFFFF / #D52B1E | 5.01 | 3.0 | Pass |
| invalid border vs field fill | #9A3412 / #FFFFFF | 7.31 | 3.0 | Pass |
| focus ring vs 2px background gap (buttons, controls) | #D52B1E / #F7F7F5 | 4.67 | 3.0 | Pass |
| focus ring vs field fill (flush field ring) | #D52B1E / #FFFFFF | 5.01 | 3.0 | Pass |
| focus ring vs default | #D52B1E / #EFEFEC | 4.35 | 3.0 | Pass |
| focus ring vs accent-soft (inset ring on selected toggle) | #D52B1E / #FCE9E7 | 4.28 | 3.0 | Pass |
| focus colour vs invalid colour (distinguishability, no WCAG threshold) | #D52B1E / #9A3412 | 1.46 | (see H3) | Confusable |
| **selected accent-soft vs unselected default** (ToggleButton, TagGroup, M08 payment method) | #FCE9E7 / #EFEFEC | **1.02** | 3.0 | **Fail** |
| selected accent-soft vs surface (Toolbar, Tag surface variant) | #FCE9E7 / #FFFFFF | 1.17 | 3.0 | Fail |
| selected label vs unselected label (text-colour cue) | #A3241A / #1A1A1A | 2.34 | 3.0 | Fail |
| Tabs primary: white indicator vs list | #FFFFFF / #EFEFEC | 1.15 | 3.0 | Fail |
| Tabs primary: selected vs unselected label (text-colour cue) | #1A1A1A / #5E5E5A | 2.67 | 3.0 | Fail |
| Tabs secondary: 2px underline vs surface | #D52B1E / #FFFFFF | 5.01 | 3.0 | Pass |
| Calendar selected day vs surface | #D52B1E / #FFFFFF | 5.01 | 3.0 | Pass |
| Calendar today tint vs surface | #FCE9E7 / #FFFFFF | 1.17 | 3.0 | Fail |
| Calendar selected vs today | #D52B1E / #FCE9E7 | 4.28 | 3.0 | Pass |
| Calendar nav icons vs surface | #A3241A / #FFFFFF | 7.43 | 3.0 | Pass |
| Pagination current-page fill vs surface | #EFEFEC / #FFFFFF | 1.15 | 3.0 | Fail |
| **Switch off track vs background / surface** | #EFEFEC / #F7F7F5, #FFFFFF | **1.07 / 1.15** | 3.0 | **Fail** |
| Switch off thumb vs track | #FFFFFF / #EFEFEC | 1.15 | 3.0 | Fail |
| Switch on track vs background | #D52B1E / #F7F7F5 | 4.67 | 3.0 | Pass |
| Switch on thumb vs track | #FFFFFF / #D52B1E | 5.01 | 3.0 | Pass |
| Slider unfilled track vs background | #EFEFEC / #F7F7F5 | 1.07 | 3.0 | Fail |
| Slider fill vs track; knob vs rim | #D52B1E / #EFEFEC; #FFFFFF / #D52B1E | 4.35; 5.01 | 3.0 | Pass |
| Meter/ProgressBar track vs background | #EFEFEC / #F7F7F5 | 1.07 | 3.0 | Not required: the value is shown as text ("8 / 12") |
| Meter fill (accent / foreground) vs track | #D52B1E, #1A1A1A / #EFEFEC | 4.35 / 15.11 | 3.0 | Pass |
| muted icons (chevrons, field icons) vs surface | #5E5E5A / #FFFFFF | 6.51 | 3.0 | Pass |
| CloseButton glyph vs its fill | #5E5E5A / #EFEFEC | 5.65 | 3.0 | Pass |
| status icons success / warning / danger / info vs surface | #17663A, #854D0E, #9A3412, #1F5FA8 / #FFFFFF | 7.00 / 6.85 / 7.31 / 6.44 | 3.0 | Pass |
| status icons warning / info vs their tints | #854D0E / #FEF3C7; #1F5FA8 / #E6EEF8 | 6.15 / 5.51 | 3.0 | Pass |
| selected chip in chip rail (ink fill) vs background | #1A1A1A / #F7F7F5 | 16.23 | 3.0 | Pass |
| Drawer handle vs sheet | #DCDCD7 / #FFFFFF | 1.38 | 3.0 | Fail as a graphic; acceptable because "Abbrechen", close and Esc exist |
| outline-button / unselected-chip border vs background | #DCDCD7 / #F7F7F5 | 1.28 | 3.0 | Not required: the text label identifies the control |
| Link touch underline vs background | #DCDCD7 / #F7F7F5 | 1.28 | advisory | Weak cue, see M16 |
| list/menu hover fill vs overlay | #EFEFEC / #FFFFFF | 1.15 | n/a | Hover only; keyboard focus uses the ring (verify, L23) |

### HeroUI baseline for the shared problems

| Pair | HeroUI v3 default | Ours | Change |
| --- | --- | --- | --- |
| white on accent | 3.59 | 5.01 | Theme fixed |
| white on accent-hover | 3.08 | 4.43 | Better, still fails |
| muted on default | 4.05 | 5.65 | Theme fixed |
| field boundary | no border; fill 1.09 | border 1.75 | Better, still fails |
| selected tint vs unselected | 1.18 | 1.02 | Slightly worse |
| Tabs label cue (foreground vs muted) | 3.67 | 2.67 | Worse: the darker muted narrows it |
| switch off / slider track vs background | 1.09 | 1.07 | Same |
| Tabs indicator, current page, switch thumb | 1.19 | 1.15 | Same |
| today / range tint vs white | 1.20 | 1.17 | Same |
| focus vs invalid: OKLab ΔE (normal; protanopia simulation) | 0.39; 0.28 | 0.12; 0.06 | Worse: red focus next to brick |

## Findings

| # | Severity | Component + file | Observed (numbers) | Requirement (source) | Fix | From HeroUI? |
| --- | --- | --- | --- | --- | --- | --- |
| H1 | High | All text-like fields: TextField, Select, ComboBox, Autocomplete, DatePicker/DateField/TimeField, NumberField, SearchField, InputGroup, InputOTP, ColorField, and the read-only style (dashed border, 1.56:1 on its fill). Token `color-field-border` in `tokens.json`; see `components/TextField/preview.html`, `components/InputOTP/preview.html` | Border #C4C4BF measures 1.75:1 against the white field fill, 1.63 against background and 1.52 on the grey `default` ground. The fill alone gives 1.07. The border is the only cue to a field's extent and tap area for empty OTP slots (no per-slot label or placeholder), NumberField, date segments, filled fields and empty fields without a placeholder. The README forbids placeholder-as-label, so that last case is common. A label above the field does not show where the box is. **Verdict: fails 1.4.11.** It is arguable only for a field whose placeholder or value text sits inside it. | SC 1.4.11 Non-text Contrast (AA): 3:1 for visual information needed to identify a component | Minimum passing border: **#959591** (3.01 against the white fill), **#8F8F8B** to also hold against background (3.03), **#8A8A87** against every ground (3.00 on #EFEFEC). Simplest: reuse `color-control-border` #8E8E89 (3.29 / 3.07). Softening-compatible option: keep #C4C4BF on the top and sides and draw the bottom edge in #8F8F8B or darker. That edge identifies the field at 3:1 and covers OTP slots. It needs one CSS rule. Hover must then go darker than the base, for example #6F6F6B. | Partly. HeroUI draws no border (fill 1.09:1, worse); the soft value is ours. |
| H2 | High | Selected state: ToggleButton and ToggleButtonGroup, TagGroup, Toolbar, Drawer M08 payment method. `components/ToggleButton/preview.html`, `components/TagGroup/preview.html`, `components/Toolbar/preview.html`, `components/Drawer/preview.html` | The selected fill #FCE9E7 measures 1.02:1 against the unselected #EFEFEC (1.00:1 in a deuteranopia simulation) and 1.17:1 against white. The label shifts only from #1A1A1A to #A3241A (2.34:1), at the same weight. In the M08 "Zahlung erfassen" sheet, "Bar" is told apart from "Karte" and "TWINT" by hue alone, in a money action. This breaks the ToggleButton card's own "Don't". | SC 1.4.1 Use of Color (A); SC 1.4.11 (AA) for the selected-state indicator; UX spec §5.5 | Add a cue that does not depend on colour: a 16px check icon in each selected segment and tag. Then style by context:<ul><li>**Attached ToggleButtonGroup** (including M08): keep the tint, add a 1.5px #8A8A87 outline, and keep the check icon. HeroUI draws the focus ring inset with no gap here, so with an ink fill the ink focus ring from H3 would measure 1:1 and vanish.</li><li>**Detached tags and chips**, where the ring sits outside a 2px gap: the ink style the chip rail already uses is fine (#1A1A1A fill, white text, 16.23:1 against background).</li></ul>For M08, RadioGroup is also acceptable. | Yes (HeroUI's 15% tint gives 1.18:1); ours is slightly worse. |
| H3 | High | Focus vs invalid on every field. Token `color-focus` (= accent); `components/TextField/preview.html`, `components/Select/preview.html`, `components/ComboBox/preview.html`, `components/SearchField/preview.html`, `components/InputOTP/preview.html` | A focused field shows a 2px #D52B1E ring. An invalid field shows a 1px #9A3412 border, which becomes 2px when focused. The two colours are 1.46:1 apart, at OKLab ΔE 0.12. In a protanopia simulation they become #635819 and #52480B (ΔE 0.06, 1.28:1), so a valid focused field looks like an error and a focused error looks like plain focus. FieldError text exists, so this is not a WCAG failure, but it is the confusion §5.5 targets in purchase forms. The README lists this as an open decision. | UX spec §5.5 (errors in words, not colour only); SC 1.4.1 risk for the field state | Set `color-focus` to `color-foreground` #1A1A1A. It measures 16.23:1 against background and 17.40 against white, keeps 3.48:1 against the accent across the 2px gap on primary buttons, and stays 2.70:1 from brick under deuteranopia. Info blue #1F5FA8 also passes (6.00:1) but collapses to 1.07:1 against brick under deuteranopia, so prefer ink. | No. HeroUI's focus is blue against red danger (ΔE 0.39). |
| H4 | High | Hold timer: Alert ("Platz reserviert · noch 12:40 Min."), Progress. `components/Alert/README.md`, `components/Progress/README.md` | The cards define the visual only. There is no live region, no announcement schedule, no expiry state and no way to extend. Progress only says to pair the bar with text. | UX spec §5.5 (announce remaining time and what happens at expiry); SC 4.1.3 Status Messages (AA); SC 2.2.1 Timing Adjustable (A): warn and allow extending, or document why the hold is essential | Add to the Alert card: <ul><li>Countdown text in `role="timer"`, not live.</li><li>A separate visually hidden `aria-live="polite"` region that announces at 10, 5, 2 and 1 min and at expiry, never every second.</li><li>At 2 min, a "Zeit verlängern" action if the business allows. Otherwise state the essential-exception reason in the spec.</li><li>At expiry, a danger-soft Alert ("Reservierung abgelaufen") with a "Neu buchen" action that keeps entered data.</li><li>No focus moves.</li></ul> | No (HeroUI has no timer) |
| H5 | High | Sheet footers at 320px: Drawer (M08–M10 money sheets) and AlertDialog. `components/Drawer/preview.html`, `components/AlertDialog/preview.html`, `components/Button/README.md` | Button labels are `whitespace-nowrap`. Drawer footer ("Abbrechen" plus a primary at `flex:1`) needs 277.6px for "CHF 37.80 erfassen" and 298.5px for "CHF 1’249.00 erfassen", against 272px available at 320px. AlertDialog with the Button card's danger label ("Behalten" + "Bestellung stornieren") needs 273.1px against 240px. InputOTP (282 of 288px) and the Card price row (253 of 256px) barely fit. Data tables are exempt. | SC 1.4.10 Reflow (AA): no horizontal scrolling at 320 CSS px | Below 360px, stack footer buttons full width with the primary first, or let footer labels wrap. Join "CHF" and the amount with a no-break space so a wrap never splits the amount. | Partly. `nowrap` is HeroUI's; the side-by-side `flex:1` footer is ours. |
| M6 | Medium | Switch. `components/Switch/preview.html` | The off track #EFEFEC measures 1.07:1 against background and 1.15 against white. The white thumb is 1.15:1 against the track and shows only through its shadow. An off switch is nearly invisible outdoors, and the README admits this. | SC 1.4.11 (AA) | Make the off track `color-control-border` #8E8E89: 3.07 against background, white thumb 3.29 against it. Alternatively, add a 1px #8A8A87 outline on the off track. | Yes (1.09 / 1.19 in HeroUI) |
| M7 | Medium | Slider (C02 price filter). `components/Slider/preview.html` | The unfilled track measures 1.07:1 against background, so the end of the range is not visible. The whole control is 20px tall (thumb 28×20). It passes 2.5.8 through the spacing exception but is far below 44px for an outdoor price filter. | SC 1.4.11 (AA); 44px is SC 2.5.5 (AAA) and Apple HIG guidance | Draw the unfilled track in #8E8E89 or give it a 1px outline. Show min and max values as text. Pad the hit area to 44px tall. | Yes |
| M8 | Medium | Tabs primary (M03 status tabs). `components/Tabs/preview.html`, `components/Tabs/README.md` | The selected white indicator measures 1.15:1 against the list. The label shifts from #5E5E5A to #1A1A1A, only 2.67:1 (HeroUI 3.67), at the same weight. Four German tabs (Offen, Bestätigt, Bereit, Abgeschlossen) need 377.8px against 343px, and English needs 361.0px. The list scrolls and the last tab is hidden at 375px. The README's claim that 4 tabs fit is false. | SC 1.4.11 (AA) and SC 1.4.1 (A) for the selected state; UX spec 375px fit | Set the selected label to weight 600 and add a 1px #1A1A1A outline on the indicator. Alternatively, use secondary (underline) tabs for M03, which reach 5.01:1. Cap primary tabs at 3 German labels on phones, or use shorter labels. | Indicator: yes. Label-cue regression: no (our darker muted). |
| M9 | Medium | Primary button label in hover and touch-pressed states. Token `color-accent-hover`; `components/Button/preview.html` | White on #D94035 measures 4.43:1. On phones, the pressed state uses this colour. The checkbox check, radio dot and switch thumb on this fill are non-text and pass at 4.43 against 3:1. HeroUI's own lighten formula applied to our accent gives #DC493A (4.13). | SC 1.4.3 (AA), which applies in every state | Darken on hover instead: #C12D20 (accent 90% + ink 10% in OKLab) gives 5.74:1. | No (theme value; HeroUI's resting accent fails worse at 3.59) |
| M10 | Medium | Focus-visible coverage. Specimens draw focus for only 6 of 48 components: Button, ComboBox, InputOTP, SearchField, Select, TextField. 22 of 48 READMEs never mention focus. The interactive ones are Accordion, Autocomplete, ColorPicker, Disclosure, Dropdown, ListBox, Pagination, RangeCalendar, Tabs, Toolbar, Toast, Drawer, Popover and AlertDialog. `components/Breadcrumbs/README.md` states "No focus ... styling in HeroUI CSS". `components/Card/README.md` defers the style to the consumer. | The interactive Card is the entry to every product and tour (C02, C08), and it has no defined focus style. Breadcrumbs links may show none. The dialog cards do not state initial focus, focus return or Esc behaviour. | SC 2.4.7 Focus Visible (AA); SC 2.4.11 Focus Not Obscured (AA); UX spec §5.5 (keyboard-operable purchase steps and sheets) | Add one line to each interactive card: "focus-visible: 2px `color-focus` ring, 2px gap". Give Card the same ring around its 24px-radius tile, and Breadcrumbs the Link ring. For dialogs, state the following: <ul><li>Initial focus goes to the first field or the heading.</li><li>Focus is trapped while open and returns to the trigger on close.</li><li>Esc closes everything except AlertDialog.</li></ul> | Partly. HeroUI rings cover most items; the Card and Breadcrumbs gaps are HeroUI's; the documentation gap is ours. |
| M11 | Medium | SearchField clear button (C02 gift search). `components/SearchField/README.md`, `components/SearchField/preview.html` | The target is 20×20 with no touch extension (a HeroUI CloseButton at size-5). It sits inside the 40px input group, so the spacing exception cannot apply. Escape clears the field, but that is not a pointer equivalent. Select's clear button passes: 20px visible with a 24px target. | SC 2.5.8 Target Size (Minimum) (AA): 24×24 | Make it 24px visible with a 40px hit area padded inside the field end. | Yes |
| M12 | Medium | Toast. `components/Toast/README.md`, `components/Toast/preview.html` | The close button is 20×20 and appears only on hover of the front toast, so touch users cannot reach it. Toasts auto-dismiss after 4s. "Rückgängig" after a money action (M08) and the failure toast both vanish after 4s. Timers pause only on hover or focus, which a touch user cannot trigger. | SC 2.2.1 Timing Adjustable (A); SC 2.5.8 (AA) | Toasts that carry an action or danger status do not auto-dismiss and show an always-visible close button of at least 24px. Success-only toasts may keep 4s. Keep failure details inline as well. | Yes |
| M13 | Medium | InputOTP (C05 login sheet), SearchField. `components/InputOTP/preview.html`, `components/SearchField/preview.html` | The OTP card shows six slots with no visible label or instruction. SearchField shows only a placeholder. Login sits in the purchase path, just before the request is sent. | SC 3.3.2 Labels or Instructions (A); SC 1.3.1 Info and Relationships (A); UX spec §5.5 (clear field labels) | Add a visible label above the OTP group (for example "Code aus der E-Mail"). Give each slot an `aria-label` such as "Ziffer 1 von 6". Make the SearchField label a spec item, not a consumer option. | Yes (HeroUI leaves labels to the consumer) |
| M14 | Medium | ToggleButtonGroup at 375px. `components/ToggleButton/README.md` | "Alle / Geschenke / Touren / Geschichten" needs 359.1px of content against 343px. In equal `fullWidth` segments (85.8px), "Geschichten" needs 116px. Buttons do not wrap. The README's claim that 3 to 4 segments fit is false for four German segments. English with 4 segments (260.8px) and German with 3 (243px) fit. | UX spec §1.1 (375px first); SC 1.4.10 at 320px | Use at most 3 German segments per group. Use the ScrollShadow chip rail for category lists. | No |
| M15 | Medium | Disabled-option reasons: RadioGroup ("Bei diesem Shop nicht verfügbar"), Select item ("Für dieses Datum nicht verfügbar"), Checkbox. `components/RadioGroup/preview.html`, `components/Select/preview.html` | 50% opacity takes the reason text to 2.16:1 on background and 2.21:1 on white. It is exempt as part of an inactive control, but it defeats the RadioGroup rule "Don't leave a disabled option without a reason". | SC 1.4.3 exemption applies; UX spec §5.5 (state in words) | Dim only the control and its label. Keep the description at full muted (6.07 / 6.51), or place the reason outside the disabled element. | Yes (HeroUI dims the whole root) |
| M16 | Medium | Link. `components/Link/README.md`, `components/Link/preview.html` | The link colour equals body text (1:1). There is no underline at rest on pointer devices; the only cue is weight 500 against 400. The touch underline #DCDCD7 measures 1.28:1 against background, barely visible outdoors. | SC 1.4.1 (A): a link in running text needs a cue beyond colour (failure F73). A weight change alone is weak. | Underline links at rest on every device, in #5E5E5A (6.07:1), 1.5px thick with a 4px offset. | Yes (HeroUI links are ink with no underline); the touch underline colour is ours |
| L17 | Low | Checkbox and radio on grey grounds; Table select-all. Token `color-control-border` | 3.29:1 against its own white fill, so the inner edge passes. The outer edge measures 2.86:1 on default/tertiary and 2.93:1 on surface-secondary, the Table header ground. The 3.07:1 on background leaves only a 0.07 margin. | SC 1.4.11 (AA) | #8A8A85 holds 3:1 on every ground. | No |
| L18 | Low | Calendar: today and unavailable days (C03 pickup, C10 departure). `components/Calendar/preview.html` | Today is a #FCE9E7 tint (1.17:1 against white) with its number in #A3241A, only 2.34:1 from normal days, so the cue is hue only. Selected and today are clearly apart (4.28:1). Unavailable "shop closed" days show only 50% opacity with no reason. | SC 1.4.1 (A) for "today" as information; UX spec §5.5 (state in words) | Mark today with a 1px ink ring or a dot under the number. Add a legend line under the grid ("Grau: Shop geschlossen") and an ErrorMessage when a closed day is chosen. | Yes |
| L19 | Low | Pagination (merchant desktop). `components/Pagination/preview.html`, `components/Pagination/README.md` | The current page is a #EFEFEC fill on white, 1.15:1. `aria-current` covers screen readers only. The README rule "no more than 7 items at 375px" fails: Previous, 5 pages and Next need 378.5px in German and 377.4px in English, against 343px. | SC 1.4.11 (AA) | Mark the current page with an ink fill and white text (17.40:1) or a 1px ink outline. Below 640px, use icon-only Previous/Next (276px), or load-more as the card says. | Indicator: yes. Rule: no. |
| L20 | Low | Dropdown at 375px. `components/Dropdown/README.md` | The 48svw cap gives a 148px label box. "Stornieren und erstatten" (162.6px) and "Rückerstattung erfassen" (164.4px) wrap to two lines. HeroUI labels wrap rather than truncate (`w-fit`). Items are 36px tall; the README asks for 44px on mobile. | UX spec 375px fit; 44px guidance | On phones, show actions as a Drawer action sheet with full-width 48px rows, or set the popover minimum width to 240px. | Yes (cap); the labels are ours |
| L21 | Low | Targets that pass 2.5.8 but fall below 44px: Calendar nav buttons 24px, DatePicker calendar trigger 24px, CloseButton 24px (the README pads it to 44px in the host layout), ListBox/Select/ComboBox/Autocomplete items 36px, Tabs 32px, Pagination 36px, TagGroup md 24px and sm 20px, Toast action 32px, checkbox and radio rows 20px. The README asks for 44px rows but the specimens do not draw them. | All pass, either at 24px or through the spacing exception. Older tourists outdoors need more. | SC 2.5.5 (AAA) 44px; Apple HIG 44pt; Material 48dp | In customer flows on phones: make Calendar nav buttons and the DatePicker trigger 40px, make list items 44px, use TagGroup lg only, and draw the 44px row height on the Checkbox, RadioGroup and Switch cards. | Yes |
| L22 | Low | Text under 12px: Avatar Badge count at 10px. `components/Avatar/preview.html` | 10px counter in a 16px badge. Specimen captions at 11px (ColorPicker) and the 10px "3D icon" placeholder are annotations, not component text. | Legibility (no WCAG minimum size) | Use Badge md (12px) or put the count in text next to the avatar. | Yes (HeroUI Badge sm uses 10px) |
| L23 | Low | Keyboard highlight in pickers: ComboBox, Autocomplete, Select. `components/ComboBox/preview.html` | The specimens draw the active option with the hover fill only (#EFEFEC, 1.15:1). HeroUI CSS gives `data-focus-visible` items a 2px ring. | SC 2.4.7 (AA), SC 1.4.11 (AA) | Verify in the build that the option with virtual focus (`aria-activedescendant`) gets the ring, not only the fill. Draw that state on the card. | Yes (verify) |
| L24 | Low | Documentation accuracy. `tokens.json`, `README.md` | `color-muted` is documented as "6.2:1 on white" but measures 6.51. `color-warning-soft-foreground` is documented as "about 6.9:1" on its tint but measures 6.15 (6.85 is its ratio on white). The README says every status role has a `-soft-foreground` token, but info has neither `color-info-soft-foreground` nor `color-info-foreground`, so Chip and Avatar use `color-info` as text (5.51:1 on the tint). | Accuracy | Correct the two ratios. Add `color-info-soft-foreground` (#1F5FA8) and `color-info-foreground` (#FFFFFF, 6.44:1). | No |
| L25 | Low | Description and FieldError at 12/16 (TextField, Fieldset, Checkbox, RadioGroup) | 12px passes, but the users are often older and read outdoors. Field errors carry the §5.5 message. | Outdoor legibility (no WCAG minimum size) | Set FieldError to the `label` style (13/18, weight 500) and keep descriptions at 12/16. | Yes (HeroUI `text-xs`) |

## What is right

- **Text contrast holds everywhere it renders.** The minimum is 4.98:1 (muted on the hero sky end), and every soft-foreground passes on its own tint at 5.51 to 6.37:1. The theme fixes HeroUI's primary button (3.59 to 5.01) and muted on grey (4.05 to 5.65).
- **Status never relies on colour alone in the main patterns.** Alert, the lg status Chip and the Table status column all carry an icon plus words. The secondary and tertiary chips carry words.
- **Brick danger (#9A3412) is kept apart from the brand red**, and solid danger appears only on destructive buttons. Danger text measures 7.31:1 on white.
- **Checkbox and radio use the darker `color-control-border`**, at 3.29:1 against their fill, because the edge is the only sign of an empty box.
- **The focus ring itself is strong.** It measures 4.28 to 5.01:1 on every ground and sits outside a 2px gap on buttons and controls. Only its colour clashes with the invalid state (H3).
- **Selection with a cue beyond colour exists and is good.** ListBox and Select use a checkmark. Secondary tabs use a 2px underline at 5.01:1. The ScrollShadow chip rail uses an ink fill at 16.23:1. Calendar selected and today are 4.28:1 apart. ToggleButton "Gemerkt" changes both icon and label.
- **The mobile basics are right.** Field text is 16px on phones (no iOS zoom). Controls are 40px. NumberField steppers are 40×40. InputOTP fits at 282px with paste supported (SC 3.3.8). CloseButton is padded to 44px in the host. Drawer and Toast add a safe-area inset. Table is banned at 375px in favour of stacked rows. Tooltips are not relied on for touch.
- **Drag has alternatives.** Drawer drag-to-dismiss sits beside "Abbrechen", the close trigger and Esc. The React Aria Slider moves to a tap on its track, and RangeCalendar works with two taps, so neither needs dragging (SC 2.5.7).
- **Money and error patterns follow UX spec §5.5.** The sheet states the amount and the consequence, and the primary label repeats the amount ("CHF 37.80 erfassen"). Errors say what went wrong and keep entered data. Empty states give one sentence and one action. Loading uses Skeleton.
- **German copy fits where it matters most.** Status chips, Alert titles, sheet and dialog footers at 375px, Toolbar, OTP, the Card price row and every Button label fit at 343px. The Swiss "ss" spelling is used throughout.
