import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";

/**
 * What the editor map shares with the guest itinerary map (tour-itinerary-map.tsx): the
 * aerial style (aerial-style.ts), the `tour-map-marker` pin (tour-itinerary-map.css) and the
 * dashed red route. The guest file stays as it is; these are the same values, so a pin
 * looks the same in both.
 */
export const ROUTE_SOURCE = "tour-route";

export const routeData = (coordinates: [number, number][]) =>
  ({
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates },
  }) as const;

export function addRoute(map: MapLibreMap, coordinates: [number, number][]) {
  map.addSource(ROUTE_SOURCE, {
    type: "geojson",
    data: routeData(coordinates),
  });
  map.addLayer({
    id: "tour-route-halo",
    type: "line",
    source: ROUTE_SOURCE,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: { "line-color": "#fffaf4", "line-width": 8, "line-opacity": 0.9 },
  });
  map.addLayer({
    id: "tour-route-line",
    type: "line",
    source: ROUTE_SOURCE,
    layout: { "line-cap": "round", "line-join": "round" },
    paint: {
      "line-color": "#d52b1e",
      "line-width": 4,
      "line-dasharray": [2, 1],
    },
  });
}

export function setRoute(map: MapLibreMap, coordinates: [number, number][]) {
  (map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined)?.setData(
    routeData(coordinates),
  );
}

/** A numbered pin, the guest map's button. */
export function pinElement(number: number, label: string, selected: boolean) {
  const button = document.createElement("button");

  button.type = "button";
  button.className = "tour-map-marker";
  button.textContent = String(number);
  button.setAttribute("aria-label", label);
  button.setAttribute("aria-pressed", String(selected));

  return button;
}

export const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
