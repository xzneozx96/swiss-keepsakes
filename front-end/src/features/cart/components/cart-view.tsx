import type { ConfirmOptions } from "@/components/confirm-dialog";

import { Alert, Button, Checkbox, Drawer, Label } from "@heroui/react";
import { useState } from "react";

import { useConfirm } from "@/components/confirm-dialog";
import {
  CartRemoveIcon,
  ChevronDownIcon,
  EngraveIcon,
  InfoIcon,
  OptionIcon,
  PayLaterIcon,
  PickupDateIcon,
  PickupIcon,
  ShopIcon,
  StatusSuccessIcon,
} from "@/components/icons";
import { BackButton } from "@/components/layout/cart-button";
import { Media } from "@/components/media";
import { QuantityBox } from "@/components/quantity-stepper";
import { useSheetExit } from "@/components/sheet-exit";

export interface CartLineView {
  id: string;
  name: string;
  photo?: string;
  /** Chosen option ("Small"); undefined for a one-option ("Standard") gift. */
  option?: string;
  /** "Engraving “Anna”"; undefined without engraving. */
  engraving?: string;
  /** Seller shop name. */
  store: string;
  /** Unit price, the line's highlighted price: "CHF 89.00". */
  price: string;
  /** "each", after the price. */
  each: string;
  /** Payment rule in short: "30% deposit after confirmation". */
  policy: string;
  /** "Request to receive on Wed 21 Oct". */
  requestDate: string;
  /** Pickup place: "Shop Altstadt". */
  place: string;
  select: {
    /** "Select Pocket knife · Medium, Wed 21 Oct". */
    label: string;
    isSelected: boolean;
    onChange: (selected: boolean) => void;
  };
  quantity: {
    /** "Quantity, Pocket knife". */
    label: string;
    value: number;
    max: number;
    onChange: (value: number) => void;
  };
  removeAria: string;
  /** Asked first (owner rule): "Remove Pocket knife · M?". */
  removeConfirm: ConfirmOptions;
  onRemove: () => void;
  /** The requested date can no longer be requested (AC04); `onFix` moves it to the earliest. */
  invalid?: {
    title: string;
    message: string;
    fixLabel: string;
    onFix: () => void;
  };
}

export interface CartViewProps {
  title: string;
  backLabel: string;
  /** Dates are requests; different dates, places or payment rules become separate orders. */
  note: { title: string; body: string };
  lines: CartLineView[];
  bar: {
    /** Always visible, so it stays reachable while the list scrolls. */
    selectAll: {
      label: string;
      isSelected: boolean;
      isIndeterminate: boolean;
      onChange: (selected: boolean) => void;
    };
    /** "2 of 3 selected". */
    selectedCount: string;
    totalLabel: string;
    total: string;
    /** Accessible name of the total, which opens the breakdown sheet. */
    detailsLabel: string;
    continueLabel: string;
    /**
     * Why Continue cannot go on yet: nothing is ticked, or a ticked line has a date that
     * can no longer be requested (`fixLineId`, whose fix button gets focus).
     */
    blocked?: { message: string; fixLineId?: string };
  };
  /** Bottom sheet opened from the bar total: each ticked gift with its total, then the totals. */
  breakdown: {
    title: string;
    closeLabel: string;
    items: { id: string; label: string; pickup: string; total: string }[];
    /** Shown instead of the items when nothing is ticked. */
    emptyMessage: string;
    subtotalLabel: string;
    subtotal: string;
    totalLabel: string;
    total: string;
    chip: string;
  };
  onBack: () => void;
  /** Hand-off to sign-in (C05) and review (C06) with the ticked lines; only when not blocked. */
  onContinue: () => void;
}

/**
 * C04 Cart: one flat list of gift slips, each with its own pickup and payment rule. The
 * guest ticks the gifts to request; C06 groups the ticked ones into orders. The bottom bar
 * sits in the page flow (sticky), so the space after the last line follows its real height;
 * the route sets `ownsBottomSpace` so the guest shell adds no tab-bar padding.
 */
export function CartView({
  title,
  backLabel,
  note,
  lines,
  bar,
  breakdown,
  onBack,
  onContinue,
}: CartViewProps) {
  const [showBlocked, setShowBlocked] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { confirm, dialog } = useConfirm();

  const handleRemove = async (line: CartLineView) => {
    if (!(await confirm(line.removeConfirm))) return;
    line.onRemove();
    // The pressed button is gone; keep keyboard focus in the cart instead of on <body>.
    // After the last line the route's empty state renders, so look the heading up after paint.
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>("[data-cart-title]")?.focus(),
    );
  };

  const handleContinue = () => {
    if (!bar.blocked) {
      onContinue();

      return;
    }
    setShowBlocked(true);
    // Pressing explains (as on C03): take the guest to what needs attention. Select all is
    // in the always-visible bar, so only a line's fix button needs scrolling to.
    if (bar.blocked.fixLineId) {
      const fix = document.querySelector<HTMLElement>(
        `[data-date-fix="${bar.blocked.fixLineId}"]`,
      );

      fix?.scrollIntoView({ behavior: "smooth", block: "center" });
      fix?.focus({ preventScroll: true });
    } else {
      document
        .querySelector<HTMLElement>("[data-select-all] input")
        ?.focus({ preventScroll: true });
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 bg-background/90 ps-4 pe-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl">
        <BackButton label={backLabel} onPress={onBack} />
        <h1
          data-cart-title
          className="font-serif text-title outline-none"
          tabIndex={-1}
        >
          {title}
        </h1>
      </header>

      <div className="flex flex-1 flex-col gap-5 px-6 pt-2 pb-5">
        {/* HeroUI has no info status: tinted Alert (alert--soft alert--info) with the info icon. */}
        <Alert className="alert--soft alert--info w-full">
          <Alert.Indicator>
            <InfoIcon size={16} />
          </Alert.Indicator>
          <Alert.Content>
            <Alert.Title>{note.title}</Alert.Title>
            <Alert.Description>{note.body}</Alert.Description>
          </Alert.Content>
        </Alert>

        <ul className="flex flex-col gap-3">
          {lines.map((line) => (
            <GiftSlip key={line.id} line={line} onRemove={handleRemove} />
          ))}
        </ul>
      </div>

      <div
        data-cart-bar
        className="sticky bottom-0 z-30 flex flex-col gap-2 border-t border-separator bg-background px-6 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]"
      >
        <p aria-live="polite" className="text-sm text-danger empty:hidden">
          {showBlocked && bar.blocked ? bar.blocked.message : ""}
        </p>
        <div className="flex min-h-11 items-center justify-between gap-3">
          <div data-select-all>
            <Check
              isIndeterminate={bar.selectAll.isIndeterminate}
              isSelected={bar.selectAll.isSelected}
              label={bar.selectAll.label}
              onChange={bar.selectAll.onChange}
            />
          </div>
          <span className="text-sm text-muted">{bar.selectedCount}</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Airbnb pattern: the underlined total opens the price breakdown. */}
          <button
            aria-haspopup="dialog"
            aria-label={`${bar.detailsLabel}, ${bar.totalLabel} ${bar.total}`}
            className="-ms-1 flex min-w-0 flex-1 flex-col items-start rounded-lg px-1 text-start outline-none focus-visible:focus-ring"
            type="button"
            onClick={() => setShowBreakdown(true)}
          >
            <span className="text-xs text-muted">{bar.totalLabel}</span>
            <span className="flex items-center gap-1 text-lg font-semibold tabular-nums underline underline-offset-4">
              {bar.total}
              <ChevronDownIcon aria-hidden className="rotate-180" size={16} />
            </span>
          </button>
          <Button size="lg" onPress={handleContinue}>
            {bar.continueLabel}
          </Button>
        </div>
      </div>

      <BreakdownSheet
        breakdown={breakdown}
        isOpen={showBreakdown}
        onOpenChange={setShowBreakdown}
      />
      {dialog}
    </div>
  );
}

/** Price breakdown as a bottom sheet (Drawer card; sheets instead of new screens). */
function BreakdownSheet({
  breakdown,
  isOpen,
  onOpenChange,
}: {
  breakdown: CartViewProps["breakdown"];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const exitRef = useSheetExit();

  return (
    <Drawer.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Content className="mx-auto max-w-[430px]" placement="bottom">
        <Drawer.Dialog>
          <span ref={exitRef} hidden />
          <Drawer.Handle />
          <Drawer.CloseTrigger aria-label={breakdown.closeLabel} />
          <Drawer.Header>
            <Drawer.Heading className="text-heading">
              {breakdown.title}
            </Drawer.Heading>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-4 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] text-foreground">
            {breakdown.items.length ? (
              <ul className="flex flex-col gap-3">
                {breakdown.items.map((item) => (
                  <li key={item.id} className="flex items-start gap-3">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span>{item.label}</span>
                      <span className="text-sm text-muted">{item.pickup}</span>
                    </span>
                    <span className="tabular-nums">{item.total}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">{breakdown.emptyMessage}</p>
            )}
            <dl className="flex flex-col gap-2 border-t border-separator pt-4">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">{breakdown.subtotalLabel}</dt>
                <dd className="tabular-nums">{breakdown.subtotal}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="font-semibold">{breakdown.totalLabel}</dt>
                <dd className="text-heading tabular-nums">{breakdown.total}</dd>
              </div>
            </dl>
            <span className="flex items-center gap-1 self-start rounded-full bg-surface-secondary px-2 py-0.5 text-xs whitespace-nowrap">
              <StatusSuccessIcon aria-hidden size={12} />
              {breakdown.chip}
            </span>
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}

/** HeroUI Checkbox, 24px box (lab CartSelectDemo); the label is visible or only for screen readers. */
function Check({
  label,
  hideLabel = false,
  isSelected,
  isIndeterminate,
  onChange,
}: {
  label: string;
  hideLabel?: boolean;
  isSelected: boolean;
  isIndeterminate?: boolean;
  onChange: (selected: boolean) => void;
}) {
  return (
    <Checkbox
      aria-label={hideLabel ? label : undefined}
      className="items-center"
      isIndeterminate={isIndeterminate}
      isSelected={isSelected}
      onChange={onChange}
    >
      <Checkbox.Content className="flex-row items-center gap-2">
        <Checkbox.Control className="size-6 rounded-lg">
          <Checkbox.Indicator className="size-4 [&_[data-slot$=checkmark]]:size-4 [&_[data-slot$=indeterminate]]:size-3.5" />
        </Checkbox.Control>
        {!hideLabel && <Label>{label}</Label>}
      </Checkbox.Content>
    </Checkbox>
  );
}

/** One gift as a white card (Lab L "Gift slip", owner choice 13.10.2026), M02 card surface. */
function GiftSlip({
  line,
  onRemove,
}: {
  line: CartLineView;
  onRemove: (line: CartLineView) => void;
}) {
  return (
    <li className="flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface">
      <div className="flex items-start gap-3">
        <div className="flex h-[72px] shrink-0 items-center">
          <Check
            hideLabel
            isSelected={line.select.isSelected}
            label={line.select.label}
            onChange={line.select.onChange}
          />
        </div>
        <Media
          alt=""
          className="size-[72px] shrink-0 rounded-xl"
          photo={line.photo}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start gap-1">
            <h3 className="min-w-0 flex-1 font-semibold leading-snug">
              {line.name}
            </h3>
            <button
              aria-label={line.removeAria}
              className="-me-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-lg bg-transparent text-danger outline-none transition-colors hover:bg-danger-soft focus-visible:focus-ring active:bg-danger-soft-hover"
              type="button"
              onClick={() => onRemove(line)}
            >
              <CartRemoveIcon aria-hidden size={19} />
            </button>
          </div>
          <p className="flex items-start gap-1.5 text-sm text-muted">
            <ShopIcon aria-hidden className="mt-0.5 shrink-0" size={14} />
            {line.store}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {line.option && (
          <p className="flex items-start gap-2 text-sm">
            <OptionIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
            {line.option}
          </p>
        )}
        {line.engraving && (
          <p className="flex items-start gap-2 text-sm">
            <EngraveIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
            {line.engraving}
          </p>
        )}
        <p className="flex items-start gap-2 text-sm">
          <PickupDateIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
          {line.requestDate}
        </p>
        <p className="flex items-start gap-2 text-sm">
          <PickupIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
          {line.place}
        </p>
        <p className="flex items-start gap-2 text-sm">
          <PayLaterIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
          {line.policy}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-separator pt-3">
        <p className="flex min-w-0 items-baseline gap-1">
          <span className="text-heading tabular-nums">{line.price}</span>
          <span className="text-sm text-muted">{line.each}</span>
        </p>
        <QuantityBox
          label={line.quantity.label}
          max={line.quantity.max}
          value={line.quantity.value}
          onChange={line.quantity.onChange}
        />
      </div>

      {line.invalid && (
        <Alert className="alert--soft w-full min-w-0" status="warning">
          <Alert.Indicator />
          <Alert.Content className="min-w-0 items-start gap-2">
            <Alert.Title>{line.invalid.title}</Alert.Title>
            <Alert.Description>{line.invalid.message}</Alert.Description>
            <Button
              className="h-auto min-h-8 max-w-full py-1.5 text-start whitespace-normal"
              data-date-fix={line.id}
              size="sm"
              variant="secondary"
              onPress={line.invalid.onFix}
            >
              {line.invalid.fixLabel}
            </Button>
          </Alert.Content>
        </Alert>
      )}
    </li>
  );
}
