import type { Departure, Tour, TourSection, TourStop } from "../types";

import { lt, row, sampleDeparture, timeline } from "./curated";

import { storyFromChapters } from "@/lib/rich-text";

/**
 * Tour 02 of the client's three curated tours: "Pilatus: Above the City"
 * (client-resources/Swiss_Native_Lucerne_Tour_02.pdf, planning edition, verified 16.10.2026).
 * Prices, capacity and departures are sample values. Coordinates are looked up from
 * OpenStreetMap and are only for the map.
 */
const photos = {
  station: "lucerne-kapellbruecke-1200",
  kriens: "pilatus",
  fraekmuentegg: "pilatus-fraekmuentegg",
  kulm: "pilatus-dragon-ride",
} as const;

const itinerary: TourStop[] = [
  {
    id: "station",
    name: lt("Luzerne railway station", "Bahnhof Luzern"),
    description: lt(
      "Meet at the station. Your guide agrees the exact meeting pin with you before the day. Bus 1 towards Kriens/Obernau leaves from here.",
      "Treffpunkt am Bahnhof. Ihre Führung vereinbart den genauen Treffpunkt vorab mit Ihnen. Von hier fährt Bus 1 Richtung Kriens/Obernau.",
    ),
    minutesFromStart: 0,
    coordinates: [8.3093, 47.0511],
    photo: photos.station,
  },
  {
    id: "kriens",
    name: lt("Kriens, Zentrum Pilatus", "Kriens, Zentrum Pilatus"),
    description: lt(
      "About 15 minutes by bus, then a 5–10 minute walk to the valley station, plus a buffer. Tickets and boarding follow here.",
      "Etwa 15 Minuten mit dem Bus, danach 5–10 Minuten zu Fuss zur Talstation, plus Puffer. Hier folgen Tickets und Einstieg.",
    ),
    minutesFromStart: 25,
    coordinates: [8.27962, 47.03361],
    photo: photos.kriens,
    note: lt(
      "The Kriens lifts are closed from 19 October to 27 November 2026; in those weeks the day runs via Alpnachstad.",
      "Die Kriens-Seilbahnen sind vom 19. Oktober bis 27. November 2026 geschlossen; in dieser Zeit führt der Tag über Alpnachstad.",
    ),
  },
  {
    id: "fraekmuentegg",
    name: lt("Fräkmüntegg", "Fräkmüntegg"),
    description: lt(
      "The gondola from Kriens stops here, and you change to the Dragon Ride aerial cableway for the last stretch to the summit.",
      "Die Gondel aus Kriens hält hier, und Sie steigen auf die Luftseilbahn Dragon Ride für das letzte Stück zum Gipfel um.",
    ),
    minutesFromStart: 60,
    coordinates: [8.25027, 46.99034],
    photo: photos.fraekmuentegg,
  },
  {
    id: "kulm",
    name: lt("Pilatus Kulm", "Pilatus Kulm"),
    description: lt(
      "Time for views, photographs and a guided look at how town and mountain relate. No hike and no compulsory stair climb. Lunch at the Bellevue self-service restaurant.",
      "Zeit für Aussicht, Fotos und eine Führung zum Verhältnis von Stadt und Berg. Keine Wanderung und kein obligatorischer Treppenaufstieg. Mittagessen im Selbstbedienungsrestaurant Bellevue.",
    ),
    minutesFromStart: 105,
    coordinates: [8.25564, 46.97926],
    photo: photos.kulm,
    note: lt(
      "Distant peaks depend on visibility. In cloud, the guide focuses on the engineering and the changing landscape.",
      "Fernsicht hängt von der Sicht ab. Bei Wolken liegt der Schwerpunkt auf Technik und Landschaftswahrnehmung.",
    ),
  },
];

const sections: TourSection[] = [
  {
    id: "for-whom",
    layout: "text",
    title: lt("Who is this day for?", "Für wen ist dieser Tag gedacht?"),
    body: lt(
      "For couples, friends and families who want a mountain experience without planning a hike. For curious travellers interested in engineering, and photographers who value time to observe.\n\nGuests who are uncomfortable with heights or aerial cableways should discuss this before booking.",
      "Für Paare, Freunde und Familien, die Berglandschaft erleben möchten, ohne eine Wanderung zu planen. Für neugierige Gäste, die sich für Technik interessieren, und für Fotografierende, die Zeit zum Beobachten schätzen.\n\nWer grosse Höhen oder Seilbahnen unangenehm findet, sollte dies vor der Buchung ansprechen.",
    ),
  },
  {
    id: "glance",
    layout: "facts",
    title: lt("The day at a glance", "Der Tag auf einen Blick"),
    items: [
      row(
        "g-group",
        lt("Group", "Gruppe"),
        lt("About 2–8 guests (proposed)", "Etwa 2–8 Gäste (vorgeschlagen)"),
      ),
      row(
        "g-time",
        lt("Programme", "Programm"),
        lt("08:30 to about 15:00", "08:30 bis etwa 15:00 Uhr"),
        {
          detail: lt(
            "Planning times, not reserved departures. After 15:30 onward travel is possible, with an extra buffer and no guaranteed connection.",
            "Planungszeiten, keine gebuchten Abfahrten. Ab 15:30 ist eine Weiterreise möglich, mit zusätzlichem Puffer und ohne garantierte Anschlussverbindung.",
          ),
        },
      ),
      row(
        "g-walk",
        lt("Walking", "Gehen"),
        lt(
          "Short walks around stations and viewing areas",
          "Kurze Wege bei Stationen und Aussichtspunkten",
        ),
        {
          detail: lt(
            "No mountain hike and no compulsory stair climb to a summit viewpoint. Mobility arrangements need checking.",
            "Keine Bergwanderung und kein obligatorischer Treppenaufstieg zu einem Gipfel-Aussichtspunkt. Mobilität vorab klären.",
          ),
        },
      ),
      row(
        "g-format",
        lt("Format", "Format"),
        lt(
          "A stand-alone day, or an addition to Tour 01",
          "Ein eigener Tag oder eine Ergänzung zu Tour 01",
        ),
      ),
    ],
  },
  {
    id: "maintenance",
    layout: "notice",
    title: lt(
      "Kriens lifts closed for maintenance",
      "Revision der Kriens-Seilbahnen",
    ),
    body: lt(
      "From 19 October to 27 November 2026 the Kriens lifts are closed. In that period the day uses rail to Alpnachstad and the cogwheel railway both ways. The cogwheel season ends on 29 November 2026. Route and tickets are reconfirmed for your date.",
      "Vom 19. Oktober bis 27. November 2026 sind die Kriens-Seilbahnen geschlossen. In dieser Zeit fahren wir mit der Bahn nach Alpnachstad und mit der Zahnradbahn hin und zurück. Deren Saison endet am 29. November 2026. Route und Tickets werden für Ihr Datum neu bestätigt.",
    ),
  },
  {
    id: "special",
    layout: "list",
    title: lt("What makes it memorable", "Was macht ihn besonders?"),
    items: [
      row(
        "s-transition",
        lt("The transition is part of it", "Der Wechsel gehört dazu"),
        lt(
          "Bus, gondola, a change at Fräkmüntegg and the Dragon Ride aerial cableway. The guide connects these stages with conversations about landscape and access to the mountains.",
          "Bus, Gondel, Umstieg auf der Fräkmüntegg und die Luftseilbahn Dragon Ride. Die Führung verbindet diese Etappen mit Gesprächen über Landschaft und Zugang zum Gebirge.",
        ),
      ),
      row(
        "s-top",
        lt("At the top", "Oben"),
        lt(
          "Time for views, photography and an uncomplicated lunch.",
          "Zeit für Aussicht, Fotografie und ein einfaches Mittagessen.",
        ),
      ),
      row(
        "s-weather",
        lt("Honest about the weather", "Ehrlich beim Wetter"),
        lt(
          "Distant peaks depend on visibility; clear skies are not promised.",
          "Sicht auf ferne Gipfel ist wetterabhängig; ein klarer Himmel wird nicht versprochen.",
        ),
      ),
    ],
  },
  {
    id: "timetable",
    layout: "timeline",
    title: lt("A day with room to look", "Der geplante Tagesablauf"),
    body: lt(
      "Planning times, not reserved departures. This applies only when the Kriens lifts operate.",
      "Planungszeiten, keine gebuchten Abfahrten. Nur bei Betrieb der Kriens-Seilbahnen.",
    ),
    items: timeline([
      [
        "08:30–09:10",
        "t1",
        lt(
          "Meet at Luzerne station and take bus 1 to Kriens",
          "Treffen am Bahnhof Luzern, Bus 1 nach Kriens",
        ),
        lt(
          "Bus 1 towards Kriens/Obernau to Kriens, Zentrum Pilatus. About 15 minutes on the bus, then 5–10 minutes walking plus a buffer.",
          "Bus 1 Richtung Kriens/Obernau bis Kriens, Zentrum Pilatus. Etwa 15 Minuten Busfahrt, danach 5–10 Minuten Fussweg plus Puffer.",
        ),
      ],
      [
        "09:10–10:15",
        "t2",
        lt(
          "Tickets, gondola and the Dragon Ride to Pilatus Kulm",
          "Tickets, Gondel und Dragon Ride nach Pilatus Kulm",
        ),
        lt(
          "Gondola to Fräkmüntegg, then the Dragon Ride. The mountain trip takes around 40 minutes; this block includes waiting time.",
          "Gondel zur Fräkmüntegg, Umstieg auf Dragon Ride. Die reine Bergfahrt dauert ungefähr 40 Minuten; der Zeitblock enthält Wartezeit.",
        ),
      ],
      [
        "10:15–11:30",
        "t3",
        lt(
          "Views and guided interpretation",
          "Aussicht und erzählerische Führung",
        ),
        lt(
          "Near the facilities; no hike is needed. In cloud, the focus is on engineering and the changing landscape.",
          "Nahe den Anlagen; keine Wanderung erforderlich. Bei Wolken liegt der Schwerpunkt auf Technik und Landschaftswahrnehmung.",
        ),
      ],
      [
        "11:30–12:30",
        "t4",
        lt(
          "Lunch at the Bellevue self-service restaurant",
          "Mittagessen im Selbstbedienungsrestaurant Bellevue",
        ),
        lt("Tables cannot be reserved.", "Keine Tischreservation möglich."),
      ],
      [
        "12:30–13:30",
        "t5",
        lt("Free time on the summit", "Freie Zeit auf dem Gipfel"),
        lt(
          "Photographs, conversation and a last look. Outdoor areas only when conditions allow.",
          "Bilder, Gespräche und ein letzter Blick; Aussenbereiche nur bei geeigneten Bedingungen.",
        ),
      ],
      [
        "13:30–15:00",
        "t6",
        lt("Descent and return to Luzerne", "Rückfahrt nach Luzern"),
        lt(
          "Via Fräkmüntegg and Kriens, a walk to the bus, and back to Luzerne. Allow time for queues.",
          "Über Fräkmüntegg und Kriens, Fussweg zum Bus, Rückkehr nach Luzern. Zeit für Warteschlangen lassen.",
        ),
      ],
      [
        "After 15:30",
        "t7",
        lt("Possible onward travel", "Mögliche Weiterreise"),
        lt(
          "With an additional buffer. No connecting service is guaranteed.",
          "Mit zusätzlichem Puffer. Keine garantierte Anschlussverbindung.",
        ),
      ],
    ]),
  },
  {
    id: "rhythm",
    layout: "text",
    title: lt("Why this rhythm?", "Warum dieser Rhythmus?"),
    body: lt(
      "An early lunch fits the kitchen opening time. The descent begins well before closing, and the remaining margin supports a relaxed group pace rather than a promise of extra activities.",
      "Ein frühes Mittagessen passt zur Küchenöffnung. Die Rückfahrt beginnt deutlich vor Betriebsschluss; der verbleibende Puffer dient der Gruppe und ist kein Versprechen zusätzlicher Aktivitäten.",
    ),
  },
  {
    id: "route",
    layout: "list",
    title: lt("Route and transport", "Strecke und Transport"),
    items: [
      row(
        "r-main",
        lt("Main route", "Hauptroute"),
        lt(
          "Luzerne, bus 1 to Kriens, Zentrum Pilatus, a walk to the valley station, the gondola via Krienseregg to Fräkmüntegg, then the Dragon Ride to Pilatus Kulm. You return the same way.",
          "Luzern, Bus 1 nach Kriens, Zentrum Pilatus, Fussweg zur Talstation, Gondel über Krienseregg zur Fräkmüntegg, dann Dragon Ride nach Pilatus Kulm. Gleicher Rückweg.",
        ),
        {
          detail: lt(
            "A lake cruise is not part of the core programme.",
            "Keine Schifffahrt im Grundprogramm.",
          ),
        },
      ),
      row(
        "r-alt",
        lt("During maintenance", "Bei Revision"),
        lt(
          "Rail to Alpnachstad and the cogwheel railway both ways, only when railway operation is confirmed.",
          "Bahn nach Alpnachstad und Zahnradbahn hin und zurück, nur bei bestätigtem Bahnbetrieb.",
        ),
      ),
    ],
  },
  {
    id: "operations",
    layout: "facts",
    title: lt("Published operating hours", "Betriebszeiten"),
    body: lt(
      "Hours are published schedules, checked on 16 October 2026. Weather can change operations.",
      "Veröffentlichte Zeiten, geprüft am 16. Oktober 2026. Wetterbedingte Änderungen bleiben möglich.",
    ),
    items: [
      row(
        "o-before",
        lt("Kriens ascent, until 18 Oct", "Kriens-Aufstieg, bis 18. Okt"),
        lt(
          "08:30–17:00 · last descent from Pilatus Kulm 17:30",
          "08:30–17:00 · letzte Abfahrt Pilatus Kulm 17:30",
        ),
      ),
      row(
        "o-after",
        lt("Kriens ascent, from 28 Nov", "Kriens-Aufstieg, ab 28. Nov"),
        lt(
          "08:30–16:00 · last descent from Pilatus Kulm 16:30",
          "08:30–16:00 · letzte Abfahrt Pilatus Kulm 16:30",
        ),
      ),
    ],
  },
  {
    id: "lunch",
    layout: "list",
    title: lt("Lunch on the summit", "Mittagessen auf dem Gipfel"),
    items: [
      row(
        "l-bellevue",
        lt(
          "Bellevue self-service restaurant",
          "Selbstbedienungsrestaurant Bellevue",
        ),
        lt(
          "Simple food with wide views: Swiss and international dishes. Tables cannot be reserved.",
          "Einfach und aussichtsreich: Schweizer und internationale Gerichte. Keine Tischreservation.",
        ),
        {
          optional: true,
          detail: lt(
            "Lunch is paid separately and is not booked for you.",
            "Das Mittagessen wird separat bezahlt und nicht für Sie gebucht.",
          ),
          contact: { phone: "+41 41 329 12 12", email: "hotels@pilatus.ch" },
        },
      ),
    ],
  },
  {
    id: "bellevue-hours",
    layout: "facts",
    title: lt("Bellevue opening hours", "Öffnungszeiten Bellevue"),
    items: [
      row(
        "h1",
        lt("Until 24 Oct", "Bis 24. Okt"),
        lt(
          "09:00–17:00 · kitchen 11:30–16:30",
          "09:00–17:00 · Küche 11:30–16:30",
        ),
      ),
      row(
        "h2",
        lt("25 Oct to 29 Nov", "25. Okt bis 29. Nov"),
        lt(
          "09:00–16:00 · kitchen until 15:30",
          "09:00–16:00 · Küche bis 15:30",
        ),
      ),
      row(
        "h3",
        lt("30 Nov to 11 Apr 2027", "30. Nov bis 11. Apr 2027"),
        lt(
          "09:30–15:30 · kitchen 11:30–15:00",
          "09:30–15:30 · Küche 11:30–15:00",
        ),
      ),
    ],
  },
  {
    id: "weather",
    layout: "list",
    title: lt("Weather and flexibility", "Wetter und Flexibilität"),
    items: [
      row(
        "w-wind",
        lt(
          "Strong wind or poor weather",
          "Starker Wind oder schlechtes Wetter",
        ),
        lt(
          "The day is rescheduled, or a separately agreed city alternative is offered.",
          "Wir verschieben den Tag oder bieten eine separat vereinbarte Stadtalternative an.",
        ),
      ),
      row(
        "w-tickets",
        lt("Tickets and concessions", "Tickets und Ermässigungen"),
        lt(
          "Tickets and concessions are calculated individually. Transport, food and gifts are included only if the confirmed offer lists them.",
          "Fahrkarten und Ermässigungen werden individuell berechnet. Fahrten, Essen und Geschenke sind erst eingeschlossen, wenn das Angebot sie ausdrücklich aufführt.",
        ),
      ),
    ],
  },
];

export const pilatus: Tour = {
  id: "pilatus-above-the-city",
  slug: "pilatus-above-the-city",
  name: lt("Pilatus: Above the City", "Pilatus: Über der Stadt"),
  summary: lt(
    "A day from Luzerne: bus, gondola and the Dragon Ride to the summit, with no hike",
    "Ein Tag ab Luzern: Bus, Gondel und Dragon Ride zum Gipfel, ohne Wanderung",
  ),
  description: lt(
    "In the morning, you are still among the buildings of Luzerne. Soon, forest passes beneath the gondola and the city becomes a small part of a much larger landscape. This journey explores the relationship between town and mountain: our desire for open horizons, and the engineering that makes such heights accessible.",
    "Am Morgen stehen Sie noch zwischen den Häusern von Luzern. Wenig später ziehen unter der Gondel Wälder vorbei, und die Stadt wird zu einem kleinen Teil einer viel grösseren Landschaft. Dieser Ausflug erzählt von der Beziehung zwischen Stadt und Berg: von unserer Sehnsucht nach Weite und den technischen Ideen, die diese Höhe erreichbar machen.",
  ),
  longStory: storyFromChapters({
    title: lt("From the city to the mountain", "Von der Stadt zum Berg"),
    chapters: [
      {
        photo: photos.kriens,
        title: lt("A change of perspective", "Eine andere Perspektive"),
        body: lt(
          "In the morning, you are still among the buildings of Luzerne. Soon, forest passes beneath the gondola and the city becomes a small part of a much larger landscape. This journey explores the relationship between town and mountain: our desire for open horizons, and the engineering that makes such heights accessible.",
          "Am Morgen stehen Sie noch zwischen den Häusern von Luzern. Wenig später ziehen unter der Gondel Wälder vorbei, und die Stadt wird zu einem kleinen Teil einer viel grösseren Landschaft. Dieser Ausflug erzählt von der Beziehung zwischen Stadt und Berg: von unserer Sehnsucht nach Weite und den technischen Ideen, die diese Höhe erreichbar machen.",
        ),
      },
      {
        photo: photos.fraekmuentegg,
        title: lt(
          "The transition is part of the experience",
          "Der Wechsel ist Teil des Erlebnisses",
        ),
        body: lt(
          "Bus, gondola, a change at Fräkmüntegg and the Dragon Ride aerial cableway. Guiding connects these stages with conversations about landscape and access to the mountains.",
          "Bus, Gondel, Umstieg auf der Fräkmüntegg und die Luftseilbahn Dragon Ride. Die Führung verbindet diese Etappen mit Gesprächen über Landschaft und Zugang zum Gebirge.",
        ),
      },
      {
        photo: photos.kulm,
        title: lt("A day with room to look", "Ein Tag mit Raum zum Schauen"),
        body: lt(
          "At the top, there is time for views, photography and an uncomplicated lunch. Distant peaks depend on visibility; clear skies are not promised. In cloud, the guide turns to the engineering and the changing landscape.",
          "Oben bleibt Zeit für Aussicht, Fotografie und ein einfaches Mittagessen. Sicht auf ferne Gipfel ist wetterabhängig; ein klarer Himmel wird nicht versprochen. Bei Wolken richtet die Führung den Blick auf Technik und Landschaft.",
        ),
      },
    ],
  }),
  photos: [photos.kulm, photos.fraekmuentegg, photos.kriens],
  durationMinutes: 390,
  adultPrice: 12900,
  childPrice: 6500,
  infantPrice: 0,
  meetingPoint: lt(
    "Luzerne railway station (exact meeting point agreed before the day)",
    "Bahnhof Luzern (genauer Treffpunkt wird vorab vereinbart)",
  ),
  included: [
    lt(
      "Guiding from Luzerne to Pilatus Kulm and back, in a small group",
      "Führung von Luzern auf den Pilatus Kulm und zurück, in kleiner Gruppe",
    ),
    lt(
      "Stories and conversation about landscape and access to the mountains",
      "Geschichten und Gespräche über Landschaft und Zugang zum Gebirge",
    ),
  ],
  excluded: lt(
    "Bus, gondola and Dragon Ride tickets, lunch and gifts are included only if the confirmed offer lists them. A lake cruise is not part of the programme.",
    "Bus-, Gondel- und Dragon-Ride-Tickets, Mittagessen und Geschenke sind nur enthalten, wenn das bestätigte Angebot sie ausdrücklich aufführt. Eine Schifffahrt gehört nicht zum Programm.",
  ),
  conditions: lt(
    "No mountain hike and no compulsory stair climb; short walks around stations and viewing areas. Please discuss a fear of heights or aerial cableways, and any mobility needs, before booking. Small groups of about 2–8 guests. Children must be accompanied by an adult.",
    "Keine Bergwanderung und kein obligatorischer Treppenaufstieg; kurze Wege bei Stationen und Aussichtspunkten. Bitte sprechen Sie Höhenangst oder Unbehagen bei Seilbahnen sowie Mobilitätsbedürfnisse vor der Buchung an. Kleine Gruppen mit etwa 2–8 Gästen. Kinder müssen von einer erwachsenen Person begleitet werden.",
  ),
  cancellationPolicy: lt(
    "Sample policy: contact the organiser at least 48 hours before departure. In strong wind or unsuitable mountain weather the day is rescheduled, or a city alternative is agreed.",
    "Beispielregel: mindestens 48 Stunden vor Beginn den Veranstalter kontaktieren. Bei starkem Wind oder unpassendem Bergwetter wird der Tag verschoben oder eine Stadtalternative vereinbart.",
  ),
  published: true,
  commissionRate: 0.1,
  itinerary,
  ageBands: { childFrom: 6, adultFrom: 16 },
  participantFields: [
    {
      id: "needs",
      label: lt(
        "Mobility, dietary needs or fear of heights",
        "Mobilität, Ernährung oder Höhenangst",
      ),
      required: false,
    },
  ],
  sections,
  checkedOn: "2026-10-16",
  keepsakeIds: ["p-vx-pilatus"],
};

export const pilatusDepartures: Departure[] = (
  [
    ["pilatus-18", "2026-10-18", "deposit"],
    ["pilatus-24", "2026-10-24", "deposit"],
    ["pilatus-07", "2026-11-07", "later"],
    ["pilatus-28", "2026-11-28", "full"],
  ] as const
).map(([id, date, policy]) =>
  sampleDeparture({
    id,
    tourId: pilatus.id,
    date,
    time: "08:30",
    policy,
  }),
);
