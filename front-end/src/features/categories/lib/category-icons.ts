import type { CategoryIcon } from '@sk/api-contract'
import type { IconComponent } from '@/components/icons'
import type { MessageKey } from '@/i18n/en'

import {
  BarIcon,
  BoatIcon,
  BridgeIcon,
  CafeIcon,
  CashIcon,
  ChurchIcon,
  EmergencyIcon,
  HolidayIcon,
  InfoIcon,
  LandmarkIcon,
  LockerIcon,
  MarketIcon,
  MonumentIcon,
  MountainIcon,
  MuseumIcon,
  RestaurantIcon,
  ShopIcon,
  SquareIcon,
  SupermarketIcon,
  ToiletIcon,
  TransportIcon,
  ViewpointIcon,
  WaterIcon,
  WifiIcon,
} from '@/components/icons'

/** The drawing of each category icon key. The keys are the fixed list of the API (`categoryIcons` in @sk/domain). */
export const categoryIconComponents: Record<CategoryIcon, IconComponent> = {
  toilet: ToiletIcon,
  water: WaterIcon,
  wifi: WifiIcon,
  transport: TransportIcon,
  locker: LockerIcon,
  cash: CashIcon,
  restaurant: RestaurantIcon,
  cafe: CafeIcon,
  bar: BarIcon,
  market: MarketIcon,
  supermarket: SupermarketIcon,
  shop: ShopIcon,
  landmark: LandmarkIcon,
  church: ChurchIcon,
  bridge: BridgeIcon,
  monument: MonumentIcon,
  museum: MuseumIcon,
  viewpoint: ViewpointIcon,
  square: SquareIcon,
  info: InfoIcon,
  holiday: HolidayIcon,
  emergency: EmergencyIcon,
  boat: BoatIcon,
  mountain: MountainIcon,
}

/** The order of the picker: the same as the API list. */
export const categoryIconKeys = Object.keys(categoryIconComponents) as CategoryIcon[]

export const iconLabelKey = (icon: CategoryIcon) => `categories.icon.${icon}` as MessageKey
