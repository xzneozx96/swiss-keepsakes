import type { Language } from "@/contexts/locale-context";
import type { TourStop } from "@/features/tours/types";
import type { useTourEditor } from "../../hooks/use-tour-editor";
import type { Coordinates } from "./itinerary-map";
import type { Place } from "./use-place-search";

import { useEffect, useRef, useState } from "react";

import { ItineraryMap } from "./itinerary-map";
import { reducedMotion } from "./map-shared";
import { PlaceSearch } from "./place-search";
import { StopCard } from "./stop-card";
import { useStopDrag } from "./use-stop-drag";

import { BookingsIcon } from "@/components/icons";
import { useConfirm } from "@/components/confirm-dialog";
import { useLocale } from "@/contexts/locale-context";
import { DetailCard } from "@/features/merchant/order-detail/components/detail-card";
import { pickText } from "@/lib/localized";

type Editor = ReturnType<typeof useTourEditor>;

const stopId = () =>
  `stop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function BareFrame({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

function CardFrame({ children }: { children: React.ReactNode }) {
  const { t } = useLocale();

  return (
    <DetailCard icon={BookingsIcon} title={t("products.field.itinerary")}>
      {children}
    </DetailCard>
  );
}

/**
 * Step 2's itinerary (owner reference: Wanderlog): search a place or drop a pin to add a
 * stop; the map above and the numbered list below are the same stops in the same order,
 * and selecting one selects the other. The list is the source of truth, so every stop stays
 * editable when the map cannot load.
 */
export function ItineraryCard({
  editor,
  language,
  bare = false,
}: {
  editor: Editor;
  language: Language;
  /** Without its card frame, to sit inside a sheet. */
  bare?: boolean;
}) {
  const { t } = useLocale();
  const { confirm, dialog } = useConfirm();
  const { edit, change, stopId: selectedId, selectStop } = editor;
  const stops = edit.itinerary;
  const listRef = useRef<HTMLOListElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [announcement, setAnnouncement] = useState("");
  // What to do to a card once it exists: focus its name (a dropped pin has none) or a mover.
  const afterRender = useRef<(() => void) | null>(null);
  const nameOf = (stop: TourStop) => pickText(stop.name, language).text;

  useEffect(() => {
    afterRender.current?.();
    afterRender.current = null;
  });

  const card = (id: string) =>
    listRef.current?.querySelector<HTMLElement>(`[data-stop="${id}"]`);

  // The selected card stays in view, whether it was chosen on the map or in the list.
  useEffect(() => {
    if (!selectedId) return;
    const frame = requestAnimationFrame(() =>
      card(selectedId)?.scrollIntoView({
        block: "nearest",
        behavior: reducedMotion() ? "auto" : "smooth",
      }),
    );

    return () => cancelAnimationFrame(frame);
  }, [selectedId]);

  const patch = (id: string, next: Partial<TourStop>) =>
    change({
      itinerary: stops.map((stop) =>
        stop.id === id ? { ...stop, ...next } : stop,
      ),
    });

  const add = (coordinates: Coordinates, name?: string) => {
    const last = stops[stops.length - 1];
    const stop: TourStop = {
      id: stopId(),
      name: name ? { en: name, de: name } : {},
      description: {},
      minutesFromStart: last ? last.minutesFromStart + 10 : 0,
      coordinates,
      photo: "",
    };

    change({ itinerary: [...stops, stop] });
    selectStop(stop.id);
    setAnnouncement(
      t("products.itinerary.live.added", {
        n: stops.length + 1,
        name: name ?? t("products.itinerary.stop.unnamed"),
      }),
    );
    // A dropped pin has no name yet: start typing it.
    if (!name)
      afterRender.current = () =>
        card(stop.id)?.querySelector<HTMLElement>("input")?.focus();
  };

  /** One stop to a new place: the arrows (one step) and the drag handle (anywhere) both end here. */
  const moveTo = (
    from: number,
    to: number,
    refocus: "arrow" | "grip" = "grip",
  ) => {
    if (to < 0 || to >= stops.length || to === from) return;
    const next = [...stops];
    const [moved] = next.splice(from, 1);

    next.splice(to, 0, moved);
    change({ itinerary: next });
    setAnnouncement(t("products.itinerary.live.moved", { n: to + 1 }));

    // The card moved in the DOM; give its button back the focus.
    afterRender.current = () => {
      const buttons = card(moved.id)?.querySelectorAll<HTMLButtonElement>(
        "[data-move]",
      );
      const same = card(moved.id)?.querySelector<HTMLButtonElement>(
        `[data-move="${to < from ? "up" : "down"}"]`,
      );

      if (refocus === "grip")
        card(moved.id)
          ?.querySelector<HTMLButtonElement>("[data-grip]")
          ?.focus();
      else (same && !same.disabled ? same : buttons?.[0])?.focus();
      card(moved.id)?.scrollIntoView({
        block: "nearest",
        behavior: reducedMotion() ? "auto" : "smooth",
      });
    };
  };

  const drag = useStopDrag({
    listRef,
    placeholderRef,
    // An open card folds while it is dragged (and so does its pin's selection).
    onStart: (index) => {
      if (stops[index]?.id === selectedId) selectStop(null);
    },
    onDrop: (from, to) => moveTo(from, to, "grip"),
  });

  const remove = async (stop: TourStop) => {
    const confirmed = await confirm({
      title: t("products.itinerary.confirm.title", {
        name: nameOf(stop) || t("products.itinerary.stop.unnamed"),
      }),
      body: t("products.itinerary.confirm.body"),
      confirmLabel: t("products.itinerary.confirm.action"),
    });

    if (!confirmed) return;
    change({ itinerary: stops.filter((s) => s.id !== stop.id) });
    if (selectedId === stop.id) selectStop(null);
    setAnnouncement(t("products.itinerary.live.removed"));
  };

  const Frame = bare ? BareFrame : CardFrame;

  return (
    <Frame>
      <p className="text-sm text-pretty text-muted">
        {t("products.itinerary.hint")}
      </p>
      <PlaceSearch
        onPick={(place: Place) => add(place.coordinates, place.name)}
      />
      <ItineraryMap
        selectedId={selectedId}
        stops={stops.map((stop) => ({
          id: stop.id,
          coordinates: stop.coordinates,
          name: nameOf(stop) || t("products.itinerary.stop.unnamed"),
        }))}
        onDrop={(coordinates) => add(coordinates)}
        onMove={(id, coordinates) => {
          patch(id, { coordinates });
          setAnnouncement(
            t("products.itinerary.live.pin", {
              n: stops.findIndex((s) => s.id === id) + 1,
            }),
          );
        }}
        onSelect={selectStop}
      />
      {stops.length ? (
        <div className="relative">
          <ol
            ref={listRef}
            aria-label={t("products.itinerary.list")}
            className="flex flex-col"
          >
            {stops.map((stop, index) => (
              <StopCard
                key={stop.id}
                count={stops.length}
                gripProps={drag.handleProps(index)}
                index={index}
                language={language}
                nameError={editor.textError("itinerary", language, stop.name)}
                selected={stop.id === selectedId}
                stop={stop}
                textError={editor.textError(
                  "itinerary",
                  language,
                  stop.description,
                )}
                onChange={(next) => patch(stop.id, next)}
                onMove={(direction, refocus = "arrow") =>
                  moveTo(index, index + direction, refocus)
                }
                onRemove={() => void remove(stop)}
                onSelect={() =>
                  selectStop(stop.id === selectedId ? null : stop.id)
                }
              />
            ))}
          </ol>
          {/* The slot a dragged card will land in (see useStopDrag). */}
          <div
            ref={placeholderRef}
            aria-hidden
            hidden
            className="pointer-events-none absolute start-12 end-0 rounded-2xl border-2 border-dashed border-accent bg-accent/10"
          />
        </div>
      ) : (
        <p className="rounded-2xl bg-surface-secondary p-4 text-sm text-muted">
          {t("products.itinerary.empty")}
        </p>
      )}
      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>
      {dialog}
    </Frame>
  );
}
