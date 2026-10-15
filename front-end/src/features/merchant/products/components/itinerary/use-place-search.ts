import { useEffect, useState } from "react";

export interface Place {
  /** Stable key: the search server's id plus origin. */
  key: string;
  name: string;
  /** Kind and area, e.g. "Historisches Areal · (LU) - Luzern". */
  detail: string;
  /** [lng, lat], as a stop stores it. */
  coordinates: [number, number];
}

export type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "done"; places: Place[] };

/** swisstopo's SearchServer: free, no key, CORS open. Streets and addresses in Switzerland. */
const ENDPOINT = "https://api3.geo.admin.ch/rest/services/api/SearchServer";
const ORIGINS = "gazetteer,address,zipcode";
const MIN_LENGTH = 2;
const DEBOUNCE_MS = 300;

interface Hit {
  id: number;
  attrs: { label: string; lat: number; lon: number; origin: string };
}

const TAG = /<[^>]*>/g;
const clean = (html: string) =>
  html.replace(TAG, "").replace(/\s+/g, " ").trim();

/**
 * Labels arrive as HTML (`<i>Kind</i> <b>Name</b> (LU) - Town`). The bold text is the name;
 * what is left is the detail. Text is taken apart with a pattern, never rendered as HTML.
 */
function toPlace(hit: Hit): Place {
  const bold = /<b>([\s\S]*?)<\/b>/.exec(hit.attrs.label);
  const full = clean(hit.attrs.label);
  // An address reads "Kapellbrücke 1, 6004 Luzern": the bold part alone is only the town.
  const name = bold && hit.attrs.origin === "gazetteer" ? clean(bold[1]) : full;
  const detail =
    name === full
      ? ""
      : clean(hit.attrs.label.replace(/<b>[\s\S]*?<\/b>/, " "));

  return {
    key: `${hit.attrs.origin}-${hit.id}`,
    name: name || full,
    detail,
    coordinates: [hit.attrs.lon, hit.attrs.lat],
  };
}

/** The same name, detail and spot (to ~1 m) is one result. */
function unique(places: Place[]) {
  const seen = new Set<string>();

  return places.filter((place) => {
    const id = `${place.name}|${place.detail}|${place.coordinates[0].toFixed(5)}|${place.coordinates[1].toFixed(5)}`;

    if (seen.has(id)) return false;
    seen.add(id);

    return true;
  });
}

/** Debounced place search; a newer query (or unmount) aborts the one in flight. */
export function usePlaceSearch(query: string, attempt = 0): SearchState {
  const text = query.trim();
  const [state, setState] = useState<SearchState>({ status: "idle" });

  useEffect(() => {
    if (text.length < MIN_LENGTH) {
      setState({ status: "idle" });

      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setState({ status: "loading" });
      try {
        const url = new URL(ENDPOINT);

        url.search = new URLSearchParams({
          searchText: text,
          type: "locations",
          limit: "8",
          sr: "4326",
          origins: ORIGINS,
        }).toString();
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) throw new Error(String(response.status));
        const body = (await response.json()) as { results?: Hit[] };

        setState({
          status: "done",
          places: unique((body.results ?? []).map(toPlace)).slice(0, 6),
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setState({ status: "error" });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, attempt]);

  return state;
}
