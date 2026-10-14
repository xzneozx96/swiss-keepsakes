# EmptyState

What a list or section shows when it has no content: one sentence and one next action; the section Header labels the list above it.

## Covers
HeroUI EmptyState and Header (both styled in HeroUI's CSS only; neither has a docs page).

## Spec
- HeroUI EmptyState: padding 8px, text 14/20 `color-muted`; nothing else defined.
- HeroUI Header: full width, padding 8px x, 6px top, 4px bottom, text 12/16 weight 500 `color-muted`, start-aligned. Used as a section label in menus and lists.

## Our changes
- Per UX spec §5.5, an empty state has one sentence that explains the situation and one next action: a `secondary` Button `sm` (36px, `color-default`, `color-accent-soft-foreground` label), because it is an alternative path, not a dismissal.
- Icon slot above the sentence: 56x56, radius `radius-2xl`, `color-surface-secondary` ground, for the soft 3D travel icon set (not yet sourced; the slot is marked "3D").
- Centred, padding 24px x 16px.

## Use
- Empty cart (C04), no transactions (C14), no stories in this language (C19), merchant "Heute" with no orders (M02), partner report with no transactions (P02).

## Don't
- Don't leave an empty list blank or show only "Keine Daten".
- Don't offer more than one action.
- Don't put the icon on a red tint; red is for actions and selection.
