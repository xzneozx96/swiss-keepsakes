import type { Map as MapLibreMap, Marker } from "maplibre-gl";

import { Button, Spinner } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

import { addRoute, pinElement, reducedMotion, setRoute } from "./map-shared";

import { CloseIcon, PlusIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { loadAerialStyle } from "@/features/tours/map/aerial-style";
import { useLatest } from "@/hooks/use-latest";

import "maplibre-gl/dist/maplibre-gl.css";
import "@/features/tours/map/tour-itinerary-map.css";

export type Coordinates = [number, number];

export interface PinStop {
  id: string;
  coordinates: Coordinates;
  /** The name as shown in the interface language; only used for the pin's label. */
  name: string;
}

type MapState = "loading" | "ready" | "error";

/** Luzerne's old town, where an empty tour starts. */
const LUCERNE: Coordinates = [8.3093, 47.0502];
const STOP_ZOOM = 16.2;

/**
 * The itinerary editor's map: the guest map's aerial photo, numbered pins and dashed route,
 * seen from above so pins are easy to place. Pins are numbered by their position in `stops`
 * (as the guest map numbers them). Select a pin to select its stop, drag it to move it,
 * and "Drop a pin" then a tap adds a stop. The map is created once; stops, selection and
 * callbacks reach it through refs, so typing in a card never rebuilds it. If the map cannot
 * load, a notice with "Reload map" says so and the list carries on without it.
 */
export function ItineraryMap({
  stops,
  selectedId,
  onSelect,
  onMove,
  onDrop,
}: {
  stops: PinStop[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, coordinates: Coordinates) => void;
  onDrop: (coordinates: Coordinates) => void;
}) {
  const { t } = useLocale();
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef(new Map<string, Marker>());
  const [mapState, setMapState] = useState<MapState>("loading");
  const [attempt, setAttempt] = useState(0);
  const [dropping, setDropping] = useState(false);

  const live = useLatest({
    stops,
    selectedId,
    onSelect,
    onMove,
    onDrop,
    dropping,
  });
  const translations = useLatest(t);

  useEffect(() => {
    const container = canvasRef.current;

    if (!container) return;
    let disposed = false;
    let map: MapLibreMap | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const markers = markersRef.current;

    setMapState("loading");
    (async () => {
      try {
        const styleLoading = loadAerialStyle();
        const { Map, NavigationControl, LngLatBounds, setWorkerUrl } =
          await import("maplibre-gl");

        if (disposed) return;
        setWorkerUrl(workerUrl);
        const copy = translations.current;
        const style = await styleLoading;

        if (disposed) return;
        const { stops: initial, selectedId: initialId } = live.current;
        const start =
          initial.find((stop) => stop.id === initialId) ?? initial[0];

        map = new Map({
          container,
          style,
          center: start?.coordinates ?? LUCERNE,
          zoom: start ? STOP_ZOOM : 12,
          pitch: 0,
          maxPitch: 0,
          dragRotate: false,
          cooperativeGestures: true,
          attributionControl: { compact: true },
          locale: {
            "NavigationControl.ZoomIn": copy("products.itinerary.map.zoomIn"),
            "NavigationControl.ZoomOut": copy("products.itinerary.map.zoomOut"),
            "CooperativeGesturesHandler.WindowsHelpText": copy(
              "products.itinerary.map.wheel",
            ),
            "CooperativeGesturesHandler.MacHelpText": copy(
              "products.itinerary.map.wheelMac",
            ),
            "CooperativeGesturesHandler.MobileHelpText": copy(
              "products.itinerary.map.touch",
            ),
          },
        });
        mapRef.current = map;
        const created = map;

        created.addControl(
          new NavigationControl({ showCompass: false }),
          "top-right",
        );
        created
          .getCanvas()
          .setAttribute("aria-label", copy("products.itinerary.map.label"));
        created.on("load", () => {
          if (disposed) return;
          clearTimeout(timeout);
          addRoute(
            created,
            live.current.stops.map((stop) => stop.coordinates),
          );
          // Selected stop: the map already opened on it. Otherwise frame the whole route.
          if (!initialId && initial.length > 1) {
            const bounds = new LngLatBounds(
              initial[0].coordinates,
              initial[0].coordinates,
            );

            initial.forEach((stop) => bounds.extend(stop.coordinates));
            created.fitBounds(bounds, {
              padding: 48,
              maxZoom: 16,
              duration: 0,
            });
          }
          setMapState("ready");
        });
        created.on("click", (event) => {
          const { dropping: active, onDrop: drop } = live.current;
          const target = event.originalEvent.target as HTMLElement | null;

          if (!active || target?.closest(".tour-map-marker")) return;
          setDropping(false);
          drop([event.lngLat.lng, event.lngLat.lat]);
        });
        created.on("error", () => {
          if (!disposed && !created.isStyleLoaded()) setMapState("error");
        });
        timeout = setTimeout(() => {
          if (!disposed) setMapState("error");
        }, 16000);
        resizeObserver = new ResizeObserver(() => created.resize());
        resizeObserver.observe(container);
      } catch {
        if (!disposed) setMapState("error");
      }
    })();

    return () => {
      disposed = true;
      clearTimeout(timeout);
      resizeObserver?.disconnect();
      markers.forEach((marker) => marker.remove());
      markers.clear();
      map?.remove();
      mapRef.current = null;
    };
  }, [attempt, live, translations]);

  // Pins and route follow the stops (position = number); only changed pins are touched.
  const signature = stops
    .map((stop) => `${stop.id}@${stop.coordinates.join(",")}`)
    .join("|");

  useEffect(() => {
    const map = mapRef.current;

    if (!map || mapState !== "ready") return;
    let cancelled = false;

    void import("maplibre-gl").then(({ Marker }) => {
      if (cancelled) return;
      const markers = markersRef.current;
      const ids = new Set(live.current.stops.map((stop) => stop.id));

      markers.forEach((marker, id) => {
        if (ids.has(id)) return;
        marker.remove();
        markers.delete(id);
      });
      live.current.stops.forEach((stop, index) => {
        const label = `${translations.current("products.itinerary.stop.number", { n: index + 1 })}: ${stop.name}`;
        let marker = markers.get(stop.id);

        if (!marker) {
          const element = pinElement(index + 1, label, false);

          element.addEventListener("click", () =>
            live.current.onSelect(stop.id),
          );
          marker = new Marker({
            element,
            anchor: "center",
            draggable: true,
          })
            .setLngLat(stop.coordinates)
            .addTo(map);
          marker.on("dragend", () => {
            const { lng, lat } = (marker as Marker).getLngLat();

            live.current.onMove(stop.id, [lng, lat]);
          });
          markers.set(stop.id, marker);
        } else {
          const at = marker.getLngLat();

          if (at.lng !== stop.coordinates[0] || at.lat !== stop.coordinates[1])
            marker.setLngLat(stop.coordinates);
        }
        const element = marker.getElement();

        element.textContent = String(index + 1);
        element.setAttribute(
          "aria-pressed",
          String(stop.id === live.current.selectedId),
        );
        element.setAttribute("aria-label", label);
      });
      setRoute(
        map,
        live.current.stops.map((stop) => stop.coordinates),
      );
    });

    return () => {
      cancelled = true;
    };
    // `signature` stands for the stops' ids, order and positions; names only relabel (below).
  }, [signature, mapState, live, translations]);

  const names = stops.map((stop) => stop.name).join("|");

  useEffect(() => {
    live.current.stops.forEach((stop, index) => {
      markersRef.current
        .get(stop.id)
        ?.getElement()
        .setAttribute(
          "aria-label",
          `${t("products.itinerary.stop.number", { n: index + 1 })}: ${stop.name}`,
        );
    });
  }, [names, t, live]);

  // Selection: the selected pin turns red and the camera goes to it.
  useEffect(() => {
    markersRef.current.forEach((marker, id) =>
      marker
        .getElement()
        .setAttribute("aria-pressed", String(id === selectedId)),
    );
    const map = mapRef.current;
    const stop = live.current.stops.find((s) => s.id === selectedId);

    if (!map || mapState !== "ready" || !stop) return;
    map.flyTo({
      center: stop.coordinates,
      zoom: Math.max(map.getZoom(), 15.5),
      duration: reducedMotion() ? 0 : 800,
    });
  }, [selectedId, mapState, live]);

  useEffect(() => {
    const canvas = mapRef.current?.getCanvas();

    if (canvas) canvas.style.cursor = dropping ? "crosshair" : "";
    if (!dropping) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDropping(false);
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [dropping, mapState]);

  return (
    <div className="tour-itinerary relative isolate h-[min(52svh,340px)] min-h-72 overflow-hidden rounded-2xl bg-surface-tertiary lg:h-[420px]">
      <div ref={canvasRef} className="tour-map-canvas" />
      {mapState === "loading" && (
        <div
          aria-live="polite"
          className="absolute inset-0 grid place-items-center bg-surface-tertiary/70"
          role="status"
        >
          <span className="flex items-center gap-2 rounded-full bg-surface px-4 py-2 text-sm shadow-surface">
            <Spinner size="sm" />
            {t("products.itinerary.map.loading")}
          </span>
        </div>
      )}
      {mapState === "error" && (
        <div
          className="absolute inset-0 grid place-items-center bg-surface-secondary p-6"
          role="alert"
        >
          <div className="flex max-w-xs flex-col items-center gap-3 text-center">
            <p className="text-sm text-pretty text-muted">
              {t("products.itinerary.map.unavailable")}
            </p>
            <Button
              size="sm"
              variant="tertiary"
              onPress={() => setAttempt((n) => n + 1)}
            >
              {t("products.itinerary.map.retry")}
            </Button>
          </div>
        </div>
      )}
      {mapState === "ready" && (
        <div className="absolute start-3 top-3 flex flex-col items-start gap-2">
          <Button
            className="min-h-11 shadow-surface"
            variant={dropping ? "primary" : "secondary"}
            onPress={() => setDropping((on) => !on)}
          >
            {dropping ? (
              <CloseIcon aria-hidden size={16} />
            ) : (
              <PlusIcon aria-hidden size={16} />
            )}
            {t(
              dropping
                ? "products.itinerary.drop.cancel"
                : "products.itinerary.drop.start",
            )}
          </Button>
          {dropping && (
            <p
              className="rounded-xl bg-surface px-3 py-2 text-sm shadow-surface"
              role="status"
            >
              {t("products.itinerary.drop.hint")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
