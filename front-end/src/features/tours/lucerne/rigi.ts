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
      'Start at the landing stages. SGV normally lists Pier 1 for Vitznau; check the pier and the sailing on the day.',
      'Start bei den Landungsbrücken. Für Vitznau nennt SGV normalerweise Steg 1; Steg und Kurs am Tag selbst prüfen.',
    ),
    minutesFromStart: 0,
    coordinates: [8.3112, 47.051],
    photo: photos.piers,
  },
  {
    id: 'vitznau',
    name: lt('Vitznau', 'Vitznau'),
    description: lt(
      'The boat takes about an hour across the lake. At Vitznau, walk to the railway boarding point and change to the cogwheel train; leave time to spare.',
      'Die Schifffahrt über den See dauert ungefähr eine Stunde. In Vitznau gehen Sie zu Fuss zum Bahneinstieg und steigen mit genügend Zeit in die Zahnradbahn um.',
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
      'Short walks to suitable viewpoints, then lunch in the self-service restaurant of the Rigi Kulm-Hotel.',
      'Kurze Wege zu geeigneten Aussichtspunkten, dann Mittagessen im Selbstbedienungsrestaurant des Rigi Kulm-Hotels.',
    ),
    minutesFromStart: 135,
    coordinates: [8.4847, 47.05569],
    photo: photos.kulm,
    note: lt(
      'Views depend on the weather. In poor visibility, shorten your time on the summit or pick another day.',
      'Die Aussicht hängt vom Wetter ab. Bei schlechter Sicht die Zeit auf dem Gipfel verkürzen oder einen anderen Tag wählen.',
    ),
  },
  {
    id: 'kaltbad',
    name: lt('Rigi Kaltbad', 'Rigi Kaltbad'),
    description: lt(
      'A short stay near the station on the way down. The section from Kulm to Kaltbad is by train, not on foot. Spa admission is not part of the route.',
      'Ein kurzer Aufenthalt nahe dem Bahnhof auf dem Rückweg. Der Abschnitt von Kulm nach Kaltbad wird mit der Bahn gefahren, nicht zu Fuss. Der Spa-Eintritt gehört nicht zur Route.',
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
      'Who will enjoy this route?',
      'Für wen eignet sich dieser Ausflug?',
    ),
    body: lt(
      'For travellers who enjoy a slower pace and changing landscapes. For couples, friends and families who like boats and trains, and for returning visitors ready to spend a full day beyond the Old Town.\n\nIt can also suit several generations travelling together; check boarding, short walks and mobility needs beforehand.',
      'Für Gäste, die ruhiger reisen und verschiedene Landschaftseindrücke verbinden möchten. Für Paare, Freunde und Familien, die Schiffe und Züge mögen, und für Wiederkehrende, die nach der Altstadt einen ganzen Tag in der Region verbringen wollen.\n\nAuch für Generationenreisen denkbar; Einstiege, kurze Wege und die Mobilität vorab prüfen.',
    ),
  },
  {
    id: 'glance',
    layout: 'facts',
    title: lt('At a glance', 'Auf einen Blick'),
    items: [
      row(
        'g-day',
        lt('Time needed', 'Zeitbedarf'),
        lt('A full day, about 8 hours', 'Ein ganzer Tag, etwa 8 Stunden'),
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
          'A day of its own, or after the Luzerne walk and Pilatus',
          'Ein eigener Tag oder nach dem Luzerner Rundgang und Pilatus',
        ),
      ),
      row(
        'g-not',
        lt('Not part of the route', 'Nicht Teil der Route'),
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
          'Not a single viewpoint: water, hillside, train window, open height and the lakeshore again. Take your time to look.',
          'Nicht ein einziger Aussichtspunkt, sondern vom Wasser zum Hang, vom Zugfenster zur Höhe und wieder hinunter an den See. Nehmen Sie sich Zeit zum Schauen.',
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
        lt('Weather', 'Wetter'),
        lt('Views depend on the weather.', 'Die Aussicht hängt vom Wetter ab.'),
      ),
    ],
  },
  {
    id: 'timetable',
    layout: 'timeline',
    title: lt('A day in changing scenes', 'Ein Tag in mehreren Bildern'),
    body: lt(
      'Rough time windows. The actual boat services depend on the date of your trip.',
      'Ungefähre Zeitfenster; die konkreten Schiffskurse hängen vom Datum ab.',
    ),
    items: timeline([
      [
        '08:45–09:15',
        't1',
        lt(
          'Start at the Luzerne landing stages',
          'Start bei den Luzerner Landungsbrücken',
        ),
        lt(
          'Check the pier and the sailing; SGV normally lists Pier 1 for Vitznau.',
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
        lt('Change with time to spare', 'Umstieg mit genügend Zeit'),
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
          'Short walks to suitable viewpoints.',
          'Kurze Wege zu geeigneten Aussichtspunkten.',
        ),
      ],
      [
        '12:00–13:00',
        't5',
        lt('Lunch at the Rigi Kulm-Hotel', 'Mittagessen im Rigi Kulm-Hotel'),
        lt(
          'In the self-service restaurant. Check availability.',
          'Im Selbstbedienungsrestaurant; Verfügbarkeit prüfen.',
        ),
      ],
      [
        '13:00–14:15',
        't6',
        lt('Cogwheel train to Rigi Kaltbad', 'Zahnradbahn nach Rigi Kaltbad'),
        lt(
          'A short stay near the station. Spa admission is not part of the route.',
          'Kurzer Aufenthalt nahe dem Bahnhof. Der Spa-Eintritt gehört nicht zur Route.',
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
          'Depends on the connection you take. Check the return timetable before planning onward travel.',
          'Je nach Verbindung. Den Rückfahrplan prüfen, bevor Sie die Weiterreise planen.',
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
      'Check the boat times separately; the rail times below are only an example.',
      'Die Schiffszeiten separat prüfen; die Bahnzeiten unten sind nur ein Beispiel.',
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
      'The checked Rigi rail timetable covers 12 October to 12 December 2026. SGV changes to its winter boat timetable on 19 October, through 16 April 2027. The time windows above therefore change over the year.',
      'Der geprüfte Rigi-Fahrplan gilt 12.10.–12.12.2026. SGV wechselt am 19.10. auf den Winterfahrplan bis 16.04.2027. Die Zeitfenster oben gelten deshalb nicht das ganze Jahr.',
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
          'Boat to Vitznau, a walk to the railway boarding point, then the cogwheel train to Kulm. Kaltbad is on the same line and is visited on the way back. If a connection is tight, take the next one rather than rush.',
          'Schiff bis Vitznau, zu Fuss zum Bahneinstieg, Zahnradbahn bis Kulm. Kaltbad liegt auf derselben Bahnstrecke und wird auf dem Rückweg besucht. Ist ein Anschluss knapp, nehmen Sie lieber den nächsten, statt zu hetzen.',
        ),
      ),
      row(
        'r-return',
        lt('Alternative return', 'Alternative Rückreise'),
        lt(
          'If the boat timetable does not fit, you can return by a land connection from Vitznau or by rail via Arth-Goldau. This changes the route and possibly ticket validity, so check it for your travel day.',
          'Bei unpassendem Schiffsfahrplan ist eine Landverbindung ab Vitznau oder eine Bahnrückfahrt über Arth-Goldau möglich. Das ändert Route und möglicherweise Ticketgültigkeit; für den Reisetag prüfen.',
        ),
      ),
    ],
  },
  {
    id: 'lunch',
    layout: 'list',
    title: lt('Lunch at Rigi Kulm', 'Mittagessen auf Rigi Kulm'),
    body: lt(
      'Lunch is optional and paid separately.',
      'Das Mittagessen ist optional und wird separat bezahlt.',
    ),
    items: [
      row(
        'l-self',
        lt(
          'Rigi Kulm-Hotel, self-service restaurant',
          'Rigi Kulm-Hotel, Selbstbedienungsrestaurant',
        ),
        lt(
          'Swiss dishes; the operator lists hot food until 15:30. Check the full opening hours for your date before you go.',
          'Schweizer Gerichte; die Betreiberseite nennt warme Speisen bis 15:30. Die vollständigen tagesaktuellen Öffnungszeiten vor der Reise prüfen.',
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
    'A full day by lake boat and cogwheel railway: across the lake to Vitznau, up to Rigi Kulm and back down by way of Kaltbad. Views depend on the weather, and there is time to linger.',
    'Ein ganzer Tag mit Schiff und Zahnradbahn: über den See nach Vitznau, hinauf auf Rigi Kulm und über Kaltbad zurück. Die Aussicht hängt vom Wetter ab, und es bleibt Zeit zum Verweilen.',
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
          'It is a sequence of perspectives rather than a single viewpoint: water, hillside, train window, open height and the lakeshore again. Take your time to look.',
          'Es ist eine Folge von Perspektiven statt eines einzelnen Aussichtspunkts: Wasser, Hang, Zugfenster, offene Höhe und wieder das Seeufer. Nehmen Sie sich Zeit zum Schauen.',
        ),
      },
      {
        photo: photos.kaltbad,
        title: lt('Time to change', 'Umsteigen mit Zeit'),
        body: lt(
          'Lunch at Rigi Kulm and a short stop at Kaltbad add different moods without requiring a long hike. If a connection is tight, take the next one rather than rush.',
          'Ein Mittagessen auf Rigi Kulm und ein kurzer Aufenthalt in Kaltbad schaffen unterschiedliche Stimmungen, ohne eine lange Wanderung vorauszusetzen. Ist ein Anschluss knapp, nehmen Sie lieber den nächsten, statt zu hetzen.',
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
    'Luzerne landing stages, Pier 1 for Vitznau',
    'Luzerner Landungsbrücken, Steg 1 nach Vitznau',
  ),
  included: [
    lt(
      'A boat trip across the lake from Luzerne to Vitznau and back',
      'Eine Schifffahrt über den See von Luzern nach Vitznau und zurück',
    ),
    lt(
      'The cogwheel railway up to Rigi Kulm, with a stop at Kaltbad on the way down',
      'Die Zahnradbahn hinauf nach Rigi Kulm, mit einem Halt in Kaltbad auf dem Rückweg',
    ),
  ],
  excluded: lt(
    'Boat and rail tickets, lunch and keepsakes are paid separately. Spa admission, a paddle steamer, a heritage steam train and farm visits are not part of the route.',
    'Schiffs- und Bahntickets, Mittagessen und Andenken werden separat bezahlt. Spa, Dampfschiff, historische Dampfbahn und Hofbesuche gehören nicht zur Route.',
  ),
  conditions: lt(
    'No compulsory hike: the section from Kulm to Kaltbad is by train. Views depend on the weather. Check boarding, short walks and your own mobility needs before you go. SGV asks groups of ten or more to register in advance.',
    'Kein obligatorischer Wanderweg: Der Abschnitt von Kulm nach Kaltbad wird mit der Bahn gefahren. Die Aussicht hängt vom Wetter ab. Einstiege, kurze Wege und die eigene Mobilität vorab prüfen. SGV verlangt bei Gruppen ab zehn Personen eine Voranmeldung.',
  ),
  cancellationPolicy: lt(
    'In poor visibility, shorten your time on the summit or pick another day.',
    'Bei schlechter Sicht die Zeit auf dem Gipfel verkürzen oder einen anderen Tag wählen.',
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
