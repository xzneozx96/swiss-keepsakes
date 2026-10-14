import type { Review } from "@/features/catalog/types";

/** Illustrative prototype reviews, not customer endorsements or real bookings. */
export const sampleTourReviews: Review[] = [
  {
    id: "sample-tour-old-town-1",
    productId: "tour:old-town",
    guestName: "Anna K.",
    rating: 5,
    text: {
      en: "The painted houses were my favourite stop. We had time to ask questions and take photos without feeling rushed.",
      de: "Die bemalten Häuser waren mein Lieblingsstopp. Wir konnten ohne Zeitdruck Fragen stellen und fotografieren.",
    },
    createdAt: "2026-10-12T16:00:00+02:00",
    purchasedAt: "2026-10-12T13:00:00+02:00",
    photos: ["lucerne-old-town"],
  },
  {
    id: "sample-tour-old-town-2",
    productId: "tour:old-town",
    guestName: "Lukas M.",
    rating: 5,
    text: {
      en: "A lovely introduction to Lucerne. The stories made the bridge and little squares feel much more memorable.",
      de: "Eine schöne Einführung in Luzern. Die Geschichten machten die Brücke und die kleinen Plätze besonders einprägsam.",
    },
    createdAt: "2026-10-11T15:00:00+02:00",
    purchasedAt: "2026-10-11T13:00:00+02:00",
  },
  {
    id: "sample-tour-old-town-3",
    productId: "tour:old-town",
    guestName: "Sophie R.",
    rating: 4,
    text: {
      en: "Bring comfortable shoes for the cobbled streets. The small group made it easy to hear the guide at each stop.",
      de: "Bequeme Schuhe fürs Kopfsteinpflaster mitbringen. In der kleinen Gruppe war die Führung an jedem Stopp gut zu hören.",
    },
    createdAt: "2026-10-09T17:00:00+02:00",
    purchasedAt: "2026-10-09T13:00:00+02:00",
    photos: ["musegg-wall"],
    // The one tour review with a shop reply (spec §4.11), written in German by the manager.
    reply: {
      text: "Danke, Sophie! Gute Schuhe sind auf dem Kopfsteinpflaster wirklich Gold wert. Schön, dass Sie an jedem Stopp alles gut hören konnten.",
      language: "de",
      by: "Lukas",
      at: "2026-10-10T09:15:00+02:00",
    },
  },
  {
    id: "sample-tour-old-town-4",
    productId: "tour:old-town",
    guestName: "Daniel W.",
    rating: 5,
    text: {
      en: "Good pace with our older child. We especially enjoyed spotting the details on the façades together.",
      de: "Gutes Tempo mit unserem älteren Kind. Besonders schön war es, gemeinsam die Details an den Fassaden zu entdecken.",
    },
    createdAt: "2026-10-08T18:00:00+02:00",
    purchasedAt: "2026-10-08T13:00:00+02:00",
  },
  {
    id: "sample-tour-old-town-5",
    productId: "tour:old-town",
    guestName: "Maya S.",
    rating: 5,
    text: {
      en: "The route helped us get our bearings for the rest of our stay. Plenty of little places to revisit afterwards.",
      de: "Die Route half uns, uns für den Rest unseres Aufenthalts zu orientieren. Viele kleine Orte zum späteren Wiederbesuchen.",
    },
    createdAt: "2026-10-06T16:00:00+02:00",
    purchasedAt: "2026-10-06T13:00:00+02:00",
  },
  {
    id: "sample-tour-old-town-6",
    productId: "tour:old-town",
    guestName: "Felix B.",
    rating: 4,
    text: {
      en: "Interesting stories and a relaxed walk. Some streets were busy, but the quieter stops gave us space to linger.",
      de: "Interessante Geschichten und ein entspannter Spaziergang. Einige Gassen waren voll, aber an den ruhigeren Stopps konnten wir verweilen.",
    },
    createdAt: "2026-10-05T16:00:00+02:00",
    purchasedAt: "2026-10-05T13:00:00+02:00",
  },
  {
    id: "sample-tour-lake-1",
    productId: "tour:lake",
    guestName: "Clara H.",
    rating: 5,
    text: {
      en: "The lake views were beautiful even with a little cloud. A light jacket was useful out on the deck.",
      de: "Die Seeblicke waren auch bei leichter Bewölkung wunderschön. Eine leichte Jacke war an Deck hilfreich.",
    },
    createdAt: "2026-10-12T18:00:00+02:00",
    purchasedAt: "2026-10-12T15:00:00+02:00",
    photos: ["lake-steamboat"],
  },
  {
    id: "sample-tour-lake-2",
    productId: "tour:lake",
    guestName: "Noah T.",
    rating: 4,
    text: {
      en: "A calm afternoon with time to enjoy the scenery. The meeting point was easy to find by the pier.",
      de: "Ein ruhiger Nachmittag mit Zeit für die Landschaft. Der Treffpunkt am Schiffsteg war leicht zu finden.",
    },
    createdAt: "2026-10-09T18:00:00+02:00",
    purchasedAt: "2026-10-09T15:00:00+02:00",
  },
  {
    id: "sample-tour-lake-3",
    productId: "tour:lake",
    guestName: "Emma F.",
    rating: 5,
    text: {
      en: "We enjoyed hearing the stories from the shore while watching the mountains. A memorable change from walking in town.",
      de: "Die Geschichten vom Ufer zu hören und dabei die Berge zu sehen war wunderbar. Eine schöne Abwechslung zum Stadtspaziergang.",
    },
    createdAt: "2026-10-05T18:00:00+02:00",
    purchasedAt: "2026-10-05T15:00:00+02:00",
  },
];
