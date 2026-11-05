import type { Departure, Tour, TourSection, TourStop } from '@sk/domain/bookings'

import { storyFromChapters } from '@sk/domain/shared'
import { lt, row, sampleDeparture, timeline } from './curated'

import { stopStories } from './stops'

/**
 * Tour 01 of the client's three curated tours: "Luzerne: The Things That Remain"
 * (client-resources/Swiss_Native_Lucerne_Tour_01.pdf, planning edition, verified 16.10.2026).
 * Prices, capacity and departures are sample values. Spreuer Bridge and the Needle Dam are
 * written from that document; the other three stops reuse the researched stop stories.
 */
const photos = {
  'station': 'lucerne-old-town',
  'chapel-bridge': 'lucerne-kapellbruecke-1200',
  'kornmarkt': 'kornmarkt',
  'weinmarkt': 'weinmarkt',
  'spreuer-bridge': 'spreuer-totentanz',
  'needle-dam': 'nadelwehr',
} as const

const spreuer = {
  name: lt('Spreuer Bridge', 'Spreuerbrücke'),
  coordinates: [8.30187, 47.05198] as [number, number],
  title: lt(
    'Paintings that remind us of time',
    'Bilder, die an die Zeit erinnern',
  ),
  body: lt(
    'The Spreuer Bridge is a covered wooden footbridge over the Reuss. Under its roof hangs a Dance of Death, a cycle of paintings from the 17th century that the official tourist listing dates to 1625–1635. In each picture Death comes for a person from a different walk of life. It is a very old way of asking what matters when time is limited. The pictures are about death, so they may not suit every mood or very young children. Cross slowly, keep the walkway clear for others, and give one picture more time than you planned.',
    'Die Spreuerbrücke ist eine gedeckte Holzbrücke über die Reuss. Unter ihrem Dach hängt ein Totentanz, ein Bilderzyklus aus dem 17. Jahrhundert, den der offizielle Tourismuseintrag auf 1625–1635 datiert. In jedem Bild holt der Tod einen Menschen aus einem anderen Stand. Es ist eine sehr alte Art zu fragen, was zählt, wenn die Zeit begrenzt ist. Die Bilder handeln vom Tod und passen nicht zu jeder Stimmung oder zu sehr kleinen Kindern. Gehen Sie langsam, halten Sie den Durchgang für andere frei und geben Sie einem Bild mehr Zeit, als Sie geplant hatten.',
  ),
  description: lt(
    'Cross the covered bridge from north to south and look up at the Dance of Death paintings, keeping the walkway clear.',
    'Überqueren Sie die gedeckte Brücke von Norden nach Süden und schauen Sie zu den Totentanzbildern hinauf, ohne den Durchgang zu blockieren.',
  ),
  note: lt(
    'Public access around the clock, free of charge; view the paintings in daylight. Public toilets are listed nearby, so check access locally.',
    'Rund um die Uhr öffentlich und kostenlos zugänglich; die Bilder bei Tageslicht ansehen. In der Nähe sind öffentliche Toiletten verzeichnet, den Zugang vor Ort prüfen.',
  ),
}

const needleDam = {
  name: lt('Needle Dam', 'Nadelwehr'),
  coordinates: [8.30322, 47.05109] as [number, number],
  title: lt(
    'How a city looks after its river',
    'Wie eine Stadt ihren Fluss behütet',
  ),
  body: lt(
    'The Needle Dam crosses the Reuss just below the Old Town. It works with wooden needles, upright timbers set in the river to hold back or release water, and it was renovated between 2009 and 2011. The idea is simple and old: manage the flow with parts that people can see and understand. From the bank you see the needles and the rushing water, which shows how a city manages a river it lives beside. Staff moving needles is not scheduled, and the viewpoint is on public ground.',
    'Das Nadelwehr quert die Reuss unterhalb der Altstadt. Es arbeitet mit hölzernen Nadeln, aufrechten Balken, die im Fluss gesetzt werden, um Wasser zurückzuhalten oder freizugeben, und wurde 2009–2011 erneuert. Die Idee ist einfach und alt: den Abfluss mit Teilen regeln, die man sehen und verstehen kann. Vom Ufer aus sehen Sie die Nadeln und das strömende Wasser, woran man sieht, wie eine Stadt mit dem Fluss umgeht, an dem sie lebt. Arbeiten am Wehr sind nicht geplant, und der Aussichtspunkt liegt auf öffentlichem Grund.',
  ),
  description: lt(
    'See the wooden needles of the dam from the public viewpoint on the south bank and see how the river is managed.',
    'Sehen Sie die Holznadeln des Wehrs vom öffentlichen Aussichtspunkt am Südufer und sehen Sie, wie der Fluss reguliert wird.',
  ),
  note: lt(
    'A public viewpoint: there is no demonstration schedule, and the working structure cannot be entered.',
    'Ein öffentlicher Aussichtspunkt: Es gibt keinen Vorführplan, die Betriebsanlage darf nicht betreten werden.',
  ),
}

function fromStory(id: 'chapel-bridge' | 'kornmarkt' | 'weinmarkt', minutesFromStart: number): TourStop {
  const story = stopStories[id]

  return {
    id,
    name: story.name,
    description: story.description,
    minutesFromStart,
    coordinates: story.coordinates,
    photo: photos[id],
    note: story.note,
  }
}

const itinerary: TourStop[] = [
  {
    id: 'station',
    name: lt('Bahnhofplatz, Luzerne', 'Bahnhofplatz Luzern'),
    description: lt(
      'Start at Bahnhofplatz, by the historic station arch.',
      'Start auf dem Bahnhofplatz, beim historischen Bahnhofportal.',
    ),
    minutesFromStart: 0,
    coordinates: [8.3093, 47.0511],
    photo: photos.station,
  },
  fromStory('chapel-bridge', 20),
  fromStory('kornmarkt', 60),
  fromStory('weinmarkt', 85),
  {
    id: 'spreuer-bridge',
    name: spreuer.name,
    description: spreuer.description,
    minutesFromStart: 130,
    coordinates: spreuer.coordinates,
    photo: photos['spreuer-bridge'],
    note: spreuer.note,
  },
  {
    id: 'needle-dam',
    name: needleDam.name,
    description: needleDam.description,
    minutesFromStart: 160,
    coordinates: needleDam.coordinates,
    photo: photos['needle-dam'],
    note: needleDam.note,
  },
]

const sections: TourSection[] = [
  {
    id: 'for-whom',
    layout: 'text',
    title: lt('Who this walk is for', 'Für wen ist dieser Rundgang gedacht?'),
    body: lt(
      'First-time visitors who want context as well as the famous views. Returning travellers who want to notice more than they did before. Couples and friends who enjoy conversation, architecture and small discoveries. Families with curious older children who like finding details and asking why.\n\nThe paintings at Spreuer Bridge show imagery of death; keep that in mind with younger children.',
      'Erstbesucher, die berühmte Ansichten verstehen möchten. Wiederkehrende, die neue Einzelheiten entdecken wollen. Paare und Freunde, die Architektur, Geschichten und Gespräche schätzen. Familien mit neugierigen älteren Kindern, die gerne suchen und nachfragen.\n\nDie Bilder auf der Spreuerbrücke zeigen Todesdarstellungen; das bei jüngeren Kindern bedenken.',
    ),
  },
  {
    id: 'glance',
    layout: 'facts',
    title: lt('At a glance', 'Auf einen Blick'),
    items: [
      row(
        'g-time',
        lt('Time needed', 'Zeitbedarf'),
        lt('About 3 hours, plus lunch if you stop', 'Etwa 3 Stunden, plus Mittagessen bei einem Halt'),
        {
          detail: lt(
            'Lunch is optional; the walk back to the station takes 10–15 minutes.',
            'Das Mittagessen ist optional; der Rückweg zum Bahnhof dauert 10–15 Minuten.',
          ),
        },
      ),
      row(
        'g-distance',
        lt('Distance', 'Strecke'),
        lt(
          'About 2 km including the return to the station',
          'Etwa 2 km inklusive Rückweg zum Bahnhof',
        ),
        {
          detail: lt(
            'Allow 40–50 minutes of moving time. Distances and times are planning estimates.',
            'Rechnen Sie mit 40–50 Minuten reiner Gehzeit. Strecke und Zeiten sind Planungswerte.',
          ),
        },
      ),
      row(
        'g-pace',
        lt('Pace', 'Tempo'),
        lt(
          'A gentle city exploration with frequent pauses, not a hike',
          'Ein Stadtspaziergang mit vielen Pausen, keine Wanderung',
        ),
      ),
    ],
  },
  {
    id: 'special',
    layout: 'list',
    title: lt('What makes the walk special', 'Was diesen Weg besonders macht'),
    items: [
      row(
        's-postcard',
        lt('Look beyond the postcard', 'Mehr sehen als das Postkartenmotiv'),
        lt(
          'At Chapel Bridge, look at the timber, the paintings and the city around them. The story of the rebuilding raises a simple question: why do certain places matter so much to the people who live beside them? The Water Tower is viewed from outside.',
          'An der Kapellbrücke lohnt der Blick auf das Zusammenspiel von Holz, Bildern und Stadt. Die Geschichte des Wiederaufbaus wirft eine einfache Frage auf: Warum bedeuten bestimmte Orte ihren Bewohnern so viel? Der Wasserturm wird von aussen betrachtet.',
        ),
      ),
      row(
        's-details',
        lt(
          'Read the city in its everyday details',
          'Die Stadt in ihren Einzelheiten lesen',
        ),
        lt(
          'In Kornmarkt and Weinmarkt the focus shifts to individual façades, the fountain and the shape of the squares. Pick a detail that catches your eye and ask what public places say about a trading city.',
          'Am Kornmarkt und Weinmarkt treten einzelne Fassaden, der Brunnen und die Form der Plätze in den Vordergrund. Wählen Sie ein Detail, das Sie anspricht, und fragen Sie, was öffentliche Räume über eine Handelsstadt erzählen.',
        ),
      ),
      row(
        's-reflect',
        lt('A moment of reflection', 'Nachdenken und Staunen'),
        lt(
          'The Dance of Death paintings at Spreuer Bridge are a thoughtful counterpoint to the beauty outside: what do people choose to remember, and what makes a life meaningful? At the Needle Dam attention returns to the living city and the challenge of managing water.',
          'Die Totentanzbilder auf der Spreuerbrücke bilden einen nachdenklichen Gegenpol zur Schönheit der Umgebung: Was möchten Menschen bewahren, und was macht ein Leben bedeutsam? Am Nadelwehr geht es wieder um die lebendige Stadt und den Umgang mit Wasser.',
        ),
      ),
      row(
        's-memory',
        lt(
          'Finish with flavour, and a story of your own',
          'Mit Geschmack und einer eigenen Erinnerung abschliessen',
        ),
        lt(
          'Which detail will you remember most? An optional lunch gives the morning an unhurried ending.',
          'Welches Detail wird Ihnen besonders in Erinnerung bleiben? Ein optionales Mittagessen lässt den Vormittag in Ruhe ausklingen.',
        ),
      ),
    ],
  },
  {
    id: 'timetable',
    layout: 'timeline',
    title: lt('A morning with room to linger', 'Zeit zum Entdecken'),
    body: lt(
      'Rough timings for a leisurely three hours, not three hours of continuous walking.',
      'Ungefähre Zeiten für den dreistündigen Rundgang mit vielen Stopps, nicht drei Stunden reine Gehzeit.',
    ),
    items: timeline([
      [
        '09:00–09:10',
        't1',
        lt('Start at the station forecourt', 'Start am Bahnhofplatz'),
        lt(
          'By the historic station arch.',
          'Beim historischen Bahnhofportal.',
        ),
      ],
      [
        '09:10–09:20',
        't2',
        lt('Walk to Chapel Bridge', 'Weg zur Kapellbrücke'),
        lt(
          'About 5–10 minutes via Bahnhofstrasse.',
          'Etwa 5–10 Minuten über die Bahnhofstrasse.',
        ),
      ],
      [
        '09:20–09:50',
        't3',
        lt('Chapel Bridge and Water Tower', 'Kapellbrücke und Wasserturm'),
        lt(
          'Cross south to north. Paintings, fire and rebuilding; the tower is seen from outside.',
          'Von Süden nach Norden. Bilder, Brand und Wiederaufbau; der Turm nur von aussen.',
        ),
      ],
      [
        '09:50–10:00',
        't4',
        lt('Walk to Kornmarkt', 'Weg zum Kornmarkt'),
        lt(
          'About 5–10 minutes, with time for photographs.',
          'Etwa 5–10 Minuten, mit Zeit für Fotos.',
        ),
      ],
      [
        '10:00–10:20',
        't5',
        lt('Kornmarkt', 'Kornmarkt'),
        lt(
          'Town Hall exterior and the story of the trading city.',
          'Rathaus von aussen und die Geschichte der Handelsstadt.',
        ),
      ],
      [
        '10:20–10:25',
        't6',
        lt('Walk to Weinmarkt', 'Weg zum Weinmarkt'),
        lt('About 3–5 minutes.', 'Etwa 3–5 Minuten.'),
      ],
      [
        '10:25–10:45',
        't7',
        lt('Weinmarkt', 'Weinmarkt'),
        lt(
          'Façades, fountain and community memory.',
          'Fassaden, Brunnen und gemeinschaftliche Erinnerung.',
        ),
      ],
      [
        '10:45–11:00',
        't8',
        lt('Flexible pause', 'Pause'),
        lt(
          'Toilets, photographs or a drink at your own cost.',
          'Toilette, Fotos oder ein Getränk auf eigene Rechnung.',
        ),
      ],
      [
        '11:00–11:10',
        't9',
        lt('Walk via Mühlenplatz', 'Über den Mühlenplatz'),
        lt(
          'To the north end of Spreuer Bridge.',
          'Zum nördlichen Zugang der Spreuerbrücke.',
        ),
      ],
      [
        '11:10–11:35',
        't10',
        lt('Spreuer Bridge', 'Spreuerbrücke'),
        lt(
          'The Dance of Death paintings. Cross north to south and keep the walkway clear.',
          'Totentanzbilder; Übergang nach Süden, Durchgang freihalten.',
        ),
      ],
      [
        '11:35–11:40',
        't11',
        lt('Walk to the river viewpoint', 'Weg zum Flussblick'),
        lt(
          'About 3–5 minutes along the south bank.',
          'Etwa 3–5 Minuten am Südufer.',
        ),
      ],
      [
        '11:40–11:55',
        't12',
        lt('Needle Dam', 'Nadelwehr'),
        lt(
          'See how the water is regulated. There is no scheduled demonstration.',
          'Sehen, wie das Wasser reguliert wird; keine geplante Vorführung.',
        ),
      ],
      [
        '11:55–12:00',
        't13',
        lt('Close of the walk', 'Abschluss'),
        lt(
          'A last look back at the morning. Lunch is an optional extension.',
          'Ein letzter Rückblick auf den Vormittag. Das Mittagessen ist eine optionale Verlängerung.',
        ),
      ],
      [
        '12:00–13:00',
        't14',
        lt('Optional lunch', 'Optionales Mittagessen'),
        lt(
          'Wirtshaus Taube is recommended for the route. Ask for an indoor table.',
          'Wirtshaus Taube passt gut zur Route; einen Innenplatz reservieren.',
        ),
      ],
      [
        '13:00–13:15',
        't15',
        lt('Walk back to the station', 'Rückweg zum Bahnhof'),
        lt(
          'About 10–15 minutes. Leave a separate buffer before a train.',
          'Etwa 10–15 Minuten. Zusätzlichen Puffer für die Zugabfahrt einplanen.',
        ),
      ],
    ]),
  },
  {
    id: 'access',
    layout: 'facts',
    title: lt('Access and what to expect', 'Zugang und was Sie erwartet'),
    body: lt(
      'Published access information, checked for this edition. Confirm again for your travel day.',
      'Veröffentlichte Angaben, für diese Ausgabe geprüft; für den konkreten Reisetag nochmals bestätigen.',
    ),
    items: [
      row(
        'a-chapel',
        lt('Chapel Bridge', 'Kapellbrücke'),
        lt(
          'Public pedestrian crossing; a daytime visit is planned',
          'Öffentlicher Fussgängerübergang; Besuch tagsüber',
        ),
        {
          detail: lt(
            'The official page lists no opening hours, and temporary closures can occur.',
            'Die offizielle Seite nennt keine Uhrzeiten, zeitweilige Sperrungen sind möglich.',
          ),
        },
      ),
      row(
        'a-tower',
        lt('Water Tower', 'Wasserturm'),
        lt('Exterior viewing only', 'Nur Aussenbesichtigung'),
        {
          detail: lt(
            'No regular interior hours are published.',
            'Keine regulären Innenbesuchszeiten veröffentlicht.',
          ),
        },
      ),
      row(
        'a-squares',
        lt('Kornmarkt and Weinmarkt', 'Kornmarkt und Weinmarkt'),
        lt('Outdoor public squares', 'Öffentliche Plätze im Freien'),
        {
          detail: lt(
            'Shops and Town Hall interiors have separate arrangements.',
            'Geschäfte und Rathausräume sind separat geregelt.',
          ),
        },
      ),
      row(
        'a-spreuer',
        lt('Spreuer Bridge', 'Spreuerbrücke'),
        lt(
          'Open around the clock, free of charge',
          'Rund um die Uhr geöffnet, kostenlos',
        ),
        {
          detail: lt(
            'See the paintings by daylight; temporary restrictions are possible.',
            'Bilder bei Tageslicht ansehen; zeitweilige Einschränkungen vorbehalten.',
          ),
        },
      ),
      row(
        'a-dam',
        lt('Needle Dam', 'Nadelwehr'),
        lt('A public viewpoint', 'Ein öffentlicher Aussichtspunkt'),
        {
          detail: lt(
            'See it from the bridge or the bank; the working structure is not entered.',
            'Blick vom Ufer oder von der Brücke, kein Betreten der Betriebsanlage.',
          ),
        },
      ),
    ],
  },
  {
    id: 'getting-there',
    layout: 'list',
    title: lt('Getting there and around', 'Anreise und Fortbewegung'),
    items: [
      row(
        'r-rail',
        lt('By rail', 'Mit der Bahn'),
        lt(
          'Search for Luzern in the SBB journey planner; the walk starts outside the main station at Bahnhofplatz.',
          'Im SBB-Fahrplan nach Luzern suchen. Der Rundgang beginnt auf dem Bahnhofplatz.',
        ),
        {
          detail: lt(
            'Train times, fares and platforms depend on your origin and date.',
            'Verbindung, Preis und Gleis hängen von Ausgangsort und Datum ab.',
          ),
        },
      ),
      row(
        'r-walk',
        lt('On the walk', 'Unterwegs'),
        lt(
          'The route is on foot and a compact city-centre loop. No bus, boat or ticket is needed.',
          'Der Rundgang erfolgt zu Fuss; Bus, Schiff oder Bergbahn sind nicht erforderlich.',
        ),
      ),
      row(
        'r-hotel',
        lt('From your hotel', 'Ab Hotel'),
        lt(
          'Plan the connection from your hotel address. Eligible overnight guests can use the Luzerne Visitor Card on buses and trains in Zone 10; boats are excluded.',
          'Verbindung anhand der tatsächlichen Adresse planen. Berechtigte Übernachtungsgäste können mit der Gästekarte Bus und Bahn in Zone 10 nutzen; Schiffe sind ausgeschlossen.',
        ),
        {
          detail: lt(
            'Confirm eligibility with your accommodation.',
            'Berechtigung beim Hotel bestätigen.',
          ),
        },
      ),
    ],
  },
  {
    id: 'comfort',
    layout: 'list',
    title: lt(
      'Comfort and weather',
      'Komfort und Wetter',
    ),
    items: [
      row(
        'c-surface',
        lt('Surfaces', 'Wege'),
        lt(
          'Expect uneven paving, wooden surfaces and busy narrow sections. The whole route is not guaranteed to be step-free, so check access first if you use a wheelchair or have limited mobility.',
          'Mit unebenem Pflaster, Holzbelägen und engen, belebten Abschnitten rechnen. Eine durchgehend stufenfreie Route ist nicht zugesichert; bei Rollstuhl oder eingeschränkter Mobilität den Zugang vorab prüfen.',
        ),
      ),
      row(
        'c-weather',
        lt('Weather', 'Wetter'),
        lt(
          'In severe weather or when a bridge is closed, check locally and change the route.',
          'Bei Unwetter oder gesperrter Brücke vor Ort prüfen und die Route anpassen.',
        ),
      ),
    ],
  },
  {
    id: 'lunch',
    layout: 'list',
    title: lt('Optional lunch', 'Optionales Mittagessen'),
    body: lt(
      'Two venues fit the route. Lunch is optional and paid separately. Opening hours are published schedules and do not guarantee a free table.',
      'Zwei Restaurants passen zur Route. Das Mittagessen ist optional und wird separat bezahlt. Öffnungszeiten sind veröffentlichte Zeiten und keine Garantie für einen freien Tisch.',
    ),
    items: [
      row(
        'l-taube',
        lt('Wirtshaus Taube (recommended)', 'Wirtshaus Taube (empfohlen)'),
        lt(
          'Traditional regional cooking, including Luzerne-style pastry and rösti on the operator\'s menu. Daily 11:30–23:30, kitchen until 21:30.',
          'Regionale Küche, auf der Karte unter anderem Luzerner Pastetli und Rösti. Täglich 11:30–23:30, Küche bis 21:30.',
        ),
        {
          optional: true,
          detail: lt(
            'An afternoon menu applies 13:45–17:30, so a 12:00 lunch comes before it. Ask for an indoor table; the river terrace is a summer offer. Check the current menu, prices and dietary needs.',
            'Von 13:45 bis 17:30 gilt eine Nachmittagskarte, ein Mittagessen um 12:00 liegt davor. Innenplatz reservieren; die Terrasse ist ein Sommerangebot. Aktuelle Gerichte, Preise und Ernährungswünsche bestätigen.',
          ),
          contact: {
            address: 'Burgerstrasse 3, 6003 Luzern',
            phone: '+41 41 210 07 47',
            email: 'wirtshaus@taube-luzern.ch',
          },
        },
      ),
      row(
        'l-rathaus',
        lt('Rathaus Brauerei (alternative)', 'Rathaus Brauerei (Alternative)'),
        lt(
          'Hot food 11:00–22:30, cold food until 23:00; the kitchen closes an hour earlier on Sundays and public holidays.',
          'Warme Küche 11:00–22:30, kalte Küche bis 23:00; sonntags und an Feiertagen eine Stunde früher geschlossen.',
        ),
        {
          optional: true,
          detail: lt(
            'Indoor tables can be reserved, outdoor tables cannot. Email for five or more guests and wait for confirmation. Return across Rathaussteg after the dam and allow about 10 extra minutes; reserve a table for around 12:10. The operator lists special holiday hours and an Ash Wednesday closure.',
            'Innen reservierbar, Terrasse ohne Reservation. Ab fünf Personen per E-Mail anfragen und Bestätigung abwarten. Nach dem Nadelwehr über den Rathaussteg zurückgehen: ungefähr zehn zusätzliche Minuten einplanen und Tisch gegen 12:10 reservieren. Sonderöffnungszeiten beachten; am Aschermittwoch ist eine Reinigungsschliessung vermerkt.',
          ),
          contact: {
            address: 'Unter der Egg 2, 6004 Luzern',
            phone: '+41 41 410 61 11',
            email: 'info@rathausbrauerei.ch',
          },
        },
      ),
    ],
  },
  {
    id: 'opening-hours',
    layout: 'facts',
    title: lt(
      'Rathaus Brauerei opening hours',
      'Öffnungszeiten der Rathaus Brauerei',
    ),
    items: [
      row(
        'h-summer',
        lt('April to October', 'April bis Oktober'),
        lt(
          'Mon, Wed, Thu, Fri 09:00–24:00 · Tue, Sat 08:00–24:00 · Sun and public holidays 09:00–23:00',
          'Mo, Mi, Do, Fr 09:00–24:00 · Di, Sa 08:00–24:00 · So und Feiertage 09:00–23:00',
        ),
      ),
      row(
        'h-winter',
        lt('November to March', 'November bis März'),
        lt(
          'Mon, Wed, Thu, Fri 10:00–24:00 · Tue, Sat 08:00–24:00 · Sun and public holidays 10:00–23:00',
          'Mo, Mi, Do, Fr 10:00–24:00 · Di, Sa 08:00–24:00 · So und Feiertage 10:00–23:00',
        ),
      ),
    ],
  },
]

export const thingsThatRemain: Tour = {
  id: 'things-that-remain',
  slug: 'lucerne-the-things-that-remain',
  name: lt('Luzerne: The Things That Remain', 'Luzern: Was bleibt'),
  summary: lt(
    'A slow, three-hour cultural walk: bridges, painted squares and the working river',
    'Ein dreistündiger Kulturspaziergang: Brücken, bemalte Plätze und der Fluss als Lebensader',
  ),
  description: lt(
    'At first, Luzerne is a postcard: a wooden bridge, painted houses and water catching the light. Then you notice a small detail. A painting becomes a question about life, a river becomes a story of human ingenuity, and a familiar view becomes your own memory. This walk invites you to discover the city through the things its people have built, protected, used and rebuilt.',
    'Zuerst wirkt Luzern wie eine Postkarte: eine Holzbrücke, bemalte Häuser und Licht auf dem Wasser. Dann fällt Ihnen ein kleines Detail auf. Ein Bild wird zur Frage nach dem Leben, der Fluss erzählt von menschlichem Erfindergeist, und aus einer schönen Aussicht wird eine persönliche Erinnerung. Dieser Spaziergang erschliesst die Stadt über das, was ihre Menschen gebaut, bewahrt, genutzt und wieder aufgebaut haben.',
  ),
  longStory: storyFromChapters({
    title: lt('Five places, one story', 'Fünf Orte, eine Geschichte'),
    chapters: [
      {
        photo: photos['chapel-bridge'],
        title: stopStories['chapel-bridge'].title,
        body: stopStories['chapel-bridge'].body,
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
        photo: photos['spreuer-bridge'],
        title: spreuer.title,
        body: spreuer.body,
      },
      {
        photo: photos['needle-dam'],
        title: needleDam.title,
        body: needleDam.body,
      },
    ],
  }),
  photos: [
    photos['chapel-bridge'],
    photos.weinmarkt,
    photos['spreuer-bridge'],
    photos['needle-dam'],
  ],
  durationMinutes: 180,
  adultPrice: 8900,
  childPrice: 4500,
  infantPrice: 0,
  meetingPoint: lt(
    'Bahnhofplatz, by the historic station arch',
    'Bahnhofplatz, beim historischen Bahnhofportal',
  ),
  included: [
    lt(
      'A city walk of about 2 km, with time to look and photograph',
      'Ein Stadtspaziergang von etwa 2 km, mit Zeit zum Hinschauen und Fotografieren',
    ),
    lt(
      'Five stops with their stories: Chapel Bridge, Kornmarkt, Weinmarkt, Spreuer Bridge and the Needle Dam',
      'Fünf Stationen mit ihren Geschichten: Kapellbrücke, Kornmarkt, Weinmarkt, Spreuerbrücke und Nadelwehr',
    ),
  ],
  excluded: lt(
    'Lunch, drinks, keepsakes and your journey to Luzerne are paid separately, and there is no shopping stop. Mountain scenery, private interiors and workshop visits are not part of this walk.',
    'Mittagessen, Getränke, Andenken und Ihre Anreise nach Luzern werden separat bezahlt, einen Einkaufsstopp gibt es nicht. Bergtouren, private Innenräume und Werkstattbesuche gehören nicht zu diesem Rundgang.',
  ),
  conditions: lt(
    'A city walk of about 2 km with uneven paving and wooden bridge surfaces, not a hike. Check mobility needs first, as step-free access is not guaranteed along the whole route. The Water Tower is seen from outside.',
    'Ein Stadtspaziergang von etwa 2 km mit unebenem Pflaster und Holzbelägen, keine Wanderung. Mobilitätsbedürfnisse vorab prüfen, eine durchgehend stufenfreie Route ist nicht zugesichert. Der Wasserturm wird von aussen betrachtet.',
  ),
  cancellationPolicy: lt(
    'In severe weather or when a bridge is closed, check locally and change the route.',
    'Bei Unwetter oder gesperrter Brücke vor Ort prüfen und die Route anpassen.',
  ),
  published: true,
  commissionRate: 0.1,
  itinerary,
  ageBands: { childFrom: 6, adultFrom: 16 },
  participantFields: [
    {
      id: 'needs',
      label: lt(
        'Mobility or dietary needs',
        'Mobilitäts- oder Ernährungsbedürfnisse',
      ),
      required: false,
    },
  ],
  sections,
  checkedOn: '2026-10-16',
  keepsakeIds: ['p-vx-chapel-bridge', 'p-postcards'],
}

export const thingsThatRemainDepartures: Departure[] = [
  ['remain-20', '2026-10-20', 'full'],
  ['remain-24', '2026-10-24', 'deposit'],
  ['remain-31', '2026-10-31', 'later'],
  ['remain-07', '2026-11-07', 'deposit'],
].map(([id, date, policy]) =>
  sampleDeparture({
    id,
    tourId: thingsThatRemain.id,
    date,
    time: '09:00',
    policy: policy as Departure['policy'],
  }),
)
