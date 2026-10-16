import type { Departure, Tour, TourSection, TourStop } from "../types";

import { lt, row, sampleDeparture, timeline } from "./curated";
import { stopStories } from "./stops";

import { storyFromChapters } from "@/lib/rich-text";

/**
 * Tour 01 of the client's three curated tours: "Lucerne: The Things That Remain"
 * (client-resources/Swiss_Native_Lucerne_Tour_01.pdf, planning edition, verified 16.10.2026).
 * Prices, capacity and departures are sample values. Spreuer Bridge and the Needle Dam are
 * written from that document; the other three stops reuse the researched stop stories.
 */
const photos = {
  station: "lucerne-old-town",
  "chapel-bridge": "lucerne-kapellbruecke-1200",
  kornmarkt: "kornmarkt",
  weinmarkt: "weinmarkt",
  "spreuer-bridge": "spreuer-totentanz",
  "needle-dam": "nadelwehr",
} as const;

const spreuer = {
  name: lt("Spreuer Bridge", "Spreuerbrücke"),
  coordinates: [8.30187, 47.05198] as [number, number],
  title: lt(
    "Paintings that remind us of time",
    "Bilder, die an die Zeit erinnern",
  ),
  body: lt(
    "The Spreuer Bridge is a covered wooden footbridge over the Reuss. Under its roof hangs a Dance of Death, a cycle of paintings from the 17th century that the official tourist listing dates to 1625–1635. In each picture Death comes for a person from a different walk of life. It is a very old way of asking what matters when time is limited. Not every mood suits these pictures, so your guide introduces them gently and with the age of the group in mind. Cross slowly, keep the walkway clear for others, and give one picture more time than you planned.",
    "Die Spreuerbrücke ist eine gedeckte Holzbrücke über die Reuss. Unter ihrem Dach hängt ein Totentanz, ein Bilderzyklus aus dem 17. Jahrhundert, den der offizielle Tourismuseintrag auf 1625–1635 datiert. In jedem Bild holt der Tod einen Menschen aus einem anderen Stand. Es ist eine sehr alte Art zu fragen, was zählt, wenn die Zeit begrenzt ist. Nicht jede Stimmung passt zu diesen Bildern, deshalb ordnet Ihre Führung sie behutsam und altersgerecht ein. Gehen Sie langsam, halten Sie den Durchgang für andere frei und geben Sie einem Bild mehr Zeit, als Sie geplant hatten.",
  ),
  description: lt(
    "Cross the covered bridge from north to south and look up at the Dance of Death paintings, keeping the walkway clear.",
    "Überqueren Sie die gedeckte Brücke von Norden nach Süden und schauen Sie zu den Totentanzbildern hinauf, ohne den Durchgang zu blockieren.",
  ),
  note: lt(
    "Public access around the clock, free of charge; view the paintings in daylight. Public toilets are listed nearby, so check access locally.",
    "Rund um die Uhr öffentlich und kostenlos zugänglich; die Bilder bei Tageslicht ansehen. In der Nähe sind öffentliche Toiletten verzeichnet, den Zugang vor Ort prüfen.",
  ),
};

const needleDam = {
  name: lt("Needle Dam", "Nadelwehr"),
  coordinates: [8.30322, 47.05109] as [number, number],
  title: lt(
    "How a city looks after its river",
    "Wie eine Stadt ihren Fluss behütet",
  ),
  body: lt(
    "The Needle Dam crosses the Reuss just below the Old Town. It works with wooden needles, upright timbers set in the river to hold back or release water, and it was renovated between 2009 and 2011. The idea is simple and old: manage the flow with parts that people can see and understand. From the bank you see the needles and the rushing water, and your guide explains how a city manages a river it lives beside. Staff moving needles is not a scheduled part of the tour, and the walk stays on public ground.",
    "Das Nadelwehr quert die Reuss unterhalb der Altstadt. Es arbeitet mit hölzernen Nadeln, aufrechten Balken, die im Fluss gesetzt werden, um Wasser zurückzuhalten oder freizugeben, und wurde 2009–2011 erneuert. Die Idee ist einfach und alt: den Abfluss mit Teilen regeln, die man sehen und verstehen kann. Vom Ufer aus sehen Sie die Nadeln und das strömende Wasser, und Ihre Führung erklärt, wie eine Stadt mit dem Fluss umgeht, an dem sie lebt. Arbeiten am Wehr sind kein geplanter Teil der Tour, und der Rundgang bleibt auf öffentlichem Grund.",
  ),
  description: lt(
    "See the wooden needles of the dam from the public viewpoint on the south bank and hear how the river is managed.",
    "Sehen Sie die Holznadeln des Wehrs vom öffentlichen Aussichtspunkt am Südufer und erfahren Sie, wie der Fluss reguliert wird.",
  ),
  note: lt(
    "A public viewpoint: there is no demonstration schedule, and the working structure cannot be entered.",
    "Ein öffentlicher Aussichtspunkt: Es gibt keinen Vorführplan, die Betriebsanlage darf nicht betreten werden.",
  ),
};

const fromStory = (
  id: "chapel-bridge" | "kornmarkt" | "weinmarkt",
  minutesFromStart: number,
): TourStop => {
  const story = stopStories[id];

  return {
    id,
    name: story.name,
    description: story.description,
    minutesFromStart,
    coordinates: story.coordinates,
    photo: photos[id],
    note: story.note,
  };
};

const itinerary: TourStop[] = [
  {
    id: "station",
    name: lt("Bahnhofplatz, Lucerne", "Bahnhofplatz Luzern"),
    description: lt(
      "Meet by the historic station arch. Your guide confirms the exact meeting pin before the day, so please arrive by 08:50.",
      "Treffpunkt beim historischen Bahnhofportal. Ihre Führung bestätigt den genauen Standort vor dem Tag, bitte seien Sie bis 08:50 Uhr da.",
    ),
    minutesFromStart: 0,
    coordinates: [8.3093, 47.0511],
    photo: photos.station,
  },
  fromStory("chapel-bridge", 20),
  fromStory("kornmarkt", 60),
  fromStory("weinmarkt", 85),
  {
    id: "spreuer-bridge",
    name: spreuer.name,
    description: spreuer.description,
    minutesFromStart: 130,
    coordinates: spreuer.coordinates,
    photo: photos["spreuer-bridge"],
    note: spreuer.note,
  },
  {
    id: "needle-dam",
    name: needleDam.name,
    description: needleDam.description,
    minutesFromStart: 160,
    coordinates: needleDam.coordinates,
    photo: photos["needle-dam"],
    note: needleDam.note,
  },
];

const sections: TourSection[] = [
  {
    id: "for-whom",
    layout: "text",
    title: lt("Who this walk is for", "Für wen ist dieser Rundgang gedacht?"),
    body: lt(
      "First-time visitors who want context as well as the famous views. Returning travellers who want to notice more than they did before. Couples and friends who enjoy conversation, architecture and small discoveries. Families with curious older children who like finding details and asking why.\n\nThe guide can adapt the language and emphasis to the group. The paintings at Spreuer Bridge include imagery of death and are introduced sensitively.",
      "Erstbesucher, die berühmte Ansichten verstehen möchten. Wiederkehrende, die neue Einzelheiten entdecken wollen. Paare und Freunde, die Architektur, Geschichten und Gespräche schätzen. Familien mit neugierigen älteren Kindern, die gerne suchen und nachfragen.\n\nSprache und Schwerpunkte lassen sich an die Gruppe anpassen. Die Todesdarstellungen auf der Spreuerbrücke werden altersgerecht und behutsam eingeordnet.",
    ),
  },
  {
    id: "glance",
    layout: "facts",
    title: lt("The experience at a glance", "Das Erlebnis auf einen Blick"),
    items: [
      row(
        "g-group",
        lt("Group", "Gruppe"),
        lt("About 2–8 guests (proposed)", "Etwa 2–8 Gäste (vorgeschlagen)"),
      ),
      row(
        "g-time",
        lt("Guided walk", "Führung"),
        lt("09:00 to 12:00", "09:00 bis 12:00 Uhr"),
        {
          detail: lt(
            "Optional reserved lunch until 13:00; back at the station about 13:15.",
            "Auf Wunsch reserviertes Mittagessen bis 13:00; Bahnhof gegen 13:15.",
          ),
        },
      ),
      row(
        "g-distance",
        lt("Distance", "Strecke"),
        lt(
          "About 2 km including the return to the station",
          "Etwa 2 km inklusive Rückweg zum Bahnhof",
        ),
        {
          detail: lt(
            "Allow 40–50 minutes of moving time. Distances and times are planning estimates.",
            "Rechnen Sie mit 40–50 Minuten reiner Gehzeit. Strecke und Zeiten sind Planungswerte.",
          ),
        },
      ),
      row(
        "g-pace",
        lt("Pace", "Tempo"),
        lt(
          "A gentle city exploration with frequent pauses, not a hike",
          "Ein Stadtspaziergang mit vielen Pausen, keine Wanderung",
        ),
      ),
    ],
  },
  {
    id: "special",
    layout: "list",
    title: lt("What makes the walk special", "Was diesen Weg besonders macht"),
    items: [
      row(
        "s-postcard",
        lt("Look beyond the postcard", "Mehr sehen als das Postkartenmotiv"),
        lt(
          "At Chapel Bridge the guide draws attention to timber, paintings and the city around them. The story of rebuilding asks a simple question: why do certain places matter so much to the people who live beside them? The Water Tower is viewed from outside.",
          "An der Kapellbrücke lenkt die Führung den Blick auf das Zusammenspiel von Holz, Bildern und Stadt. Die Geschichte des Wiederaufbaus stellt eine einfache Frage: Warum bedeuten bestimmte Orte ihren Bewohnern so viel? Der Wasserturm wird von aussen betrachtet.",
        ),
      ),
      row(
        "s-details",
        lt(
          "Read the city in its everyday details",
          "Die Stadt in ihren Einzelheiten lesen",
        ),
        lt(
          "In Kornmarkt and Weinmarkt the focus shifts to individual façades, the fountain and the shape of the squares. Choose a detail that catches your eye and hear what public places say about a trading city.",
          "Am Kornmarkt und Weinmarkt treten einzelne Fassaden, der Brunnen und die Form der Plätze in den Vordergrund. Wählen Sie ein Detail, das Sie anspricht, und erfahren Sie, was öffentliche Räume über eine Handelsstadt erzählen.",
        ),
      ),
      row(
        "s-reflect",
        lt("A moment of reflection", "Nachdenken und Staunen"),
        lt(
          "The Dance of Death paintings at Spreuer Bridge are a thoughtful counterpoint to the beauty outside: what do people choose to remember, and what makes a life meaningful? At the Needle Dam attention returns to the living city and the challenge of managing water.",
          "Die Totentanzbilder auf der Spreuerbrücke bilden einen nachdenklichen Gegenpol zur Schönheit der Umgebung: Was möchten Menschen bewahren, und was macht ein Leben bedeutsam? Am Nadelwehr geht es wieder um die lebendige Stadt und den Umgang mit Wasser.",
        ),
      ),
      row(
        "s-memory",
        lt(
          "Finish with flavour, and a story of your own",
          "Mit Geschmack und einer eigenen Erinnerung abschliessen",
        ),
        lt(
          "Guests might share the detail they will remember most. An optional lunch gives the morning an unhurried ending.",
          "Welches Detail wird Ihnen besonders in Erinnerung bleiben? Ein optionales Mittagessen lässt den Vormittag in Ruhe ausklingen.",
        ),
      ),
    ],
  },
  {
    id: "timetable",
    layout: "timeline",
    title: lt("A morning with room to linger", "Zeit zum Entdecken"),
    body: lt(
      "A proposed timetable for a small group. It is a designed schedule, not a booked departure. This is a leisurely three-hour experience, not three hours of continuous walking.",
      "Vorgeschlagener Ablauf für eine kleine Gruppe, noch keine gebuchte Abfahrt. Die dreistündige Führung enthält viele Stopps, nicht drei Stunden reine Gehzeit.",
    ),
    items: timeline([
      [
        "09:00–09:10",
        "t1",
        lt("Meet at the station forecourt", "Treffpunkt am Bahnhofplatz"),
        lt(
          "By the historic station arch. Arrive by 08:45–08:50.",
          "Beim historischen Bahnhofportal. Ankunft 08:45–08:50.",
        ),
      ],
      [
        "09:10–09:20",
        "t2",
        lt("Walk to Chapel Bridge", "Weg zur Kapellbrücke"),
        lt(
          "About 5–10 minutes via Bahnhofstrasse.",
          "Etwa 5–10 Minuten über die Bahnhofstrasse.",
        ),
      ],
      [
        "09:20–09:50",
        "t3",
        lt("Chapel Bridge and Water Tower", "Kapellbrücke und Wasserturm"),
        lt(
          "Cross south to north. Paintings, fire and rebuilding; the tower is seen from outside.",
          "Von Süden nach Norden. Bilder, Brand und Wiederaufbau; der Turm nur von aussen.",
        ),
      ],
      [
        "09:50–10:00",
        "t4",
        lt("Walk to Kornmarkt", "Weg zum Kornmarkt"),
        lt(
          "About 5–10 minutes, with time for photographs.",
          "Etwa 5–10 Minuten, mit Zeit für Fotos.",
        ),
      ],
      [
        "10:00–10:20",
        "t5",
        lt("Kornmarkt", "Kornmarkt"),
        lt(
          "Town Hall exterior and the story of the trading city.",
          "Rathaus von aussen und die Geschichte der Handelsstadt.",
        ),
      ],
      [
        "10:20–10:25",
        "t6",
        lt("Walk to Weinmarkt", "Weg zum Weinmarkt"),
        lt("About 3–5 minutes.", "Etwa 3–5 Minuten."),
      ],
      [
        "10:25–10:45",
        "t7",
        lt("Weinmarkt", "Weinmarkt"),
        lt(
          "Façades, fountain and community memory.",
          "Fassaden, Brunnen und gemeinschaftliche Erinnerung.",
        ),
      ],
      [
        "10:45–11:00",
        "t8",
        lt("Flexible pause", "Pause"),
        lt(
          "Toilets, photographs or a drink at your own cost.",
          "Toilette, Fotos oder ein Getränk auf eigene Rechnung.",
        ),
      ],
      [
        "11:00–11:10",
        "t9",
        lt("Walk via Mühlenplatz", "Über den Mühlenplatz"),
        lt(
          "To the north end of Spreuer Bridge.",
          "Zum nördlichen Zugang der Spreuerbrücke.",
        ),
      ],
      [
        "11:10–11:35",
        "t10",
        lt("Spreuer Bridge", "Spreuerbrücke"),
        lt(
          "The Dance of Death paintings. Cross north to south and keep the walkway clear.",
          "Totentanzbilder; Übergang nach Süden, Durchgang freihalten.",
        ),
      ],
      [
        "11:35–11:40",
        "t11",
        lt("Walk to the river viewpoint", "Weg zum Flussblick"),
        lt(
          "About 3–5 minutes along the south bank.",
          "Etwa 3–5 Minuten am Südufer.",
        ),
      ],
      [
        "11:40–11:55",
        "t12",
        lt("Needle Dam", "Nadelwehr"),
        lt(
          "Understand how the water is regulated. No guaranteed demonstration.",
          "Wasserregulierung verstehen; keine garantierte Vorführung.",
        ),
      ],
      [
        "11:55–12:00",
        "t13",
        lt("Close of the walk", "Abschluss"),
        lt(
          "A short personal reflection on the morning. Lunch is an optional extension.",
          "Persönliche Rückschau auf den Vormittag. Das Mittagessen ist eine optionale Verlängerung.",
        ),
      ],
      [
        "12:00–13:00",
        "t14",
        lt("Optional reserved indoor lunch", "Optionales Mittagessen"),
        lt(
          "Wirtshaus Taube is recommended for the route. Allow longer for larger groups.",
          "Reservierter Innenplatz in der Taube; grössere Gruppen benötigen mehr Zeit.",
        ),
      ],
      [
        "13:00–13:15",
        "t15",
        lt("Walk back to the station", "Rückweg zum Bahnhof"),
        lt(
          "About 10–15 minutes. Leave a separate buffer before a train.",
          "Etwa 10–15 Minuten. Zusätzlichen Puffer für die Zugabfahrt einplanen.",
        ),
      ],
    ]),
  },
  {
    id: "access",
    layout: "facts",
    title: lt("Access and what to expect", "Zugang und was Sie erwartet"),
    body: lt(
      "Published access information, checked for this edition. Confirm again for your travel day.",
      "Veröffentlichte Angaben, für diese Ausgabe geprüft; für den konkreten Reisetag nochmals bestätigen.",
    ),
    items: [
      row(
        "a-chapel",
        lt("Chapel Bridge", "Kapellbrücke"),
        lt(
          "Public pedestrian crossing; a daytime visit is planned",
          "Öffentlicher Fussgängerübergang; Besuch tagsüber",
        ),
        {
          detail: lt(
            "The official page lists no opening hours, and temporary closures can occur.",
            "Die offizielle Seite nennt keine Uhrzeiten, zeitweilige Sperrungen sind möglich.",
          ),
        },
      ),
      row(
        "a-tower",
        lt("Water Tower", "Wasserturm"),
        lt("Exterior viewing only", "Nur Aussenbesichtigung"),
        {
          detail: lt(
            "No regular interior hours are confirmed; an interior visit needs separate confirmation.",
            "Keine regulären Innenbesuchszeiten bestätigt; Innenzugang nur nach gesonderter Bestätigung.",
          ),
        },
      ),
      row(
        "a-squares",
        lt("Kornmarkt and Weinmarkt", "Kornmarkt und Weinmarkt"),
        lt("Outdoor public squares", "Öffentliche Plätze im Freien"),
        {
          detail: lt(
            "Shops and Town Hall interiors have separate arrangements.",
            "Geschäfte und Rathausräume sind separat geregelt.",
          ),
        },
      ),
      row(
        "a-spreuer",
        lt("Spreuer Bridge", "Spreuerbrücke"),
        lt(
          "Open around the clock, free of charge",
          "Rund um die Uhr geöffnet, kostenlos",
        ),
        {
          detail: lt(
            "See the paintings by daylight; temporary restrictions are possible.",
            "Bilder bei Tageslicht ansehen; zeitweilige Einschränkungen vorbehalten.",
          ),
        },
      ),
      row(
        "a-dam",
        lt("Needle Dam", "Nadelwehr"),
        lt("A public viewpoint", "Ein öffentlicher Aussichtspunkt"),
        {
          detail: lt(
            "See it from the bridge or the bank; the working structure is not entered.",
            "Blick vom Ufer oder von der Brücke, kein Betreten der Betriebsanlage.",
          ),
        },
      ),
    ],
  },
  {
    id: "getting-there",
    layout: "list",
    title: lt("Getting there and around", "Anreise und Fortbewegung"),
    items: [
      row(
        "r-rail",
        lt("By rail", "Mit der Bahn"),
        lt(
          "Search for Luzern in the SBB journey planner and meet outside the main station at Bahnhofplatz.",
          "Im SBB-Fahrplan nach Luzern suchen. Treffpunkt auf dem Bahnhofplatz.",
        ),
        {
          detail: lt(
            "Train times, fares and platforms depend on your origin and date.",
            "Verbindung, Preis und Gleis hängen von Ausgangsort und Datum ab.",
          ),
        },
      ),
      row(
        "r-walk",
        lt("On the walk", "Unterwegs"),
        lt(
          "The route is on foot and a compact city-centre loop. No bus, boat or ticket is needed.",
          "Der Rundgang erfolgt zu Fuss; Bus, Schiff oder Bergbahn sind nicht erforderlich.",
        ),
      ),
      row(
        "r-hotel",
        lt("From your hotel", "Ab Hotel"),
        lt(
          "Plan the connection from your hotel address. Eligible overnight guests can use the Lucerne Visitor Card on buses and trains in Zone 10; boats are excluded.",
          "Verbindung anhand der tatsächlichen Adresse planen. Berechtigte Übernachtungsgäste können mit der Gästekarte Bus und Bahn in Zone 10 nutzen; Schiffe sind ausgeschlossen.",
        ),
        {
          detail: lt(
            "Confirm eligibility with your accommodation.",
            "Berechtigung beim Hotel bestätigen.",
          ),
        },
      ),
    ],
  },
  {
    id: "comfort",
    layout: "list",
    title: lt(
      "Comfort, weather and group size",
      "Komfort, Wetter und Gruppengrösse",
    ),
    items: [
      row(
        "c-surface",
        lt("Surfaces", "Wege"),
        lt(
          "Expect uneven paving, wooden surfaces and busy narrow sections. Tell us about wheelchair or mobility needs before you book; the whole route is not guaranteed to be step-free.",
          "Mit unebenem Pflaster, Holzbelägen und engen, belebten Abschnitten rechnen. Für Rollstuhl oder eingeschränkte Mobilität den Zugang vorab klären; eine durchgehend stufenfreie Route ist nicht zugesichert.",
        ),
      ),
      row(
        "c-weather",
        lt("Weather", "Wetter"),
        lt(
          "In light rain the outdoor explanations are shortened. In severe weather or a bridge closure the route is changed after a local check.",
          "Bei leichtem Regen werden Erklärungen im Freien verkürzt; bei Unwetter oder Sperrungen wird die Route nach lokaler Prüfung angepasst.",
        ),
      ),
      row(
        "c-group",
        lt("Group size", "Gruppengrösse"),
        lt(
          "For more than about eight guests, extra time or separate guiding groups keep the bridge traffic clear. The group size is a service choice, not an official limit.",
          "Für mehr als etwa acht Gäste sind zusätzliche Zeit oder getrennte Führungsgruppen vorgesehen. Diese Gruppengrösse ist ein Gestaltungsvorschlag, keine behördliche Grenze.",
        ),
      ),
    ],
  },
  {
    id: "lunch",
    layout: "list",
    title: lt("Optional lunch", "Optionales Mittagessen"),
    body: lt(
      "Two venues fit the route. Lunch is optional, is paid separately and is not booked for you. Opening hours are published schedules and do not guarantee a free table.",
      "Zwei Restaurants passen zur Route. Das Mittagessen ist optional, wird separat bezahlt und nicht für Sie gebucht. Öffnungszeiten sind veröffentlichte Zeiten und keine Garantie für einen freien Tisch.",
    ),
    items: [
      row(
        "l-taube",
        lt("Wirtshaus Taube (recommended)", "Wirtshaus Taube (empfohlen)"),
        lt(
          "Traditional regional cooking, including Lucerne-style pastry and rösti on the operator's menu. Daily 11:30–23:30, kitchen until 21:30.",
          "Regionale Küche, auf der Karte unter anderem Luzerner Pastetli und Rösti. Täglich 11:30–23:30, Küche bis 21:30.",
        ),
        {
          optional: true,
          detail: lt(
            "An afternoon menu applies 13:45–17:30, so a 12:00 lunch comes before it. Ask for an indoor table; the river terrace is a summer offer. Check the current menu, prices and dietary needs.",
            "Von 13:45 bis 17:30 gilt eine Nachmittagskarte, ein Mittagessen um 12:00 liegt davor. Innenplatz reservieren; die Terrasse ist ein Sommerangebot. Aktuelle Gerichte, Preise und Ernährungswünsche bestätigen.",
          ),
          contact: {
            address: "Burgerstrasse 3, 6003 Luzern",
            phone: "+41 41 210 07 47",
            email: "wirtshaus@taube-luzern.ch",
          },
        },
      ),
      row(
        "l-rathaus",
        lt("Rathaus Brauerei (alternative)", "Rathaus Brauerei (Alternative)"),
        lt(
          "Hot food 11:00–22:30, cold food until 23:00; the kitchen closes an hour earlier on Sundays and public holidays.",
          "Warme Küche 11:00–22:30, kalte Küche bis 23:00; sonntags und an Feiertagen eine Stunde früher geschlossen.",
        ),
        {
          optional: true,
          detail: lt(
            "Indoor tables can be reserved, outdoor tables cannot. Email for five or more guests and wait for confirmation. Return across Rathaussteg after the dam and allow about 10 extra minutes; book lunch around 12:10. The operator lists special holiday hours and an Ash Wednesday closure.",
            "Innen reservierbar, Terrasse ohne Reservation. Ab fünf Personen per E-Mail anfragen und Bestätigung abwarten. Nach dem Nadelwehr über den Rathaussteg zurückgehen: ungefähr zehn zusätzliche Minuten einplanen und Mittagessen gegen 12:10 reservieren. Sonderöffnungszeiten beachten; am Aschermittwoch ist eine Reinigungsschliessung vermerkt.",
          ),
          contact: {
            address: "Unter der Egg 2, 6004 Luzern",
            phone: "+41 41 410 61 11",
            email: "info@rathausbrauerei.ch",
          },
        },
      ),
    ],
  },
  {
    id: "opening-hours",
    layout: "facts",
    title: lt(
      "Rathaus Brauerei opening hours",
      "Öffnungszeiten der Rathaus Brauerei",
    ),
    items: [
      row(
        "h-summer",
        lt("April to October", "April bis Oktober"),
        lt(
          "Mon, Wed, Thu, Fri 09:00–24:00 · Tue, Sat 08:00–24:00 · Sun and public holidays 09:00–23:00",
          "Mo, Mi, Do, Fr 09:00–24:00 · Di, Sa 08:00–24:00 · So und Feiertage 09:00–23:00",
        ),
      ),
      row(
        "h-winter",
        lt("November to March", "November bis März"),
        lt(
          "Mon, Wed, Thu, Fri 10:00–24:00 · Tue, Sat 08:00–24:00 · Sun and public holidays 10:00–23:00",
          "Mo, Mi, Do, Fr 10:00–24:00 · Di, Sa 08:00–24:00 · So und Feiertage 10:00–23:00",
        ),
      ),
    ],
  },
  {
    id: "expectations",
    layout: "text",
    title: lt(
      "A good match, with honest expectations",
      "Für die passende Erwartung",
    ),
    body: lt(
      "The value lies in attentive guiding, interpretation and time to notice. This route does not include mountain scenery, private interiors or a workshop visit. A shorter 90–120 minute version is possible on request.\n\nWeather, access, restaurant availability and the group's needs shape the final confirmed programme.",
      "Der Mehrwert liegt in persönlicher Begleitung, verständlichen Zusammenhängen und Zeit zum Entdecken. Bergtouren, private Innenräume und Werkstattbesuche sind nicht enthalten. Eine kürzere Variante von 90–120 Minuten ist auf Anfrage möglich.\n\nWetter, Zugänglichkeit, Tischverfügbarkeit und Bedürfnisse der Gruppe bestimmen das endgültig bestätigte Programm.",
    ),
  },
];

export const thingsThatRemain: Tour = {
  id: "things-that-remain",
  slug: "lucerne-the-things-that-remain",
  name: lt("Lucerne: The Things That Remain", "Luzern: Was bleibt"),
  summary: lt(
    "A slow, three-hour cultural walk: bridges, painted squares and the working river",
    "Ein dreistündiger Kulturspaziergang: Brücken, bemalte Plätze und der Fluss als Lebensader",
  ),
  description: lt(
    "At first, Lucerne is a postcard: a wooden bridge, painted houses and water catching the light. Then someone helps you notice a small detail. A painting becomes a question about life, a river becomes a story of human ingenuity, and a familiar view becomes your own memory. This walk invites you to discover the city through the things its people have built, protected, used and rebuilt.",
    "Zuerst wirkt Luzern wie eine Postkarte: eine Holzbrücke, bemalte Häuser und Licht auf dem Wasser. Dann macht Sie jemand auf ein kleines Detail aufmerksam. Ein Bild wird zur Frage nach dem Leben, der Fluss erzählt von menschlichem Erfindergeist, und aus einer schönen Aussicht wird eine persönliche Erinnerung. Dieser Spaziergang erschliesst die Stadt über das, was ihre Menschen gebaut, bewahrt, genutzt und wieder aufgebaut haben.",
  ),
  longStory: storyFromChapters({
    title: lt("Five places, one story", "Fünf Orte, eine Geschichte"),
    chapters: [
      {
        photo: photos["chapel-bridge"],
        title: stopStories["chapel-bridge"].title,
        body: stopStories["chapel-bridge"].body,
      },
      {
        photo: photos.kornmarkt,
        title: stopStories.kornmarkt.title,
        body: stopStories.kornmarkt.body,
      },
      {
        photo: photos.weinmarkt,
        title: stopStories.weinmarkt.title,
        body: stopStories.weinmarkt.body,
      },
      {
        photo: photos["spreuer-bridge"],
        title: spreuer.title,
        body: spreuer.body,
      },
      {
        photo: photos["needle-dam"],
        title: needleDam.title,
        body: needleDam.body,
      },
    ],
  }),
  photos: [
    photos["chapel-bridge"],
    photos.weinmarkt,
    photos["spreuer-bridge"],
    photos["needle-dam"],
  ],
  durationMinutes: 180,
  adultPrice: 8900,
  childPrice: 4500,
  infantPrice: 0,
  meetingPoint: lt(
    "Bahnhofplatz, by the historic station arch",
    "Bahnhofplatz, beim historischen Bahnhofportal",
  ),
  included: [
    lt(
      "Personal guiding on the 09:00–12:00 cultural walk, in a small group",
      "Persönliche Kulturführung von 09:00 bis 12:00 Uhr in kleiner Gruppe",
    ),
    lt(
      "Stories and interpretation at five stops, with time to look, ask and photograph",
      "Geschichten und Einordnung an fünf Stationen, mit Zeit zum Hinschauen, Fragen und Fotografieren",
    ),
  ],
  excluded: lt(
    "Lunch, drinks, keepsakes and your journey to Lucerne are optional or separate extras, and there is no compulsory shopping stop. Mountain scenery, private interiors and workshop visits are not part of this walk.",
    "Mittagessen, Getränke, Andenken und Ihre Anreise nach Luzern sind optionale oder separate Leistungen, einen Einkaufsstopp gibt es nicht. Bergtouren, private Innenräume und Werkstattbesuche gehören nicht zu diesem Rundgang.",
  ),
  conditions: lt(
    "A city walk of about 2 km with uneven paving and wooden bridge surfaces, not a hike. Please discuss mobility needs before booking, as step-free access is not guaranteed along the whole route. The Water Tower is seen from outside. Small groups of about 2–8 guests. Children must be accompanied by an adult.",
    "Ein Stadtspaziergang von etwa 2 km mit unebenem Pflaster und Holzbelägen, keine Wanderung. Bitte klären Sie Mobilitätsbedürfnisse vor der Buchung, eine durchgehend stufenfreie Route ist nicht zugesichert. Der Wasserturm wird von aussen betrachtet. Kleine Gruppen mit etwa 2–8 Gästen. Kinder müssen von einer erwachsenen Person begleitet werden.",
  ),
  cancellationPolicy: lt(
    "Sample policy: contact the organiser at least 48 hours before departure. In severe weather the route is changed after a local check, or another date is offered.",
    "Beispielregel: mindestens 48 Stunden vor Beginn den Veranstalter kontaktieren. Bei Unwetter wird die Route nach lokaler Prüfung angepasst oder ein anderes Datum angeboten.",
  ),
  published: true,
  commissionRate: 0.1,
  itinerary,
  ageBands: { childFrom: 6, adultFrom: 16 },
  participantFields: [
    {
      id: "needs",
      label: lt(
        "Mobility or dietary needs",
        "Mobilitäts- oder Ernährungsbedürfnisse",
      ),
      required: false,
    },
  ],
  sections,
  checkedOn: "2026-10-16",
  keepsakeIds: ["p-vx-chapel-bridge", "p-postcards"],
};

export const thingsThatRemainDepartures: Departure[] = [
  ["remain-20", "2026-10-20", "full"],
  ["remain-24", "2026-10-24", "deposit"],
  ["remain-31", "2026-10-31", "later"],
  ["remain-07", "2026-11-07", "deposit"],
].map(([id, date, policy]) =>
  sampleDeparture({
    id,
    tourId: thingsThatRemain.id,
    date,
    time: "09:00",
    policy: policy as Departure["policy"],
  }),
);
