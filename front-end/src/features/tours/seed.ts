import type {
  Departure,
  Tour,
  TourBooking,
  TourData,
  TourDraft,
  TourParticipants,
} from "./types";

import { firstPaymentAmount, tourTotal } from "./lib/selectors";
import { operationsFixtures } from "./merchant/lib/fixtures";

const cancellationPolicy = {
  en: "Sample policy: contact the organiser at least 48 hours before departure. Refunds and rescheduling need merchant approval.",
  de: "Beispielregel: mindestens 48 Stunden vor Beginn den Veranstalter kontaktieren. Rückerstattungen und Umbuchungen brauchen die Zustimmung des Händlers.",
};
const walkingItinerary: Tour["itinerary"] = [
  {
    id: "chapel",
    name: { en: "Chapel Bridge", de: "Kapellbrücke" },
    description: {
      en: "Meet your guide by the river and begin with the stories behind Lucerne's wooden bridge.",
      de: "Treffen Sie Ihre Führung am Fluss und beginnen Sie mit den Geschichten hinter Luzerns Holzbrücke.",
    },
    minutesFromStart: 0,
    coordinates: [8.30762, 47.05167],
    photo: "lucerne-kapellbruecke-1200",
    note: {
      en: "Look for the guide with the red umbrella at the north entrance, on the old-town side.",
      de: "Die Führung wartet mit einem roten Schirm am Nordeingang, auf der Altstadtseite.",
    },
  },
  {
    id: "old-town",
    name: { en: "Old-town squares", de: "Altstadtplätze" },
    description: {
      en: "Explore the painted façades around Hirschenplatz, with time to pause and take photographs.",
      de: "Entdecken Sie die bemalten Fassaden rund um den Hirschenplatz, mit Zeit für Pausen und Fotos.",
    },
    minutesFromStart: 25,
    coordinates: [8.30576, 47.05216],
    photo: "lucerne-old-town",
  },
  {
    id: "musegg",
    name: { en: "Musegg Wall", de: "Museggmauer" },
    description: {
      en: "See the city's historic fortifications and enjoy a different view of the old town.",
      de: "Entdecken Sie die historische Stadtbefestigung und einen anderen Blick auf die Altstadt.",
    },
    minutesFromStart: 65,
    coordinates: [8.30525, 47.05506],
    photo: "musegg-wall",
    note: {
      en: "Steep steps lead up to the wall. Ask your guide for the step-free route along the street.",
      de: "Steile Stufen führen zur Mauer hinauf. Fragen Sie Ihre Führung nach dem stufenfreien Weg entlang der Strasse.",
    },
  },
  {
    id: "lake",
    name: { en: "Finish by the lake", de: "Abschluss am See" },
    description: {
      en: "Return to the waterfront for local tips and your final questions.",
      de: "Kehren Sie ans Seeufer zurück, mit lokalen Tipps und Zeit für letzte Fragen.",
    },
    minutesFromStart: 110,
    coordinates: [8.30969, 47.05303],
    photo: "lake-steamboat",
  },
];

export const tourSeed: Tour[] = [
  {
    id: "old-town",
    longStory: {
      title: {
        en: "Two hours on the oldest streets",
        de: "Zwei Stunden auf den ältesten Gassen",
      },
      chapters: [
        {
          photo: "lucerne-kapellbruecke-1200",
          title: {
            en: "Where the river leaves the lake",
            de: "Wo der Fluss den See verlässt",
          },
          body: {
            en: "The walk starts on the Chapel Bridge, a covered wooden bridge across the Reuss, right where the river leaves the lake. Beside it stands the octagonal Water Tower, about 34 metres high. Both were part of the town’s defences before they became its postcard.",
            de: "Der Spaziergang beginnt auf der Kapellbrücke, einem gedeckten Holzsteg über die Reuss, genau dort, wo der Fluss den See verlässt. Daneben steht der achteckige Wasserturm, rund 34 Meter hoch. Beide gehörten zur Stadtbefestigung, bevor sie zum Postkartenmotiv wurden.",
          },
        },
        {
          photo: "lucerne-old-town",
          title: {
            en: "The squares that were a market and a courtroom",
            de: "Die Plätze, die Markt und Gericht waren",
          },
          body: {
            en: "From the river the route climbs into the old town’s squares, where façades were painted to tell passers-by who lived behind them. On the Weinmarkt the citizens swore their alliance in 1332, and a fountain has stood there since 1481.",
            de: "Vom Fluss führt der Weg in die Plätze der Altstadt, wo Fassaden bemalt wurden, um Vorbeigehenden zu zeigen, wer dahinter wohnte. Auf dem Weinmarkt schworen die Bürger 1332 ihren Bund, und seit 1481 steht dort ein Brunnen.",
          },
        },
        {
          photo: "musegg-wall",
          title: {
            en: "A town that built its walls and kept them",
            de: "Eine Stadt, die ihre Mauern behielt",
          },
          body: {
            en: "We pass below the Musegg Wall, nine towers on a ridge above the town, before the route ends by the lake. Many medieval towns pulled their walls down. Lucerne kept this one, and you can still see why: from up there, you see the whole lake coming.",
            de: "Wir kommen an der Museggmauer vorbei, neun Türme auf einem Grat über der Stadt, bevor die Route am See endet. Viele mittelalterliche Städte rissen ihre Mauern ab. Luzern behielt diese, und man sieht noch, warum: Von dort oben sieht man den ganzen See kommen.",
          },
        },
      ],
    },
    slug: "lucerne-old-town-walk",
    name: { en: "Lucerne old-town walk", de: "Altstadtspaziergang Luzern" },
    summary: {
      en: "A small-group walk through the old town",
      de: "Ein Spaziergang in kleiner Gruppe durch die Altstadt",
    },
    description: {
      en: "Follow the river into the old town, pause at the painted façades and hear the stories behind Chapel Bridge. An unhurried walk with time for questions and photographs.",
      de: "Folgen Sie dem Fluss in die Altstadt, entdecken Sie bemalte Fassaden und hören Sie die Geschichten hinter der Kapellbrücke. Ein entspannter Spaziergang mit Zeit für Fragen und Fotos.",
    },
    photos: ["lucerne-old-town", "lucerne-kapellbruecke-1200", "musegg-wall"],
    durationMinutes: 120,
    adultPrice: 8900,
    childPrice: 4500,
    infantPrice: 0,
    meetingPoint: {
      en: "Chapel Bridge · north entrance",
      de: "Kapellbrücke · Nordeingang",
    },
    included: [
      {
        en: "Local guide in English or German",
        de: "Lokale Führung auf Englisch oder Deutsch",
      },
      {
        en: "Two-hour guided city walk",
        de: "Zweistündiger geführter Stadtspaziergang",
      },
    ],
    excluded: {
      en: "Food, drinks, transport and attraction entry fees.",
      de: "Essen, Getränke, Transport und Eintrittspreise.",
    },
    conditions: {
      en: "Around 2 km on cobbled streets. Comfortable shoes recommended. Children must be accompanied by an adult. Ask the organiser about step-free access before booking.",
      de: "Rund 2 km über Kopfsteinpflaster. Bequeme Schuhe empfohlen. Kinder müssen von einer erwachsenen Person begleitet werden. Bitte den stufenfreien Zugang vor der Buchung klären.",
    },
    cancellationPolicy,
    published: true,
    commissionRate: 0.1,
    itinerary: walkingItinerary,
    ageBands: { childFrom: 6, adultFrom: 16 },
    participantFields: [
      {
        id: "childName",
        label: { en: "Child’s name", de: "Name des Kindes" },
        required: false,
      },
    ],
  },
  {
    id: "lake",
    longStory: {
      title: {
        en: "Where the steamers still run",
        de: "Wo die Dampfschiffe noch fahren",
      },
      chapters: [
        {
          photo: "lake-steamboat",
          title: {
            en: "A lake with five paddle steamers",
            de: "Ein See mit fünf Raddampfern",
          },
          body: {
            en: "Lake Lucerne still runs a fleet of historic paddle steamers: the Uri from 1901, then Unterwalden, Schiller, Gallia, and the Stadt Luzern of 1928, the last steamboat built for a Swiss lake. They are not museum pieces. They carry passengers every summer. Your journey crosses the same water.",
            de: "Auf dem Vierwaldstättersee fährt noch immer eine Flotte historischer Raddampfer: die Uri von 1901, dann Unterwalden, Schiller, Gallia und die Stadt Luzern von 1928, der letzte für einen Schweizer See gebaute Dampfer. Sie sind keine Museumsstücke. Jeden Sommer befördern sie Passagiere. Ihre Fahrt führt über dasselbe Wasser.",
          },
        },
        {
          photo: "lucerne-old-town",
          title: {
            en: "A shoreline full of stories",
            de: "Ein Ufer voller Geschichten",
          },
          body: {
            en: "The lake touches the heart of Swiss history. Lucerne joined the alliance with Uri, Schwyz and Unterwalden in 1332. Your guide points out the shores as they pass and tells the stories behind them.",
            de: "Der See liegt im Herzen der Schweizer Geschichte. Luzern schloss 1332 den Bund mit Uri, Schwyz und Unterwalden. Ihre Führung zeigt Ihnen die Ufer beim Vorbeifahren und erzählt die Geschichten dazu.",
          },
        },
        {
          photo: "pilatus",
          title: {
            en: "The mountain that watches",
            de: "Der Berg, der zuschaut",
          },
          body: {
            en: "Mount Pilatus follows you across the water. Legend says Pontius Pilate lay in a mountain lake, and that dragons lived in its caves. Seen from the deck on a day with low cloud, you can almost believe it.",
            de: "Der Pilatus begleitet Sie über das Wasser. Die Sage erzählt, Pontius Pilatus liege in einem Bergsee, und in den Höhlen hausten Drachen. Vom Deck aus, an einem Tag mit tiefen Wolken, glaubt man es fast.",
          },
        },
      ],
    },
    slug: "lake-lucerne-stories",
    name: { en: "Across Lake Lucerne", de: "Über den Vierwaldstättersee" },
    summary: {
      en: "Lake views and stories from the shore",
      de: "Seeblicke und Geschichten vom Ufer",
    },
    description: {
      en: "A lake experience with time to take in the landscape. Illustrative tour content for review.",
      de: "Ein Seeerlebnis mit Zeit für die Landschaft. Beispielinhalt zur Prüfung.",
    },
    photos: ["lake-steamboat", "lucerne-old-town"],
    durationMinutes: 180,
    adultPrice: 12900,
    childPrice: 6500,
    infantPrice: 0,
    meetingPoint: {
      en: "Lucerne pier · meeting point 1",
      de: "Schiffsteg Luzern · Treffpunkt 1",
    },
    included: [
      { en: "Local guide and lake journey", de: "Lokale Führung und Seefahrt" },
    ],
    excluded: {
      en: "Meals and personal expenses.",
      de: "Mahlzeiten und persönliche Ausgaben.",
    },
    conditions: {
      en: "Please arrive 15 minutes early. Ask about accessibility before booking.",
      de: "Bitte 15 Minuten früher da sein. Zugänglichkeit vor der Buchung klären.",
    },
    cancellationPolicy,
    published: true,
    commissionRate: 0.1,
    itinerary: [
      {
        id: "pier",
        name: { en: "Lucerne pier", de: "Schiffsteg Luzern" },
        description: {
          en: "Meet your guide at the waterfront before boarding.",
          de: "Treffen Sie Ihre Führung vor dem Einsteigen am Seeufer.",
        },
        minutesFromStart: 0,
        coordinates: [8.30971, 47.05033],
        photo: "lake-steamboat",
      },
      {
        id: "waterfront",
        name: { en: "Lakeside stories", de: "Geschichten am See" },
        description: {
          en: "Take in the lake views and the stories of the shore.",
          de: "Geniessen Sie die Seeblicke und die Geschichten des Ufers.",
        },
        minutesFromStart: 90,
        coordinates: [8.315, 47.0558],
        photo: "lucerne-old-town",
      },
    ],
    ageBands: { childFrom: 4, adultFrom: 16 },
    participantFields: [
      {
        id: "access",
        label: {
          en: "Accessibility needs on board",
          de: "Bedürfnisse zur Barrierefreiheit an Bord",
        },
        required: false,
      },
    ],
  },
  // Published by the merchant in German only (R02, AC30): every merchant text is German.
  {
    id: "night",
    longStory: {
      title: {
        de: "Wenn die Stadt ihre Geschichten erzählt",
      },
      chapters: [
        {
          photo: "lucerne-water-tower",
          title: {
            de: "Der Turm, der stehen blieb",
          },
          body: {
            de: "Wir treffen uns am Wasserturm, achteckig und rund 34 Meter hoch. Als die Kapellbrücke am 18. August 1993 abbrannte, überstand er das Feuer. Bei Laternenlicht sieht man gut, wie die Brücke und der Turm zusammengehören.",
          },
        },
        {
          photo: "lucerne-night",
          title: {
            de: "Gassen, die still werden",
          },
          body: {
            de: "Wenn die Tagesgäste weg sind, gehört die Altstadt wieder den Luzernern. Die Laterne wirft warmes Licht auf bemalte Fassaden und alte Brunnen, und die Gassen sind so still, dass man die Reuss hört. Hier erzählen wir, was tagsüber niemand hört.",
          },
        },
        {
          photo: "lion-monument",
          title: {
            de: "Der sterbende Löwe",
          },
          body: {
            de: "Am Ende steht das Löwendenkmal. 1792 fielen Schweizer Gardisten beim Sturm auf die Tuilerien in Paris. Der Entwurf stammt von Bertel Thorvaldsen, der Fels wurde 1820 und 1821 von Lukas Ahorn gehauen. Der Löwe stirbt still, den Speer im Rücken. Zum Abschluss gibt es heissen Tee.",
          },
        },
      ],
    },
    slug: "luzern-bei-nacht",
    name: { de: "Luzern bei Nacht" },
    summary: { de: "Mit der Laterne durch die beleuchtete Altstadt" },
    description: {
      de: "Wenn es dunkel wird, zeigt sich Luzern von einer anderen Seite. Mit der Laterne geht es vom Wasserturm durch stille Gassen bis zum Löwendenkmal. Die Führung findet auf Deutsch statt.",
    },
    photos: ["lucerne-night", "lucerne-water-tower", "lion-monument"],
    durationMinutes: 120,
    adultPrice: 4900,
    childPrice: 2500,
    infantPrice: 0,
    meetingPoint: { de: "Wasserturm · Seite Rathausquai" },
    included: [
      { de: "Laternenführung auf Deutsch" },
      { de: "Heisser Tee zum Abschluss" },
    ],
    excluded: { de: "Abendessen und Getränke." },
    conditions: {
      de: "Rund 1,5 km, teilweise über Kopfsteinpflaster und Treppen. Warme Kleidung empfohlen. Kinder nur in Begleitung einer erwachsenen Person.",
    },
    cancellationPolicy: {
      de: "Beispielregel: Absage bis 24 Stunden vor Beginn beim Veranstalter. Rückerstattungen brauchen die Zustimmung des Händlers.",
    },
    published: true,
    commissionRate: 0.1,
    itinerary: [
      {
        id: "tower",
        name: { de: "Wasserturm" },
        description: {
          de: "Treffpunkt am Wasserturm. Die Laternen werden verteilt, dann geht es los.",
        },
        minutesFromStart: 0,
        coordinates: [8.30835, 47.05155],
        photo: "lucerne-water-tower",
      },
      {
        id: "weinmarkt",
        name: { de: "Weinmarkt" },
        description: {
          de: "Geschichten von Zünften, Märkten und Nachtwächtern auf dem stillen Platz.",
        },
        minutesFromStart: 35,
        coordinates: [8.30455, 47.05208],
        photo: "lucerne-night",
      },
      {
        id: "lion",
        name: { de: "Löwendenkmal" },
        description: {
          de: "Zum Abschluss das beleuchtete Löwendenkmal und ein heisser Tee.",
        },
        minutesFromStart: 95,
        coordinates: [8.31061, 47.05847],
        photo: "lion-monument",
      },
    ],
    ageBands: { childFrom: 6, adultFrom: 16 },
    participantFields: [
      {
        id: "names",
        label: { de: "Namen aller Teilnehmenden" },
        required: true,
      },
    ],
  },
  // Sold out: its only departure is fully booked by seeded bookings.
  {
    id: "workshop",
    longStory: {
      title: {
        en: "Learning to cut a line",
        de: "Eine Linie schneiden lernen",
      },
      chapters: [
        {
          photo: "artisan-workshop",
          title: {
            en: "The bench at the back",
            de: "Die Werkbank im hinteren Teil",
          },
          body: {
            en: "The workshop is at the back of the old-town shop, a short walk from the bridge. The bench is a working one, with the tools laid out the way engravers have laid them out for generations.",
            de: "Die Werkstatt liegt im hinteren Teil des Ladens in der Altstadt, nur ein paar Schritte von der Brücke. Die Werkbank ist eine echte Arbeitsbank, die Werkzeuge liegen so, wie Gravierer sie seit Generationen auslegen.",
          },
        },
        {
          photo: "engraving",
          title: {
            en: "One line, then the next",
            de: "Eine Linie, dann die nächste",
          },
          body: {
            en: "Hand engraving is slow and forgiving if you stay calm. You start with straight lines on a practice piece, then move to letters. By the end of the afternoon, most people cut a name or a small motif that is clearly their own.",
            de: "Handgravur ist langsam und verzeiht viel, wenn man ruhig bleibt. Sie beginnen mit geraden Linien auf einem Übungsstück und gehen dann zu Buchstaben über. Am Ende des Nachmittags gravieren die meisten einen Namen oder ein kleines Motiv, das klar ihr eigenes ist.",
          },
        },
        {
          photo: "pocket-knife",
          title: {
            en: "A knife with your hand in it",
            de: "Ein Messer mit Ihrer Handschrift",
          },
          body: {
            en: "You leave with a pocket knife you have engraved yourself. It will never be as clean as a machine-cut name, and that is why it matters. Every time you open it, you see your own hand.",
            de: "Sie gehen mit einem Taschenmesser nach Hause, das Sie selbst graviert haben. Es wird nie so sauber sein wie ein maschinell geschnittener Name, und gerade deshalb zählt es. Jedes Mal, wenn Sie es öffnen, sehen Sie Ihre eigene Hand.",
          },
        },
      ],
    },
    slug: "engraving-workshop",
    name: { en: "Engraving workshop", de: "Gravurkurs im Laden" },
    summary: {
      en: "Engrave your own pocket knife at our workbench",
      de: "Gravieren Sie Ihr eigenes Taschenmesser an unserer Werkbank",
    },
    description: {
      en: "Spend an afternoon at the workbench in our old-town shop. Learn the basics of hand engraving, then engrave a name or a small motif on a pocket knife to take home.",
      de: "Verbringen Sie einen Nachmittag an der Werkbank in unserem Laden in der Altstadt. Lernen Sie die Grundlagen der Handgravur und gravieren Sie dann einen Namen oder ein kleines Motiv auf ein Taschenmesser zum Mitnehmen.",
    },
    photos: ["artisan-workshop", "engraving", "pocket-knife"],
    durationMinutes: 180,
    adultPrice: 11900,
    childPrice: 7900,
    infantPrice: 0,
    meetingPoint: {
      en: "Shop Altstadt · workshop at the back",
      de: "Laden Altstadt · Werkstatt im hinteren Teil",
    },
    included: [
      {
        en: "A pocket knife to engrave and keep",
        de: "Ein Taschenmesser zum Gravieren und Mitnehmen",
      },
      {
        en: "Tools, guidance and coffee",
        de: "Werkzeug, Anleitung und Kaffee",
      },
    ],
    excluded: {
      en: "Additional knives and gift wrapping.",
      de: "Weitere Messer und Geschenkverpackung.",
    },
    conditions: {
      en: "Suitable from age 8. Children under 16 take part with an adult. Up to 6 people per workshop.",
      de: "Geeignet ab 8 Jahren. Kinder unter 16 nehmen mit einer erwachsenen Person teil. Höchstens 6 Personen pro Kurs.",
    },
    cancellationPolicy,
    published: true,
    commissionRate: 0.1,
    itinerary: [
      {
        id: "welcome",
        name: { en: "Welcome at the shop", de: "Begrüssung im Laden" },
        description: {
          en: "Meet the craftsman, choose your knife and sketch your design.",
          de: "Lernen Sie den Handwerker kennen, wählen Sie Ihr Messer und skizzieren Sie Ihr Motiv.",
        },
        minutesFromStart: 0,
        coordinates: [8.30598, 47.05182],
        photo: "artisan-workshop",
      },
      {
        id: "workbench",
        name: { en: "At the workbench", de: "An der Werkbank" },
        description: {
          en: "Engrave your knife step by step, with help whenever you need it.",
          de: "Gravieren Sie Ihr Messer Schritt für Schritt, mit Hilfe, wann immer Sie sie brauchen.",
        },
        minutesFromStart: 30,
        coordinates: [8.30606, 47.05186],
        photo: "engraving",
      },
    ],
    ageBands: { childFrom: 8, adultFrom: 16 },
    participantFields: [
      {
        id: "engraving",
        label: {
          en: "Name or motif to engrave",
          de: "Name oder Motiv für die Gravur",
        },
        required: true,
      },
    ],
  },
  {
    id: "pilatus",
    slug: "pilatus-above-the-clouds",
    name: { en: "A day above the clouds", de: "Ein Tag über den Wolken" },
    summary: {
      en: "Mountain views from Pilatus",
      de: "Bergblicke vom Pilatus",
    },
    description: {
      en: "New departure dates are on their way.",
      de: "Neue Abfahrtsdaten folgen bald.",
    },
    photos: ["pilatus"],
    durationMinutes: 300,
    adultPrice: 15900,
    childPrice: 7900,
    infantPrice: 0,
    meetingPoint: { en: "To be confirmed", de: "Noch zu bestätigen" },
    included: [],
    excluded: { en: "To be confirmed", de: "Noch zu bestätigen" },
    conditions: { en: "Not yet open for bookings.", de: "Noch nicht buchbar." },
    cancellationPolicy,
    published: false,
    commissionRate: 0.1,
    itinerary: [],
    ageBands: { childFrom: 6, adultFrom: 16 },
    participantFields: [],
  },
];
export function emptyTourDraft(): TourDraft {
  return {
    tourId: "old-town",
    departureId: "walk-16",
    adults: 2,
    children: 1,
    infants: 0,
    contactName: "",
    phone: "",
    childName: "",
  };
}
type BookingContact = Pick<
  TourBooking,
  "id" | "ref" | "guestId" | "contactName" | "phone" | "partnerId"
>;

/** A confirmed sample booking with its first payment made, priced from the tour and departure. */
function seededBooking(
  tour: Tour,
  departure: Departure,
  contact: BookingContact,
  group: TourParticipants,
): TourBooking {
  const total = tourTotal(tour, group);
  const firstAmount = firstPaymentAmount(departure.policy, total);
  const createdAt = "2026-10-11T09:00:00+02:00";

  return {
    ...contact,
    ...group,
    language: "en",
    tourId: tour.id,
    departureId: departure.id,
    tourName: structuredClone(tour.name),
    meetingPoint: structuredClone(tour.meetingPoint),
    startsAt: departure.startsAt,
    endsAt: new Date(
      Date.parse(departure.startsAt) + tour.durationMinutes * 60_000,
    ).toISOString(),
    childName: "",
    total,
    firstAmount,
    adultPrice: tour.adultPrice,
    childPrice: tour.childPrice,
    infantPrice: tour.infantPrice,
    cancellationPolicy: structuredClone(tour.cancellationPolicy),
    policy: departure.policy,
    balanceDueAt: departure.balanceDueAt,
    commissionRate: tour.commissionRate,
    createdAt,
    commissionRecordedAt: null,
    activity: [],
    status: "confirmed",
    holdUntil: null,
    payments:
      firstAmount > 0
        ? [
            {
              id: `${contact.id}-payment`,
              amount: firstAmount,
              method: "online",
              status: "succeeded",
              at: createdAt,
            },
          ]
        : [],
  };
}

export function createTourSeed(): TourData {
  const departures = [
    {
      id: "walk-13",
      tourId: "old-town",
      startsAt: "2026-10-13T07:00:00+02:00",
      capacity: 12,
      policy: "deposit",
      balanceDueAt: "2026-10-12T18:00:00+02:00",
      closed: true,
    },
    {
      id: "walk-16",
      tourId: "old-town",
      startsAt: "2026-10-16T10:00:00+02:00",
      capacity: 12,
      policy: "deposit",
      balanceDueAt: "2026-10-15T18:00:00+02:00",
      closed: false,
    },
    {
      id: "walk-18",
      tourId: "old-town",
      startsAt: "2026-10-18T14:00:00+02:00",
      capacity: 12,
      policy: "full",
      balanceDueAt: "2026-10-18T14:00:00+02:00",
      closed: false,
    },
    {
      id: "walk-20",
      tourId: "old-town",
      startsAt: "2026-10-20T10:00:00+02:00",
      capacity: 12,
      policy: "full",
      balanceDueAt: "2026-10-20T10:00:00+02:00",
      closed: false,
    },
    {
      id: "lake-17",
      tourId: "lake",
      startsAt: "2026-10-17T10:00:00+02:00",
      capacity: 16,
      policy: "later",
      balanceDueAt: "2026-10-16T18:00:00+02:00",
      closed: false,
    },
    // Last seats: 9 of 12 seats are booked, so the sample group of 3 takes the last ones.
    {
      id: "walk-23",
      tourId: "old-town",
      startsAt: "2026-10-23T10:00:00+02:00",
      capacity: 12,
      policy: "deposit",
      balanceDueAt: "2026-10-22T18:00:00+02:00",
      closed: false,
    },
    {
      id: "night-15",
      tourId: "night",
      startsAt: "2026-10-15T19:30:00+02:00",
      capacity: 10,
      policy: "full",
      balanceDueAt: "2026-10-15T19:30:00+02:00",
      closed: false,
    },
    {
      id: "night-22",
      tourId: "night",
      startsAt: "2026-10-22T19:30:00+02:00",
      capacity: 10,
      policy: "full",
      balanceDueAt: "2026-10-22T19:30:00+02:00",
      closed: false,
    },
    {
      id: "workshop-17",
      tourId: "workshop",
      startsAt: "2026-10-17T14:00:00+02:00",
      capacity: 6,
      policy: "full",
      balanceDueAt: "2026-10-17T14:00:00+02:00",
      closed: false,
    },
  ] satisfies TourData["departures"];
  const tour = tourSeed[0];
  const record = {
    language: "en",
    tourId: tour.id,
    departureId: "walk-13",
    tourName: tour.name,
    meetingPoint: tour.meetingPoint,
    startsAt: "2026-10-13T07:00:00+02:00",
    endsAt: "2026-10-13T09:00:00+02:00",
    adults: 2,
    children: 1,
    infants: 0,
    childName: "Alex",
    total: 22300,
    firstAmount: 6690,
    adultPrice: tour.adultPrice,
    childPrice: tour.childPrice,
    infantPrice: tour.infantPrice,
    cancellationPolicy: structuredClone(tour.cancellationPolicy),
    policy: "deposit",
    balanceDueAt: "2026-10-12T18:00:00+02:00",
    partnerId: null,
    commissionRate: 0.1,
    createdAt: "2026-10-12T10:00:00+02:00",
    commissionRecordedAt: null,
    activity: [],
  } satisfies Partial<TourBooking>;
  const bookings: TourBooking[] = [
    {
      ...record,
      id: "tour-anna",
      ref: "SK-T1042",
      guestId: "g-anna",
      contactName: "Anna Keller",
      phone: "+41 79 123 45 67",
      status: "confirmed",
      holdUntil: null,
      payments: [
        {
          id: "tp-1",
          amount: 6690,
          method: "online",
          status: "succeeded",
          at: record.createdAt,
        },
      ],
    },
    {
      ...record,
      id: "tour-lena",
      ref: "SK-T1044",
      guestId: "g-elena",
      contactName: "Elena Novak",
      phone: "+41 78 555 01 44",
      status: "no_show",
      holdUntil: null,
      payments: [
        {
          id: "tp-2",
          amount: 22300,
          method: "online",
          status: "succeeded",
          at: record.createdAt,
        },
      ],
    },
    {
      ...record,
      id: "tour-marie",
      ref: "SK-T1045",
      guestId: "g-marie",
      contactName: "Marie Dubois",
      phone: "+41 79 555 01 45",
      status: "delivered",
      holdUntil: null,
      payments: [],
    },
    {
      ...record,
      id: "tour-tom",
      ref: "SK-T1043",
      guestId: "g-tom",
      contactName: "Tom Becker",
      phone: "+49 151 555 0143",
      departureId: "walk-16",
      startsAt: "2026-10-16T10:00:00+02:00",
      endsAt: "2026-10-16T12:00:00+02:00",
      balanceDueAt: "2026-10-15T18:00:00+02:00",
      status: "confirmed",
      holdUntil: null,
      payments: [
        {
          id: "tp-3",
          amount: 6690,
          method: "online",
          status: "succeeded",
          at: record.createdAt,
        },
      ],
    },
  ];
  // Seat fillers: walk-18 and the workshop are sold out, walk-23 keeps its last 3 seats.
  const fillers = [
    [
      "walk-18",
      {
        id: "tour-yuki",
        ref: "SK-T1046",
        guestId: "g-yuki",
        contactName: "Yuki Tanaka",
        phone: "+41 79 555 01 46",
        partnerId: null,
      },
      { adults: 2, children: 2, infants: 0 },
    ],
    [
      "walk-18",
      {
        id: "tour-sofia",
        ref: "SK-T1047",
        guestId: "g-sofia",
        contactName: "Sofia Rossi",
        phone: "+39 333 555 0147",
        partnerId: null,
      },
      { adults: 4, children: 0, infants: 0 },
    ],
    [
      "walk-18",
      {
        id: "tour-daniel",
        ref: "SK-T1048",
        guestId: "g-daniel",
        contactName: "Daniel Meier",
        phone: "+41 76 555 01 48",
        partnerId: null,
      },
      { adults: 2, children: 2, infants: 1 },
    ],
    [
      "walk-23",
      {
        id: "tour-lars",
        ref: "SK-T1049",
        guestId: "g-lars",
        contactName: "Lars Jensen",
        phone: "+45 20 55 01 49",
        partnerId: "hotel-am-see",
      },
      { adults: 3, children: 2, infants: 0 },
    ],
    [
      "walk-23",
      {
        id: "tour-peter",
        ref: "SK-T1050",
        guestId: "g-peter",
        contactName: "Peter Schmid",
        phone: "+41 79 555 01 50",
        partnerId: null,
      },
      { adults: 4, children: 0, infants: 0 },
    ],
    [
      "workshop-17",
      {
        id: "tour-marie-workshop",
        ref: "SK-T1051",
        guestId: "g-marie",
        contactName: "Marie Dubois",
        phone: "+41 79 555 01 45",
        partnerId: null,
      },
      { adults: 2, children: 1, infants: 0 },
    ],
    [
      "workshop-17",
      {
        id: "tour-elena-workshop",
        ref: "SK-T1052",
        guestId: "g-elena",
        contactName: "Elena Novak",
        phone: "+41 78 555 01 44",
        partnerId: null,
      },
      { adults: 3, children: 0, infants: 0 },
    ],
  ] satisfies [string, BookingContact, TourParticipants][];

  for (const [departureId, contact, group] of fillers) {
    const departure = departures.find((d) => d.id === departureId);
    const tour = tourSeed.find((t) => t.id === departure?.tourId);

    if (departure && tour)
      bookings.push(seededBooking(tour, departure, contact, group));
  }
  // Steps 2.10–2.14: overdue policies, completion, cancellation and reconciliation cases.
  const operations = operationsFixtures(tourSeed, departures);

  return {
    tours: structuredClone(tourSeed),
    departures: [...departures, ...operations.departures],
    bookings: [...bookings, ...operations.bookings],
    draft: emptyTourDraft(),
  };
}
