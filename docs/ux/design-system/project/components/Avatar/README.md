# Avatar

Person or shop image with an initials fallback, plus corner badges and stacked groups.

## Covers
HeroUI v3 `Avatar` (`Image`, `Fallback`), `Badge` (`Badge.Anchor`, `Badge.Label`) and `AvatarGroup` (`AvatarGroup.Count`).

## Spec
- Avatar: sm 32px (12/16), md 40px (14/20, default), lg 48px (16/24); always a circle; fallback on `color-default`.
- Colours: text in the colour's soft foreground on `color-default`; `soft` variant puts the tint behind the initials.
- Badge: sm 16px, md 28px, lg 32px min box; 1px border in `color-background`; placed on a corner and shifted 25% outward; variants primary, secondary, soft; colours default, accent, success, warning, danger.
- AvatarGroup: 8px overlap with a 2px seam (clip by default, or ring in `color-background`); `max` adds a count; grid mode gap 12px.

## Our changes
- Counts are not drawn inside the sm badge (10px text is too small): use an sm dot badge and write the count as text beside the avatar.
- Badges and initials avoid the accent colours; red stays for actions and selection. Dots use `color-info`.

## Use
- Merchant team and invitations (M22, M01), partner list (M15), review authors (C03).

## Don't
- Don't use the md 28px badge on a 32px avatar; use sm.
- Don't let a dot badge be the only signal; add text for screen readers and sighted users.
