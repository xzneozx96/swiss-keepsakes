/**
 * Single choke point for the icon library (same pattern as the agentic-rag frontend):
 * call sites import from here, so swapping the library only touches this file.
 *
 * reicon-react renders each SVG with a fresh `dangerouslySetInnerHTML` object on every
 * render, which makes React re-apply the markup each time. Wrapping every icon in
 * React.memo means re-renders with unchanged props skip the SVG entirely.
 */
import type { IconComponent, IconProps } from "reicon-react";

import { createElement, forwardRef, memo } from "react";
import * as Reicon from "reicon-react";

export type { IconComponent };

function stable(Base: IconComponent, name: string): IconComponent {
  const Memoized = memo(Base);

  Memoized.displayName = name;

  return Memoized as unknown as IconComponent;
}

// Guest navigation and header
export const ExploreIcon = stable(Reicon.Compass, "ExploreIcon");
export const GiftIcon = stable(Reicon.Gift, "GiftIcon");
export const TourIcon = stable(Reicon.Ticket, "TourIcon");
export const AccountIcon = stable(Reicon.User, "AccountIcon");
export const CartIcon = stable(Reicon.ShoppingBag, "CartIcon");

// Merchant navigation
export const TodayIcon = stable(Reicon.Home, "TodayIcon");
export const OrdersIcon = stable(Reicon.Receipt, "OrdersIcon");
export const BookingsIcon = stable(Reicon.Calendar, "BookingsIcon");
export const ProductsIcon = stable(Reicon.Package, "ProductsIcon");
export const PartnersIcon = stable(Reicon.Handshake, "PartnersIcon");
export const ContentIcon = stable(Reicon.Document, "ContentIcon");
export const RequestsIcon = stable(Reicon.Inbox, "RequestsIcon");
export const ReportsIcon = stable(Reicon.ChartBar, "ReportsIcon");
export const SettingsIcon = stable(Reicon.Settings, "SettingsIcon");
export const MoreIcon = stable(Reicon.MoreH, "MoreIcon");

// Discovery
export const SearchIcon = stable(Reicon.Search, "SearchIcon");
export const BackIcon = stable(Reicon.ArrowLeft, "BackIcon");
export const ArrowRightIcon = stable(Reicon.ArrowRight, "ArrowRightIcon");
export const ClockIcon = stable(Reicon.Clock, "ClockIcon");
export const MessageIcon = stable(Reicon.MessageText, "MessageIcon");

// Card actions and ratings (use weight="Filled" for the saved / filled state)
export const FavouriteIcon = stable(Reicon.Heart, "FavouriteIcon");
export const RatingIcon = stable(Reicon.Star, "RatingIcon");

// Status labels (Chip card: every status is tint + icon + words)
export const StatusInfoIcon = stable(Reicon.Hourglass, "StatusInfoIcon");
export const StatusSuccessIcon = stable(Reicon.TickCircle, "StatusSuccessIcon");
export const StatusWarningIcon = stable(Reicon.Clock, "StatusWarningIcon");
export const StatusDangerIcon = stable(
  Reicon.AlertTriangle,
  "StatusDangerIcon",
);
export const StatusNeutralIcon = stable(
  Reicon.MinusCircle,
  "StatusNeutralIcon",
);

// Prototype bar and general UI
export const PrototypeIcon = stable(Reicon.Flask, "PrototypeIcon");
export const ResetIcon = stable(Reicon.Refresh, "ResetIcon");
export const LanguageIcon = stable(Reicon.Globe, "LanguageIcon");
export const InfoIcon = stable(Reicon.InfoCircle, "InfoIcon");
export const ChevronRightIcon = stable(Reicon.ChevronRight, "ChevronRightIcon");
export const ChevronLeftIcon = stable(Reicon.ChevronLeft, "ChevronLeftIcon");
export const CloseIcon = stable(Reicon.Xmark, "CloseIcon");

// Option tiles: the chosen tile's corner check (C03, C10; use weight="Filled")
export const SelectedIcon = stable(Reicon.TickCircle, "SelectedIcon");
export const CopyIcon = stable(Reicon.Copy, "CopyIcon");
export const CopiedIcon = stable(Reicon.CopySuccess, "CopiedIcon");

// Detail highlights
export const EngraveIcon = stable(Reicon.PenNib, "EngraveIcon");
export const PickupIcon = stable(Reicon.Location, "PickupIcon");
export const PayLaterIcon = stable(Reicon.Wallet, "PayLaterIcon");
export const PickupDateIcon = stable(Reicon.Calendar, "PickupDateIcon");
export const OptionIcon = stable(Reicon.Tag, "OptionIcon");

// Seller contact card
export const CallIcon = stable(Reicon.Call, "CallIcon");
export const EmailIcon = stable(Reicon.Sms, "EmailIcon");
export const DirectionsIcon = stable(Reicon.Routing, "DirectionsIcon");
export const ShopIcon = stable(Reicon.Shop, "ShopIcon");

// Cart line
export const TrashIcon = stable(Reicon.Trash4, "TrashIcon");
/** Drag handle: six dots in two columns; reicon-react has none (its bar icons read as a menu). */
export const GripIcon = forwardRef<SVGSVGElement, IconProps>(function GripIcon(
  {
    size = 24,
    color,
    secondaryColor: _secondary,
    weight: _weight,
    strokeWidth: _stroke,
    ...props
  },
  ref,
) {
  return createElement(
    "svg",
    {
      ref,
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: color ?? "currentColor",
      ...props,
    },
    [9, 15].flatMap((x) =>
      [6, 12, 18].map((y) =>
        createElement("circle", { key: `${x}-${y}`, cx: x, cy: y, r: 1.75 }),
      ),
    ),
  );
}) as IconComponent;
export const QrIcon = stable(Reicon.Qr, "QrIcon");
/** Sliders: "adjust what you see" (owner, 14 Oct 2026: clearer than the funnel shape). */
export const FilterIcon = stable(Reicon.Setting4, "FilterIcon");
export const ArchiveIcon = stable(Reicon.Archive, "ArchiveIcon");
export const CartRemoveIcon = stable(Reicon.Trash4, "CartRemoveIcon");
export const MinusIcon = stable(Reicon.Minus, "MinusIcon");
export const PlusIcon = stable(Reicon.Plus, "PlusIcon");
export const ChevronDownIcon = stable(Reicon.ChevronDown, "ChevronDownIcon");

// Trip profile (C07)
export const TravelGroupIcon = stable(Reicon.Profile2user, "TravelGroupIcon");
export const TravelSoloIcon = stable(Reicon.User, "TravelSoloIcon");

// Overview analytics deltas (M02, step 1.9s)
export const TrendUpIcon = stable(Reicon.TrendUp, "TrendUpIcon");
export const TrendDownIcon = stable(Reicon.TrendDown, "TrendDownIcon");
// Dashboard card link affordance (step 1.9t)
export const ArrowUpRightIcon = stable(Reicon.ArrowUpRight, "ArrowUpRightIcon");

// Account hub and Edit profile (step 1.12s)
export const CameraIcon = stable(Reicon.Camera, "CameraIcon");
export const CardIcon = stable(Reicon.Card, "CardIcon");
export const CashIcon = stable(Reicon.Money, "CashIcon");
export const BankIcon = stable(Reicon.Bank, "BankIcon");
export const NotificationIcon = stable(Reicon.Notification, "NotificationIcon");
export const LogoutIcon = stable(Reicon.Logout4, "LogoutIcon");
export const ProfileEditIcon = stable(Reicon.UserEdit, "ProfileEditIcon");
export const SendIcon = stable(Reicon.Send, "SendIcon");
/** The C21 trip assistant (R19). */
export const AssistantIcon = stable(Reicon.MagicStar, "AssistantIcon");

// Rich-text toolbar for the long story (M12, M13; owner 15.10.2026)
export const HeadingIcon = stable(Reicon.Text, "HeadingIcon");
export const BoldIcon = stable(Reicon.TextBold, "BoldIcon");
export const ItalicIcon = stable(Reicon.TextItalic, "ItalicIcon");
export const BulletListIcon = stable(Reicon.UnorderedList, "BulletListIcon");
export const NumberedListIcon = stable(Reicon.OrderedList, "NumberedListIcon");
export const QuoteIcon = stable(Reicon.QuoteUp, "QuoteIcon");
export const LinkIcon = stable(Reicon.Link, "LinkIcon");
export const PhotoAddIcon = stable(Reicon.GalleryAdd, "PhotoAddIcon");
export const UploadIcon = stable(Reicon.ImageUp, "UploadIcon");
export const UndoIcon = stable(Reicon.Undo, "UndoIcon");
export const RedoIcon = stable(Reicon.Redo, "RedoIcon");
/** The long story card (M12, M13). */
export const StoryIcon = stable(Reicon.Book, "StoryIcon");
/** Product row menu (M11): edit, archive and restore. */
export const EditIcon = stable(Reicon.Edit2, "EditIcon");
export const RestoreIcon = stable(Reicon.ArchiveUp, "RestoreIcon");
