/**
 * Single choke point for the icon library (same pattern as the agentic-rag frontend):
 * call sites import from here, so swapping the library only touches this file.
 *
 * Each icon is a plain re-export, so a screen that is loaded later brings only its own icons.
 * Wrapping them here (React.memo) would put all of them in the first load.
 */
import type { IconComponent, IconProps } from 'reicon-react'

import { createElement } from 'react'

export type { IconComponent }

// Guest navigation and header
export { Compass as ExploreIcon } from 'reicon-react'
export { Gift as GiftIcon } from 'reicon-react'
export { Ticket as TourIcon } from 'reicon-react'
export { User as AccountIcon } from 'reicon-react'
export { Sparkles as SparkleIcon } from 'reicon-react'
export { ShoppingBag as CartIcon } from 'reicon-react'

// Merchant navigation
export { Home as TodayIcon } from 'reicon-react'
export { Receipt as OrdersIcon } from 'reicon-react'
export { Calendar as BookingsIcon } from 'reicon-react'
export { Package as ProductsIcon } from 'reicon-react'
export { Handshake as PartnersIcon } from 'reicon-react'
export { Document as ContentIcon } from 'reicon-react'
export { Inbox as RequestsIcon } from 'reicon-react'
export { ChartBar as ReportsIcon } from 'reicon-react'
export { Settings as SettingsIcon } from 'reicon-react'
export { MoreH as MoreIcon } from 'reicon-react'

// Discovery
export { Search as SearchIcon } from 'reicon-react'
export { ArrowLeft as BackIcon } from 'reicon-react'
export { ArrowRight as ArrowRightIcon } from 'reicon-react'
export { Clock as ClockIcon } from 'reicon-react'
export { MessageText as MessageIcon } from 'reicon-react'

// Card actions and ratings (use weight="Filled" for the saved / filled state)
export { Heart as FavouriteIcon } from 'reicon-react'
export { Star as RatingIcon } from 'reicon-react'

// Status labels (Chip card: every status is tint + icon + words)
export { Hourglass as StatusInfoIcon } from 'reicon-react'
export { TickCircle as StatusSuccessIcon } from 'reicon-react'
export { Clock as StatusWarningIcon } from 'reicon-react'
export { AlertTriangle as StatusDangerIcon } from 'reicon-react'
export { MinusCircle as StatusNeutralIcon } from 'reicon-react'

// Prototype bar and general UI
export { Flask as PrototypeIcon } from 'reicon-react'
export { Refresh as ResetIcon } from 'reicon-react'
export { Globe as LanguageIcon } from 'reicon-react'
export { InfoCircle as InfoIcon } from 'reicon-react'
export { ChevronRight as ChevronRightIcon } from 'reicon-react'
export { ChevronLeft as ChevronLeftIcon } from 'reicon-react'
export { Xmark as CloseIcon } from 'reicon-react'

// Option tiles: the chosen tile's corner check (C03, C10; use weight="Filled")
export { TickCircle as SelectedIcon } from 'reicon-react'
export { Check as CheckIcon } from 'reicon-react'
export { Copy as CopyIcon } from 'reicon-react'
export { CopySuccess as CopiedIcon } from 'reicon-react'

// Detail highlights
export { PenNib as EngraveIcon } from 'reicon-react'
export { Location as PickupIcon } from 'reicon-react'
export { Wallet as PayLaterIcon } from 'reicon-react'
export { Calendar as PickupDateIcon } from 'reicon-react'
export { Tag as OptionIcon } from 'reicon-react'

// Seller contact card
export { Call as CallIcon } from 'reicon-react'
export { Sms as EmailIcon } from 'reicon-react'
export { Routing as DirectionsIcon } from 'reicon-react'
export { Pin2 as OpenInMapsIcon } from 'reicon-react'
export { Shop as ShopIcon } from 'reicon-react'

// Cart line
export { Trash4 as TrashIcon } from 'reicon-react'
/** Drag handle: six dots in two columns; reicon-react has none (its bar icons read as a menu). */
export const GripIcon = function GripIcon(
  { ref, size = 24, color, secondaryColor: _secondary, weight: _weight, strokeWidth: _stroke, ...props }: IconProps & { ref?: React.RefObject<SVGSVGElement | null> },
) {
  return createElement(
    'svg',
    {
      ref,
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: color ?? 'currentColor',
      ...props,
    },
    [9, 15].flatMap(x =>
      [6, 12, 18].map(y =>
        createElement('circle', { key: `${x}-${y}`, cx: x, cy: y, r: 1.75 }),
      ),
    ),
  )
} as unknown as IconComponent
export { Qr as QrIcon } from 'reicon-react'
/** Sliders: "adjust what you see" (owner, 14 Oct 2026: clearer than the funnel shape). */
export { Setting4 as FilterIcon } from 'reicon-react'
export { Archive as ArchiveIcon } from 'reicon-react'
export { Trash4 as CartRemoveIcon } from 'reicon-react'
export { Minus as MinusIcon } from 'reicon-react'
export { Plus as PlusIcon } from 'reicon-react'
export { ChevronDown as ChevronDownIcon } from 'reicon-react'

// Trip profile (C07)
export { Profile2user as TravelGroupIcon } from 'reicon-react'
export { User as TravelSoloIcon } from 'reicon-react'

// Overview analytics deltas (M02, step 1.9s)
export { TrendUp as TrendUpIcon } from 'reicon-react'
export { TrendDown as TrendDownIcon } from 'reicon-react'
// Dashboard card link affordance (step 1.9t)
export { ArrowUpRight as ArrowUpRightIcon } from 'reicon-react'

// Account hub and Edit profile (step 1.12s)
export { Camera as CameraIcon } from 'reicon-react'
export { Card as CardIcon } from 'reicon-react'
export { Money as CashIcon } from 'reicon-react'
export { Bank as BankIcon } from 'reicon-react'
export { Notification as NotificationIcon } from 'reicon-react'
export { Logout4 as LogoutIcon } from 'reicon-react'
export { UserEdit as ProfileEditIcon } from 'reicon-react'
export { Send as SendIcon } from 'reicon-react'
/** The C21 trip assistant (R19). */
export { Sparkles as AssistantIcon } from 'reicon-react'

// Rich-text toolbar for the long story (M12, M13; owner 15.10.2026)
export { Text as HeadingIcon } from 'reicon-react'
export { TextBold as BoldIcon } from 'reicon-react'
export { TextItalic as ItalicIcon } from 'reicon-react'
export { UnorderedList as BulletListIcon } from 'reicon-react'
export { OrderedList as NumberedListIcon } from 'reicon-react'
export { QuoteUp as QuoteIcon } from 'reicon-react'
export { Link as LinkIcon } from 'reicon-react'
export { GalleryAdd as PhotoAddIcon } from 'reicon-react'
export { ImageUp as UploadIcon } from 'reicon-react'
export { Undo as UndoIcon } from 'reicon-react'
export { Redo as RedoIcon } from 'reicon-react'
/** The long story card (M12, M13). */
export { Book as StoryIcon } from 'reicon-react'
/** Product row menu (M11): edit, archive and restore. */
export { Edit2 as EditIcon } from 'reicon-react'
export { ArchiveUp as RestoreIcon } from 'reicon-react'

// Guest background music player (launcher, sheet)
export { MusicNote as MusicIcon } from 'reicon-react'
export { Play as PlayIcon } from 'reicon-react'
export { Pause as PauseIcon } from 'reicon-react'
