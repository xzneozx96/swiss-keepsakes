export type Interest = "scenic" | "culture" | "food" | "shopping" | "relaxing";

export const INTERESTS: { id: Interest; label: string }[] = [
  { id: "scenic", label: "Scenic views" },
  { id: "culture", label: "History & culture" },
  { id: "food", label: "Local food" },
  { id: "shopping", label: "Shopping" },
  { id: "relaxing", label: "Relaxing" },
];

export interface Hotel {
  id: string;
  name: string;
  area: string;
  address: string;
}

// Verified live on the hotels' own sites, 16 Oct 2026.
export const HOTELS: Hotel[] = [
  {
    id: "schweizerhof",
    name: "Hotel Schweizerhof Luzern",
    area: "Lakefront",
    address: "Schweizerhofquai 3",
  },
  {
    id: "balances",
    name: "Hotel des Balances",
    area: "Old Town, on the Reuss",
    address: "Weinmarkt",
  },
  {
    id: "wildenmann",
    name: "Romantik Hotel Wilden Mann",
    area: "Old Town",
    address: "Bahnhofstrasse 30",
  },
  {
    id: "waldstaetterhof",
    name: "Hotel Waldstätterhof",
    area: "Next to the station",
    address: "Zentralstrasse 4",
  },
  {
    id: "radisson",
    name: "Radisson Blu Hotel Luzerne",
    area: "Station and KKL",
    address: "Inseliquai 12",
  },
  {
    id: "montana",
    name: "Art Deco Hotel Montana",
    area: "Hillside above the lake",
    address: "Adligenswilerstrasse 22",
  },
];

export interface Place {
  id: string;
  name: string;
  /** Key into WALK_MINUTES. */
  walkId: string;
  minutes: number;
  indoor: boolean;
  /** Core Old Town stops that every plan can fall back on. */
  core?: boolean;
  family?: boolean;
  interests: Interest[];
  price: string;
  fact: string;
  source: string;
}

export const PLACES: Place[] = [
  {
    id: "pilatus",
    name: "Pilatus Dragon Ride",
    walkId: "station",
    minutes: 210,
    indoor: false,
    interests: ["scenic", "relaxing"],
    price:
      "Winter return from Kriens CHF 60, children 6–15 CHF 30, under 6 free",
    fact: "Bus 1 to Kriens, then the gondola and the Dragon Ride cable car (3 min 39 s) up to Pilatus Kulm.",
    source: "https://pilatus.ch/en/railway-cableways/timetable",
  },
  {
    id: "laederach",
    name: "Läderach chocolate, Luzerne station",
    walkId: "station",
    minutes: 20,
    indoor: true,
    interests: ["shopping"],
    price: "Shop",
    fact: "Station shops stay open on Sundays, so this is the chocolate stop on any day.",
    source:
      "https://www.sbb.ch/de/reiseinformationen/bahnhoefe/bahnhof-finden/bahnhof-luzern/geschaefte/shop-detail.html/geo-laederach-chocolatier-suisse-045d",
  },
  {
    id: "rosengart",
    name: "Museum Sammlung Rosengart",
    walkId: "rosengart",
    minutes: 90,
    indoor: true,
    interests: ["culture"],
    price: "Adult CHF 20, ages 7–16 CHF 10",
    fact: "A private collection of modern art, three minutes from the station.",
    source: "https://www.rosengart.ch",
  },
  {
    id: "kunstmuseum",
    name: "Kunstmuseum Luzern",
    walkId: "pier",
    minutes: 75,
    indoor: true,
    interests: ["culture"],
    price:
      "Adult CHF 15, free to age 16, free on the first Sunday of the month",
    fact: "Luzerne's art museum, in the KKL building by the lake.",
    source: "https://www.kunstmuseumluzern.ch",
  },
  {
    id: "cruise",
    name: "Short Catamaran Cruise",
    walkId: "pier",
    minutes: 55,
    indoor: false,
    family: true,
    interests: ["scenic", "relaxing"],
    price: "Ticket price: see lakelucerne.ch",
    fact: "55 minutes from Pier 3, in front of the KKL, to Kehrsiten-Bürgenstock and back, with views of the city, Bürgenstock, Rigi and Pilatus.",
    source:
      "https://webshop.lakelucerne.ch/en/products/round-trip-buergenstock",
  },
  {
    id: "bucherer",
    name: "Bucherer watches, Schwanenplatz",
    walkId: "bucherer",
    minutes: 30,
    indoor: true,
    interests: ["shopping"],
    price: "Shop",
    fact: "The Luzerne flagship store, Schwanenplatz 5.",
    source: "https://www.longines.com/de-ch/store/id/bucherer-luzern-173757",
  },
  {
    id: "chapel",
    name: "Chapel Bridge and Water Tower",
    walkId: "chapel",
    minutes: 30,
    indoor: false,
    core: true,
    family: true,
    interests: ["scenic", "culture"],
    price: "Free",
    fact: "A 14th-century covered bridge with painted panels. The Water Tower beside it is older, from around 1300. A fire on 18 Aug 1993 destroyed most of the bridge, and it reopened on 14 Apr 1994.",
    source:
      "https://www.luzern.com/en/the-city/sights/top-sights/lucernes-landmarks-the-chapel-bridge-and-its-water-tower",
  },
  {
    id: "weinmarkt",
    name: "Weinmarkt square",
    walkId: "weinmarkt",
    minutes: 15,
    indoor: false,
    core: true,
    interests: ["culture"],
    price: "Free",
    fact: "A market square recorded around 1300, with a late-Gothic fountain of 1481 and the guild house Zunfthaus zur Metzgern at no. 3.",
    source: "https://www.zunfthaus-zur-metzgern.ch/zum-gebaeude/geschichte",
  },
  {
    id: "sprungli",
    name: "Confiserie Sprüngli",
    walkId: "spruengli",
    minutes: 30,
    indoor: true,
    interests: ["shopping", "food"],
    price: "Shop and café",
    fact: "Hertensteinstrasse 62. Open on Sundays from 11:00.",
    source: "https://spruengli.ch/de/store/luzern-hertensteinstrasse",
  },
  {
    id: "spreuer",
    name: "Spreuer Bridge",
    walkId: "spreuer",
    minutes: 15,
    indoor: false,
    core: true,
    interests: ["culture", "scenic"],
    price: "Free",
    fact: "Built around 1408. Its 65 Dance of Death panels were painted by Caspar Meglinger between 1625 and 1635.",
    source:
      "https://www.luzern.com/en/the-city/sights/top-sights/spreuer-bridge",
  },
  {
    id: "nadelwehr",
    name: "Needle Dam (Nadelwehr)",
    walkId: "nadelwehr",
    minutes: 10,
    indoor: false,
    core: true,
    interests: ["culture", "scenic"],
    price: "Free",
    fact: "Built 1859–1861. The water level of Lake Luzerne is still regulated by setting and removing timber needles by hand.",
    source: "https://www.luzern.com/en/the-city/sights/top-sights/needle-dam",
  },
  {
    id: "zytturm",
    name: "Zytturm clock tower",
    walkId: "zytturm",
    minutes: 30,
    indoor: false,
    interests: ["culture", "scenic"],
    price: "Free",
    fact: "Its clock, from 1535, strikes the hour one minute before every other clock in the city. The tower has 104 steps and is not suitable for strollers.",
    source: "https://www.museggmauer.ch/zytturm/",
  },
  {
    id: "lion",
    name: "Lion Monument",
    walkId: "lion",
    minutes: 25,
    indoor: false,
    core: true,
    family: true,
    interests: ["culture", "scenic"],
    price: "Free",
    fact: "Inaugurated in 1821 for the Swiss Guards killed in Paris on 10 Aug 1792. Mark Twain called it the most mournful and moving piece of stone in the world.",
    source:
      "https://www.luzern.com/de/stadt/sehenswuerdigkeiten/top-sehenswuerdigkeiten/loewendenkmal",
  },
  {
    id: "glacier",
    name: "Gletschergarten (Glacier Garden)",
    walkId: "lion",
    minutes: 90,
    indoor: true,
    family: true,
    interests: ["culture"],
    price: "Adult CHF 24, ages 6–16 CHF 12, under 6 free",
    fact: "Right next to the Lion Monument, partly indoors, so it works in any weather.",
    source:
      "https://gletschergarten.ch/de/besuch/besucherinfos/eintrittspreise",
  },
  {
    id: "bourbaki",
    name: "Bourbaki Panorama",
    walkId: "bourbaki",
    minutes: 50,
    indoor: true,
    interests: ["culture"],
    price: "Adult CHF 15, ages 6–16 CHF 7",
    fact: "A 112 m × 10 m circular painting from 1881, next to the Lion Monument.",
    source: "https://www.bourbakipanorama.ch",
  },
  {
    id: "verkehrshaus",
    name: "Swiss Museum of Transport",
    walkId: "verkehrshaus",
    minutes: 150,
    indoor: true,
    family: true,
    interests: ["culture", "relaxing"],
    price: "Adult CHF 37, under 16 CHF 16, under 6 free",
    fact: "Switzerland's biggest museum of transport, Haldenstrasse 44. A good rainy-day choice for children.",
    source: "https://www.verkehrshaus.ch",
  },
];

export const placeById = (id: string) => PLACES.find((p) => p.id === id);

export interface Restaurant {
  id: string;
  name: string;
  walkId: string;
  /** Days the restaurant is closed, 0 = Sunday. */
  closedOn: number[];
  veg: boolean;
  price: string;
  note: string;
  phone: string;
  bookUrl?: string;
  source?: string;
}

export const RESTAURANTS: Restaurant[] = [
  {
    id: "taube",
    name: "Wirtshaus Taube",
    walkId: "taube",
    closedOn: [],
    veg: true,
    price: "Mains about CHF 28.50–58.50. Chügelipastetli CHF 41.50",
    note: "By the Reuss next to the Needle Dam, with Luzerne and Swiss dishes.",
    phone: "+41 41 210 07 47",
    bookUrl: "https://www.taube-luzern.ch/",
    source:
      "https://www.taube-luzern.ch/pdf/menu/Taube_2026_Herbstkarte_CH-DE-EN_web.pdf",
  },
  {
    id: "galliker",
    name: "Wirtshaus Galliker",
    walkId: "galliker",
    closedOn: [0, 1],
    veg: false,
    price: "Luzerne classics such as Chügelipastetli",
    note: "A traditional Luzerne tavern near the Spreuer Bridge. The family has run it since 1856.",
    phone: "+41 41 240 10 02",
    source: "https://wirtshaus-galliker.ch/en/tradition",
  },
  {
    id: "wildenmann",
    name: "Wilden Mann, Burgerstube",
    walkId: "wildenmann",
    closedOn: [],
    veg: true,
    price: "Mains CHF 36–52. Weekday two-course lunch around CHF 28",
    note: "First mentioned in 1517, set in seven interlocking houses. The Burgerstube serves Luzerne dishes.",
    phone: "+41 41 210 16 66",
    bookUrl:
      "https://guest.foratable.com/restaurants/ab10890dbb1fc2d661005da5c716e5d8",
    source: "https://www.wilden-mann.ch/essen",
  },
  {
    id: "oldswiss",
    name: "Old Swiss House",
    walkId: "oldswiss",
    closedOn: [0, 1],
    veg: false,
    price: "Mains CHF 51–69. Wiener Schnitzel CHF 66",
    note: "Next to the Lion Monument, known for its Wiener Schnitzel. 14 GaultMillau points.",
    phone: "+41 41 410 61 71",
    source: "https://www.oldswisshouse.ch/kueche/auszeichnungen/",
  },
  {
    id: "rathaus",
    name: "Rathaus Brauerei",
    walkId: "rathaus",
    closedOn: [],
    veg: true,
    price: "Mains about CHF 24–47.50",
    note: "Beer brewed in copper kettles in the Town Hall, and sent through a 70 m underground pipe.",
    phone: "+41 41 410 61 11",
  },
  {
    id: "barbatti",
    name: "Ristorante Barbatti",
    walkId: "barbatti",
    closedOn: [],
    veg: true,
    price: "Pasta CHF 22–39, mains CHF 45–59",
    note: "A Venetian kitchen in the Old Town, with vegetarian dishes marked on the menu.",
    phone: "+41 41 410 13 41",
  },
  {
    id: "kanchi",
    name: "Restaurant Kanchi",
    walkId: "kanchi",
    closedOn: [],
    veg: true,
    price: "Vegetarian menu CHF 42 per person",
    note: "Indian restaurant at Löwenplatz.",
    phone: "+41 41 410 67 08",
  },
  {
    id: "bachmann",
    name: "Confiserie Bachmann, Schwanenplatz",
    walkId: "bachmann",
    closedOn: [],
    veg: false,
    price: "Bakery lunch, soups and sandwiches",
    note: "A casual stop by the lake. Open every day.",
    phone: "+41 41 410 91 44",
  },
];

export const restaurantById = (id: string) =>
  RESTAURANTS.find((r) => r.id === id);

export interface CityEvent {
  from: string;
  to: string;
  text: string;
}

export const EVENTS: CityEvent[] = [
  {
    from: "2026-11-02",
    to: "2026-11-08",
    text: "Swiss Specialities Week at Wirtshaus Taube.",
  },
  { from: "2026-11-07", to: "2026-11-15", text: "Blues Festival in Luzerne." },
  { from: "2026-11-20", to: "2027-01-01", text: "The ice rink is open." },
  { from: "2026-11-21", to: "2026-11-21", text: "Advent opens in Luzerne." },
  { from: "2026-11-22", to: "2026-12-27", text: "The Christmas Train runs." },
  { from: "2027-01-14", to: "2027-01-24", text: "Lilu Light Festival." },
];
