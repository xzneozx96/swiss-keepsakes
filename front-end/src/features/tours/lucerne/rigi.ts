import type { Departure, Tour, TourSection, TourStop } from '@sk/domain/bookings'

import { storyFromChapters } from '@sk/domain/shared'

import { lt, row, sampleDeparture, timeline } from './curated'

/**
 * Tour 03 of the client's three curated tours: "Rigi: From Lake to Sky"
 * (client-resources/Swiss_Native_Lucerne_Tour_03.pdf, planning edition, verified 16.10.2026).
 * Prices, capacity and departures are sample values. Coordinates are looked up from
 * OpenStreetMap and are only for the map.
 */
const photos = {
  piers: 'rigi-vitznau-pier',
  vitznau: 'rigi-vitznau-train',
  kulm: 'rigi-kulm',
  restaurant: 'rigi-kulm-restaurant',
  kaltbad: 'rigi-kaltbad',
} as const

const itinerary: TourStop[] = [
  {
    id: 'piers',
    name: lt('Luzerne landing stages', 'Luzerner Landungsbrücken'),
    description: lt(
      'Meet near the landing stages. SGV normally lists Pier 1 for Vitznau; your guide checks the pier and the service before the day.',
      'Treffpunkt bei den Landungsbrücken. Für Vitznau nennt SGV normalerweise Steg 1; Ihre Führung prüft Steg und Kurs vor dem Tag.',
    ),
    minutesFromStart: 0,
    coordinates: [8.3112, 47.051],
    photo: photos.piers,
  },
  {
    id: 'vitznau',
    name: lt('Vitznau', 'Vitznau'),
    description: lt(
      'The boat takes about an hour across the lake. At Vitznau you walk to the railway boarding point and change to the cogwheel train, with a deliberate buffer.',
      'Die Schifffahrt über den See dauert ungefähr eine Stunde. In Vitznau gehen Sie zu Fuss zum Bahneinstieg und steigen mit bewusstem Puffer in die Zahnradbahn um.',
    ),
    minutesFromStart: 75,
    coordinates: [8.48466, 47.00912],
    photo: photos.vitznau,
    note: lt(
      'The Vitznau to Kulm ride takes 32 minutes in the checked timetable. The Weggis cableway is not needed.',
      'Die Bahn Vitznau–Kulm benötigt im geprüften Fahrplan 32 Minuten. Die Weggis-Seilbahn wird nicht benötigt.',
    ),
  },
  {
    id: 'kulm',
    name: lt('Rigi Kulm', 'Rigi Kulm'),
    description: lt(
      'Short walks to suitable viewpoints with guided interpretation, then lunch in the self-service restaurant of the Rigi Kulm-Hotel.',
      'Kurze Wege zu geeigneten Aussichtspunkten mit erzählerischer Führung, dann Mittagessen im Selbstbedienungsrestaurant des Rigi Kulm-Hotels.',
    ),
    minutesFromStart: 135,
    coordinates: [8.4847, 47.05569],
    photo: photos.kulm,
    note: lt(
      'Views depend on the weather. In poor visibility the mountain section is shortened or rescheduled.',
      'Die Aussicht hängt vom Wetter ab. Bei schlechter Sicht wird der Bergteil verkürzt oder verschoben.',
    ),
  },
  {
    id: 'kaltbad',
    name: lt('Rigi Kaltbad', 'Rigi Kaltbad'),
    description: lt(
      'A short stay near the station on the way down. The section from Kulm to Kaltbad is by train, not on foot. No spa booking is included.',
      'Ein kurzer Aufenthalt nahe dem Bahnhof auf dem Rückweg. Der Abschnitt von Kulm nach Kaltbad wird mit der Bahn gefahren, nicht zu Fuss. Es ist keine Spa-Buchung enthalten.',
    ),
    minutesFromStart: 270,
    coordinates: [8.46618, 47.0447],
    photo: photos.kaltbad,
  },
]

const sections: TourSection[] = [
  {
    id: 'for-whom',
    layout: 'text',
    title: lt(
      'Who will enjoy this tour?',
      'Für wen eignet sich dieser Ausflug?',
    ),
    body: lt(
      'For travellers who enjoy a slower pace and changing landscapes. For couples, friends and families who like boats and trains, and for returning visitors ready to spend a full day beyond the Old Town.\n\nIt can suit a multigenerational group when boarding arrangements, short walks and individual mobility needs are checked in advance.',
      'Für Gäste, die ruhiger reisen und verschiedene Landschaftseindrücke verbinden möchten. Für Paare, Freunde und Familien, die Schiffe und Züge mögen, und für Wiederkehrende, die nach der Altstadt einen ganzen Tag in der Region verbringen wollen.\n\nAuch für Generationenreisen denkbar, wenn Einstiege, kurze Wege und individuelle Mobilität vorab geklärt werden.',
    ),
  },
  {
    id: 'glance',
    layout: 'facts',
    title: lt('The day at a glance', 'Der Tag auf einen Blick'),
    items: [
      row(
        'g-group',
        lt('Group', 'Gruppe'),
        lt('About 2–8 guests (proposed)', 'Etwa 2–8 Gäste (vorgeschlagen)'),
      ),
      row(
        'g-day',
        lt('Programme', 'Programm'),
        lt('A full day, from about 08:45', 'Ein ganzer Tag, ab etwa 08:45 Uhr'),
        {
          detail: lt(
            'Return to Luzerne around 16:00–17:00, depending on the connection.',
            'Rückkehr nach Luzern etwa 16:00–17:00 Uhr, je nach Verbindung.',
          ),
        },
      ),
      row(
        'g-walk',
        lt('Walking', 'Gehen'),
        lt(
          'No compulsory hike: Kulm to Kaltbad is by train',
          'Kein obligatorischer Wanderweg: Kulm nach Kaltbad mit der Bahn',
        ),
      ),
      row(
        'g-format',
        lt('Format', 'Format'),
        lt(
          'A stand-alone day, or after Tour 01 and Pilatus',
          'Ein eigener Tag oder nach Tour 01 und Pilatus',
        ),
      ),
      row(
        'g-not',
        lt('Not automatically included', 'Nicht automatisch enthalten'),
        lt(
          'Spa admission, a paddle steamer, a heritage steam train and farm visits',
          'Spa, Dampfschiff, historische Dampfbahn und Hofbesuche',
        ),
      ),
    ],
  },
  {
    id: 'special',
    layout: 'list',
    title: lt(
      'What gives this day its character',
      'Was macht diesen Tag besonders?',
    ),
    items: [
      row(
        's-perspectives',
        lt('A sequence of perspectives', 'Eine Folge von Perspektiven'),
        lt(
          'Not a single viewpoint: water, hillside, train window, open height and the lakeshore again. The guide makes space for observations and conversation.',
          'Nicht ein einziger Aussichtspunkt, sondern vom Wasser zum Hang, vom Zugfenster zur Höhe und wieder hinunter an den See. Die Führung lässt Raum für Beobachtungen und Gespräche.',
        ),
      ),
      row(
        's-moods',
        lt('Lunch and a short stop', 'Mittagessen und ein kurzer Halt'),
        lt(
          'Lunch at Rigi Kulm and a short stop at Kaltbad add different moods without requiring a long hike.',
          'Ein Mittagessen auf Rigi Kulm und ein kurzer Aufenthalt in Kaltbad schaffen unterschiedliche Stimmungen, ohne eine lange Wanderung vorauszusetzen.',
        ),
      ),
      row(
        's-weather',
        lt('Honest about the weather', 'Ehrlich beim Wetter'),
        lt('Views depend on the weather.', 'Die Aussicht hängt vom Wetter ab.'),
      ),
    ],
  },
  {
    id: 'timetable',
    layout: 'timeline',
    title: lt('A day in changing scenes', 'Ein Tag in mehreren Bildern'),
    body: lt(
      'Planning windows. The actual boat services depend on the date you choose.',
      'Zeitfenster zur Planung; konkrete Schiffskurse hängen vom Datum ab.',
    ),
    items: timeline([
      [
        '08:45–09:15',
        't1',
        lt(
          'Meet near the Luzerne landing stages',
          'Treffen bei den Luzerner Landungsbrücken',
        ),
        lt(
          'Verify the pier and the service; SGV normally lists Pier 1 for Vitznau.',
          'Steg und Kurs prüfen; für Vitznau nennt SGV normalerweise Steg 1.',
        ),
      ],
      [
        'About 09–10',
        't2',
        lt('Cruise to Vitznau', 'Schifffahrt nach Vitznau'),
        lt(
          'About one hour, depending on the service. Watch the lake and the changing shoreline.',
          'Ungefähr eine Stunde je nach Kurs. See und Uferlandschaft beobachten.',
        ),
      ],
      [
        'About 10–11',
        't3',
        lt('Transfer with a deliberate buffer', 'Umstieg mit bewusstem Puffer'),
        lt(
          'If needed, take a later train and enjoy the lakeshore. The checked Vitznau to Kulm timetable gives 32 minutes.',
          'Falls nötig ein späterer Zug und ein Aufenthalt am See. Die Bahn Vitznau–Kulm benötigt im geprüften Fahrplan 32 Minuten.',
        ),
      ],
      [
        '11:00–12:00',
        't4',
        lt('Arrive at Rigi Kulm', 'Ankommen auf Rigi Kulm'),
        lt(
          'Short walks to suitable viewpoints and guided interpretation.',
          'Kurze Wege zu geeigneten Aussichtspunkten und erzählerische Führung.',
        ),
      ],
      [
        '12:00–13:00',
        't5',
        lt('Lunch at the Rigi Kulm-Hotel', 'Mittagessen im Rigi Kulm-Hotel'),
        lt(
          'In the self-service restaurant. Confirm availability.',
          'Im Selbstbedienungsrestaurant; Verfügbarkeit bestätigen.',
        ),
      ],
      [
        '13:00–14:15',
        't6',
        lt('Cogwheel train to Rigi Kaltbad', 'Zahnradbahn nach Rigi Kaltbad'),
        lt(
          'A short stay near the station; no additional spa booking is included.',
          'Kurzer Aufenthalt nahe dem Bahnhof, keine zusätzliche Spa-Buchung.',
        ),
      ],
      [
        '14:15–15:45',
        't7',
        lt(
          'Train to Vitznau, time by the lake',
          'Bahn nach Vitznau, Zeit am See',
        ),
        lt(
          'Time on the shore and a buffer before the appropriate boat.',
          'Zeit am Ufer und Puffer bis zum passenden Schiff.',
        ),
      ],
      [
        'About 16–17',
        't8',
        lt('Return to Luzerne', 'Rückkehr nach Luzern'),
        lt(
          'According to the selected connection. Book onward travel only after confirming the return timetable.',
          'Je nach Verbindung. Weiterreise erst nach bestätigtem Rückfahrplan buchen.',
        ),
      ],
    ]),
  },
  {
    id: 'rail-example',
    layout: 'facts',
    title: lt(
      'Rail example for 12 Oct to 12 Dec 2026',
      'Bahnbeispiel für 12.10.–12.12.2026',
    ),
    body: lt(
      'Match the boats separately. This is not a confirmed end-to-end booking.',
      'Die Schiffe dazu separat abstimmen; dies ist kein bestätigtes Gesamtpaket.',
    ),
    items: [
      row(
        'x1',
        lt('Vitznau to Kulm', 'Vitznau nach Kulm'),
        lt('10:15 → 10:47', '10:15 → 10:47'),
      ),
      row(
        'x2',
        lt('Kulm to Kaltbad', 'Kulm nach Kaltbad'),
        lt('13:00 → 13:15', '13:00 → 13:15'),
      ),
      row(
        'x3',
        lt('Kaltbad to Vitznau', 'Kaltbad nach Vitznau'),
        lt('14:15 → 14:40', '14:15 → 14:40'),
      ),
    ],
  },
  {
    id: 'seasonal',
    layout: 'notice',
    title: lt(
      'Timetables change with the season',
      'Fahrpläne wechseln mit der Saison',
    ),
    body: lt(
      'The checked Rigi rail timetable covers 12 October to 12 December 2026. SGV changes to its winter boat timetable on 19 October, through 16 April 2027. The time windows above are therefore not fixed year-round departures.\n\nSGV asks groups of ten or more to register in advance. That is not a seat reservation.',
      'Der geprüfte Rigi-Fahrplan gilt 12.10.–12.12.2026. SGV wechselt am 19.10. auf den Winterfahrplan bis 16.04.2027. Deshalb sind die Zeitfenster oben keine ganzjährig festen Abfahrten.\n\nBei Gruppen ab zehn Personen verlangt SGV eine Voranmeldung; diese ist keine Sitzplatzreservation.',
    ),
  },
  {
    id: 'route',
    layout: 'list',
    title: lt('The lake and mountain route', 'Die Route über See und Berg'),
    body: lt(
      'Luzerne, Vitznau, Rigi Kulm, Rigi Kaltbad, Vitznau, Luzerne.',
      'Luzern, Vitznau, Rigi Kulm, Rigi Kaltbad, Vitznau, Luzern.',
    ),
    items: [
      row(
        'r-change',
        lt('Allow time to change', 'Umsteigen mit Zeit'),
        lt(
          'Boat to Vitznau, a walk to the railway boarding point, then the cogwheel train to Kulm. Kaltbad is on the same line and is visited on the return. When a connection is tight, we plan a later departure rather than pass the pressure on to guests.',
          'Schiff bis Vitznau, zu Fuss zum Bahneinstieg, Zahnradbahn bis Kulm. Kaltbad liegt auf derselben Bahnstrecke und wird auf dem Rückweg besucht. Bei knappen Anschlüssen planen wir einen späteren Kurs, statt den Zeitdruck weiterzugeben.',
        ),
      ),
      row(
        'r-return',
        lt('Alternative return', 'Alternative Rückreise'),
        lt(
          'If the boat timetable does not fit, a land connection from Vitznau or a rail return via Arth-Goldau can be checked. This changes the route and possibly ticket validity, so it is confirmed only after checking your travel day.',
          'Bei unpassendem Schiffsfahrplan kann eine Landverbindung ab Vitznau oder eine Bahnrückfahrt über Arth-Goldau geprüft werden. Das ändert Route und möglicherweise Ticketgültigkeit; erst nach Prüfung des Reisetags zugesagt.',
        ),
      ),
    ],
  },
  {
    id: 'lunch',
    layout: 'list',
    title: lt('Lunch at Rigi Kulm', 'Mittagessen auf Rigi Kulm'),
    body: lt(
      'Lunch is optional, is paid separately and is not reserved for you.',
      'Das Mittagessen ist optional, wird separat bezahlt und nicht für Sie reserviert.',
    ),
    items: [
      row(
        'l-self',
        lt(
          'Rigi Kulm-Hotel, self-service restaurant',
          'Rigi Kulm-Hotel, Selbstbedienungsrestaurant',
        ),
        lt(
          'Swiss dishes; the operator lists hot food until 15:30. Confirm the full opening hours for your date before you book.',
          'Schweizer Gerichte; die Betreiberseite nennt warme Speisen bis 15:30. Die vollständigen tagesaktuellen Öffnungszeiten vor Buchung bestätigen.',
        ),
        {
          optional: true,
          contact: { phone: '+41 41 880 18 88', email: 'hotel@rigikulm.ch' },
        },
      ),
      row(
        'l-carte',
        lt('À la carte restaurant', 'À-la-carte-Restaurant'),
        lt(
          'Lunch service at weekends, 11:30–14:00; on weekdays dinner service for hotel guests. A daily à la carte lunch is not promised.',
          'Am Wochenende Mittagservice 11:30–14:00; werktags Abendservice für Hotelgäste. Ein tägliches À-la-carte-Mittagessen wird nicht versprochen.',
        ),
        { optional: true },
      ),
    ],
  },
]

export const rigi: Tour = {
  id: 'rigi-from-lake-to-sky',
  slug: 'rigi-from-lake-to-sky',
  name: lt('Rigi: From Lake to Sky', 'Rigi: Vom See zum Himmel'),
  summary: lt(
    'A full day by lake boat and cogwheel railway, with time to linger',
    'Ein ganzer Tag mit Schiff und Zahnradbahn, mit Zeit zum Verweilen',
  ),
  description: lt(
    'Luzerne slowly falls behind the boat. Shorelines pass and the water gives the day a different rhythm. At Vitznau, the perspective changes: the cogwheel train climbs towards the Rigi. This day combines travel across the lake, the fascination of a mountain railway and a stay with room for personal discoveries.',
    'Luzern bleibt langsam hinter dem Schiff zurück. Die Ufer ziehen vorbei, und das Wasser gibt dem Tag einen anderen Rhythmus. In Vitznau wechselt die Perspektive: Die Zahnradbahn führt hinauf zur Rigi. Dieser Ausflug verbindet das Reisen auf dem See mit dem Staunen über eine Bergbahn und einem Aufenthalt, der Raum für persönliche Entdeckungen lässt.',
  ),
  longStory: storyFromChapters({
    title: lt('From the lake to the sky', 'Vom See zum Himmel'),
    chapters: [
      {
        photo: photos.piers,
        title: lt(
          'The journey is already a memory',
          'Schon der Weg ist eine Erinnerung',
        ),
        body: lt(
          'Luzerne slowly falls behind the boat. Shorelines pass and the water gives the day a different rhythm. At Vitznau, the perspective changes: the cogwheel train climbs towards the Rigi.',
          'Luzern bleibt langsam hinter dem Schiff zurück. Die Ufer ziehen vorbei, und das Wasser gibt dem Tag einen anderen Rhythmus. In Vitznau wechselt die Perspektive: Die Zahnradbahn führt hinauf zur Rigi.',
        ),
      },
      {
        photo: photos.kulm,
        title: lt('A sequence of perspectives', 'Eine Folge von Perspektiven'),
        body: lt(
          'It is a sequence of perspectives rather than a single viewpoint: water, hillside, train window, open height and the lakeshore again. The guide makes space for observations and conversation.',
          'Es ist eine Folge von Perspektiven statt eines einzelnen Aussichtspunkts: Wasser, Hang, Zugfenster, offene Höhe und wieder das Seeufer. Die Führung lässt Raum für Beobachtungen und Gespräche.',
        ),
      },
      {
        photo: photos.kaltbad,
        title: lt('Time to change', 'Umsteigen mit Zeit'),
        body: lt(
          'Lunch at Rigi Kulm and a short stop at Kaltbad add different moods without requiring a long hike. When a connection is tight, we plan a later departure rather than pass the pressure on to guests.',
          'Ein Mittagessen auf Rigi Kulm und ein kurzer Aufenthalt in Kaltbad schaffen unterschiedliche Stimmungen, ohne eine lange Wanderung vorauszusetzen. Bei knappen Anschlüssen planen wir einen späteren Kurs, statt den Zeitdruck weiterzugeben.',
        ),
      },
    ],
  }),
  photos: [photos.kulm, photos.piers, photos.kaltbad, photos.restaurant],
  durationMinutes: 480,
  adultPrice: 13900,
  childPrice: 7000,
  infantPrice: 0,
  meetingPoint: lt(
    'Luzerne landing stages (Pier 1 for Vitznau; pier and service confirmed before the day)',
    'Luzerner Landungsbrücken (Steg 1 nach Vitznau; Steg und Kurs werden vorab bestätigt)',
  ),
  included: [
    lt(
      'Guiding from Luzerne across the lake and up the Rigi and back, in a small group',
      'Führung ab Luzern über den See auf die Rigi und zurück, in kleiner Gruppe',
    ),
    lt(
      'Stories and conversation along the lake, the cogwheel railway and the summit',
      'Geschichten und Gespräche am See, auf der Zahnradbahn und auf dem Gipfel',
    ),
  ],
  excluded: lt(
    'Boat and rail tickets, lunch and gifts. Spa admission, a paddle steamer, a heritage steam train and farm visits are not automatically included.',
    'Schiffs- und Bahntickets, Mittagessen und Geschenke. Spa, Dampfschiff, historische Dampfbahn und Hofbesuche sind nicht automatisch enthalten.',
  ),
  conditions: lt(
    'No compulsory hike: the section from Kulm to Kaltbad is by train. Views depend on the weather. Please check boarding arrangements, short walks and individual mobility needs before booking. Small groups of about 2–8 guests; SGV asks groups of ten or more to register in advance. Children must be accompanied by an adult.',
    'Kein obligatorischer Wanderweg: Der Abschnitt von Kulm nach Kaltbad wird mit der Bahn gefahren. Die Aussicht hängt vom Wetter ab. Bitte klären Sie Einstiege, kurze Wege und individuelle Mobilität vor der Buchung. Kleine Gruppen mit etwa 2–8 Gästen; SGV verlangt bei Gruppen ab zehn Personen eine Voranmeldung. Kinder müssen von einer erwachsenen Person begleitet werden.',
  ),
  cancellationPolicy: lt(
    'Sample policy: contact the organiser at least 48 hours before departure. In poor visibility the mountain section is shortened or rescheduled.',
    'Beispielregel: mindestens 48 Stunden vor Beginn den Veranstalter kontaktieren. Bei schlechter Sicht wird der Bergteil verkürzt oder verschoben.',
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
}

export const rigiDepartures: Departure[] = (
  [
    ['rigi-21', '2026-10-21', 'deposit'],
    ['rigi-28', '2026-10-28', 'full'],
    ['rigi-04', '2026-11-04', 'later'],
    ['rigi-11', '2026-11-11', 'deposit'],
  ] as const
).map(([id, date, policy]) =>
  sampleDeparture({
    id,
    tourId: rigi.id,
    date,
    time: '08:45',
    policy,
  }),
)
