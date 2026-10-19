import {
  EVENTS,
  HOTELS,
  PLACES,
  RESTAURANTS,
  restaurantById,
  type Interest,
  type Place,
} from "../data/places";
import { WALK_MINUTES } from "../data/walking";

import { dayLabel, dow, fmt, hoursFor, restaurantOpen, toMin } from "./hours";

export interface PlanInput {
  stay: string;
  adults: number;
  children: number;
  date: string;
  start: string;
  length: "half" | "full";
  interests: Interest[];
  diet: "any" | "veg";
  /** "less-walking", "indoor", "later", "shopping" or "lunch:<restaurant id>". */
  tweaks: string[];
}

export interface PlanItem {
  kind: "stop" | "lunch" | "move";
  id: string;
  start: string;
  end: string;
  name: string;
  text: string;
  price?: string;
  source?: string;
  tag?: string;
}

export interface Plan {
  date: string;
  dayLabel: string;
  items: PlanItem[];
  notes: string[];
  skipped: { name: string; reason: string }[];
  lunchAlternatives: { id: string; name: string }[];
  summary: { start: string; end: string; stops: number; walkMinutes: number };
  added: string[];
  removed: string[];
}

const ROUTE_ORDER = [
  "pilatus",
  "laederach",
  "rosengart",
  "kunstmuseum",
  "cruise",
  "bucherer",
  "chapel",
  "weinmarkt",
  "sprungli",
  "spreuer",
  "nadelwehr",
  "zytturm",
  "lion",
  "glacier",
  "bourbaki",
  "verkehrshaus",
];

const BUS: Record<string, { ride: number; text: (iso: string) => string }> = {
  lion: {
    ride: 4,
    text: (iso) =>
      `Bus ${iso < "2026-12-13" ? "1 or 19" : "1, 8 or 9"} to Löwenplatz, about 4 min`,
  },
  bourbaki: {
    ride: 4,
    text: (iso) =>
      `Bus ${iso < "2026-12-13" ? "1 or 19" : "1, 8 or 9"} to Löwenplatz, about 4 min`,
  },
  verkehrshaus: {
    ride: 10,
    text: (iso) =>
      `Bus ${iso < "2026-12-13" ? "6, 8 or 24" : "20, 4 or 3"} to the Verkehrshaus, about 10 min`,
  },
};

export const walkMinutes = (a: string, b: string) => {
  if (a === b) return 0;

  return WALK_MINUTES[a]?.[b] ?? WALK_MINUTES[b]?.[a] ?? 10;
};

function leg(from: string, to: Place, iso: string, walkCap: number) {
  const walk = walkMinutes(from, to.walkId);
  const bus = BUS[to.id];

  if (walk >= 15 && bus)
    return { minutes: bus.ride + 5, text: bus.text(iso), walk: 0, ok: true };

  return {
    minutes: walk,
    text: walk ? `Walk ${walk} min` : "",
    walk,
    ok: walk <= walkCap,
  };
}

function pickLunch(
  from: string,
  p: PlanInput,
  skip: Set<string>,
): {
  chosen?: (typeof RESTAURANTS)[number];
  rest: (typeof RESTAURANTS)[number][];
} {
  const override = p.tweaks.find((t) => t.startsWith("lunch:"))?.slice(6);
  const food = p.interests.includes("food");
  const rank = food
    ? [
        "taube",
        "galliker",
        "wildenmann",
        "oldswiss",
        "barbatti",
        "rathaus",
        "kanchi",
        "bachmann",
      ]
    : [
        "rathaus",
        "bachmann",
        "wildenmann",
        "barbatti",
        "taube",
        "kanchi",
        "galliker",
        "oldswiss",
      ];
  const open = RESTAURANTS.filter(
    (r) =>
      restaurantOpen(r.id, p.date) &&
      (p.diet === "any" || r.veg) &&
      !skip.has(r.id),
  ).sort(
    (a, b) =>
      rank.indexOf(a.id) * 3 +
      walkMinutes(from, a.walkId) -
      (rank.indexOf(b.id) * 3 + walkMinutes(from, b.walkId)),
  );
  const chosen = (override && open.find((r) => r.id === override)) || open[0];

  return { chosen, rest: open.filter((r) => r !== chosen).slice(0, 3) };
}

/** Builds one day. Every stop is checked against that day's published hours before it goes in. */
export function buildPlan(p: PlanInput): Plan {
  const tweaks = new Set(p.tweaks);
  const lessWalking = tweaks.has("less-walking");
  const indoorOnly = tweaks.has("indoor");
  const startMin = toMin(p.start) + (tweaks.has("later") ? 60 : 0);
  const endLimit = startMin + (p.length === "full" ? 420 : 240);
  const maxStops =
    (p.length === "full" ? 6 : 4) -
    (lessWalking ? 1 : 0) +
    (tweaks.has("shopping") ? 1 : 0);
  const base = p.stay === "none" || p.stay === "zurich" ? "station" : p.stay;
  const wantShops = p.interests.includes("shopping") || tweaks.has("shopping");
  const walkCap = lessWalking ? 10 : 25;

  const skipped: Plan["skipped"] = [];
  const pool = PLACES.filter((pl) => {
    const h = hoursFor(pl.id, p.date);
    const shop = pl.interests.length === 1 && pl.interests[0] === "shopping";
    const relevant =
      pl.core ||
      pl.interests.some((i) => p.interests.includes(i)) ||
      (wantShops && pl.interests.includes("shopping"));

    if (!relevant) return false;
    if (shop && !wantShops) return false;
    if (pl.id === "pilatus" && p.length !== "full") return false;
    if (indoorOnly && !pl.indoor) return false;
    if ("closed" in h) {
      skipped.push({ name: pl.name, reason: h.closed });

      return false;
    }
    if (pl.id === "zytturm" && (p.children > 0 || lessWalking)) {
      if (p.children > 0)
        skipped.push({
          name: pl.name,
          reason: "steep stairs, not suitable for strollers",
        });

      return false;
    }

    return true;
  });

  const score = (pl: Place) =>
    (pl.core ? 1 : 0) +
    2 * pl.interests.filter((i) => p.interests.includes(i)).length +
    (p.children > 0 && pl.family ? 1 : 0) +
    (tweaks.has("shopping") && pl.interests.includes("shopping") ? 3 : 0);
  const byRoute = (a: Place, b: Place) =>
    ROUTE_ORDER.indexOf(a.id) - ROUTE_ORDER.indexOf(b.id);

  const schedule = (chosen: Place[]) => {
    const items: PlanItem[] = [];
    const notes: string[] = [];
    let t = startMin;
    let at = base;
    let walkTotal = 0;
    let lunchDone = false;
    let lunchAlternatives: Plan["lunchAlternatives"] = [];
    let placed = 0;

    const move = (from: number, minutes: number, name: string, text = "") => {
      items.push({
        kind: "move",
        id: `move-${items.length}`,
        start: fmt(from),
        end: fmt(from + minutes),
        name,
        text,
      });
    };

    const addLunch = () => {
      lunchDone = true;
      const { chosen: r, rest } = pickLunch(at, p, new Set());

      if (!r) return;
      const walk = walkMinutes(at, r.walkId);
      const start = Math.max(t + walk, 12 * 60);

      if (start > 13 * 60 + 30) return;
      if (start - (t + walk) >= 15)
        move(t, start - walk - t, "Free time", "Until lunch");
      if (walk) {
        move(start - walk, walk, `Walk ${walk} min`);
        walkTotal += walk;
      }
      items.push({
        kind: "lunch",
        id: r.id,
        start: fmt(start),
        end: fmt(start + 70),
        name: r.name,
        text: r.note,
        price: r.price,
        source: r.source,
      });
      t = start + 70;
      at = r.walkId;
      lunchAlternatives = rest.map((x) => ({ id: x.id, name: x.name }));
      if (r.id === "taube" && p.date >= "2026-11-02" && p.date <= "2026-11-08")
        notes.push("It is Swiss Specialities Week at Wirtshaus Taube.");
    };

    for (const pl of chosen) {
      if (
        !lunchDone &&
        (t >= 11 * 60 + 45 || (pl.minutes >= 60 && t >= 11 * 60 + 15))
      )
        addLunch();
      const h = hoursFor(pl.id, p.date);

      if ("closed" in h) return null;
      const l = leg(at, pl, p.date, walkCap);

      if (!l.ok) return null;
      let arrive = t + l.minutes;

      if (pl.id === "cruise") arrive = Math.ceil((arrive - 7) / 60) * 60 + 7;
      if (arrive < h.open) arrive = h.open;
      if (arrive > h.last || arrive + pl.minutes > endLimit + 30) return null;
      const wait = arrive - (t + l.minutes);

      if (wait >= 15) move(t, wait, "Free time", `Until ${pl.name} opens`);
      if (l.minutes) {
        move(arrive - l.minutes, l.minutes, l.text);
        walkTotal += l.walk;
      }
      items.push({
        kind: "stop",
        id: pl.id,
        start: fmt(arrive),
        end: fmt(arrive + pl.minutes),
        name: pl.name,
        text: pl.fact,
        price: pl.price,
        source: pl.source,
        tag: pl.id === "cruise" ? `Departs ${fmt(arrive)}` : undefined,
      });
      placed++;
      t = arrive + pl.minutes;
      at = pl.walkId;
    }
    if (!lunchDone && startMin <= 12 * 60 + 30 && endLimit >= 13 * 60)
      addLunch();

    return { items, notes, walkTotal, lunchAlternatives, placed };
  };

  const selected: Place[] = [];

  for (const pl of [...pool].sort(
    (a, b) => score(b) - score(a) || byRoute(a, b),
  )) {
    if (selected.length >= maxStops) break;
    const trial = [...selected, pl].sort(byRoute);

    if (schedule(trial)) {
      selected.length = 0;
      selected.push(...trial);
    }
  }
  const built = schedule(selected) ?? {
    items: [],
    notes: [],
    walkTotal: 0,
    lunchAlternatives: [],
    placed: 0,
  };
  const notes = built.notes;

  if (!built.items.some((i) => i.kind === "lunch") && p.length === "full")
    notes.push(
      "No lunch stop fits between these stops, so plan to eat on the way.",
    );
  EVENTS.filter((e) => p.date >= e.from && p.date <= e.to).forEach((e) =>
    notes.push(e.text),
  );
  if (p.date >= "2026-12-05" && p.date <= "2027-01-05")
    notes.push("Daylight is short: the sun sets around 16:40 in mid-December.");
  if (dow(p.date) === 0 && wantShops)
    notes.push(
      "Most shops are closed on Sundays. Station shops and Sprüngli (from 11:00) are open.",
    );
  if (
    p.date <= "2026-10-31" &&
    p.interests.some((i) => i === "food" || i === "scenic")
  )
    notes.push(
      "Evening idea: the Stadtkeller folk show, 20:00 until the end of October. Book on +41 41 410 47 33.",
    );
  if (p.stay === "zurich")
    notes.push(
      "Trains back to Zürich run twice an hour and take 42 to 50 minutes.",
    );

  const stops = built.items.filter(
    (i) => i.kind === "stop" || i.kind === "lunch",
  );

  return {
    date: p.date,
    dayLabel: dayLabel(p.date),
    items: built.items,
    notes,
    skipped,
    lunchAlternatives: built.lunchAlternatives,
    summary: {
      start: built.items[0]?.start ?? fmt(startMin),
      end: built.items.at(-1)?.end ?? fmt(startMin),
      stops: stops.length,
      walkMinutes: built.walkTotal,
    },
    added: [],
    removed: [],
  };
}

/** The plan for the current tweaks, with what changed against the plan before the last tweak. */
export function buildWithDiff(p: PlanInput): Plan {
  const plan = buildPlan(p);

  if (!p.tweaks.length) return plan;
  const before = buildPlan({ ...p, tweaks: p.tweaks.slice(0, -1) });
  const names = (x: Plan) =>
    new Map(
      x.items.filter((i) => i.kind !== "move").map((i) => [i.id, i.name]),
    );
  const prev = names(before);
  const now = names(plan);

  return {
    ...plan,
    added: [...now].filter(([id]) => !prev.has(id)).map(([, n]) => n),
    removed: [...prev].filter(([id]) => !now.has(id)).map(([, n]) => n),
  };
}

export const hotelName = (id: string) =>
  id === "none"
    ? "the station area"
    : id === "zurich"
      ? "Luzerne station (day trip from Zürich)"
      : (HOTELS.find((h) => h.id === id)?.name ?? id);

export const lunchById = restaurantById;
