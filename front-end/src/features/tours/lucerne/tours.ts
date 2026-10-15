import type { Departure, Tour, TourStop } from "../types";
import type { StopSlug } from "./stops";

import { stopStories } from "./stops";

import { storyFromChapters } from "@/lib/rich-text";

/**
 * The eleven tours from the client's "Lucerne cultural story journeys" brief (Oct 2026):
 * four city routes and seven alpine journeys. Prices, capacities, departures and meeting
 * points are sample values for the prototype and need the client's confirmation. Stories,
 * stop cards and notes come from the researched notes in docs/content/lucerne-tours.
 */

/** Photo slug (src/assets/photos) shown for each story place. */
export const stopPhotos: Record<StopSlug, string> = {
  "chapel-bridge": "lucerne-kapellbruecke-1200",
  kornmarkt: "kornmarkt",
  weinmarkt: "weinmarkt",
  hirschenplatz: "hirschenplatz",
  "victorinox-store": "victorinox-store",
  "musegg-zyt": "zytturm",
  hofkirche: "hofkirche",
  "lion-monument": "lion-monument",
  "old-swiss-house": "old-swiss-house",
  "jesuit-church": "jesuit-church",
  "ritter-palace": "ritter-palace",
  "suidter-pharmacy": "suidter-pharmacy",
  furka: "furka-rhone-glacier",
  grimsel: "grimsel-hospiz",
  susten: "susten-steinsee",
  gotthard: "gotthard-devils-bridge",
  nufenen: "nufenen-pass",
  "brienzer-rothorn": "rothorn-steam",
  "finsterwald-honey": "finsterwald-entlebuch",
};

const cancellationPolicy = {
  en: "Sample policy: contact the organiser at least 48 hours before departure. Refunds and rescheduling need merchant approval.",
  de: "Beispielregel: mindestens 48 Stunden vor Beginn den Veranstalter kontaktieren. Rückerstattungen und Umbuchungen brauchen die Zustimmung des Händlers.",
};
const passCancellationPolicy = {
  en: "Sample policy: contact the organiser at least 48 hours before departure. If the pass or a railway is closed on the day, the organiser offers another date or a refund.",
  de: "Beispielregel: mindestens 48 Stunden vor Beginn den Veranstalter kontaktieren. Ist der Pass oder eine Bahn am Tag gesperrt, bietet der Veranstalter ein anderes Datum oder eine Rückerstattung an.",
};

function stop(
  slug: StopSlug,
  minutesFromStart: number,
  id: string = slug,
): TourStop {
  const story = stopStories[slug];

  return {
    id,
    name: story.name,
    description: story.description,
    minutesFromStart,
    coordinates: story.coordinates,
    photo: stopPhotos[slug],
    ...("note" in story ? { note: story.note } : {}),
  };
}

function chapters(slugs: StopSlug[]) {
  return slugs.map((slug) => ({
    photo: stopPhotos[slug],
    title: stopStories[slug].title,
    body: stopStories[slug].body,
  }));
}

const station = (photo = "lucerne-kapellbruecke-1200"): TourStop => ({
  id: "station",
  name: { en: "Lucerne railway station", de: "Bahnhof Luzern" },
  description: {
    en: "Meet your driver-guide at Bahnhofplatz. The vehicle leaves on time and returns here at the end of the day.",
    de: "Treffen Sie Ihre Fahrerführung am Bahnhofplatz. Das Fahrzeug fährt pünktlich ab und bringt Sie am Ende des Tages hierher zurück.",
  },
  minutesFromStart: 0,
  coordinates: [8.3093, 47.0505],
  photo,
});

const passMeeting = {
  en: "Lucerne railway station · Bahnhofplatz",
  de: "Bahnhof Luzern · Bahnhofplatz",
};
const passIncluded: Tour["included"] = [
  {
    en: "Driver-guide in English or German",
    de: "Fahrerführung auf Englisch oder Deutsch",
  },
  {
    en: "Vehicle from and back to Lucerne",
    de: "Fahrzeug ab und zurück nach Luzern",
  },
  {
    en: "Stops at designated viewpoints only",
    de: "Halte nur an markierten Aussichtspunkten",
  },
];
const passConditions = {
  en: "Alpine road trip by vehicle; no hiking is needed. Pass roads are seasonal and close after snow, so the journey runs only when the pass is open. Bring warm layers. Travel times are estimates. Children must be accompanied by an adult.",
  de: "Alpenfahrt mit dem Fahrzeug, Wandern ist nicht nötig. Passstrassen sind saisonal und werden nach Schneefall gesperrt, die Fahrt findet nur bei geöffnetem Pass statt. Warme Kleidung mitbringen. Fahrzeiten sind Schätzungen. Kinder müssen von einer erwachsenen Person begleitet werden.",
};
const passExcluded = {
  en: "Meals, drinks and entry fees.",
  de: "Mahlzeiten, Getränke und Eintrittspreise.",
};
const passAgeBands = { childFrom: 6, adultFrom: 16 };
const passFields: Tour["participantFields"] = [
  {
    id: "needs",
    label: {
      en: "Mobility or dietary needs",
      de: "Mobilitäts- oder Ernährungsbedürfnisse",
    },
    required: false,
  },
];
const cityFields: Tour["participantFields"] = [
  {
    id: "childName",
    label: { en: "Child’s name", de: "Name des Kindes" },
    required: false,
  },
];

export const lucerneTours: Tour[] = [
  {
    id: "lucerne-90",
    slug: "lucerne-in-90-minutes",
    name: { en: "Lucerne in 90 minutes", de: "Luzern in 90 Minuten" },
    summary: {
      en: "A guided walk from Chapel Bridge to the old-town squares",
      de: "Ein geführter Spaziergang von der Kapellbrücke zu den Plätzen der Altstadt",
    },
    description: {
      en: "Five stops in 90 minutes: Chapel Bridge, Kornmarkt, Weinmarkt, Hirschenplatz and the Victorinox store. Your guide tells the story behind each place, and the walk ends where you can look around the shop. With two hours, your guide can add the Lion Monument.",
      de: "Fünf Stationen in 90 Minuten: Kapellbrücke, Kornmarkt, Weinmarkt, Hirschenplatz und der Victorinox Store. Ihre Führung erzählt die Geschichte hinter jedem Ort, und der Spaziergang endet dort, wo Sie sich im Laden umsehen können. Mit zwei Stunden kann Ihre Führung das Löwendenkmal ergänzen.",
    },
    longStory: storyFromChapters({
      title: {
        en: "Five places, five stories",
        de: "Fünf Orte, fünf Geschichten",
      },
      chapters: chapters([
        "chapel-bridge",
        "kornmarkt",
        "weinmarkt",
        "hirschenplatz",
        "victorinox-store",
      ]),
    }),
    photos: [
      "lucerne-kapellbruecke-1200",
      "weinmarkt",
      "hirschenplatz",
      "victorinox-store",
    ],
    durationMinutes: 90,
    adultPrice: 8900,
    childPrice: 4500,
    infantPrice: 0,
    meetingPoint: {
      en: "Chapel Bridge · Rathausquai end",
      de: "Kapellbrücke · Seite Rathausquai",
    },
    included: [
      {
        en: "Local guide in English or German",
        de: "Lokale Führung auf Englisch oder Deutsch",
      },
      {
        en: "90-minute guided walk with a shopping stop at the end",
        de: "90-minütiger geführter Spaziergang mit Einkaufsstopp am Ende",
      },
    ],
    excluded: {
      en: "Food, drinks, purchases and entry fees.",
      de: "Essen, Getränke, Einkäufe und Eintrittspreise.",
    },
    conditions: {
      en: "A short walk of under 1 km on cobbled streets. Comfortable shoes recommended. Children must be accompanied by an adult. The Water Tower and Town Hall interiors are not part of the walk.",
      de: "Ein kurzer Spaziergang von unter 1 km über Kopfsteinpflaster. Bequeme Schuhe empfohlen. Kinder müssen von einer erwachsenen Person begleitet werden. Das Innere von Wasserturm und Rathaus gehört nicht zum Rundgang.",
    },
    cancellationPolicy,
    published: true,
    commissionRate: 0.1,
    itinerary: [
      stop("chapel-bridge", 0),
      stop("kornmarkt", 20),
      stop("weinmarkt", 40),
      stop("hirschenplatz", 55),
      stop("victorinox-store", 75),
    ],
    ageBands: { childFrom: 6, adultFrom: 16 },
    participantFields: cityFields,
  },
  {
    id: "time-history-loyalty",
    slug: "time-history-and-loyalty",
    name: {
      en: "Time, history and loyalty",
      de: "Zeit, Geschichte und Treue",
    },
    summary: {
      en: "A half-day walk from the Musegg Wall to the Lion Monument",
      de: "Ein Halbtagesspaziergang von der Museggmauer zum Löwendenkmal",
    },
    description: {
      en: "From the Zyt Tower on the Musegg Wall to the Hofkirche, the Lion Monument, the Old Swiss House and the Jesuit Church: a half-day for groups who want the story of how Lucerne kept time, built its churches and remembered its Swiss Guards. The meal at the Old Swiss House is optional.",
      de: "Vom Zytturm auf der Museggmauer zur Hofkirche, zum Löwendenkmal, zum Old Swiss House und zur Jesuitenkirche: ein halber Tag für Gruppen, die erfahren möchten, wie Luzern die Zeit mass, seine Kirchen baute und seiner Schweizergardisten gedachte. Das Essen im Old Swiss House ist optional.",
    },
    longStory: storyFromChapters({
      title: {
        en: "How a city remembers",
        de: "Wie sich eine Stadt erinnert",
      },
      chapters: chapters([
        "musegg-zyt",
        "hofkirche",
        "lion-monument",
        "old-swiss-house",
        "jesuit-church",
      ]),
    }),
    photos: ["zytturm", "lion-monument", "hofkirche", "jesuit-church"],
    durationMinutes: 240,
    adultPrice: 12900,
    childPrice: 6500,
    infantPrice: 0,
    meetingPoint: {
      en: "Zyt Tower · Museggmauer",
      de: "Zytturm · Museggmauer",
    },
    included: [
      {
        en: "Local guide in English or German",
        de: "Lokale Führung auf Englisch oder Deutsch",
      },
      {
        en: "Half-day guided walk in a small group",
        de: "Geführter Halbtagesspaziergang in kleiner Gruppe",
      },
    ],
    excluded: {
      en: "Food and drinks (the meal at the Old Swiss House is optional), transport and entry fees.",
      de: "Essen und Getränke (das Essen im Old Swiss House ist optional), Transport und Eintrittspreise.",
    },
    conditions: {
      en: "About 3 km with some steps and one climb to the Musegg Wall; ask the organiser about a step-free route. Access to the Musegg towers is seasonal. Churches are visited outside services. Children must be accompanied by an adult.",
      de: "Rund 3 km mit einigen Stufen und einem Anstieg zur Museggmauer, einen stufenfreien Weg erfragen Sie beim Veranstalter. Der Zugang zu den Museggtürmen ist saisonal. Kirchen werden ausserhalb der Gottesdienste besucht. Kinder müssen von einer erwachsenen Person begleitet werden.",
    },
    cancellationPolicy,
    published: true,
    commissionRate: 0.1,
    itinerary: [
      stop("musegg-zyt", 0),
      stop("hofkirche", 55),
      stop("lion-monument", 100),
      stop("old-swiss-house", 130),
      stop("jesuit-church", 195),
    ],
    ageBands: { childFrom: 6, adultFrom: 16 },
    participantFields: cityFields,
  },
  {
    id: "quieter-lives",
    slug: "the-citys-quieter-lives",
    name: {
      en: "The city’s quieter lives",
      de: "Die stillen Seiten der Stadt",
    },
    summary: {
      en: "A self-guided route past a palace, a pharmacy and a church",
      de: "Eine Route auf eigene Faust an Palast, Apotheke und Kirche vorbei",
    },
    description: {
      en: "Not every memory belongs in a palace. This self-guided route links Ritter’s Palace, the Jesuit Church, the Suidter pharmacy, two old-town squares and the Lion Monument, with a story card for each stop. Allow three to five hours; it suits small groups.",
      de: "Nicht jede Erinnerung gehört in einen Palast. Diese Route auf eigene Faust verbindet den Ritterschen Palast, die Jesuitenkirche, die Suidter-Apotheke, zwei Altstadtplätze und das Löwendenkmal, mit einer Geschichtenkarte zu jeder Station. Rechnen Sie mit drei bis fünf Stunden; die Route eignet sich für kleine Gruppen.",
    },
    longStory: storyFromChapters({
      title: {
        en: "Ordinary lives, kept in stone and glass",
        de: "Alltag, aufbewahrt in Stein und Glas",
      },
      chapters: chapters([
        "ritter-palace",
        "jesuit-church",
        "suidter-pharmacy",
        "weinmarkt",
        "hirschenplatz",
        "lion-monument",
      ]),
    }),
    photos: ["ritter-palace", "suidter-pharmacy", "jesuit-church"],
    durationMinutes: 240,
    adultPrice: 3900,
    childPrice: 2000,
    infantPrice: 0,
    meetingPoint: {
      en: "Ritter’s Palace · Bahnhofstrasse",
      de: "Ritterscher Palast · Bahnhofstrasse",
    },
    included: [
      {
        en: "Story card for each of the six stops",
        de: "Geschichtenkarte zu jeder der sechs Stationen",
      },
      {
        en: "Route map with the walking order",
        de: "Routenkarte mit der Reihenfolge",
      },
    ],
    excluded: {
      en: "A guide, food, drinks and entry fees.",
      de: "Führung, Essen, Getränke und Eintrittspreise.",
    },
    conditions: {
      en: "Self-guided, at your own pace. The pharmacy is a working shop and the palace courtyard is usually open on working days only; neither visit is part of the ticket, so arrange anything beyond the outside view in advance. Comfortable shoes recommended.",
      de: "Auf eigene Faust, im eigenen Tempo. Die Apotheke ist ein laufender Betrieb und der Palasthof ist in der Regel nur an Werktagen offen. Beides gehört nicht zum Ticket, Besuche über die Aussenansicht hinaus bitte vorab absprechen. Bequeme Schuhe empfohlen.",
    },
    cancellationPolicy,
    published: true,
    commissionRate: 0.1,
    itinerary: [
      stop("ritter-palace", 0),
      stop("jesuit-church", 30),
      stop("suidter-pharmacy", 60),
      stop("weinmarkt", 100),
      stop("hirschenplatz", 130),
      stop("lion-monument", 170),
    ],
    ageBands: { childFrom: 6, adultFrom: 16 },
    participantFields: cityFields,
  },
  {
    id: "own-pace",
    slug: "lucerne-at-your-own-pace",
    name: {
      en: "Lucerne at your own pace",
      de: "Luzern im eigenen Tempo",
    },
    summary: {
      en: "A self-guided old-town route with a story at every stop",
      de: "Eine Altstadtroute auf eigene Faust mit einer Geschichte an jeder Station",
    },
    description: {
      en: "Six stops across the old town, from Chapel Bridge to the Lion Monument, with a story card and a map for each. Two to three relaxed hours; leave out the Lion Monument if you only have 90 minutes.",
      de: "Sechs Stationen in der Altstadt, von der Kapellbrücke bis zum Löwendenkmal, jeweils mit Geschichtenkarte und Karte. Zwei bis drei entspannte Stunden; lassen Sie das Löwendenkmal weg, wenn Sie nur 90 Minuten haben.",
    },
    longStory: storyFromChapters({
      title: {
        en: "A city to read slowly",
        de: "Eine Stadt zum langsamen Lesen",
      },
      chapters: chapters([
        "chapel-bridge",
        "jesuit-church",
        "kornmarkt",
        "weinmarkt",
        "hirschenplatz",
        "lion-monument",
      ]),
    }),
    photos: ["lucerne-kapellbruecke-1200", "kornmarkt", "lion-monument"],
    durationMinutes: 150,
    adultPrice: 2900,
    childPrice: 1500,
    infantPrice: 0,
    meetingPoint: {
      en: "Chapel Bridge · Rathausquai end",
      de: "Kapellbrücke · Seite Rathausquai",
    },
    included: [
      {
        en: "Story card for each of the six stops",
        de: "Geschichtenkarte zu jeder der sechs Stationen",
      },
      {
        en: "Route map with the walking order",
        de: "Routenkarte mit der Reihenfolge",
      },
    ],
    excluded: {
      en: "A guide, food, drinks and entry fees.",
      de: "Führung, Essen, Getränke und Eintrittspreise.",
    },
    conditions: {
      en: "Self-guided, about 2 km on cobbled streets. Check the walking route on a live map. Comfortable shoes recommended. Children must be accompanied by an adult.",
      de: "Auf eigene Faust, rund 2 km über Kopfsteinpflaster. Den Weg bitte auf einer Live-Karte prüfen. Bequeme Schuhe empfohlen. Kinder müssen von einer erwachsenen Person begleitet werden.",
    },
    cancellationPolicy,
    published: true,
    commissionRate: 0.1,
    itinerary: [
      stop("chapel-bridge", 0),
      stop("jesuit-church", 25),
      stop("kornmarkt", 50),
      stop("weinmarkt", 70),
      stop("hirschenplatz", 90),
      stop("lion-monument", 120),
    ],
    ageBands: { childFrom: 6, adultFrom: 16 },
    participantFields: cityFields,
  },
  {
    id: "furka",
    slug: "furka-a-road-where-you-can-see-time",
    name: { en: "Furka Pass", de: "Furkapass" },
    summary: {
      en: "A day on the pass road above the Rhône Glacier",
      de: "Ein Tag auf der Passstrasse über dem Rhonegletscher",
    },
    description: {
      en: "From Lucerne over the Furka Pass to the Hotel Belvédère and the Rhône Glacier viewpoint, then down to Gletsch. A day by vehicle about how a road and a glacier both keep a record of time.",
      de: "Von Luzern über den Furkapass zum Hotel Belvédère und zum Aussichtspunkt am Rhonegletscher, dann hinunter nach Gletsch. Ein Tag im Fahrzeug darüber, wie eine Strasse und ein Gletscher beide die Zeit festhalten.",
    },
    longStory: storyFromChapters({
      title: {
        en: "A road where you can see time",
        de: "Eine Strasse, auf der man die Zeit sieht",
      },
      chapters: chapters(["furka"]),
    }),
    photos: ["furka-rhone-glacier", "furka-hairpins"],
    durationMinutes: 330,
    adultPrice: 18900,
    childPrice: 9500,
    infantPrice: 0,
    meetingPoint: passMeeting,
    included: passIncluded,
    excluded: passExcluded,
    conditions: passConditions,
    cancellationPolicy: passCancellationPolicy,
    published: true,
    commissionRate: 0.1,
    itinerary: [
      station(),
      {
        id: "furka-summit",
        name: { en: "Furka summit viewpoint", de: "Furka-Passhöhe" },
        description: {
          en: "A first stop at the summit to look back at the climb from the Uri side.",
          de: "Ein erster Halt auf der Passhöhe mit Blick zurück auf den Aufstieg von der Urner Seite.",
        },
        minutesFromStart: 110,
        coordinates: [8.42173, 46.57624],
        photo: "furka-hairpins",
      },
      stop("furka", 135),
      {
        id: "gletsch",
        name: { en: "Gletsch", de: "Gletsch" },
        description: {
          en: "A short stop at the foot of the Rhône Glacier valley before the drive back.",
          de: "Ein kurzer Halt am Fuss des Rhonegletschertals vor der Rückfahrt.",
        },
        minutesFromStart: 173,
        coordinates: [8.3615, 46.56132],
        photo: stopPhotos.furka,
      },
    ],
    ageBands: passAgeBands,
    participantFields: passFields,
  },
  {
    id: "grimsel",
    slug: "grimsel-when-water-becomes-power",
    name: { en: "Grimsel Pass", de: "Grimselpass" },
    summary: {
      en: "Granite, blue reservoirs and the hospice on the pass",
      de: "Granit, blaue Stauseen und das Hospiz auf der Passhöhe",
    },
    description: {
      en: "Through the Aare valley to the Räterichsbodensee, the Grimsel Hospiz and the summit tarn. A day on how water, once an obstacle, became a source of energy, seen only from public viewpoints.",
      de: "Durch das Aaretal zum Räterichsbodensee, zum Grimsel Hospiz und zum Totesee auf der Passhöhe. Ein Tag darüber, wie Wasser, einst ein Hindernis, zur Energiequelle wurde, gesehen nur von öffentlichen Aussichtspunkten.",
    },
    longStory: storyFromChapters({
      title: {
        en: "When water becomes power",
        de: "Wenn Wasser zu Kraft wird",
      },
      chapters: chapters(["grimsel"]),
    }),
    photos: ["grimsel-hospiz", "grimsel-dam"],
    durationMinutes: 330,
    adultPrice: 18900,
    childPrice: 9500,
    infantPrice: 0,
    meetingPoint: passMeeting,
    included: passIncluded,
    excluded: passExcluded,
    conditions: {
      en: `${passConditions.en} Dams and power-station areas are not entered.`,
      de: `${passConditions.de} Staumauern und Kraftwerksanlagen werden nicht betreten.`,
    },
    cancellationPolicy: passCancellationPolicy,
    published: true,
    commissionRate: 0.1,
    itinerary: [
      station(),
      {
        id: "handegg",
        name: { en: "Handegg", de: "Handegg" },
        description: {
          en: "A first stop in the upper Aare valley, where the road starts to climb.",
          de: "Ein erster Halt im oberen Aaretal, wo die Strasse zu steigen beginnt.",
        },
        minutesFromStart: 95,
        coordinates: [8.30706, 46.61243],
        photo: stopPhotos.grimsel,
      },
      {
        id: "raeterichsboden",
        name: { en: "Lake Räterichsboden", de: "Räterichsbodensee" },
        description: {
          en: "A viewpoint over the first reservoir on the way up.",
          de: "Ein Aussichtspunkt über den ersten Stausee auf dem Weg nach oben.",
        },
        minutesFromStart: 120,
        coordinates: [8.32835, 46.58408],
        photo: "grimsel-dam",
      },
      stop("grimsel", 138),
      {
        id: "grimsel-top",
        name: {
          en: "Grimsel summit and Totesee",
          de: "Grimsel-Passhöhe und Totesee",
        },
        description: {
          en: "A last stop at the top, by the small lake on the summit.",
          de: "Ein letzter Halt auf der Passhöhe, am kleinen See.",
        },
        minutesFromStart: 191,
        coordinates: [8.3377, 46.56152],
        photo: stopPhotos.grimsel,
      },
    ],
    ageBands: passAgeBands,
    participantFields: passFields,
  },
  {
    id: "susten",
    slug: "susten-the-beauty-of-engineering",
    name: { en: "Susten Pass", de: "Sustenpass" },
    summary: {
      en: "Bridges, tunnels and sweeping curves across the mountains",
      de: "Brücken, Tunnels und weite Kurven durch die Berge",
    },
    description: {
      en: "From Wassen up the Susten road to the summit tunnel and on to the Steingletscher. A day about a road built not only to cross the mountains but to show them, with passengers counting the changing frames.",
      de: "Von Wassen die Sustenstrasse hinauf zum Scheiteltunnel und weiter zum Steingletscher. Ein Tag über eine Strasse, die nicht nur die Berge quert, sondern sie zeigt, und bei der die Mitreisenden die wechselnden Bilder zählen.",
    },
    longStory: storyFromChapters({
      title: {
        en: "The beauty of engineering",
        de: "Die Schönheit der Ingenieurskunst",
      },
      chapters: chapters(["susten"]),
    }),
    photos: ["susten-steinsee"],
    durationMinutes: 300,
    adultPrice: 17900,
    childPrice: 9000,
    infantPrice: 0,
    meetingPoint: passMeeting,
    included: passIncluded,
    excluded: passExcluded,
    conditions: {
      en: `${passConditions.en} Nobody walks inside road tunnels or along unsafe edges.`,
      de: `${passConditions.de} Niemand geht in Strassentunnels oder an unsicheren Kanten.`,
    },
    cancellationPolicy: passCancellationPolicy,
    published: true,
    commissionRate: 0.1,
    itinerary: [
      station(),
      stop("susten", 85),
      {
        id: "steingletscher",
        name: { en: "Steingletscher", de: "Steingletscher" },
        description: {
          en: "A longer stop by the glacier lake, with time for lunch or a short walk.",
          de: "Ein längerer Halt am Gletschersee, mit Zeit für ein Mittagessen oder einen kurzen Spaziergang.",
        },
        minutesFromStart: 125,
        coordinates: [8.421, 46.69637],
        photo: stopPhotos.susten,
      },
    ],
    ageBands: passAgeBands,
    participantFields: passFields,
  },
  {
    id: "gotthard",
    slug: "gotthard-the-road-that-connected-europe",
    name: { en: "Gotthard Pass", de: "Gotthardpass" },
    summary: {
      en: "The Devil’s Bridge, the Tremola and the summit, in one day",
      de: "Teufelsbrücke, Tremola und Passhöhe an einem Tag",
    },
    description: {
      en: "The Schöllenen Gorge and the Devil’s Bridge, the summit museum and the cobbled Tremola down to Airolo. A full day about how one pass tied together goods, languages and cultures on both sides of the Alps.",
      de: "Die Schöllenenschlucht und die Teufelsbrücke, das Museum auf der Passhöhe und die gepflasterte Tremola hinunter nach Airolo. Ein ganzer Tag darüber, wie ein Pass Waren, Sprachen und Kulturen auf beiden Seiten der Alpen verband.",
    },
    longStory: storyFromChapters({
      title: {
        en: "The road that connected Europe",
        de: "Die Strasse, die Europa verband",
      },
      chapters: chapters(["gotthard"]),
    }),
    photos: ["gotthard-devils-bridge", "gotthard-tremola"],
    durationMinutes: 420,
    adultPrice: 21900,
    childPrice: 11000,
    infantPrice: 0,
    meetingPoint: passMeeting,
    included: passIncluded,
    excluded: passExcluded,
    conditions: {
      en: `${passConditions.en} The Devil’s Bridge path can be wet and is not step-free.`,
      de: `${passConditions.de} Der Weg zur Teufelsbrücke kann nass sein und ist nicht stufenfrei.`,
    },
    cancellationPolicy: passCancellationPolicy,
    published: true,
    commissionRate: 0.1,
    itinerary: [
      station(),
      stop("gotthard", 75),
      {
        id: "gotthard-summit",
        name: {
          en: "Gotthard summit and museum",
          de: "Gotthard-Passhöhe und Museum",
        },
        description: {
          en: "Park at the summit, 2,106 m up, and visit the small museum or walk to the lake.",
          de: "Parken Sie auf der Passhöhe auf 2106 m und besuchen Sie das kleine Museum oder spazieren Sie zum See.",
        },
        minutesFromStart: 140,
        coordinates: [8.56688, 46.55524],
        photo: "gotthard-tremola",
      },
      {
        id: "tremola",
        name: { en: "The Tremola", de: "Die Tremola" },
        description: {
          en: "Drive the cobbled hairpins down the south side, with one photo stop at a marked viewpoint.",
          de: "Fahren Sie über die gepflasterten Kehren auf der Südseite hinunter, mit einem Fotohalt an einem markierten Aussichtspunkt.",
        },
        minutesFromStart: 200,
        coordinates: [8.57129, 46.54316],
        photo: "gotthard-tremola",
      },
      {
        id: "airolo",
        name: { en: "Airolo", de: "Airolo" },
        description: {
          en: "Lunch in the first village on the Ticino side before the drive home through the tunnel.",
          de: "Mittagessen im ersten Dorf auf der Tessiner Seite, bevor es durch den Tunnel nach Hause geht.",
        },
        minutesFromStart: 245,
        coordinates: [8.6086, 46.52903],
        photo: "gotthard-tremola",
      },
    ],
    ageBands: passAgeBands,
    participantFields: passFields,
  },
  {
    id: "nufenen",
    slug: "nufenen-a-pass-of-the-motoring-age",
    name: { en: "Nufenen Pass", de: "Nufenenpass" },
    summary: {
      en: "The highest pass road entirely within Switzerland, with wind and silence",
      de: "Die höchste Passstrasse, die ganz in der Schweiz liegt, mit Wind und Stille",
    },
    description: {
      en: "Through the Gotthard tunnel to Airolo and up the Bedretto valley to the Nufenen summit at 2,478 m, then down to Ulrichen in the Goms. A day about the age when ordinary motorists could reach landscapes once left to experienced mountain travellers.",
      de: "Durch den Gotthardtunnel nach Airolo und durchs Bedrettotal zur Nufenen-Passhöhe auf 2478 m, dann hinunter nach Ulrichen im Goms. Ein Tag über die Zeit, als gewöhnliche Autofahrende Landschaften erreichten, die einst erfahrenen Bergreisenden vorbehalten waren.",
    },
    longStory: storyFromChapters({
      title: {
        en: "A pass of the motoring age",
        de: "Ein Pass des Autozeitalters",
      },
      chapters: chapters(["nufenen"]),
    }),
    photos: ["nufenen-pass"],
    durationMinutes: 450,
    adultPrice: 23900,
    childPrice: 12000,
    infantPrice: 0,
    meetingPoint: passMeeting,
    included: passIncluded,
    excluded: passExcluded,
    conditions: passConditions,
    cancellationPolicy: passCancellationPolicy,
    published: true,
    commissionRate: 0.1,
    itinerary: [
      station(),
      {
        id: "airolo",
        name: { en: "Airolo", de: "Airolo" },
        description: {
          en: "A coffee stop on the Ticino side of the Gotthard tunnel.",
          de: "Ein Kaffeehalt auf der Tessiner Seite des Gotthardtunnels.",
        },
        minutesFromStart: 90,
        coordinates: [8.6086, 46.52903],
        photo: stopPhotos.nufenen,
      },
      {
        id: "all-acqua",
        name: { en: "All’Acqua", de: "All’Acqua" },
        description: {
          en: "A short photo stop at the foot of the climb in the Bedretto valley.",
          de: "Ein kurzer Fotohalt am Fuss des Anstiegs im Bedrettotal.",
        },
        minutesFromStart: 130,
        coordinates: [8.47574, 46.48691],
        photo: stopPhotos.nufenen,
      },
      stop("nufenen", 155),
      {
        id: "ulrichen",
        name: { en: "Ulrichen", de: "Ulrichen" },
        description: {
          en: "Lunch in the Goms valley, on the Valais side of the pass.",
          de: "Mittagessen im Goms, auf der Walliser Seite des Passes.",
        },
        minutesFromStart: 240,
        coordinates: [8.30497, 46.50656],
        photo: stopPhotos.nufenen,
      },
    ],
    ageBands: passAgeBands,
    participantFields: passFields,
  },
  {
    id: "rothorn",
    slug: "brienzer-rothorn-when-steam-climbs-into-the-clouds",
    name: { en: "Brienzer Rothorn", de: "Brienzer Rothorn" },
    summary: {
      en: "Cable car up, steam railway down to Lake Brienz",
      de: "Mit der Seilbahn hinauf, mit der Dampfbahn hinunter an den Brienzersee",
    },
    description: {
      en: "From Sörenberg up the Brienzer Rothorn by cable car, then down to Brienz on the cog railway. A one-day version of a journey that is better over two days: fewer stops, so each chapter has room. Giessbach Falls by boat is an optional extra.",
      de: "Von Sörenberg mit der Seilbahn aufs Brienzer Rothorn und mit der Zahnradbahn hinunter nach Brienz. Eine Eintagesversion einer Reise, die sich besser auf zwei Tage verteilt: weniger Stationen, damit jedes Kapitel Raum hat. Die Bootsfahrt zu den Giessbachfällen ist ein optionales Extra.",
    },
    longStory: storyFromChapters({
      title: {
        en: "When steam climbs into the clouds",
        de: "Wenn Dampf in die Wolken steigt",
      },
      chapters: chapters(["brienzer-rothorn"]),
    }),
    photos: ["rothorn-steam", "rothorn-view"],
    durationMinutes: 420,
    adultPrice: 19900,
    childPrice: 10000,
    infantPrice: 0,
    meetingPoint: passMeeting,
    included: [
      {
        en: "Driver-guide in English or German",
        de: "Fahrerführung auf Englisch oder Deutsch",
      },
      {
        en: "Vehicle to Sörenberg and from Brienz back to Lucerne",
        de: "Fahrzeug nach Sörenberg und von Brienz zurück nach Luzern",
      },
    ],
    excluded: {
      en: "Cable car, railway and boat tickets, meals and drinks.",
      de: "Tickets für Seilbahn, Bahn und Schiff, Mahlzeiten und Getränke.",
    },
    conditions: {
      en: "Cable car, steam railway and boat run seasonally; check the timetables before booking. Steam is not guaranteed on every train. Compartments are small, so ask the organiser before booking if you need step-free access. Bring warm layers: the summit is much colder than the valley.",
      de: "Seilbahn, Dampfbahn und Schiff verkehren saisonal, bitte die Fahrpläne vor der Buchung prüfen. Dampf ist nicht auf jedem Zug garantiert. Die Abteile sind klein, wer stufenfreien Zugang braucht, fragt vor der Buchung beim Veranstalter nach. Warme Kleidung mitbringen: Auf dem Gipfel ist es deutlich kälter als im Tal.",
    },
    cancellationPolicy: passCancellationPolicy,
    published: true,
    commissionRate: 0.1,
    itinerary: [
      station(),
      {
        id: "soerenberg",
        name: { en: "Sörenberg cable car", de: "Seilbahn Sörenberg" },
        description: {
          en: "Board the aerial tramway at Sörenberg for the ride up to the summit.",
          de: "Steigen Sie in Sörenberg in die Luftseilbahn für die Fahrt zum Gipfel.",
        },
        minutesFromStart: 70,
        coordinates: [8.05896, 46.80854],
        photo: stopPhotos["brienzer-rothorn"],
      },
      stop("brienzer-rothorn", 85),
      {
        id: "planalp",
        name: { en: "Planalp, on the railway", de: "Planalp, an der Bahn" },
        description: {
          en: "The cog railway passes the mid-station on its slow run down the mountain.",
          de: "Die Zahnradbahn passiert die Mittelstation auf ihrer langsamen Talfahrt.",
        },
        minutesFromStart: 230,
        coordinates: [8.01991, 46.77226],
        photo: stopPhotos["brienzer-rothorn"],
      },
      {
        id: "brienz",
        name: { en: "Brienz", de: "Brienz" },
        description: {
          en: "Lunch by Lake Brienz. Your driver meets you here, or you can continue by boat to Giessbach.",
          de: "Mittagessen am Brienzersee. Ihre Fahrerführung holt Sie hier ab, oder Sie fahren mit dem Schiff weiter zum Giessbach.",
        },
        minutesFromStart: 260,
        coordinates: [8.0379, 46.75459],
        photo: "rothorn-view",
      },
    ],
    ageBands: passAgeBands,
    participantFields: passFields,
  },
  {
    id: "finsterwald-honey",
    slug: "finsterwald-every-flowering-season-tastes-different",
    name: { en: "Finsterwald honey", de: "Finsterwald und der Honig" },
    summary: {
      en: "A quieter Switzerland of moors, meadows and bees",
      de: "Eine stillere Schweiz aus Mooren, Wiesen und Bienen",
    },
    description: {
      en: "Leave the city for Finsterwald in the Entlebuch biosphere, with time on the moor path and, where a local beekeeper agrees, a small beehouse visit. A morning about how honey tastes of its flowers, its weather and its beekeeper.",
      de: "Verlassen Sie die Stadt Richtung Finsterwald in der Biosphäre Entlebuch, mit Zeit auf dem Moorpfad und, wenn eine örtliche Imkerei zustimmt, einem kleinen Besuch im Bienenhaus. Ein Vormittag darüber, wie Honig nach seinen Blüten, seinem Wetter und seiner Imkerin oder seinem Imker schmeckt.",
    },
    longStory: storyFromChapters({
      title: {
        en: "Every flowering season tastes different",
        de: "Jede Blütezeit schmeckt anders",
      },
      chapters: chapters(["finsterwald-honey"]),
    }),
    photos: ["finsterwald-entlebuch", "finsterwald-beehouse"],
    durationMinutes: 210,
    adultPrice: 13900,
    childPrice: 7000,
    infantPrice: 0,
    meetingPoint: passMeeting,
    included: [
      {
        en: "Driver-guide in English or German",
        de: "Fahrerführung auf Englisch oder Deutsch",
      },
      {
        en: "Vehicle from and back to Lucerne",
        de: "Fahrzeug ab und zurück nach Luzern",
      },
    ],
    excluded: {
      en: "Honey and other purchases, meals and drinks.",
      de: "Honig und andere Einkäufe, Mahlzeiten und Getränke.",
    },
    conditions: {
      en: "A beehouse visit happens only if the owner agrees and is not promised. Tell the organiser about allergies before booking, and follow the beekeeper’s safety instructions. Wear closed shoes.",
      de: "Ein Besuch im Bienenhaus findet nur mit Zustimmung der Besitzerin oder des Besitzers statt und wird nicht zugesichert. Teilen Sie Allergien vor der Buchung mit und befolgen Sie die Sicherheitshinweise der Imkerei. Geschlossene Schuhe tragen.",
    },
    cancellationPolicy,
    published: true,
    commissionRate: 0.1,
    itinerary: [
      station(),
      stop("finsterwald-honey", 50),
      {
        id: "mettilimoos",
        name: { en: "Moor path", de: "Moorpfad" },
        description: {
          en: "A short walk on the public path through the moor landscape.",
          de: "Ein kurzer Spaziergang auf dem öffentlichen Pfad durch die Moorlandschaft.",
        },
        minutesFromStart: 80,
        coordinates: [8.08892, 46.98456],
        photo: stopPhotos["finsterwald-honey"],
      },
    ],
    ageBands: passAgeBands,
    participantFields: [
      {
        id: "allergies",
        label: {
          en: "Allergies, including bee stings",
          de: "Allergien, auch gegen Bienenstiche",
        },
        required: true,
      },
    ],
  },
];

const at = (date: string, time: string) =>
  `${date}T${time}:00${date >= "2026-10-25" ? "+01:00" : "+02:00"}`;
const departure = (
  id: string,
  tourId: string,
  date: string,
  time: string,
  capacity: number,
  policy: Departure["policy"],
): Departure => {
  const startsAt = at(date, time);
  const dayBefore = new Date(Date.parse(startsAt) - 86_400_000)
    .toISOString()
    .slice(0, 10);

  return {
    id,
    tourId,
    startsAt,
    capacity,
    policy,
    balanceDueAt: policy === "full" ? startsAt : at(dayBefore, "18:00"),
    closed: false,
  };
};

/** Departures added with the Lucerne tours; the older fixtures keep their ids in the seed. */
export const lucerneDepartures: Departure[] = [
  departure(
    "history-24",
    "time-history-loyalty",
    "2026-10-24",
    "09:30",
    16,
    "deposit",
  ),
  departure(
    "history-31",
    "time-history-loyalty",
    "2026-10-31",
    "09:30",
    16,
    "full",
  ),
  departure("pace-16", "own-pace", "2026-10-16", "10:00", 20, "full"),
  departure("pace-18", "own-pace", "2026-10-18", "14:00", 20, "full"),
  departure("pace-24", "own-pace", "2026-10-24", "10:00", 20, "full"),
  departure("furka-24", "furka", "2026-10-24", "09:00", 8, "deposit"),
  departure("furka-31", "furka", "2026-10-31", "09:00", 8, "full"),
  departure("grimsel-25", "grimsel", "2026-10-25", "09:00", 8, "deposit"),
  departure("grimsel-01", "grimsel", "2026-11-01", "09:00", 8, "full"),
  departure("susten-22", "susten", "2026-10-22", "09:30", 8, "full"),
  departure("susten-29", "susten", "2026-10-29", "09:30", 8, "deposit"),
  departure("gotthard-23", "gotthard", "2026-10-23", "08:30", 8, "deposit"),
  departure("gotthard-30", "gotthard", "2026-10-30", "08:30", 8, "full"),
  departure("nufenen-26", "nufenen", "2026-10-26", "08:30", 8, "deposit"),
  departure("nufenen-02", "nufenen", "2026-11-02", "08:30", 8, "full"),
  departure("rothorn-21", "rothorn", "2026-10-21", "08:00", 8, "full"),
  departure("rothorn-28", "rothorn", "2026-10-28", "08:00", 8, "deposit"),
  departure("honey-20", "finsterwald-honey", "2026-10-20", "09:00", 8, "full"),
  departure("honey-27", "finsterwald-honey", "2026-10-27", "09:00", 8, "later"),
];
