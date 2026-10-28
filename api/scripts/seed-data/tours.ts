import type { Localized, TourGuideDoc } from '@sk/domain/content'

// The prototype's tour guides (front-end/src/features/tours/seed.ts). Guide text, stops and duration only: no
// price, no departure, no media. Written by a one-off conversion.
export interface SeedTourStop { latitude: number, longitude: number, title: Localized, text: Localized, minutesFromStart: number }
export interface SeedTour { slug: Localized, durationMinutes: number, doc: TourGuideDoc, stops: SeedTourStop[] }

export const seedTours: SeedTour[] = [
  {
    slug: {
      en: 'things-that-remain',
      de: 'things-that-remain',
    },
    durationMinutes: 180,
    doc: {
      title: {
        en: 'Luzerne: The Things That Remain',
        de: 'Luzern: Was bleibt',
      },
      summary: {
        en: 'A slow, three-hour cultural walk: bridges, painted squares and the working river',
        de: 'Ein dreistündiger Kulturspaziergang: Brücken, bemalte Plätze und der Fluss als Lebensader',
      },
      meetingPoint: {
        en: 'Bahnhofplatz, by the historic station arch',
        de: 'Bahnhofplatz, beim historischen Bahnhofportal',
      },
      sections: [
        {
          id: 'for-whom',
          heading: {
            en: 'Who this walk is for',
            de: 'Für wen ist dieser Rundgang gedacht?',
          },
          body: {
            en: 'First-time visitors who want context as well as the famous views. Returning travellers who want to notice more than they did before. Couples and friends who enjoy conversation, architecture and small discoveries. Families with curious older children who like finding details and asking why.\n\nThe guide can adapt the language and emphasis to the group. The paintings at Spreuer Bridge include imagery of death and are introduced sensitively.',
            de: 'Erstbesucher, die berühmte Ansichten verstehen möchten. Wiederkehrende, die neue Einzelheiten entdecken wollen. Paare und Freunde, die Architektur, Geschichten und Gespräche schätzen. Familien mit neugierigen älteren Kindern, die gerne suchen und nachfragen.\n\nSprache und Schwerpunkte lassen sich an die Gruppe anpassen. Die Todesdarstellungen auf der Spreuerbrücke werden altersgerecht und behutsam eingeordnet.',
          },
        },
        {
          id: 'glance',
          heading: {
            en: 'The experience at a glance',
            de: 'Das Erlebnis auf einen Blick',
          },
          body: {
            en: 'Group: About 2–8 guests (proposed)\nGuided walk: 09:00 to 12:00 Optional reserved lunch until 13:00; back at the station about 13:15.\nDistance: About 2 km including the return to the station Allow 40–50 minutes of moving time. Distances and times are planning estimates.\nPace: A gentle city exploration with frequent pauses, not a hike',
            de: 'Gruppe: Etwa 2–8 Gäste (vorgeschlagen)\nFührung: 09:00 bis 12:00 Uhr Auf Wunsch reserviertes Mittagessen bis 13:00; Bahnhof gegen 13:15.\nStrecke: Etwa 2 km inklusive Rückweg zum Bahnhof Rechnen Sie mit 40–50 Minuten reiner Gehzeit. Strecke und Zeiten sind Planungswerte.\nTempo: Ein Stadtspaziergang mit vielen Pausen, keine Wanderung',
          },
        },
        {
          id: 'special',
          heading: {
            en: 'What makes the walk special',
            de: 'Was diesen Weg besonders macht',
          },
          body: {
            en: 'Look beyond the postcard: At Chapel Bridge the guide draws attention to timber, paintings and the city around them. The story of rebuilding asks a simple question: why do certain places matter so much to the people who live beside them? The Water Tower is viewed from outside.\nRead the city in its everyday details: In Kornmarkt and Weinmarkt the focus shifts to individual façades, the fountain and the shape of the squares. Choose a detail that catches your eye and hear what public places say about a trading city.\nA moment of reflection: The Dance of Death paintings at Spreuer Bridge are a thoughtful counterpoint to the beauty outside: what do people choose to remember, and what makes a life meaningful? At the Needle Dam attention returns to the living city and the challenge of managing water.\nFinish with flavour, and a story of your own: Guests might share the detail they will remember most. An optional lunch gives the morning an unhurried ending.',
            de: 'Mehr sehen als das Postkartenmotiv: An der Kapellbrücke lenkt die Führung den Blick auf das Zusammenspiel von Holz, Bildern und Stadt. Die Geschichte des Wiederaufbaus stellt eine einfache Frage: Warum bedeuten bestimmte Orte ihren Bewohnern so viel? Der Wasserturm wird von aussen betrachtet.\nDie Stadt in ihren Einzelheiten lesen: Am Kornmarkt und Weinmarkt treten einzelne Fassaden, der Brunnen und die Form der Plätze in den Vordergrund. Wählen Sie ein Detail, das Sie anspricht, und erfahren Sie, was öffentliche Räume über eine Handelsstadt erzählen.\nNachdenken und Staunen: Die Totentanzbilder auf der Spreuerbrücke bilden einen nachdenklichen Gegenpol zur Schönheit der Umgebung: Was möchten Menschen bewahren, und was macht ein Leben bedeutsam? Am Nadelwehr geht es wieder um die lebendige Stadt und den Umgang mit Wasser.\nMit Geschmack und einer eigenen Erinnerung abschliessen: Welches Detail wird Ihnen besonders in Erinnerung bleiben? Ein optionales Mittagessen lässt den Vormittag in Ruhe ausklingen.',
          },
        },
        {
          id: 'timetable',
          heading: {
            en: 'A morning with room to linger',
            de: 'Zeit zum Entdecken',
          },
          body: {
            en: 'A proposed timetable for a small group. It is a designed schedule, not a booked departure. This is a leisurely three-hour experience, not three hours of continuous walking.\n\n09:00–09:10: Meet at the station forecourt By the historic station arch. Arrive by 08:45–08:50.\n09:10–09:20: Walk to Chapel Bridge About 5–10 minutes via Bahnhofstrasse.\n09:20–09:50: Chapel Bridge and Water Tower Cross south to north. Paintings, fire and rebuilding; the tower is seen from outside.\n09:50–10:00: Walk to Kornmarkt About 5–10 minutes, with time for photographs.\n10:00–10:20: Kornmarkt Town Hall exterior and the story of the trading city.\n10:20–10:25: Walk to Weinmarkt About 3–5 minutes.\n10:25–10:45: Weinmarkt Façades, fountain and community memory.\n10:45–11:00: Flexible pause Toilets, photographs or a drink at your own cost.\n11:00–11:10: Walk via Mühlenplatz To the north end of Spreuer Bridge.\n11:10–11:35: Spreuer Bridge The Dance of Death paintings. Cross north to south and keep the walkway clear.\n11:35–11:40: Walk to the river viewpoint About 3–5 minutes along the south bank.\n11:40–11:55: Needle Dam Understand how the water is regulated. No guaranteed demonstration.\n11:55–12:00: Close of the walk A short personal reflection on the morning. Lunch is an optional extension.\n12:00–13:00: Optional reserved indoor lunch Wirtshaus Taube is recommended for the route. Allow longer for larger groups.\n13:00–13:15: Walk back to the station About 10–15 minutes. Leave a separate buffer before a train.',
            de: 'Vorgeschlagener Ablauf für eine kleine Gruppe, noch keine gebuchte Abfahrt. Die dreistündige Führung enthält viele Stopps, nicht drei Stunden reine Gehzeit.\n\n09:00–09:10: Treffpunkt am Bahnhofplatz Beim historischen Bahnhofportal. Ankunft 08:45–08:50.\n09:10–09:20: Weg zur Kapellbrücke Etwa 5–10 Minuten über die Bahnhofstrasse.\n09:20–09:50: Kapellbrücke und Wasserturm Von Süden nach Norden. Bilder, Brand und Wiederaufbau; der Turm nur von aussen.\n09:50–10:00: Weg zum Kornmarkt Etwa 5–10 Minuten, mit Zeit für Fotos.\n10:00–10:20: Kornmarkt Rathaus von aussen und die Geschichte der Handelsstadt.\n10:20–10:25: Weg zum Weinmarkt Etwa 3–5 Minuten.\n10:25–10:45: Weinmarkt Fassaden, Brunnen und gemeinschaftliche Erinnerung.\n10:45–11:00: Pause Toilette, Fotos oder ein Getränk auf eigene Rechnung.\n11:00–11:10: Über den Mühlenplatz Zum nördlichen Zugang der Spreuerbrücke.\n11:10–11:35: Spreuerbrücke Totentanzbilder; Übergang nach Süden, Durchgang freihalten.\n11:35–11:40: Weg zum Flussblick Etwa 3–5 Minuten am Südufer.\n11:40–11:55: Nadelwehr Wasserregulierung verstehen; keine garantierte Vorführung.\n11:55–12:00: Abschluss Persönliche Rückschau auf den Vormittag. Das Mittagessen ist eine optionale Verlängerung.\n12:00–13:00: Optionales Mittagessen Reservierter Innenplatz in der Taube; grössere Gruppen benötigen mehr Zeit.\n13:00–13:15: Rückweg zum Bahnhof Etwa 10–15 Minuten. Zusätzlichen Puffer für die Zugabfahrt einplanen.',
          },
        },
        {
          id: 'access',
          heading: {
            en: 'Access and what to expect',
            de: 'Zugang und was Sie erwartet',
          },
          body: {
            en: 'Published access information, checked for this edition. Confirm again for your travel day.\n\nChapel Bridge: Public pedestrian crossing; a daytime visit is planned The official page lists no opening hours, and temporary closures can occur.\nWater Tower: Exterior viewing only No regular interior hours are confirmed; an interior visit needs separate confirmation.\nKornmarkt and Weinmarkt: Outdoor public squares Shops and Town Hall interiors have separate arrangements.\nSpreuer Bridge: Open around the clock, free of charge See the paintings by daylight; temporary restrictions are possible.\nNeedle Dam: A public viewpoint See it from the bridge or the bank; the working structure is not entered.',
            de: 'Veröffentlichte Angaben, für diese Ausgabe geprüft; für den konkreten Reisetag nochmals bestätigen.\n\nKapellbrücke: Öffentlicher Fussgängerübergang; Besuch tagsüber Die offizielle Seite nennt keine Uhrzeiten, zeitweilige Sperrungen sind möglich.\nWasserturm: Nur Aussenbesichtigung Keine regulären Innenbesuchszeiten bestätigt; Innenzugang nur nach gesonderter Bestätigung.\nKornmarkt und Weinmarkt: Öffentliche Plätze im Freien Geschäfte und Rathausräume sind separat geregelt.\nSpreuerbrücke: Rund um die Uhr geöffnet, kostenlos Bilder bei Tageslicht ansehen; zeitweilige Einschränkungen vorbehalten.\nNadelwehr: Ein öffentlicher Aussichtspunkt Blick vom Ufer oder von der Brücke, kein Betreten der Betriebsanlage.',
          },
        },
        {
          id: 'getting-there',
          heading: {
            en: 'Getting there and around',
            de: 'Anreise und Fortbewegung',
          },
          body: {
            en: 'By rail: Search for Luzern in the SBB journey planner and meet outside the main station at Bahnhofplatz. Train times, fares and platforms depend on your origin and date.\nOn the walk: The route is on foot and a compact city-centre loop. No bus, boat or ticket is needed.\nFrom your hotel: Plan the connection from your hotel address. Eligible overnight guests can use the Luzerne Visitor Card on buses and trains in Zone 10; boats are excluded. Confirm eligibility with your accommodation.',
            de: 'Mit der Bahn: Im SBB-Fahrplan nach Luzern suchen. Treffpunkt auf dem Bahnhofplatz. Verbindung, Preis und Gleis hängen von Ausgangsort und Datum ab.\nUnterwegs: Der Rundgang erfolgt zu Fuss; Bus, Schiff oder Bergbahn sind nicht erforderlich.\nAb Hotel: Verbindung anhand der tatsächlichen Adresse planen. Berechtigte Übernachtungsgäste können mit der Gästekarte Bus und Bahn in Zone 10 nutzen; Schiffe sind ausgeschlossen. Berechtigung beim Hotel bestätigen.',
          },
        },
        {
          id: 'comfort',
          heading: {
            en: 'Comfort, weather and group size',
            de: 'Komfort, Wetter und Gruppengrösse',
          },
          body: {
            en: 'Surfaces: Expect uneven paving, wooden surfaces and busy narrow sections. Tell us about wheelchair or mobility needs before you book; the whole route is not guaranteed to be step-free.\nWeather: In light rain the outdoor explanations are shortened. In severe weather or a bridge closure the route is changed after a local check.\nGroup size: For more than about eight guests, extra time or separate guiding groups keep the bridge traffic clear. The group size is a service choice, not an official limit.',
            de: 'Wege: Mit unebenem Pflaster, Holzbelägen und engen, belebten Abschnitten rechnen. Für Rollstuhl oder eingeschränkte Mobilität den Zugang vorab klären; eine durchgehend stufenfreie Route ist nicht zugesichert.\nWetter: Bei leichtem Regen werden Erklärungen im Freien verkürzt; bei Unwetter oder Sperrungen wird die Route nach lokaler Prüfung angepasst.\nGruppengrösse: Für mehr als etwa acht Gäste sind zusätzliche Zeit oder getrennte Führungsgruppen vorgesehen. Diese Gruppengrösse ist ein Gestaltungsvorschlag, keine behördliche Grenze.',
          },
        },
        {
          id: 'lunch',
          heading: {
            en: 'Optional lunch',
            de: 'Optionales Mittagessen',
          },
          body: {
            en: 'Two venues fit the route. Lunch is optional, is paid separately and is not booked for you. Opening hours are published schedules and do not guarantee a free table.\n\nWirtshaus Taube (recommended): Traditional regional cooking, including Luzerne-style pastry and rösti on the operator\'s menu. Daily 11:30–23:30, kitchen until 21:30. An afternoon menu applies 13:45–17:30, so a 12:00 lunch comes before it. Ask for an indoor table; the river terrace is a summer offer. Check the current menu, prices and dietary needs.\nRathaus Brauerei (alternative): Hot food 11:00–22:30, cold food until 23:00; the kitchen closes an hour earlier on Sundays and public holidays. Indoor tables can be reserved, outdoor tables cannot. Email for five or more guests and wait for confirmation. Return across Rathaussteg after the dam and allow about 10 extra minutes; book lunch around 12:10. The operator lists special holiday hours and an Ash Wednesday closure.',
            de: 'Zwei Restaurants passen zur Route. Das Mittagessen ist optional, wird separat bezahlt und nicht für Sie gebucht. Öffnungszeiten sind veröffentlichte Zeiten und keine Garantie für einen freien Tisch.\n\nWirtshaus Taube (empfohlen): Regionale Küche, auf der Karte unter anderem Luzerner Pastetli und Rösti. Täglich 11:30–23:30, Küche bis 21:30. Von 13:45 bis 17:30 gilt eine Nachmittagskarte, ein Mittagessen um 12:00 liegt davor. Innenplatz reservieren; die Terrasse ist ein Sommerangebot. Aktuelle Gerichte, Preise und Ernährungswünsche bestätigen.\nRathaus Brauerei (Alternative): Warme Küche 11:00–22:30, kalte Küche bis 23:00; sonntags und an Feiertagen eine Stunde früher geschlossen. Innen reservierbar, Terrasse ohne Reservation. Ab fünf Personen per E-Mail anfragen und Bestätigung abwarten. Nach dem Nadelwehr über den Rathaussteg zurückgehen: ungefähr zehn zusätzliche Minuten einplanen und Mittagessen gegen 12:10 reservieren. Sonderöffnungszeiten beachten; am Aschermittwoch ist eine Reinigungsschliessung vermerkt.',
          },
        },
        {
          id: 'opening-hours',
          heading: {
            en: 'Rathaus Brauerei opening hours',
            de: 'Öffnungszeiten der Rathaus Brauerei',
          },
          body: {
            en: 'April to October: Mon, Wed, Thu, Fri 09:00–24:00 · Tue, Sat 08:00–24:00 · Sun and public holidays 09:00–23:00\nNovember to March: Mon, Wed, Thu, Fri 10:00–24:00 · Tue, Sat 08:00–24:00 · Sun and public holidays 10:00–23:00',
            de: 'April bis Oktober: Mo, Mi, Do, Fr 09:00–24:00 · Di, Sa 08:00–24:00 · So und Feiertage 09:00–23:00\nNovember bis März: Mo, Mi, Do, Fr 10:00–24:00 · Di, Sa 08:00–24:00 · So und Feiertage 10:00–23:00',
          },
        },
        {
          id: 'expectations',
          heading: {
            en: 'A good match, with honest expectations',
            de: 'Für die passende Erwartung',
          },
          body: {
            en: 'The value lies in attentive guiding, interpretation and time to notice. This route does not include mountain scenery, private interiors or a workshop visit. A shorter 90–120 minute version is possible on request.\n\nWeather, access, restaurant availability and the group\'s needs shape the final confirmed programme.',
            de: 'Der Mehrwert liegt in persönlicher Begleitung, verständlichen Zusammenhängen und Zeit zum Entdecken. Bergtouren, private Innenräume und Werkstattbesuche sind nicht enthalten. Eine kürzere Variante von 90–120 Minuten ist auf Anfrage möglich.\n\nWetter, Zugänglichkeit, Tischverfügbarkeit und Bedürfnisse der Gruppe bestimmen das endgültig bestätigte Programm.',
          },
        },
      ],
    },
    stops: [
      {
        latitude: 47.0511,
        longitude: 8.3093,
        title: {
          en: 'Bahnhofplatz, Luzerne',
          de: 'Bahnhofplatz Luzern',
        },
        text: {
          en: 'Meet by the historic station arch. Your guide confirms the exact meeting pin before the day, so please arrive by 08:50.',
          de: 'Treffpunkt beim historischen Bahnhofportal. Ihre Führung bestätigt den genauen Standort vor dem Tag, bitte seien Sie bis 08:50 Uhr da.',
        },
        minutesFromStart: 0,
      },
      {
        latitude: 47.05134,
        longitude: 8.30724,
        title: {
          en: 'Chapel Bridge',
          de: 'Kapellbrücke',
        },
        text: {
          en: 'Walk across the covered bridge slowly and look up at the gable paintings, then stop by the Water Tower for the view along the Reuss.',
          de: 'Gehen Sie langsam über die gedeckte Brücke, schauen Sie zu den Giebelbildern hinauf und halten Sie beim Wasserturm für den Blick auf die Reuss.',
        },
        minutesFromStart: 20,
      },
      {
        latitude: 47.05196,
        longitude: 8.30609,
        title: {
          en: 'Kornmarkt and Town Hall',
          de: 'Kornmarkt und Rathaus',
        },
        text: {
          en: 'Stand in the square, look up at the Renaissance Town Hall and its wide roof, and check what is on in the Kornschütte hall.',
          de: 'Stehen Sie auf dem Platz, schauen Sie zum Renaissance-Rathaus mit seinem breiten Dach hinauf und sehen Sie nach, was in der Kornschütte läuft.',
        },
        minutesFromStart: 60,
      },
      {
        latitude: 47.05201,
        longitude: 8.30482,
        title: {
          en: 'Weinmarkt',
          de: 'Weinmarkt',
        },
        text: {
          en: 'Stand by the fountain and look up at the painted house fronts, then find the facade by Seraphin Weingartner on the former Alte Apotheke.',
          de: 'Stellen Sie sich an den Brunnen, schauen Sie zu den bemalten Hausfassaden hinauf und suchen Sie die Fassade von Seraphin Weingartner an der ehemaligen Alten Apotheke.',
        },
        minutesFromStart: 85,
      },
      {
        latitude: 47.05198,
        longitude: 8.30187,
        title: {
          en: 'Spreuer Bridge',
          de: 'Spreuerbrücke',
        },
        text: {
          en: 'Cross the covered bridge from north to south and look up at the Dance of Death paintings, keeping the walkway clear.',
          de: 'Überqueren Sie die gedeckte Brücke von Norden nach Süden und schauen Sie zu den Totentanzbildern hinauf, ohne den Durchgang zu blockieren.',
        },
        minutesFromStart: 130,
      },
      {
        latitude: 47.05109,
        longitude: 8.30322,
        title: {
          en: 'Needle Dam',
          de: 'Nadelwehr',
        },
        text: {
          en: 'See the wooden needles of the dam from the public viewpoint on the south bank and hear how the river is managed.',
          de: 'Sehen Sie die Holznadeln des Wehrs vom öffentlichen Aussichtspunkt am Südufer und erfahren Sie, wie der Fluss reguliert wird.',
        },
        minutesFromStart: 160,
      },
    ],
  },
  {
    slug: {
      en: 'pilatus-above-the-city',
      de: 'pilatus-above-the-city',
    },
    durationMinutes: 390,
    doc: {
      title: {
        en: 'Pilatus: Above the City',
        de: 'Pilatus: Über der Stadt',
      },
      summary: {
        en: 'A day from Luzerne: bus, gondola and the Dragon Ride to the summit, with no hike',
        de: 'Ein Tag ab Luzern: Bus, Gondel und Dragon Ride zum Gipfel, ohne Wanderung',
      },
      meetingPoint: {
        en: 'Luzerne railway station (exact meeting point agreed before the day)',
        de: 'Bahnhof Luzern (genauer Treffpunkt wird vorab vereinbart)',
      },
      sections: [
        {
          id: 'for-whom',
          heading: {
            en: 'Who is this day for?',
            de: 'Für wen ist dieser Tag gedacht?',
          },
          body: {
            en: 'For couples, friends and families who want a mountain experience without planning a hike. For curious travellers interested in engineering, and photographers who value time to observe.\n\nGuests who are uncomfortable with heights or aerial cableways should discuss this before booking.',
            de: 'Für Paare, Freunde und Familien, die Berglandschaft erleben möchten, ohne eine Wanderung zu planen. Für neugierige Gäste, die sich für Technik interessieren, und für Fotografierende, die Zeit zum Beobachten schätzen.\n\nWer grosse Höhen oder Seilbahnen unangenehm findet, sollte dies vor der Buchung ansprechen.',
          },
        },
        {
          id: 'glance',
          heading: {
            en: 'The day at a glance',
            de: 'Der Tag auf einen Blick',
          },
          body: {
            en: 'Group: About 2–8 guests (proposed)\nProgramme: 08:30 to about 15:00 Planning times, not reserved departures. After 15:30 onward travel is possible, with an extra buffer and no guaranteed connection.\nWalking: Short walks around stations and viewing areas No mountain hike and no compulsory stair climb to a summit viewpoint. Mobility arrangements need checking.\nFormat: A stand-alone day, or an addition to Tour 01',
            de: 'Gruppe: Etwa 2–8 Gäste (vorgeschlagen)\nProgramm: 08:30 bis etwa 15:00 Uhr Planungszeiten, keine gebuchten Abfahrten. Ab 15:30 ist eine Weiterreise möglich, mit zusätzlichem Puffer und ohne garantierte Anschlussverbindung.\nGehen: Kurze Wege bei Stationen und Aussichtspunkten Keine Bergwanderung und kein obligatorischer Treppenaufstieg zu einem Gipfel-Aussichtspunkt. Mobilität vorab klären.\nFormat: Ein eigener Tag oder eine Ergänzung zu Tour 01',
          },
        },
        {
          id: 'maintenance',
          heading: {
            en: 'Kriens lifts closed for maintenance',
            de: 'Revision der Kriens-Seilbahnen',
          },
          body: {
            en: 'From 19 October to 27 November 2026 the Kriens lifts are closed. In that period the day uses rail to Alpnachstad and the cogwheel railway both ways. The cogwheel season ends on 29 November 2026. Route and tickets are reconfirmed for your date.',
            de: 'Vom 19. Oktober bis 27. November 2026 sind die Kriens-Seilbahnen geschlossen. In dieser Zeit fahren wir mit der Bahn nach Alpnachstad und mit der Zahnradbahn hin und zurück. Deren Saison endet am 29. November 2026. Route und Tickets werden für Ihr Datum neu bestätigt.',
          },
        },
        {
          id: 'special',
          heading: {
            en: 'What makes it memorable',
            de: 'Was macht ihn besonders?',
          },
          body: {
            en: 'The transition is part of it: Bus, gondola, a change at Fräkmüntegg and the Dragon Ride aerial cableway. The guide connects these stages with conversations about landscape and access to the mountains.\nAt the top: Time for views, photography and an uncomplicated lunch.\nHonest about the weather: Distant peaks depend on visibility; clear skies are not promised.',
            de: 'Der Wechsel gehört dazu: Bus, Gondel, Umstieg auf der Fräkmüntegg und die Luftseilbahn Dragon Ride. Die Führung verbindet diese Etappen mit Gesprächen über Landschaft und Zugang zum Gebirge.\nOben: Zeit für Aussicht, Fotografie und ein einfaches Mittagessen.\nEhrlich beim Wetter: Sicht auf ferne Gipfel ist wetterabhängig; ein klarer Himmel wird nicht versprochen.',
          },
        },
        {
          id: 'timetable',
          heading: {
            en: 'A day with room to look',
            de: 'Der geplante Tagesablauf',
          },
          body: {
            en: 'Planning times, not reserved departures. This applies only when the Kriens lifts operate.\n\n08:30–09:10: Meet at Luzerne station and take bus 1 to Kriens Bus 1 towards Kriens/Obernau to Kriens, Zentrum Pilatus. About 15 minutes on the bus, then 5–10 minutes walking plus a buffer.\n09:10–10:15: Tickets, gondola and the Dragon Ride to Pilatus Kulm Gondola to Fräkmüntegg, then the Dragon Ride. The mountain trip takes around 40 minutes; this block includes waiting time.\n10:15–11:30: Views and guided interpretation Near the facilities; no hike is needed. In cloud, the focus is on engineering and the changing landscape.\n11:30–12:30: Lunch at the Bellevue self-service restaurant Tables cannot be reserved.\n12:30–13:30: Free time on the summit Photographs, conversation and a last look. Outdoor areas only when conditions allow.\n13:30–15:00: Descent and return to Luzerne Via Fräkmüntegg and Kriens, a walk to the bus, and back to Luzerne. Allow time for queues.\nAfter 15:30: Possible onward travel With an additional buffer. No connecting service is guaranteed.',
            de: 'Planungszeiten, keine gebuchten Abfahrten. Nur bei Betrieb der Kriens-Seilbahnen.\n\n08:30–09:10: Treffen am Bahnhof Luzern, Bus 1 nach Kriens Bus 1 Richtung Kriens/Obernau bis Kriens, Zentrum Pilatus. Etwa 15 Minuten Busfahrt, danach 5–10 Minuten Fussweg plus Puffer.\n09:10–10:15: Tickets, Gondel und Dragon Ride nach Pilatus Kulm Gondel zur Fräkmüntegg, Umstieg auf Dragon Ride. Die reine Bergfahrt dauert ungefähr 40 Minuten; der Zeitblock enthält Wartezeit.\n10:15–11:30: Aussicht und erzählerische Führung Nahe den Anlagen; keine Wanderung erforderlich. Bei Wolken liegt der Schwerpunkt auf Technik und Landschaftswahrnehmung.\n11:30–12:30: Mittagessen im Selbstbedienungsrestaurant Bellevue Keine Tischreservation möglich.\n12:30–13:30: Freie Zeit auf dem Gipfel Bilder, Gespräche und ein letzter Blick; Aussenbereiche nur bei geeigneten Bedingungen.\n13:30–15:00: Rückfahrt nach Luzern Über Fräkmüntegg und Kriens, Fussweg zum Bus, Rückkehr nach Luzern. Zeit für Warteschlangen lassen.\nAfter 15:30: Mögliche Weiterreise Mit zusätzlichem Puffer. Keine garantierte Anschlussverbindung.',
          },
        },
        {
          id: 'rhythm',
          heading: {
            en: 'Why this rhythm?',
            de: 'Warum dieser Rhythmus?',
          },
          body: {
            en: 'An early lunch fits the kitchen opening time. The descent begins well before closing, and the remaining margin supports a relaxed group pace rather than a promise of extra activities.',
            de: 'Ein frühes Mittagessen passt zur Küchenöffnung. Die Rückfahrt beginnt deutlich vor Betriebsschluss; der verbleibende Puffer dient der Gruppe und ist kein Versprechen zusätzlicher Aktivitäten.',
          },
        },
        {
          id: 'route',
          heading: {
            en: 'Route and transport',
            de: 'Strecke und Transport',
          },
          body: {
            en: 'Main route: Luzerne, bus 1 to Kriens, Zentrum Pilatus, a walk to the valley station, the gondola via Krienseregg to Fräkmüntegg, then the Dragon Ride to Pilatus Kulm. You return the same way. A lake cruise is not part of the core programme.\nDuring maintenance: Rail to Alpnachstad and the cogwheel railway both ways, only when railway operation is confirmed.',
            de: 'Hauptroute: Luzern, Bus 1 nach Kriens, Zentrum Pilatus, Fussweg zur Talstation, Gondel über Krienseregg zur Fräkmüntegg, dann Dragon Ride nach Pilatus Kulm. Gleicher Rückweg. Keine Schifffahrt im Grundprogramm.\nBei Revision: Bahn nach Alpnachstad und Zahnradbahn hin und zurück, nur bei bestätigtem Bahnbetrieb.',
          },
        },
        {
          id: 'operations',
          heading: {
            en: 'Published operating hours',
            de: 'Betriebszeiten',
          },
          body: {
            en: 'Hours are published schedules, checked on 16 October 2026. Weather can change operations.\n\nKriens ascent, until 18 Oct: 08:30–17:00 · last descent from Pilatus Kulm 17:30\nKriens ascent, from 28 Nov: 08:30–16:00 · last descent from Pilatus Kulm 16:30',
            de: 'Veröffentlichte Zeiten, geprüft am 16. Oktober 2026. Wetterbedingte Änderungen bleiben möglich.\n\nKriens-Aufstieg, bis 18. Okt: 08:30–17:00 · letzte Abfahrt Pilatus Kulm 17:30\nKriens-Aufstieg, ab 28. Nov: 08:30–16:00 · letzte Abfahrt Pilatus Kulm 16:30',
          },
        },
        {
          id: 'lunch',
          heading: {
            en: 'Lunch on the summit',
            de: 'Mittagessen auf dem Gipfel',
          },
          body: {
            en: 'Bellevue self-service restaurant: Simple food with wide views: Swiss and international dishes. Tables cannot be reserved. Lunch is paid separately and is not booked for you.',
            de: 'Selbstbedienungsrestaurant Bellevue: Einfach und aussichtsreich: Schweizer und internationale Gerichte. Keine Tischreservation. Das Mittagessen wird separat bezahlt und nicht für Sie gebucht.',
          },
        },
        {
          id: 'bellevue-hours',
          heading: {
            en: 'Bellevue opening hours',
            de: 'Öffnungszeiten Bellevue',
          },
          body: {
            en: 'Until 24 Oct: 09:00–17:00 · kitchen 11:30–16:30\n25 Oct to 29 Nov: 09:00–16:00 · kitchen until 15:30\n30 Nov to 11 Apr 2027: 09:30–15:30 · kitchen 11:30–15:00',
            de: 'Bis 24. Okt: 09:00–17:00 · Küche 11:30–16:30\n25. Okt bis 29. Nov: 09:00–16:00 · Küche bis 15:30\n30. Nov bis 11. Apr 2027: 09:30–15:30 · Küche 11:30–15:00',
          },
        },
        {
          id: 'weather',
          heading: {
            en: 'Weather and flexibility',
            de: 'Wetter und Flexibilität',
          },
          body: {
            en: 'Strong wind or poor weather: The day is rescheduled, or a separately agreed city alternative is offered.\nTickets and concessions: Tickets and concessions are calculated individually. Transport, food and gifts are included only if the confirmed offer lists them.',
            de: 'Starker Wind oder schlechtes Wetter: Wir verschieben den Tag oder bieten eine separat vereinbarte Stadtalternative an.\nTickets und Ermässigungen: Fahrkarten und Ermässigungen werden individuell berechnet. Fahrten, Essen und Geschenke sind erst eingeschlossen, wenn das Angebot sie ausdrücklich aufführt.',
          },
        },
      ],
    },
    stops: [
      {
        latitude: 47.0511,
        longitude: 8.3093,
        title: {
          en: 'Luzerne railway station',
          de: 'Bahnhof Luzern',
        },
        text: {
          en: 'Meet at the station. Your guide agrees the exact meeting pin with you before the day. Bus 1 towards Kriens/Obernau leaves from here.',
          de: 'Treffpunkt am Bahnhof. Ihre Führung vereinbart den genauen Treffpunkt vorab mit Ihnen. Von hier fährt Bus 1 Richtung Kriens/Obernau.',
        },
        minutesFromStart: 0,
      },
      {
        latitude: 47.03361,
        longitude: 8.27962,
        title: {
          en: 'Kriens, Zentrum Pilatus',
          de: 'Kriens, Zentrum Pilatus',
        },
        text: {
          en: 'About 15 minutes by bus, then a 5–10 minute walk to the valley station, plus a buffer. Tickets and boarding follow here.',
          de: 'Etwa 15 Minuten mit dem Bus, danach 5–10 Minuten zu Fuss zur Talstation, plus Puffer. Hier folgen Tickets und Einstieg.',
        },
        minutesFromStart: 25,
      },
      {
        latitude: 46.99034,
        longitude: 8.25027,
        title: {
          en: 'Fräkmüntegg',
          de: 'Fräkmüntegg',
        },
        text: {
          en: 'The gondola from Kriens stops here, and you change to the Dragon Ride aerial cableway for the last stretch to the summit.',
          de: 'Die Gondel aus Kriens hält hier, und Sie steigen auf die Luftseilbahn Dragon Ride für das letzte Stück zum Gipfel um.',
        },
        minutesFromStart: 60,
      },
      {
        latitude: 46.97926,
        longitude: 8.25564,
        title: {
          en: 'Pilatus Kulm',
          de: 'Pilatus Kulm',
        },
        text: {
          en: 'Time for views, photographs and a guided look at how town and mountain relate. No hike and no compulsory stair climb. Lunch at the Bellevue self-service restaurant.',
          de: 'Zeit für Aussicht, Fotos und eine Führung zum Verhältnis von Stadt und Berg. Keine Wanderung und kein obligatorischer Treppenaufstieg. Mittagessen im Selbstbedienungsrestaurant Bellevue.',
        },
        minutesFromStart: 105,
      },
    ],
  },
  {
    slug: {
      en: 'rigi-from-lake-to-sky',
      de: 'rigi-from-lake-to-sky',
    },
    durationMinutes: 480,
    doc: {
      title: {
        en: 'Rigi: From Lake to Sky',
        de: 'Rigi: Vom See zum Himmel',
      },
      summary: {
        en: 'A full day by lake boat and cogwheel railway, with time to linger',
        de: 'Ein ganzer Tag mit Schiff und Zahnradbahn, mit Zeit zum Verweilen',
      },
      meetingPoint: {
        en: 'Luzerne landing stages (Pier 1 for Vitznau; pier and service confirmed before the day)',
        de: 'Luzerner Landungsbrücken (Steg 1 nach Vitznau; Steg und Kurs werden vorab bestätigt)',
      },
      sections: [
        {
          id: 'for-whom',
          heading: {
            en: 'Who will enjoy this tour?',
            de: 'Für wen eignet sich dieser Ausflug?',
          },
          body: {
            en: 'For travellers who enjoy a slower pace and changing landscapes. For couples, friends and families who like boats and trains, and for returning visitors ready to spend a full day beyond the Old Town.\n\nIt can suit a multigenerational group when boarding arrangements, short walks and individual mobility needs are checked in advance.',
            de: 'Für Gäste, die ruhiger reisen und verschiedene Landschaftseindrücke verbinden möchten. Für Paare, Freunde und Familien, die Schiffe und Züge mögen, und für Wiederkehrende, die nach der Altstadt einen ganzen Tag in der Region verbringen wollen.\n\nAuch für Generationenreisen denkbar, wenn Einstiege, kurze Wege und individuelle Mobilität vorab geklärt werden.',
          },
        },
        {
          id: 'glance',
          heading: {
            en: 'The day at a glance',
            de: 'Der Tag auf einen Blick',
          },
          body: {
            en: 'Group: About 2–8 guests (proposed)\nProgramme: A full day, from about 08:45 Return to Luzerne around 16:00–17:00, depending on the connection.\nWalking: No compulsory hike: Kulm to Kaltbad is by train\nFormat: A stand-alone day, or after Tour 01 and Pilatus\nNot automatically included: Spa admission, a paddle steamer, a heritage steam train and farm visits',
            de: 'Gruppe: Etwa 2–8 Gäste (vorgeschlagen)\nProgramm: Ein ganzer Tag, ab etwa 08:45 Uhr Rückkehr nach Luzern etwa 16:00–17:00 Uhr, je nach Verbindung.\nGehen: Kein obligatorischer Wanderweg: Kulm nach Kaltbad mit der Bahn\nFormat: Ein eigener Tag oder nach Tour 01 und Pilatus\nNicht automatisch enthalten: Spa, Dampfschiff, historische Dampfbahn und Hofbesuche',
          },
        },
        {
          id: 'special',
          heading: {
            en: 'What gives this day its character',
            de: 'Was macht diesen Tag besonders?',
          },
          body: {
            en: 'A sequence of perspectives: Not a single viewpoint: water, hillside, train window, open height and the lakeshore again. The guide makes space for observations and conversation.\nLunch and a short stop: Lunch at Rigi Kulm and a short stop at Kaltbad add different moods without requiring a long hike.\nHonest about the weather: Views depend on the weather.',
            de: 'Eine Folge von Perspektiven: Nicht ein einziger Aussichtspunkt, sondern vom Wasser zum Hang, vom Zugfenster zur Höhe und wieder hinunter an den See. Die Führung lässt Raum für Beobachtungen und Gespräche.\nMittagessen und ein kurzer Halt: Ein Mittagessen auf Rigi Kulm und ein kurzer Aufenthalt in Kaltbad schaffen unterschiedliche Stimmungen, ohne eine lange Wanderung vorauszusetzen.\nEhrlich beim Wetter: Die Aussicht hängt vom Wetter ab.',
          },
        },
        {
          id: 'timetable',
          heading: {
            en: 'A day in changing scenes',
            de: 'Ein Tag in mehreren Bildern',
          },
          body: {
            en: 'Planning windows. The actual boat services depend on the date you choose.\n\n08:45–09:15: Meet near the Luzerne landing stages Verify the pier and the service; SGV normally lists Pier 1 for Vitznau.\nAbout 09–10: Cruise to Vitznau About one hour, depending on the service. Watch the lake and the changing shoreline.\nAbout 10–11: Transfer with a deliberate buffer If needed, take a later train and enjoy the lakeshore. The checked Vitznau to Kulm timetable gives 32 minutes.\n11:00–12:00: Arrive at Rigi Kulm Short walks to suitable viewpoints and guided interpretation.\n12:00–13:00: Lunch at the Rigi Kulm-Hotel In the self-service restaurant. Confirm availability.\n13:00–14:15: Cogwheel train to Rigi Kaltbad A short stay near the station; no additional spa booking is included.\n14:15–15:45: Train to Vitznau, time by the lake Time on the shore and a buffer before the appropriate boat.\nAbout 16–17: Return to Luzerne According to the selected connection. Book onward travel only after confirming the return timetable.',
            de: 'Zeitfenster zur Planung; konkrete Schiffskurse hängen vom Datum ab.\n\n08:45–09:15: Treffen bei den Luzerner Landungsbrücken Steg und Kurs prüfen; für Vitznau nennt SGV normalerweise Steg 1.\nAbout 09–10: Schifffahrt nach Vitznau Ungefähr eine Stunde je nach Kurs. See und Uferlandschaft beobachten.\nAbout 10–11: Umstieg mit bewusstem Puffer Falls nötig ein späterer Zug und ein Aufenthalt am See. Die Bahn Vitznau–Kulm benötigt im geprüften Fahrplan 32 Minuten.\n11:00–12:00: Ankommen auf Rigi Kulm Kurze Wege zu geeigneten Aussichtspunkten und erzählerische Führung.\n12:00–13:00: Mittagessen im Rigi Kulm-Hotel Im Selbstbedienungsrestaurant; Verfügbarkeit bestätigen.\n13:00–14:15: Zahnradbahn nach Rigi Kaltbad Kurzer Aufenthalt nahe dem Bahnhof, keine zusätzliche Spa-Buchung.\n14:15–15:45: Bahn nach Vitznau, Zeit am See Zeit am Ufer und Puffer bis zum passenden Schiff.\nAbout 16–17: Rückkehr nach Luzern Je nach Verbindung. Weiterreise erst nach bestätigtem Rückfahrplan buchen.',
          },
        },
        {
          id: 'rail-example',
          heading: {
            en: 'Rail example for 12 Oct to 12 Dec 2026',
            de: 'Bahnbeispiel für 12.10.–12.12.2026',
          },
          body: {
            en: 'Match the boats separately. This is not a confirmed end-to-end booking.\n\nVitznau to Kulm: 10:15 → 10:47\nKulm to Kaltbad: 13:00 → 13:15\nKaltbad to Vitznau: 14:15 → 14:40',
            de: 'Die Schiffe dazu separat abstimmen; dies ist kein bestätigtes Gesamtpaket.\n\nVitznau nach Kulm: 10:15 → 10:47\nKulm nach Kaltbad: 13:00 → 13:15\nKaltbad nach Vitznau: 14:15 → 14:40',
          },
        },
        {
          id: 'seasonal',
          heading: {
            en: 'Timetables change with the season',
            de: 'Fahrpläne wechseln mit der Saison',
          },
          body: {
            en: 'The checked Rigi rail timetable covers 12 October to 12 December 2026. SGV changes to its winter boat timetable on 19 October, through 16 April 2027. The time windows above are therefore not fixed year-round departures.\n\nSGV asks groups of ten or more to register in advance. That is not a seat reservation.',
            de: 'Der geprüfte Rigi-Fahrplan gilt 12.10.–12.12.2026. SGV wechselt am 19.10. auf den Winterfahrplan bis 16.04.2027. Deshalb sind die Zeitfenster oben keine ganzjährig festen Abfahrten.\n\nBei Gruppen ab zehn Personen verlangt SGV eine Voranmeldung; diese ist keine Sitzplatzreservation.',
          },
        },
        {
          id: 'route',
          heading: {
            en: 'The lake and mountain route',
            de: 'Die Route über See und Berg',
          },
          body: {
            en: 'Luzerne, Vitznau, Rigi Kulm, Rigi Kaltbad, Vitznau, Luzerne.\n\nAllow time to change: Boat to Vitznau, a walk to the railway boarding point, then the cogwheel train to Kulm. Kaltbad is on the same line and is visited on the return. When a connection is tight, we plan a later departure rather than pass the pressure on to guests.\nAlternative return: If the boat timetable does not fit, a land connection from Vitznau or a rail return via Arth-Goldau can be checked. This changes the route and possibly ticket validity, so it is confirmed only after checking your travel day.',
            de: 'Luzern, Vitznau, Rigi Kulm, Rigi Kaltbad, Vitznau, Luzern.\n\nUmsteigen mit Zeit: Schiff bis Vitznau, zu Fuss zum Bahneinstieg, Zahnradbahn bis Kulm. Kaltbad liegt auf derselben Bahnstrecke und wird auf dem Rückweg besucht. Bei knappen Anschlüssen planen wir einen späteren Kurs, statt den Zeitdruck weiterzugeben.\nAlternative Rückreise: Bei unpassendem Schiffsfahrplan kann eine Landverbindung ab Vitznau oder eine Bahnrückfahrt über Arth-Goldau geprüft werden. Das ändert Route und möglicherweise Ticketgültigkeit; erst nach Prüfung des Reisetags zugesagt.',
          },
        },
        {
          id: 'lunch',
          heading: {
            en: 'Lunch at Rigi Kulm',
            de: 'Mittagessen auf Rigi Kulm',
          },
          body: {
            en: 'Lunch is optional, is paid separately and is not reserved for you.\n\nRigi Kulm-Hotel, self-service restaurant: Swiss dishes; the operator lists hot food until 15:30. Confirm the full opening hours for your date before you book.\nÀ la carte restaurant: Lunch service at weekends, 11:30–14:00; on weekdays dinner service for hotel guests. A daily à la carte lunch is not promised.',
            de: 'Das Mittagessen ist optional, wird separat bezahlt und nicht für Sie reserviert.\n\nRigi Kulm-Hotel, Selbstbedienungsrestaurant: Schweizer Gerichte; die Betreiberseite nennt warme Speisen bis 15:30. Die vollständigen tagesaktuellen Öffnungszeiten vor Buchung bestätigen.\nÀ-la-carte-Restaurant: Am Wochenende Mittagservice 11:30–14:00; werktags Abendservice für Hotelgäste. Ein tägliches À-la-carte-Mittagessen wird nicht versprochen.',
          },
        },
      ],
    },
    stops: [
      {
        latitude: 47.051,
        longitude: 8.3112,
        title: {
          en: 'Luzerne landing stages',
          de: 'Luzerner Landungsbrücken',
        },
        text: {
          en: 'Meet near the landing stages. SGV normally lists Pier 1 for Vitznau; your guide checks the pier and the service before the day.',
          de: 'Treffpunkt bei den Landungsbrücken. Für Vitznau nennt SGV normalerweise Steg 1; Ihre Führung prüft Steg und Kurs vor dem Tag.',
        },
        minutesFromStart: 0,
      },
      {
        latitude: 47.00912,
        longitude: 8.48466,
        title: {
          en: 'Vitznau',
          de: 'Vitznau',
        },
        text: {
          en: 'The boat takes about an hour across the lake. At Vitznau you walk to the railway boarding point and change to the cogwheel train, with a deliberate buffer.',
          de: 'Die Schifffahrt über den See dauert ungefähr eine Stunde. In Vitznau gehen Sie zu Fuss zum Bahneinstieg und steigen mit bewusstem Puffer in die Zahnradbahn um.',
        },
        minutesFromStart: 75,
      },
      {
        latitude: 47.05569,
        longitude: 8.4847,
        title: {
          en: 'Rigi Kulm',
          de: 'Rigi Kulm',
        },
        text: {
          en: 'Short walks to suitable viewpoints with guided interpretation, then lunch in the self-service restaurant of the Rigi Kulm-Hotel.',
          de: 'Kurze Wege zu geeigneten Aussichtspunkten mit erzählerischer Führung, dann Mittagessen im Selbstbedienungsrestaurant des Rigi Kulm-Hotels.',
        },
        minutesFromStart: 135,
      },
      {
        latitude: 47.0447,
        longitude: 8.46618,
        title: {
          en: 'Rigi Kaltbad',
          de: 'Rigi Kaltbad',
        },
        text: {
          en: 'A short stay near the station on the way down. The section from Kulm to Kaltbad is by train, not on foot. No spa booking is included.',
          de: 'Ein kurzer Aufenthalt nahe dem Bahnhof auf dem Rückweg. Der Abschnitt von Kulm nach Kaltbad wird mit der Bahn gefahren, nicht zu Fuss. Es ist keine Spa-Buchung enthalten.',
        },
        minutesFromStart: 270,
      },
    ],
  },
]
