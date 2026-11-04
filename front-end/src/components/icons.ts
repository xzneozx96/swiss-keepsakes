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
export { Tag as CategoryIcon } from 'reicon-react'

// Seller contact card
export { Call as CallIcon } from 'reicon-react'
export { Sms as EmailIcon } from 'reicon-react'
export { Routing as DirectionsIcon } from 'reicon-react'
export { Pin2 as OpenInMapsIcon } from 'reicon-react'
export { Crosshairs as RecenterIcon } from 'reicon-react'
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
/** The Variants block's bulk actions (ActionBar): set a price, put on sale, hide. */
export { Money as PriceIcon } from 'reicon-react'
export { Eye as ForSaleIcon } from 'reicon-react'
export { EyeOff as HiddenIcon } from 'reicon-react'
export { Trash4 as CartRemoveIcon } from 'reicon-react'
// Map controls
export { Fullscreen as FullscreenIcon } from 'reicon-react'
export { ExitFullscreen as ExitFullscreenIcon } from 'reicon-react'
export { Minus as MinusIcon } from 'reicon-react'
export { Plus as PlusIcon } from 'reicon-react'
export { ChevronDown as ChevronDownIcon } from 'reicon-react'

// Trip profile (C07)
export { Profile2user as TravelGroupIcon } from 'reicon-react'
export { Profile2user as AudienceIcon } from 'reicon-react'
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
export { Gallery as LibraryIcon } from 'reicon-react'
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
export { FilePdf as FilePdfIcon } from 'reicon-react'
// Story body media blocks and the pin link
export { Video as VideoIcon } from 'reicon-react'
export { ArrowUp as ArrowUpIcon } from 'reicon-react'
export { ArrowDown as ArrowDownIcon } from 'reicon-react'
export { MapPoint as PinLinkIcon } from 'reicon-react'

// Map category icons (fixed list of 78, owner 2026-11-04, G-S9-D-SMALL). One alias per key; see features/categories/lib/category-icons.ts.
export { Bath as CategoryToiletIcon } from 'reicon-react'
export { Drop as CategoryWaterIcon } from 'reicon-react'
export { Wifi as CategoryWifiIcon } from 'reicon-react'
export { Safe as CategoryLockerIcon } from 'reicon-react'
export { Banknote as CategoryCashIcon } from 'reicon-react'
export { Bank as CategoryBankIcon } from 'reicon-react'
export { InfoCircle as CategoryInfoIcon } from 'reicon-react'
export { Siren as CategoryEmergencyIcon } from 'reicon-react'
export { Pill as CategoryPharmacyIcon } from 'reicon-react'
export { Hospital as CategoryHospitalIcon } from 'reicon-react'
export { Mailbox as CategoryPostIcon } from 'reicon-react'
export { Bus as CategoryTransportIcon } from 'reicon-react'
export { Tram as CategoryTrainIcon } from 'reicon-react'
export { Ship as CategoryBoatIcon } from 'reicon-react'
export { Bicycle as CategoryBicycleIcon } from 'reicon-react'
export { Scooter as CategoryScooterIcon } from 'reicon-react'
export { Car as CategoryCarIcon } from 'reicon-react'
export { Plane as CategoryAirportIcon } from 'reicon-react'
export { GasStation as CategoryFuelIcon } from 'reicon-react'
export { Parking as CategoryParkingIcon } from 'reicon-react'
export { EvCharge as CategoryChargingIcon } from 'reicon-react'
export { Car3 as CategoryTaxiIcon } from 'reicon-react'
export { ForkKnife as CategoryRestaurantIcon } from 'reicon-react'
export { Coffee as CategoryCafeIcon } from 'reicon-react'
export { Wineglass as CategoryBarIcon } from 'reicon-react'
export { Glass as CategoryBreweryIcon } from 'reicon-react'
export { Cookie as CategoryBakeryIcon } from 'reicon-react'
export { PizzaSlice as CategoryPizzaIcon } from 'reicon-react'
export { Donut as CategoryDessertIcon } from 'reicon-react'
export { TeaCup as CategoryTeaIcon } from 'reicon-react'
export { Basket as CategoryMarketIcon } from 'reicon-react'
export { Cart as CategorySupermarketIcon } from 'reicon-react'
export { Building as CategoryLandmarkIcon } from 'reicon-react'
export { Bell as CategoryChurchIcon } from 'reicon-react'
export { Castle as CategoryCastleIcon } from 'reicon-react'
export { Tower as CategoryTowerIcon } from 'reicon-react'
export { Link as CategoryBridgeIcon } from 'reicon-react'
export { Crown as CategoryMonumentIcon } from 'reicon-react'
export { Courthouse as CategoryMuseumIcon } from 'reicon-react'
export { Telescope as CategoryViewpointIcon } from 'reicon-react'
export { Buildings as CategorySquareIcon } from 'reicon-react'
export { City as CategoryOldTownIcon } from 'reicon-react'
export { Camera as CategoryPhotoSpotIcon } from 'reicon-react'
export { Palette as CategoryArtIcon } from 'reicon-react'
export { Masks as CategoryTheatreIcon } from 'reicon-react'
export { Library as CategoryLibraryIcon } from 'reicon-react'
export { Shop as CategoryShopIcon } from 'reicon-react'
export { Gift as CategorySouvenirsIcon } from 'reicon-react'
export { Watch as CategoryWatchesIcon } from 'reicon-react'
export { Tshirt as CategoryClothingIcon } from 'reicon-react'
export { GemSparkle as CategoryJewelleryIcon } from 'reicon-react'
export { Book as CategoryBooksIcon } from 'reicon-react'
export { Bag as CategoryBagsIcon } from 'reicon-react'
export { ImageMountain as CategoryMountainIcon } from 'reicon-react'
export { Leaf as CategoryParkIcon } from 'reicon-react'
export { Tree as CategoryTreeIcon } from 'reicon-react'
export { Water as CategoryLakeIcon } from 'reicon-react'
export { Snowflake as CategorySnowIcon } from 'reicon-react'
export { Sun as CategorySunIcon } from 'reicon-react'
export { Hiking as CategoryHikingIcon } from 'reicon-react'
export { Cycling as CategoryCyclingIcon } from 'reicon-react'
export { Swimming as CategorySwimmingIcon } from 'reicon-react'
export { Bonfire as CategoryCampfireIcon } from 'reicon-react'
export { Calendar as CategoryEventIcon } from 'reicon-react'
export { Confetti as CategoryFestivalIcon } from 'reicon-react'
export { MusicNote as CategoryConcertIcon } from 'reicon-react'
export { Ticket as CategoryTicketsIcon } from 'reicon-react'
export { FerrisWheel as CategoryFairIcon } from 'reicon-react'
export { Football as CategorySportIcon } from 'reicon-react'
export { Meditation as CategoryWellnessIcon } from 'reicon-react'
export { Users as CategoryFamilyIcon } from 'reicon-react'
export { Paw as CategoryPetsIcon } from 'reicon-react'
export { Suitcase as CategoryHolidayIcon } from 'reicon-react'
export { Bed as CategoryHotelIcon } from 'reicon-react'
export { Washer as CategoryLaundryIcon } from 'reicon-react'
export { Compass as CategoryTourIcon } from 'reicon-react'
export { Route as CategoryRouteIcon } from 'reicon-react'
export { Walk as CategoryWalkIcon } from 'reicon-react'
