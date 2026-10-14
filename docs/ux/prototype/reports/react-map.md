# React tour itinerary map

Implemented `TourItineraryMap({ tour })` in the tours feature, using the supplied `Tour.itinerary` records. No HTML preview or iframe is involved.

## Reuse and experience

- Reuses HeroUI Button, ToggleButton and Skeleton, shared Media, icon exports, `useLocale`, and `pickText` for merchant-authored language fallbacks.
- Numbered stops are real keyboard-operable marker buttons with 44px targets. Selecting a map marker or itinerary row keeps the active photo, description, pressed state, and camera together.
- MapLibre renders actual geographic vector tiles and extruded buildings from OpenFreeMap Liberty at 55° pitch. The 2D/3D toggle changes the camera; whole-route control fits all stops. Native map zoom, compass and fullscreen controls remain available.
- Swiss red route and active markers, warm stone buildings, existing serif headings, rounded map/photo treatment, and a linked stop timeline follow the incumbent design.
- EN/DE messages are in `map/messages.ts` for integration into the existing locale dictionaries. Selected stops persist across language changes.

## Lifecycle and recovery

MapLibre is dynamically imported when the map approaches the viewport. Its module worker is bundled through Vite's worker URL mechanism; no external JavaScript CDN is required. Map, marker, resize observer, intersection observer and timer are cleaned up on unmount. Cooperative gestures preserve normal page scrolling. Reduced-motion preferences disable camera animation.

The loading state becomes a localized retry state after a map initialization error or 16-second timeout. The itinerary and photos remain accessible independently of network/WebGL availability. A zero-stop tour displays a localized guide itinerary fallback.

Map attribution is retained. The route is explicitly marked a sample itinerary: connected stop coordinates are illustrative, not street-level navigation. This is true 3D building extrusion, not elevated terrain or an authored 3D miniature.

## Validation

Owned files pass TypeScript checking; the full initial check reported only two unrelated booking label errors. Owned ESLint checks run with automatic formatting fixes. Parent owns the combined app build and browser verification to avoid conflicting browser sessions.

Official references: [MapLibre building extrusion example](https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/), [OpenFreeMap quick start](https://openfreemap.org/quick_start/). Parent verified SDK version, style availability and the `building-3d` layer before implementation.
