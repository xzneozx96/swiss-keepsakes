import type { IconComponent } from "@/components/icons";

import { Drawer } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import {
  CallIcon,
  ChevronRightIcon,
  DirectionsIcon,
  EmailIcon,
  ShopIcon,
} from "@/components/icons";
import { photoUrl } from "@/lib/photos";

export interface SellerRowProps {
  /** Shop profile photo slug; until the shop adds one, a store icon stands in. */
  photo?: string;
  /** Shop name on the row, e.g. "Swiss Keepsakes Luzern". */
  name: string;
  /** Sheet heading, e.g. "Sold by Swiss Keepsakes Luzern". */
  title: string;
  /** One muted line under the name, e.g. "Seller · shop in the old town". */
  sub: string;
  /** Shop address, shown in the sheet. */
  address: string;
  /** Opening hours, shown in the sheet. */
  hours: string;
  /** Direct contact: tel:, mailto: and a map link. */
  contacts: {
    kind: "call" | "email" | "directions";
    label: string;
    href: string;
  }[];
  /** "Visit shop": the shop's gifts (one shop in Phase 1, so the gift list). */
  visitLabel: string;
}

const contactIcon: Record<
  SellerRowProps["contacts"][number]["kind"],
  IconComponent
> = {
  call: CallIcon,
  email: EmailIcon,
  directions: DirectionsIcon,
};

const rowClass =
  "flex items-center gap-4 border-b border-separator py-4 outline-none focus-visible:focus-ring";

/**
 * Seller as the Airbnb host row (owner choice 13.10.2026, Lab option B): shop photo (a
 * store icon until there is one), name and
 * one muted line with a chevron. Tapping opens a small sheet with Call, Email,
 * Directions and Visit shop, each with its own label.
 */
export function SellerRow({
  photo,
  name,
  title,
  sub,
  address,
  hours,
  contacts,
  visitLabel,
}: SellerRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-haspopup="dialog"
        className="flex w-full items-center gap-3 rounded-2xl text-start outline-none focus-visible:focus-ring"
        type="button"
        onClick={() => setOpen(true)}
      >
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-foreground text-background"
        >
          {photoUrl(photo) ? (
            <img
              alt=""
              className="size-full object-cover"
              src={photoUrl(photo)}
            />
          ) : (
            <ShopIcon size={24} />
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-semibold">{name}</span>
          <span className="truncate text-sm text-muted">{sub}</span>
        </span>
        <ChevronRightIcon aria-hidden className="shrink-0" size={20} />
      </button>

      <Drawer.Backdrop isOpen={open} onOpenChange={setOpen}>
        <Drawer.Content className="mx-auto max-w-[430px]" placement="bottom">
          <Drawer.Dialog>
            <Drawer.Handle />
            <Drawer.Header className="flex flex-col items-start gap-0.5">
              <Drawer.Heading className="text-heading">{title}</Drawer.Heading>
              <span className="text-sm text-muted">{address}</span>
              <span className="text-sm text-muted">{hours}</span>
            </Drawer.Header>
            <Drawer.Body className="flex flex-col pb-[calc(env(safe-area-inset-bottom,0px)+16px)] text-foreground">
              {contacts.map((c) => {
                const Icon = contactIcon[c.kind];

                return (
                  <a
                    key={c.kind}
                    className={rowClass}
                    href={c.href}
                    {...(c.kind === "directions" && {
                      target: "_blank",
                      rel: "noreferrer",
                    })}
                  >
                    <Icon aria-hidden size={22} />
                    <span className="flex-1 font-medium">{c.label}</span>
                    <ChevronRightIcon aria-hidden size={18} />
                  </a>
                );
              })}
              <Link className={`${rowClass} border-b-0`} to="/gifts">
                <ShopIcon aria-hidden size={22} />
                <span className="flex-1 font-medium">{visitLabel}</span>
                <ChevronRightIcon aria-hidden size={18} />
              </Link>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </>
  );
}
