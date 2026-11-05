import type { ArticleComment } from '@sk/domain/content'

/**
 * Illustrative comments on the three tours, by the invented guests of the demo seed
 * (the story comments in features/content/seed.ts use the same cast). Each tour has one
 * set per language, keyed `<tour id>-<language>` like the story versions, and the guest page
 * shows the set of its language. Shop answers repeat only what the tour already says.
 * They are kept out of the story comment store, so the merchant comment list stays about stories.
 */
function guest(
  id: string,
  articleId: string,
  guestId: string,
  createdAt: string,
  text: string,
  parentId?: string,
): ArticleComment {
  return { id, articleId, author: { kind: 'guest', guestId }, text, createdAt, hidden: false, parentId }
}

function shop(
  id: string,
  articleId: string,
  staffName: string,
  createdAt: string,
  text: string,
  parentId: string,
): ArticleComment {
  return { id, articleId, author: { kind: 'shop', staffName }, text, createdAt, hidden: false, parentId }
}

const rigiEn = 'rigi-from-lake-to-sky-en'
const rigiDe = 'rigi-from-lake-to-sky-de'
const pilatusEn = 'pilatus-above-the-city-en'
const pilatusDe = 'pilatus-above-the-city-de'
const remainEn = 'things-that-remain-en'
const remainDe = 'things-that-remain-de'

export const tourCommentSeed: ArticleComment[] = [
  // Rigi, English
  guest('tc-rigi-en-1', rigiEn, 'g-marie', '2026-10-22T14:10:00+02:00', 'We went on a Wednesday. The boat from Pier 1 took a little over an hour and the cogwheel train in Vitznau was easy to find. Kulm was in cloud for the first half hour, then it cleared for ten minutes. Worth waiting.'),
  shop('tc-rigi-en-2', rigiEn, 'Lukas', '2026-10-23T09:30:00+02:00', 'Thank you, Marie. The views on Rigi Kulm depend on the weather, so a little waiting often pays off.', 'tc-rigi-en-1'),
  guest('tc-rigi-en-3', rigiEn, 'g-tom', '2026-10-28T18:45:00+01:00', 'Lunch in the self-service restaurant at Kulm was plain Swiss food and there was no queue at 12:30. Kulm to Kaltbad is by train, so no hiking with the children.'),
  guest('tc-rigi-en-4', rigiEn, 'g-yuki', '2026-11-01T20:05:00+01:00', 'The timetable changes with the season, so look up the Vitznau times the night before. We took the 10:15 up and the 14:15 down from Kaltbad and had a long stretch by the lake in between.'),
  guest('tc-rigi-en-5', rigiEn, 'g-peter', '2026-11-03T11:20:00+01:00', 'Kaltbad is a short stop by the station, fine for a coffee but not much more.'),
  shop('tc-rigi-en-6', rigiEn, 'Lukas', '2026-11-03T16:00:00+01:00', 'Thanks, Peter. It is a short stay on the way down; spa admission is not part of the route.', 'tc-rigi-en-5'),
  guest('tc-rigi-en-7', rigiEn, 'g-elena', '2026-11-04T08:40:00+01:00', 'Do the boat out and back if you can. The shoreline looks different on the way home.'),

  // Rigi, German
  guest('tc-rigi-de-1', rigiDe, 'g-daniel', '2026-10-21T19:15:00+02:00', 'Wir sind an einem Dienstag gefahren. Das Schiff ab Steg 1 braucht gut eine Stunde, und in Vitznau ist der Bahneinstieg gut zu Fuss erreichbar. Auf Kulm war es zuerst neblig, nach einer halben Stunde kam die Sonne.'),
  shop('tc-rigi-de-2', rigiDe, 'Lukas', '2026-10-22T09:00:00+02:00', 'Danke, Daniel. Die Aussicht auf Rigi Kulm hängt vom Wetter ab, etwas Geduld lohnt sich oft.', 'tc-rigi-de-1'),
  guest('tc-rigi-de-3', rigiDe, 'g-sofia', '2026-10-27T17:30:00+01:00', 'Mit Kindern gut machbar: Von Kulm nach Kaltbad fährt man mit der Bahn, es gibt also keine Pflichtwanderung. Das Mittagessen im Selbstbedienungsrestaurant war einfach und gut.'),
  guest('tc-rigi-de-4', rigiDe, 'g-elena', '2026-11-02T21:10:00+01:00', 'Der Fahrplan wechselt mit der Saison. Wir haben am Vorabend die Zeiten angeschaut und das Schiff nach dem Winterfahrplan genommen.'),
  guest('tc-rigi-de-5', rigiDe, 'g-marie', '2026-11-04T10:05:00+01:00', 'Kaltbad ist ein kurzer Halt beim Bahnhof, mehr nicht. Für einen Kaffee reicht es.'),
  shop('tc-rigi-de-6', rigiDe, 'Sonja', '2026-11-04T15:30:00+01:00', 'Danke, Marie. Kaltbad ist ein kurzer Aufenthalt auf dem Rückweg; der Spa-Eintritt gehört nicht zur Route.', 'tc-rigi-de-5'),

  // Pilatus, English
  guest('tc-pilatus-en-1', pilatusEn, 'g-tom', '2026-10-12T16:20:00+02:00', 'Bus 1 from the station to Kriens took about 15 minutes, then a short walk to the valley station. Gondola to Fräkmüntegg, the Dragon Ride up, and no hiking at all, which suited my mother.'),
  shop('tc-pilatus-en-2', pilatusEn, 'Lukas', '2026-10-13T09:15:00+02:00', 'Thank you, Tom. The route is short walks around the stations only, with no mountain hike.', 'tc-pilatus-en-1'),
  guest('tc-pilatus-en-3', pilatusEn, 'g-yuki', '2026-10-24T19:40:00+02:00', 'The Kriens lifts are closed for maintenance until 27 November. We went via Alpnachstad and the cogwheel railway instead, which was a nice change.'),
  guest('tc-pilatus-en-4', pilatusEn, 'g-elena', '2026-10-30T17:00:00+01:00', 'Lunch at the Bellevue self-service restaurant. Tables cannot be reserved, so we went at 11:30 and found seats easily.'),
  guest('tc-pilatus-en-5', pilatusEn, 'g-peter', '2026-11-03T12:25:00+01:00', 'Cloud covered the distant peaks, but the cableways are interesting in themselves. Not a day for anyone afraid of heights.'),
  shop('tc-pilatus-en-6', pilatusEn, 'Lukas', '2026-11-03T17:10:00+01:00', 'Thanks, Peter. Distant peaks depend on visibility, and the route uses a gondola and an aerial cableway.', 'tc-pilatus-en-5'),

  // Pilatus, German
  guest('tc-pilatus-de-1', pilatusDe, 'g-daniel', '2026-10-13T18:50:00+02:00', 'Bus 1 ab Bahnhof Luzern bis Kriens, dann kurz zu Fuss zur Talstation. Mit Gondel und Dragon Ride waren wir kurz nach zehn oben. Eine Wanderung ist nicht nötig.'),
  shop('tc-pilatus-de-2', pilatusDe, 'Sonja', '2026-10-14T09:20:00+02:00', 'Danke, Daniel. Oben bleiben es kurze Wege bei den Stationen und Aussichtspunkten.', 'tc-pilatus-de-1'),
  guest('tc-pilatus-de-3', pilatusDe, 'g-marie', '2026-10-24T20:15:00+02:00', 'Wir hatten Glück mit der Sicht. Das Mittagessen im Bellevue war unkompliziert; Tische lassen sich nicht reservieren.'),
  guest('tc-pilatus-de-4', pilatusDe, 'g-sofia', '2026-11-02T15:45:00+01:00', 'Die Kriens-Seilbahnen sind bis 27. November geschlossen, wir sind deshalb über Alpnachstad mit der Zahnradbahn gefahren. Den Fahrplan vorher prüfen lohnt sich.'),
  guest('tc-pilatus-de-5', pilatusDe, 'g-tom', '2026-11-04T09:35:00+01:00', 'Bei Wolken sieht man nicht viel, aber die Technik der Bahnen ist auch spannend.'),
  shop('tc-pilatus-de-6', pilatusDe, 'Sonja', '2026-11-04T14:00:00+01:00', 'Danke, Tom. Die Fernsicht hängt von der Sicht ab; bei Wolken lohnt der Blick auf Technik und Landschaft.', 'tc-pilatus-de-5'),

  // The Things That Remain, English
  guest('tc-remain-en-1', remainEn, 'g-elena', '2026-10-10T13:30:00+02:00', 'About 2 km including the way back to the station, with plenty of pauses. Chapel Bridge first, then Kornmarkt and Weinmarkt, and Spreuer Bridge near the end.'),
  shop('tc-remain-en-2', remainEn, 'Lukas', '2026-10-11T09:45:00+02:00', 'Thank you, Elena. Allow 40–50 minutes of moving time; the rest is time to look.', 'tc-remain-en-1'),
  guest('tc-remain-en-3', remainEn, 'g-marie', '2026-10-18T16:10:00+02:00', 'The Dance of Death paintings on Spreuer Bridge stayed with me. I would think twice about very small children.'),
  guest('tc-remain-en-4', remainEn, 'g-tom', '2026-10-27T18:20:00+01:00', 'The paving is uneven and the wooden bridges are narrow, so check access first if you have a pushchair. The Water Tower is seen from outside only.'),
  shop('tc-remain-en-5', remainEn, 'Lukas', '2026-10-28T09:10:00+01:00', 'Thanks, Tom. Step-free access is not guaranteed along the whole route, so checking first is sensible.', 'tc-remain-en-4'),
  guest('tc-remain-en-6', remainEn, 'g-yuki', '2026-11-01T14:55:00+01:00', 'Lunch at Wirtshaus Taube afterwards. We asked for an indoor table, which was a good idea in November.'),
  guest('tc-remain-en-7', remainEn, 'g-peter', '2026-11-04T11:00:00+01:00', 'The Needle Dam viewpoint is easy to miss. Look for it on the south bank, past Spreuer Bridge.'),

  // The Things That Remain, German
  guest('tc-remain-de-1', remainDe, 'g-sofia', '2026-10-11T12:40:00+02:00', 'Rund 2 km mit viel Zeit zum Schauen: von der Kapellbrücke über Kornmarkt und Weinmarkt zur Spreuerbrücke und zum Nadelwehr.'),
  shop('tc-remain-de-2', remainDe, 'Lukas', '2026-10-12T09:30:00+02:00', 'Danke, Sofia. Rechnen Sie mit 40–50 Minuten reiner Gehzeit.', 'tc-remain-de-1'),
  guest('tc-remain-de-3', remainDe, 'g-daniel', '2026-10-19T17:15:00+02:00', 'Das Pflaster ist uneben und die Holzbrücken sind eng. Mit Kinderwagen würde ich den Zugang vorher prüfen.'),
  shop('tc-remain-de-4', remainDe, 'Sonja', '2026-10-20T10:00:00+02:00', 'Danke, Daniel. Eine durchgehend stufenfreie Route ist nicht zugesichert.', 'tc-remain-de-3'),
  guest('tc-remain-de-5', remainDe, 'g-elena', '2026-10-30T19:05:00+01:00', 'Der Wasserturm wird nur von aussen angesehen, das steht auch so da. Die Totentanzbilder auf der Spreuerbrücke fanden wir sehr eindrücklich.'),
  guest('tc-remain-de-6', remainDe, 'g-peter', '2026-11-03T15:25:00+01:00', 'Zum Abschluss ins Wirtshaus Taube, einen Innenplatz hatten wir reserviert. Gute Pastetli.'),
  guest('tc-remain-de-7', remainDe, 'g-marie', '2026-11-04T10:50:00+01:00', 'Wir waren bei Regen unterwegs. Bei Unwetter oder gesperrter Brücke lohnt sich der Blick vor Ort.'),
]
