import type { Article, ArticleComment } from "./types";

import { demoAt } from "@/features/demo/clock";

/**
 * Stories for C19, C20 and M17 (outline §4). Written as inspiration in the shop's voice,
 * not as a guest's testimony, and they link only published gifts and tours (PRD §11).
 * Facts are the widely published history of each place; the shop should check the wording
 * before launch. Three stories exist in both languages and share a slug (D6); the water
 * tower is EN only, Luzern bei Nacht is DE only, and the Pilatus story is a DE draft.
 * Five more sights (Weinmarkt, Spreuer Bridge, Needle Dam, old pharmacy, Hammetschwand lift)
 * exist in both languages; their sources are in docs/content/local-stories/README.md.
 * Blog layout (4.4): each version has a staff author, a lead paragraph and 2–4 sections.
 * The EN and DE versions of a story share section ids and block order. Inline photos come
 * from src/assets/photos, never repeat the cover, and their captions say what the photo
 * shows. Only the Musegg story has a video and an audio clip; the clip is a sample
 * recording, not the Zyt tower, and its caption says so.
 */
export const articleSeed: Article[] = [
  {
    id: "musegg-morning-en",
    slug: "musegg-morning",
    language: "en",
    title: "A morning on the Musegg wall",
    excerpt:
      "Climb the old town wall before the city wakes up, and see Luzerne laid out between the lake and the hills.",
    author: { name: "Sonja", role: "Owner, Swiss Keepsakes Luzern" },
    intro:
      "The Musegg wall runs along the hill above the old town. It was built in the late 14th century to guard Luzerne from the north, and long stretches of it still stand.",
    sections: [
      {
        id: "on-the-wall",
        heading: "Up on the wall at dawn",
        blocks: [
          {
            type: "paragraph",
            text: "Go early, before the city wakes up. In the first hour you may have the wall almost to yourself.",
          },
          {
            type: "paragraph",
            text: "From the walkway the roofs of the old town fall away towards the river, and on a clear day the lake and the mountains fill the horizon.",
          },
          {
            type: "image",
            photo: "lucerne-kapellbruecke-1200",
            caption:
              "The Water Tower and the Chapel Bridge on the Reuss, with Pilatus behind.",
          },
        ],
      },
      {
        id: "nine-towers",
        heading: "The nine towers",
        blocks: [
          {
            type: "paragraph",
            text: "Nine towers are spaced along the wall, each with its own name. In the warmer months four of them are open to visitors, and you can climb up inside.",
          },
          {
            type: "video",
            youtubeId: "0UHyzRnAxy8",
            title: "Luzerne city wall with 9 Musegg towers",
            caption:
              "Video: Private Luxury Travel Switzerland by Brigitte, on YouTube.",
          },
        ],
      },
      {
        id: "first-clock",
        heading: "The clock that strikes first",
        blocks: [
          {
            type: "paragraph",
            text: "Listen for the Zyt tower. Its clock is the oldest in town, and by tradition it may strike one minute before every other clock in Luzerne.",
          },
          {
            type: "audio",
            audio: "tower-clock",
            title: "A tower clock strikes five",
            caption:
              "Sample recording of a church clock in France (CC0), not the Zyt tower.",
          },
        ],
      },
      {
        id: "old-town",
        heading: "Back down into the old town",
        blocks: [
          {
            type: "paragraph",
            text: "On the way down, the lanes behind the wall lead straight back into the old town. If you would like to take the view home, our postcard set starts at the Musegg towers, and the old-town walk stops at the wall.",
          },
          {
            type: "image",
            photo: "lucerne-old-town",
            caption: "Painted facades on Hirschenplatz in the old town.",
          },
        ],
      },
    ],
    photo: "musegg-wall",
    category: "town",
    place: "Old Town",
    readMinutes: 4,
    links: [{ kind: "gift", id: "p-postcards" }],
    related: ["water-tower", "lion-monument"],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -12, hours: -1 }),
    },
    updatedAt: demoAt({ days: -12, hours: -1 }),
  },
  {
    id: "musegg-morning-de",
    slug: "musegg-morning",
    language: "de",
    title: "Ein Morgen auf der Museggmauer",
    excerpt:
      "Steigen Sie auf die alte Stadtmauer, bevor die Stadt erwacht, und sehen Sie Luzern zwischen See und Hügeln.",
    author: { name: "Sonja", role: "Inhaberin, Swiss Keepsakes Luzern" },
    intro:
      "Die Museggmauer zieht sich über den Hügel oberhalb der Altstadt. Sie wurde im späten 14. Jahrhundert gebaut, um Luzern gegen Norden zu schützen, und lange Abschnitte stehen bis heute.",
    sections: [
      {
        id: "on-the-wall",
        heading: "Frühmorgens auf der Mauer",
        blocks: [
          {
            type: "paragraph",
            text: "Gehen Sie früh, bevor die Stadt erwacht. In der ersten Stunde haben Sie die Mauer oft fast für sich allein.",
          },
          {
            type: "paragraph",
            text: "Vom Wehrgang fallen die Dächer der Altstadt zum Fluss hin ab, und an klaren Tagen füllen See und Berge den Horizont.",
          },
          {
            type: "image",
            photo: "lucerne-kapellbruecke-1200",
            caption:
              "Wasserturm und Kapellbrücke an der Reuss, dahinter der Pilatus.",
          },
        ],
      },
      {
        id: "nine-towers",
        heading: "Die neun Türme",
        blocks: [
          {
            type: "paragraph",
            text: "Neun Türme stehen entlang der Mauer, jeder mit seinem eigenen Namen. In der warmen Jahreszeit sind vier von ihnen für Besucher geöffnet, und Sie können im Inneren hinaufsteigen.",
          },
          {
            type: "video",
            youtubeId: "0UHyzRnAxy8",
            title: "Luzerne city wall with 9 Musegg towers",
            caption:
              "Video: Private Luxury Travel Switzerland by Brigitte, auf YouTube.",
          },
        ],
      },
      {
        id: "first-clock",
        heading: "Die Uhr, die zuerst schlägt",
        blocks: [
          {
            type: "paragraph",
            text: "Achten Sie auf den Zytturm. Seine Uhr ist die älteste der Stadt, und nach alter Tradition darf sie eine Minute vor allen anderen Uhren Luzerns schlagen.",
          },
          {
            type: "audio",
            audio: "tower-clock",
            title: "Eine Turmuhr schlägt fünf",
            caption:
              "Beispielaufnahme einer Kirchturmuhr in Frankreich (CC0), nicht der Zytturm.",
          },
        ],
      },
      {
        id: "old-town",
        heading: "Hinunter in die Altstadt",
        blocks: [
          {
            type: "paragraph",
            text: "Auf dem Rückweg führen die Gassen hinter der Mauer direkt zurück in die Altstadt. Wer die Aussicht mit nach Hause nehmen möchte: Unser Postkartenset beginnt bei den Musegg-Türmen, und der Altstadtspaziergang macht Halt an der Mauer.",
          },
          {
            type: "image",
            photo: "lucerne-old-town",
            caption: "Bemalte Fassaden am Hirschenplatz in der Altstadt.",
          },
        ],
      },
    ],
    photo: "musegg-wall",
    category: "town",
    place: "Altstadt",
    readMinutes: 4,
    links: [{ kind: "gift", id: "p-postcards" }],
    related: ["luzern-bei-nacht", "lion-monument"],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -11, hours: -1 }),
    },
    updatedAt: demoAt({ days: -11, hours: -1 }),
  },
  {
    id: "lion-monument-en",
    slug: "lion-monument",
    language: "en",
    title: "The story behind the Lion Monument",
    excerpt:
      "A dying lion carved into the rock, and the Swiss guards he remembers.",
    author: { name: "Sonja", role: "Owner, Swiss Keepsakes Luzern" },
    intro:
      "A short walk from the old town, a lion lies carved into a sandstone cliff above a small, still pond. He is wounded, a broken spear in his side, one paw resting on a shield. Most people fall quiet when they first see him.",
    sections: [
      {
        id: "who-he-remembers",
        heading: "Who the lion remembers",
        blocks: [
          {
            type: "paragraph",
            text: "The monument remembers the Swiss Guards who died in Paris in 1792, defending the Tuileries Palace during the French Revolution. Many of them came from central Switzerland. The Latin words above the lion honour their loyalty and courage.",
          },
        ],
      },
      {
        id: "carved-in-rock",
        heading: "Carved into the rock",
        blocks: [
          {
            type: "paragraph",
            text: "It was designed by the Danish sculptor Bertel Thorvaldsen and carved into the rock in 1820 and 1821. The writer Mark Twain later described it as the saddest and most moving piece of stone in the world.",
          },
        ],
      },
      {
        id: "early-or-late",
        heading: "Early or late in the day",
        blocks: [
          {
            type: "paragraph",
            text: "Come early in the morning or towards evening, when the tour groups have moved on, and sit by the water for a few minutes: the lion is best seen slowly. If you understand German, our lantern walk through the old town by night starts at the Water Tower and ends here.",
          },
          {
            type: "image",
            photo: "lucerne-night",
            caption: "The Water Tower and the Chapel Bridge lit up at dusk.",
          },
        ],
      },
    ],
    photo: "lion-monument",
    category: "town",
    place: "Löwenplatz",
    readMinutes: 6,
    links: [],
    related: ["musegg-morning"],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -10, hours: -1 }),
    },
    updatedAt: demoAt({ days: -10, hours: -1 }),
  },
  {
    id: "lion-monument-de",
    slug: "lion-monument",
    language: "de",
    title: "Die Geschichte hinter dem Löwendenkmal",
    excerpt:
      "Ein sterbender Löwe im Fels und die Schweizer Gardisten, an die er erinnert.",
    author: { name: "Sonja", role: "Inhaberin, Swiss Keepsakes Luzern" },
    intro:
      "Ein paar Gehminuten von der Altstadt entfernt liegt ein Löwe, in eine Sandsteinwand gehauen, über einem kleinen, stillen Teich. Er ist verwundet, ein abgebrochener Speer steckt in seiner Seite, eine Pranke ruht auf einem Schild. Die meisten werden still, wenn sie ihn zum ersten Mal sehen.",
    sections: [
      {
        id: "who-he-remembers",
        heading: "An wen der Löwe erinnert",
        blocks: [
          {
            type: "paragraph",
            text: "Das Denkmal erinnert an die Schweizergardisten, die 1792 in Paris bei der Verteidigung des Tuilerienpalasts während der Französischen Revolution starben. Viele von ihnen stammten aus der Innerschweiz. Die lateinische Inschrift über dem Löwen ehrt ihre Treue und Tapferkeit.",
          },
        ],
      },
      {
        id: "carved-in-rock",
        heading: "In den Fels gehauen",
        blocks: [
          {
            type: "paragraph",
            text: "Entworfen hat es der dänische Bildhauer Bertel Thorvaldsen, in den Fels gehauen wurde es 1820 und 1821. Der Schriftsteller Mark Twain beschrieb es später als das traurigste und bewegendste Stück Stein der Welt.",
          },
        ],
      },
      {
        id: "early-or-late",
        heading: "Früh am Morgen oder gegen Abend",
        blocks: [
          {
            type: "paragraph",
            text: "Kommen Sie am frühen Morgen oder gegen Abend, wenn die Reisegruppen weitergezogen sind, und setzen Sie sich ein paar Minuten ans Wasser: Den Löwen sieht man am besten in Ruhe. Unser Laternenspaziergang «Luzern bei Nacht» beginnt beim Wasserturm und endet hier.",
          },
          {
            type: "image",
            photo: "lucerne-night",
            caption:
              "Der beleuchtete Wasserturm und die Kapellbrücke in der Abenddämmerung.",
          },
        ],
      },
    ],
    photo: "lion-monument",
    category: "town",
    place: "Löwenplatz",
    readMinutes: 6,
    links: [],
    related: ["luzern-bei-nacht", "musegg-morning"],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -10 }),
    },
    updatedAt: demoAt({ days: -10 }),
  },
  {
    id: "lake-steamboat-en",
    slug: "lake-steamboat",
    language: "en",
    title: "Crossing the lake by steamboat",
    excerpt:
      "Paddle wheels, polished brass and a slow way to watch the mountains rise out of the water.",
    author: { name: "Sonja", role: "Owner, Swiss Keepsakes Luzern" },
    intro:
      "Lake Luzerne still has a fleet of paddle steamers, the oldest of them more than a hundred years old. They carry you from the middle of town to the villages along the shore.",
    sections: [
      {
        id: "from-the-station",
        heading: "From the station pier",
        blocks: [
          {
            type: "paragraph",
            text: "The boats leave from the piers in front of the station, a few minutes’ walk from the Chapel Bridge. Within minutes of casting off, the town grows small behind you.",
          },
          {
            type: "image",
            photo: "lucerne-water-tower",
            caption:
              "The Water Tower and the Chapel Bridge, where the Reuss leaves the lake.",
          },
        ],
      },
      {
        id: "engine-room",
        heading: "A look into the engine room",
        blocks: [
          {
            type: "paragraph",
            text: "Find the spot where you can look down into the engine room. The pistons turn slowly and steadily, the brass shines, and children often stay there for most of the crossing.",
          },
        ],
      },
      {
        id: "out-on-the-lake",
        heading: "Out on the lake",
        blocks: [
          {
            type: "paragraph",
            text: "Out on the water the lake opens up, one arm after another. Mountains rise straight from the shore, villages sit at the water’s edge, and the light changes every few minutes. Bring a jacket even on a warm day; the wind on deck is cool.",
          },
        ],
      },
      {
        id: "step-off",
        heading: "Step off where you like",
        blocks: [
          {
            type: "paragraph",
            text: "There is no need to plan every stop. Sail for an hour, step off in a village that looks inviting and take a later boat back. Check the timetable first, as fewer boats run in winter. Our lakeside candle box comes with two postcards of the lake, and our lake tour adds stories from the shore.",
          },
        ],
      },
    ],
    photo: "lake-steamboat",
    category: "lake",
    place: "Lakefront",
    readMinutes: 5,
    links: [{ kind: "gift", id: "p-candle-box" }],
    related: [],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -8, hours: -1 }),
    },
    updatedAt: demoAt({ days: -8, hours: -1 }),
  },
  {
    id: "lake-steamboat-de",
    slug: "lake-steamboat",
    language: "de",
    title: "Mit dem Dampfschiff über den See",
    excerpt:
      "Schaufelräder, glänzendes Messing und eine langsame Art, die Berge aus dem Wasser steigen zu sehen.",
    author: { name: "Sonja", role: "Inhaberin, Swiss Keepsakes Luzern" },
    intro:
      "Auf dem Vierwaldstättersee fahren noch immer Raddampfer, der älteste von ihnen ist mehr als hundert Jahre alt. Sie bringen Sie von der Stadtmitte zu den Dörfern am Ufer.",
    sections: [
      {
        id: "from-the-station",
        heading: "Ab dem Steg beim Bahnhof",
        blocks: [
          {
            type: "paragraph",
            text: "Die Schiffe legen an den Stegen vor dem Bahnhof ab, wenige Gehminuten von der Kapellbrücke entfernt. Schon kurz nach dem Ablegen wird die Stadt hinter Ihnen klein.",
          },
          {
            type: "image",
            photo: "lucerne-water-tower",
            caption:
              "Wasserturm und Kapellbrücke, wo die Reuss aus dem See fliesst.",
          },
        ],
      },
      {
        id: "engine-room",
        heading: "Ein Blick in den Maschinenraum",
        blocks: [
          {
            type: "paragraph",
            text: "Suchen Sie die Stelle, von der Sie in den Maschinenraum hinunterschauen können. Die Kolben bewegen sich langsam und gleichmässig, das Messing glänzt, und Kinder bleiben dort oft fast die ganze Fahrt.",
          },
        ],
      },
      {
        id: "out-on-the-lake",
        heading: "Draussen auf dem See",
        blocks: [
          {
            type: "paragraph",
            text: "Draussen auf dem Wasser öffnet sich der See, ein Arm nach dem anderen. Die Berge steigen direkt vom Ufer auf, Dörfer liegen am Wasser, und das Licht ändert sich alle paar Minuten. Nehmen Sie auch an warmen Tagen eine Jacke mit, der Wind an Deck ist kühl.",
          },
        ],
      },
      {
        id: "step-off",
        heading: "Aussteigen, wo es Ihnen gefällt",
        blocks: [
          {
            type: "paragraph",
            text: "Sie müssen nicht jeden Halt planen. Fahren Sie eine Stunde hinaus, steigen Sie in einem Dorf aus, das Ihnen gefällt, und nehmen Sie ein späteres Schiff zurück. Werfen Sie vorher einen Blick auf den Fahrplan, denn im Winter fahren weniger Schiffe. Unsere Kerzenbox Seeufer enthält zwei Postkarten vom See, und unsere Seetour ergänzt die Aussicht mit Geschichten vom Ufer.",
          },
        ],
      },
    ],
    photo: "lake-steamboat",
    category: "lake",
    place: "Seebecken",
    readMinutes: 5,
    links: [{ kind: "gift", id: "p-candle-box" }],
    related: [],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -8 }),
    },
    updatedAt: demoAt({ days: -8 }),
  },
  // English only: in DE, C19 leaves it out and C20 shows it with a language notice (D6).
  {
    id: "water-tower-en",
    slug: "water-tower",
    language: "en",
    title: "The Water Tower, older than the bridge",
    excerpt:
      "The stone tower in the river was guarding Luzerne before the Chapel Bridge was built.",
    author: { name: "Sonja", role: "Owner, Swiss Keepsakes Luzern" },
    intro:
      "The eight-sided stone tower beside the Chapel Bridge is older than the bridge itself. It stood in the river as part of the town’s defences, and over the centuries it served as an archive, a treasury and a prison.",
    sections: [
      {
        id: "the-name",
        heading: "Where the name comes from",
        blocks: [
          {
            type: "paragraph",
            text: "Its name has nothing to do with drinking water. It is simply the tower that stands in the water, where the Reuss leaves the lake.",
          },
          {
            type: "image",
            photo: "lucerne-kapellbruecke-1200",
            caption: "The Water Tower in the Reuss, with Pilatus behind.",
          },
        ],
      },
      {
        id: "at-dawn",
        heading: "At dawn on the river",
        blocks: [
          {
            type: "paragraph",
            text: "Come at dawn, when the river is still and the tower’s reflection lies almost unbroken on the water. The bridge is quiet then, and you can look up at the painted panels under its roof without the crowds.",
          },
          {
            type: "image",
            photo: "lucerne-night",
            caption:
              "The tower and the bridge lit up at dusk, reflected in the river.",
          },
        ],
      },
      {
        id: "our-gifts",
        heading: "On two of our gifts",
        blocks: [
          {
            type: "paragraph",
            text: "The tower appears on two of our gifts: a limited-edition print of the tower at dawn, and the Victorinox Chapel Bridge knife, with your name engraved on the back. The old-town walk starts at the bridge.",
          },
        ],
      },
    ],
    photo: "lucerne-water-tower",
    category: "town",
    place: "Chapel Bridge",
    readMinutes: 3,
    links: [
      { kind: "tour", id: "things-that-remain" },
      { kind: "gift", id: "p-print" },
      { kind: "gift", id: "p-vx-chapel-bridge" },
    ],
    related: [],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -6, hours: -1 }),
    },
    updatedAt: demoAt({ days: -6, hours: -1 }),
  },
  // Five sight stories from the client's local-content message (16 Oct 2026), researched and
  // fact-checked against the city, the venues and the Swiss National Museum. Where the client
  // text differed from the sources it was corrected: see
  // client-resources/Lucerne_Local_Stories_Sights_and_Dining.md and docs/content/local-stories/.
  {
    id: "weinmarkt-oath-en",
    slug: "weinmarkt-oath",
    language: "en",
    title: "The square where Luzerne swore its oath",
    excerpt:
      "A fish market, a fountain and a row of painted houses: the Weinmarkt is where the town promised to join the Swiss Confederation.",
    author: { name: "Sonja", role: "Owner, Swiss Keepsakes Luzern" },
    intro:
      "Most visitors cross the Weinmarkt on the way to somewhere else. It is worth stopping. This small cobbled square is where the people of Luzerne are said to have gathered in 1332 to swear their alliance with Uri, Schwyz and Unterwalden.",
    sections: [
      {
        id: "the-oath",
        heading: "An oath in 1332",
        blocks: [
          {
            type: "paragraph",
            text: "In 1332 Luzerne joined the three founding cantons of the Swiss Confederation, and the town’s tourist office places the oath on this square. It was the first town to join the three rural cantons, which turned a small trading town on a lake into part of something much larger.",
          },
        ],
      },
      {
        id: "fish-and-market-hall",
        heading: "From fish market to open square",
        blocks: [
          {
            type: "paragraph",
            text: "Until the middle of the 16th century this was Luzerne’s fish market. Later a two-storey wooden market hall stood here, where butchers, bakers and leather sellers had their stalls. It was pulled down in 1841, and the square took the open shape you see today.",
          },
          {
            type: "image",
            photo: "hirschenplatz",
            caption:
              "Hirschenplatz, a few steps away: another old-town square lined with painted houses.",
          },
        ],
      },
      {
        id: "the-fountain",
        heading: "The fountain, and a copy",
        blocks: [
          {
            type: "paragraph",
            text: "The Weinmarkt fountain was made in 1481 by Konrad Lux, who worked on it for about ten years. The stone column you see today is not that one. The original is kept indoors, in the Historical Museum on Pfistergasse, and the column on the square was carved later by Leopold Häfliger.",
          },
        ],
      },
      {
        id: "look-up",
        heading: "Look up",
        blocks: [
          {
            type: "paragraph",
            text: "The houses around the square are decorated with painted façades, so give yourself a minute to look up at the first floors. One of them, on the former Alte Apotheke, carries a painting by Seraphin Weingartner. Early in the morning, before the shops open, the square is quiet and the colours are at their best.",
          },
          {
            type: "paragraph",
            text: "Our Old Town print shows these houses, and the Luzerne in 90 minutes walk passes the square on its way through the old town.",
          },
        ],
      },
    ],
    photo: "weinmarkt",
    category: "town",
    place: "Weinmarkt",
    readMinutes: 3,
    links: [
      { kind: "gift", id: "p-old-town-print" },
      { kind: "tour", id: "things-that-remain" },
    ],
    related: ["water-tower", "spreuer-bridge"],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -9 }),
    },
    updatedAt: demoAt({ days: -9 }),
  },
  {
    id: "weinmarkt-oath-de",
    slug: "weinmarkt-oath",
    language: "de",
    title: "Der Platz, auf dem Luzern seinen Eid schwor",
    excerpt:
      "Ein Fischmarkt, ein Brunnen und bemalte Häuser: Auf dem Weinmarkt versprach die Stadt, der Eidgenossenschaft beizutreten.",
    author: { name: "Sonja", role: "Inhaberin, Swiss Keepsakes Luzern" },
    intro:
      "Die meisten gehen über den Weinmarkt auf dem Weg zu etwas anderem. Es lohnt sich, stehen zu bleiben. Auf diesem kleinen Kopfsteinplatz sollen sich die Luzernerinnen und Luzerner 1332 versammelt haben, um den Bund mit Uri, Schwyz und Unterwalden zu beschwören.",
    sections: [
      {
        id: "the-oath",
        heading: "Ein Eid im Jahr 1332",
        blocks: [
          {
            type: "paragraph",
            text: "1332 trat Luzern dem Bund der drei Urkantone bei, und Luzern Tourismus verlegt den Schwur auf diesen Platz. Es war die erste Stadt, die sich den drei Länderorten anschloss, und aus einer kleinen Handelsstadt am See wurde so Teil von etwas viel Grösserem.",
          },
        ],
      },
      {
        id: "fish-and-market-hall",
        heading: "Vom Fischmarkt zum offenen Platz",
        blocks: [
          {
            type: "paragraph",
            text: "Bis Mitte des 16. Jahrhunderts war hier der Luzerner Fischmarkt. Später stand eine zweistöckige hölzerne Markthalle auf dem Platz, in der Metzger, Bäcker und Ledersteller ihre Stände hatten. 1841 wurde sie abgebrochen, und der Platz erhielt die offene Form, die man heute sieht.",
          },
          {
            type: "image",
            photo: "hirschenplatz",
            caption:
              "Der Hirschenplatz, wenige Schritte entfernt: ein weiterer Altstadtplatz mit bemalten Häusern.",
          },
        ],
      },
      {
        id: "the-fountain",
        heading: "Der Brunnen und seine Kopie",
        blocks: [
          {
            type: "paragraph",
            text: "Den Weinmarktbrunnen schuf 1481 Konrad Lux, der rund zehn Jahre daran arbeitete. Die Steinsäule, die heute dort steht, ist nicht dieselbe. Das Original steht im Haus, im Historischen Museum an der Pfistergasse, und die Säule auf dem Platz hat später Leopold Häfliger gehauen.",
          },
        ],
      },
      {
        id: "look-up",
        heading: "Schauen Sie nach oben",
        blocks: [
          {
            type: "paragraph",
            text: "Die Häuser rund um den Platz tragen bemalte Fassaden, nehmen Sie sich also eine Minute und schauen Sie in die ersten Stockwerke. Eines davon, an der ehemaligen Alten Apotheke, zeigt ein Gemälde von Seraphin Weingartner. Am frühen Morgen, bevor die Läden öffnen, ist der Platz still, und die Farben kommen am besten zur Geltung.",
          },
          {
            type: "paragraph",
            text: "Unser Altstadt-Druck zeigt diese Häuser, und der Spaziergang «Luzern in 90 Minuten» führt auf seinem Weg durch die Altstadt über den Platz.",
          },
        ],
      },
    ],
    photo: "weinmarkt",
    category: "town",
    place: "Weinmarkt",
    readMinutes: 3,
    links: [
      { kind: "gift", id: "p-old-town-print" },
      { kind: "tour", id: "things-that-remain" },
    ],
    related: ["luzern-bei-nacht", "spreuer-bridge"],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -9 }),
    },
    updatedAt: demoAt({ days: -9 }),
  },
  {
    id: "spreuer-bridge-en",
    slug: "spreuer-bridge",
    language: "en",
    title: "Under the Dance of Death on the Spreuer Bridge",
    excerpt:
      "Luzerne’s quieter wooden bridge carries 45 triangular paintings in its roof, and in every one of them Death is somewhere in the crowd.",
    author: { name: "Sonja", role: "Owner, Swiss Keepsakes Luzern" },
    intro:
      "Everyone photographs the Chapel Bridge. A few hundred metres downstream there is a second covered wooden bridge, plainer and much quieter, and its roof is the more unusual gallery. Look up when you cross it.",
    sections: [
      {
        id: "a-bridge-for-the-mills",
        heading: "A bridge for the mills",
        blocks: [
          {
            type: "paragraph",
            text: "The Spreuer Bridge crossed the Reuss as a complete bridge by 1408, and it was part of the town’s defences as well as a way to the mills. Its name comes from them: Spreu is chaff, the husk left over from milling, and the millers tipped it from the bridge into the river. Its southern wing dates from 1408, and since the 1993 fire on the Chapel Bridge it has been the oldest surviving covered wooden bridge in Switzerland.",
          },
          {
            type: "image",
            photo: "nadelwehr",
            caption:
              "The needle dam upstream of the Spreuer Bridge, seen across the Reuss.",
          },
        ],
      },
      {
        id: "the-paintings",
        heading: "45 paintings, one theme",
        blocks: [
          {
            type: "paragraph",
            text: "Under the roof hang triangular wooden panels, painted in the 17th century, mostly under the direction of Kaspar Meglinger, with help from other Luzerne painters. They belong to the tradition of the Dance of Death: scenes in which Death meets people of every rank, from the pope and the emperor to the child, the doctor, the farmer and the beggar. The cycle once had about seventy panels. When the bridge was shortened in 1785, some were lost, and 45 remain.",
          },
          {
            type: "image",
            photo: "spreuer-totentanz",
            caption:
              "One of the Dance of Death panels under the roof of the Spreuer Bridge.",
          },
        ],
      },
      {
        id: "death-in-the-crowd",
        heading: "Death in the crowd",
        blocks: [
          {
            type: "paragraph",
            text: "What makes the Luzerne cycle special is that Death does not drag people away in a dance. He walks among them, usually recognisable only by his skull: he leads the priest ahead of the Host as a sexton with a bell and a lantern, and he sits among the judges in court. Many of the faces are portraits of the people who paid for a panel. The verses on the black frames are not always easy to read, but the scenes are clear.",
          },
        ],
      },
      {
        id: "the-small-chapel",
        heading: "The little chapel in the middle",
        blocks: [
          {
            type: "paragraph",
            text: "About halfway across you pass a small chapel, called Maria auf der Reuss, which began in 1568 as a simple shelter against wind and weather. Come on a weekday morning, when it is quiet, and walk across slowly. The river runs loudly beside you the whole way, which suits the subject.",
          },
        ],
      },
    ],
    photo: "spreuer-bridge",
    category: "town",
    place: "River Reuss",
    readMinutes: 5,
    links: [{ kind: "tour", id: "things-that-remain" }],
    related: ["water-tower", "needle-dam"],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -7 }),
    },
    updatedAt: demoAt({ days: -7 }),
  },
  {
    id: "spreuer-bridge-de",
    slug: "spreuer-bridge",
    language: "de",
    title: "Unter dem Totentanz auf der Spreuerbrücke",
    excerpt:
      "Luzerns stillere Holzbrücke trägt 45 dreieckige Bilder im Dach, und auf jedem ist der Tod irgendwo in der Menge.",
    author: { name: "Sonja", role: "Inhaberin, Swiss Keepsakes Luzern" },
    intro:
      "Alle fotografieren die Kapellbrücke. Ein paar hundert Meter flussabwärts gibt es eine zweite gedeckte Holzbrücke, schlichter und viel ruhiger, und ihr Dach ist die ungewöhnlichere Galerie. Schauen Sie nach oben, wenn Sie hinübergehen.",
    sections: [
      {
        id: "a-bridge-for-the-mills",
        heading: "Eine Brücke für die Mühlen",
        blocks: [
          {
            type: "paragraph",
            text: "Die Spreuerbrücke führte 1408 als vollständige Brücke über die Reuss, und sie gehörte zur Stadtbefestigung ebenso wie zu den Mühlen. Von ihnen hat sie den Namen: Spreu sind die Hülsen, die beim Mahlen übrig bleiben, und die Müller kippten sie von der Brücke in den Fluss. Der Südflügel stammt von 1408, und seit dem Brand der Kapellbrücke 1993 ist er die älteste erhaltene gedeckte Holzbrücke der Schweiz.",
          },
          {
            type: "image",
            photo: "nadelwehr",
            caption:
              "Das Nadelwehr oberhalb der Spreuerbrücke, über die Reuss gesehen.",
          },
        ],
      },
      {
        id: "the-paintings",
        heading: "45 Bilder, ein Thema",
        blocks: [
          {
            type: "paragraph",
            text: "Unter dem Dach hängen dreieckige Holztafeln, im 17. Jahrhundert gemalt, grösstenteils unter der Leitung von Kaspar Meglinger, mit Hilfe weiterer Luzerner Maler. Sie gehören zur Tradition des Totentanzes: Szenen, in denen der Tod Menschen aller Stände begegnet, vom Papst und vom Kaiser bis zum Kind, zum Arzt, zum Bauern und zum Bettler. Ursprünglich hatte der Zyklus rund siebzig Tafeln. Als die Brücke 1785 verkürzt wurde, gingen einige verloren, 45 sind erhalten.",
          },
          {
            type: "image",
            photo: "spreuer-totentanz",
            caption:
              "Eine der Totentanz-Tafeln unter dem Dach der Spreuerbrücke.",
          },
        ],
      },
      {
        id: "death-in-the-crowd",
        heading: "Der Tod mitten unter den Leuten",
        blocks: [
          {
            type: "paragraph",
            text: "Das Besondere am Luzerner Totentanz ist, dass der Tod die Menschen nicht im Reigen davonführt. Er geht mitten unter ihnen, meist nur am Totenschädel zu erkennen: Er führt als Sigrist mit Glocke und Laterne den Pfarrer mit der Monstranz an, und er sitzt mitten unter den Richtern im Gericht. Viele Gesichter sind Porträts der Menschen, die eine Tafel gestiftet haben. Die Verse auf den schwarzen Rahmen sind nicht immer leicht zu lesen, die Szenen aber sind deutlich.",
          },
        ],
      },
      {
        id: "the-small-chapel",
        heading: "Die kleine Kapelle in der Mitte",
        blocks: [
          {
            type: "paragraph",
            text: "Etwa auf halber Strecke kommen Sie an einer kleinen Kapelle vorbei, «Maria auf der Reuss». Sie begann 1568 als einfacher Unterstand gegen Wind und Wetter. Kommen Sie an einem Werktagmorgen, wenn es ruhig ist, und gehen Sie langsam hinüber. Die Reuss rauscht die ganze Zeit neben Ihnen, was zum Thema passt.",
          },
        ],
      },
    ],
    photo: "spreuer-bridge",
    category: "town",
    place: "Reuss",
    readMinutes: 5,
    links: [{ kind: "tour", id: "things-that-remain" }],
    related: ["luzern-bei-nacht", "needle-dam"],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -7 }),
    },
    updatedAt: demoAt({ days: -7 }),
  },
  {
    id: "needle-dam-en",
    slug: "needle-dam",
    language: "en",
    title: "The wooden needles that hold back a lake",
    excerpt:
      "Since 1861, Luzerne has controlled the level of Lake Luzerne with timber needles, set into the Reuss by hand.",
    author: { name: "Sonja", role: "Owner, Swiss Keepsakes Luzern" },
    intro:
      "From the Spreuer Bridge, look upstream. Across the river stands a long row of thin wooden beams, and behind it the whole of Lake Luzerne. This is the Needle Dam, and it still works much as it did in 1861.",
    sections: [
      {
        id: "why-a-weir",
        heading: "Why Luzerne needed a weir",
        blocks: [
          {
            type: "paragraph",
            text: "The Reuss is the only outlet of Lake Luzerne, and for centuries the lake flooded the town in wet years. After the great flood of 1821 the cantons around the lake quarrelled with Luzerne over who was to blame. They finally agreed on a new weir in 1858, together with the railway company, and it was built between 1859 and 1861 on the model of the French engineer Charles Poirée’s needle weirs. Rules for opening and closing it followed in 1867.",
          },
        ],
      },
      {
        id: "how-it-works",
        heading: "How the needles work",
        blocks: [
          {
            type: "paragraph",
            text: "Each needle is a wooden beam about 3.5 metres long and weighing around 30 kilograms. The weir across the river holds 189 of them, and a second, longer weir along the bank holds about 500 more. To raise the lake, the crew sets needles against iron trestles. To lower it, they pull them out. The lake is kept within a band of just over half a metre.",
          },
          {
            type: "image",
            photo: "spreuer-bridge",
            caption:
              "The needle dam in the Reuss, with the Spreuer Bridge behind it.",
          },
        ],
      },
      {
        id: "a-working-year",
        heading: "A year at the weir",
        blocks: [
          {
            type: "paragraph",
            text: "In winter the weir is mostly closed. In May and June, when the snow melts in the mountains, it is usually fully open, and August is the unpredictable month, when heavy rain can force the crew to open it quickly. In August 2005 a flood tore away much of the long weir, and between 2009 and 2011 the installation was renovated so that more water could leave the lake. The needles of the long weir are now set by machine, but the weir across the river is still set largely by hand, on purpose.",
          },
          {
            type: "paragraph",
            text: "Since 1998 two small turbines beside the weir also make electricity from the same water.",
          },
        ],
      },
      {
        id: "where-to-watch",
        heading: "Where to watch",
        blocks: [
          {
            type: "paragraph",
            text: "The best view is from the Spreuer Bridge. You may see the crew at work, but there is no timetable, so treat it as a piece of luck. It is a good place to stand for a few minutes and remember that the calm lake in front of the old town is held back by a few hundred wooden beams.",
          },
        ],
      },
    ],
    photo: "nadelwehr",
    category: "town",
    place: "River Reuss",
    readMinutes: 4,
    links: [],
    related: ["spreuer-bridge", "water-tower"],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -4 }),
    },
    updatedAt: demoAt({ days: -4 }),
  },
  {
    id: "needle-dam-de",
    slug: "needle-dam",
    language: "de",
    title: "Die Holznadeln, die einen See zurückhalten",
    excerpt:
      "Seit 1861 reguliert Luzern den Pegel des Vierwaldstättersees mit Holznadeln, die von Hand in die Reuss gesetzt werden.",
    author: { name: "Sonja", role: "Inhaberin, Swiss Keepsakes Luzern" },
    intro:
      "Schauen Sie von der Spreuerbrücke flussaufwärts. Quer im Fluss steht eine lange Reihe dünner Holzbalken, und dahinter liegt der ganze Vierwaldstättersee. Das ist das Nadelwehr, und es funktioniert noch fast so wie 1861.",
    sections: [
      {
        id: "why-a-weir",
        heading: "Warum Luzern ein Wehr brauchte",
        blocks: [
          {
            type: "paragraph",
            text: "Die Reuss ist der einzige Abfluss des Vierwaldstättersees, und in nassen Jahren überschwemmte der See die Stadt jahrhundertelang. Nach dem grossen Hochwasser von 1821 stritten die Kantone rund um den See mit Luzern darüber, wer schuld war. 1858 einigten sie sich mit der Eisenbahngesellschaft auf ein neues Wehr, das zwischen 1859 und 1861 nach dem Vorbild der Nadelwehre des französischen Ingenieurs Charles Poirée gebaut wurde. 1867 folgte das Reglement zum Öffnen und Schliessen.",
          },
        ],
      },
      {
        id: "how-it-works",
        heading: "So funktionieren die Nadeln",
        blocks: [
          {
            type: "paragraph",
            text: "Jede Nadel ist ein Holzbalken von rund dreieinhalb Metern Länge und etwa 30 Kilogramm Gewicht. Das Wehr quer im Fluss hat 189 davon, ein zweites, längeres Wehr entlang des Ufers rund 500 weitere. Um den See zu heben, setzt die Mannschaft Nadeln gegen eiserne Böcke. Um ihn zu senken, zieht sie sie heraus. Der Pegel bleibt in einem Band von knapp über einem halben Meter.",
          },
          {
            type: "image",
            photo: "spreuer-bridge",
            caption: "Das Nadelwehr in der Reuss, dahinter die Spreuerbrücke.",
          },
        ],
      },
      {
        id: "a-working-year",
        heading: "Ein Jahr am Wehr",
        blocks: [
          {
            type: "paragraph",
            text: "Im Winter ist das Wehr meist geschlossen. Im Mai und Juni, wenn in den Bergen der Schnee schmilzt, ist es in der Regel ganz offen, und der August ist der unberechenbare Monat, in dem starker Regen die Mannschaft zwingen kann, es schnell zu öffnen. Im August 2005 riss ein Hochwasser einen grossen Teil des langen Wehrs mit, und von 2009 bis 2011 wurde die Anlage erneuert, damit mehr Wasser aus dem See abfliessen kann. Die Nadeln des langen Wehrs werden heute maschinell gesetzt, das Wehr quer im Fluss aber wird bewusst weiterhin grösstenteils von Hand bedient.",
          },
          {
            type: "paragraph",
            text: "Seit 1998 erzeugen zwei kleine Turbinen neben dem Wehr aus demselben Wasser auch Strom.",
          },
        ],
      },
      {
        id: "where-to-watch",
        heading: "Wo man zuschauen kann",
        blocks: [
          {
            type: "paragraph",
            text: "Am besten sieht man das Wehr von der Spreuerbrücke aus. Mit etwas Glück erleben Sie die Mannschaft bei der Arbeit, einen Fahrplan gibt es aber nicht. Es ist ein guter Ort, um ein paar Minuten zu stehen und daran zu denken, dass der ruhige See vor der Altstadt von ein paar hundert Holzbalken zurückgehalten wird.",
          },
        ],
      },
    ],
    photo: "nadelwehr",
    category: "town",
    place: "Reuss",
    readMinutes: 4,
    links: [],
    related: ["spreuer-bridge", "luzern-bei-nacht"],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -4 }),
    },
    updatedAt: demoAt({ days: -4 }),
  },
  {
    id: "old-pharmacy-en",
    slug: "old-pharmacy",
    language: "en",
    title: "The pharmacy that has stayed on its corner since 1833",
    excerpt:
      "A doctor from Vienna, three generations of Suidters and a shop that still serves the neighbours on Bahnhofstrasse.",
    author: { name: "Sonja", role: "Owner, Swiss Keepsakes Luzern" },
    intro:
      "On Bahnhofstrasse, a few doors from the old Ritter Palace, there is a pharmacy with a very old name above its window: Alte Suidtersche Apotheke. It opened in 1833, and it is still a working pharmacy.",
    sections: [
      {
        id: "a-doctor-from-vienna",
        heading: "A doctor from Vienna",
        blocks: [
          {
            type: "paragraph",
            text: "Leopold Suidter was born in 1803 in Stein, in the canton of Aargau, and studied medicine in Vienna, where his father lived for a time. He came back to Switzerland in 1827. In the summer of 1832 he took over a house in Luzerne, the Cloos-Haus, and in 1833 he opened a pharmacy in it. He died in 1855, and the pharmacy has carried the family name ever since.",
          },
        ],
      },
      {
        id: "three-generations",
        heading: "Father, son, grandson",
        blocks: [
          {
            type: "paragraph",
            text: "His son Otto Suidter took the pharmacy over in 1855 and ran it until his death in 1901. The next Otto, his grandson, took over then and had the building rebuilt in 1906. Since 1937 several other pharmacists have followed one after the other. The pharmacy calls itself the oldest in Luzerne.",
          },
          {
            type: "image",
            photo: "ritter-palace",
            caption:
              "The Ritter Palace, now the cantonal government building, a few doors along Bahnhofstrasse.",
          },
        ],
      },
      {
        id: "still-open",
        heading: "Still open on Bahnhofstrasse",
        blocks: [
          {
            type: "paragraph",
            text: "This is a working pharmacy, not a museum: people come in for their prescriptions, and the staff need to be able to serve them. Look at the front from the street and, if you need something, go in as a customer. If you would like to take photos inside, ask first. It is closed on Sundays.",
          },
          {
            type: "paragraph",
            text: "It sits on the way between the Jesuit Church and the Weinmarkt, so it is easy to pass on a walk through the quieter streets of the old town.",
          },
        ],
      },
    ],
    photo: "suidter-pharmacy",
    category: "town",
    place: "Old Town",
    readMinutes: 3,
    links: [],
    related: ["weinmarkt-oath", "water-tower"],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -3 }),
    },
    updatedAt: demoAt({ days: -3 }),
  },
  {
    id: "old-pharmacy-de",
    slug: "old-pharmacy",
    language: "de",
    title: "Die Apotheke, die seit 1833 an ihrer Ecke steht",
    excerpt:
      "Ein Arzt aus Wien, drei Generationen Suidter und ein Geschäft, das noch heute die Nachbarschaft an der Bahnhofstrasse bedient.",
    author: { name: "Sonja", role: "Inhaberin, Swiss Keepsakes Luzern" },
    intro:
      "An der Bahnhofstrasse, ein paar Türen vom alten Ritterschen Palast entfernt, steht über einem Schaufenster ein sehr alter Name: Alte Suidtersche Apotheke. Sie wurde 1833 eröffnet und ist noch immer eine Apotheke im Alltagsbetrieb.",
    sections: [
      {
        id: "a-doctor-from-vienna",
        heading: "Ein Arzt aus Wien",
        blocks: [
          {
            type: "paragraph",
            text: "Leopold Suidter wurde 1803 in Stein im Aargau geboren und studierte Medizin in Wien, wo sein Vater zeitweise lebte. 1827 kehrte er in die Schweiz zurück. Im Sommer 1832 übernahm er in Luzern ein Haus, das Cloos-Haus, und eröffnete darin 1833 eine Apotheke. Er starb 1855, und die Apotheke trägt seither den Familiennamen.",
          },
        ],
      },
      {
        id: "three-generations",
        heading: "Vater, Sohn, Enkel",
        blocks: [
          {
            type: "paragraph",
            text: "Sein Sohn Otto Suidter übernahm die Apotheke 1855 und führte sie bis zu seinem Tod 1901. Der nächste Otto, sein Enkel, übernahm sie dann und liess das Haus 1906 umbauen. Seit 1937 sind mehrere weitere Apothekerinnen und Apotheker gefolgt. Die Apotheke bezeichnet sich als die älteste Luzerns.",
          },
          {
            type: "image",
            photo: "ritter-palace",
            caption:
              "Der Rittersche Palast, heute Regierungsgebäude, wenige Türen weiter an der Bahnhofstrasse.",
          },
        ],
      },
      {
        id: "still-open",
        heading: "Noch immer geöffnet an der Bahnhofstrasse",
        blocks: [
          {
            type: "paragraph",
            text: "Das ist eine Apotheke im Alltagsbetrieb, kein Museum: Die Menschen kommen mit ihren Rezepten, und das Team muss sie bedienen können. Schauen Sie sich die Fassade von der Strasse aus an, und wenn Sie etwas brauchen, treten Sie als Kundin oder Kunde ein. Wenn Sie drinnen fotografieren möchten, fragen Sie vorher. Sonntags ist geschlossen.",
          },
          {
            type: "paragraph",
            text: "Sie liegt auf dem Weg zwischen der Jesuitenkirche und dem Weinmarkt und ist deshalb leicht in einen Spaziergang durch die ruhigeren Gassen der Altstadt einzubauen.",
          },
        ],
      },
    ],
    photo: "suidter-pharmacy",
    category: "town",
    place: "Altstadt",
    readMinutes: 3,
    links: [],
    related: ["weinmarkt-oath", "luzern-bei-nacht"],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -3 }),
    },
    updatedAt: demoAt({ days: -3 }),
  },
  {
    id: "hammetschwand-lift-en",
    slug: "hammetschwand-lift",
    language: "en",
    title: "Europe’s highest outdoor lift, built in 1905",
    excerpt:
      "An iron tower on the cliff above Lake Luzerne, a ride of under a minute and a view that took five years to reach.",
    author: { name: "Sonja", role: "Owner, Swiss Keepsakes Luzern" },
    intro:
      "On the Bürgenstock, on the cliff above Lake Luzerne, a slim iron tower stands against the rock. It is the Hammetschwand lift, and it has taken visitors to the summit for more than a hundred years.",
    sections: [
      {
        id: "a-hotelier-with-an-idea",
        heading: "A hotelier with an idea",
        blocks: [
          {
            type: "paragraph",
            text: "In the Belle Époque the hotels on the Bürgenstock competed for guests who wanted something to do. Franz Josef Bucher, the hotelier behind them, built a path along the cliff in 1900, and then he wanted to bring guests up from it to the summit, a climb of more than 150 metres. His rivals built mountain railways. He built a lift: Europe’s highest outdoor lift, to be exact, and a good thing to put on a poster.",
          },
          {
            type: "image",
            photo: "hammetschwand-cliff-path",
            caption:
              "The Felsenweg, the cliff path that leads from the Bürgenstock to the lift.",
          },
        ],
      },
      {
        id: "built-by-hand",
        heading: "Built by hand",
        blocks: [
          {
            type: "paragraph",
            text: "Miners from Austria and Italy built the path and the lift shaft between 1900 and 1905. They worked hanging on ropes, drilling holes in the rock by hand and blasting the lower part of the lift shaft, some 60 metres high, straight up into the rock. The tower is an iron lattice built like a bridge, in the spirit of the Eiffel Tower, and it was riveted together where it stands. The first cabin was made of zinc-plated spruce and held eight people.",
          },
        ],
      },
      {
        id: "the-ride",
        heading: "The ride today",
        blocks: [
          {
            type: "paragraph",
            text: "The first lift took about three minutes to climb to the top, at one metre a second. Today a glass cabin takes you up 152.8 metres in under a minute. After a renovation in 1992 the lift was in fact slowed down, so that visitors could see more on the way. At the top a platform, at about 1,130 metres, looks over Lake Luzerne and the mountains around it. In summer the tower is lit at night and can be seen from Luzerne.",
          },
          {
            type: "image",
            photo: "hammetschwand-view",
            caption:
              "Lake Luzerne and the Rigi, seen from the Hammetschwand viewpoint.",
          },
        ],
      },
      {
        id: "before-you-go",
        heading: "Before you go",
        blocks: [
          {
            type: "paragraph",
            text: "The lift is not for people who dislike heights: the cabin has glass walls on three sides. Check the opening times and the weather with the Bürgenstock Resort before you set out, and wear shoes you can walk in, because the cliff path leads to the lift.",
          },
        ],
      },
    ],
    photo: "hammetschwand-lift",
    category: "lake",
    place: "Bürgenstock",
    readMinutes: 4,
    links: [],
    related: ["lake-steamboat", "musegg-morning"],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -1 }),
    },
    updatedAt: demoAt({ days: -1 }),
  },
  {
    id: "hammetschwand-lift-de",
    slug: "hammetschwand-lift",
    language: "de",
    title: "Europas höchster Aussenlift, gebaut 1905",
    excerpt:
      "Ein eiserner Turm an der Felswand über dem Vierwaldstättersee, eine Fahrt von unter einer Minute und eine Aussicht, für die man fünf Jahre baute.",
    author: { name: "Sonja", role: "Inhaberin, Swiss Keepsakes Luzern" },
    intro:
      "Auf dem Bürgenstock, an der Felswand über dem Vierwaldstättersee, steht ein schlanker Eisenturm vor dem Felsen. Es ist der Hammetschwand-Lift, und er bringt seit über hundert Jahren Gäste auf den Gipfel.",
    sections: [
      {
        id: "a-hotelier-with-an-idea",
        heading: "Ein Hotelier mit einer Idee",
        blocks: [
          {
            type: "paragraph",
            text: "In der Belle Époque konkurrierten die Hotels auf dem Bürgenstock um Gäste, die etwas erleben wollten. Franz Josef Bucher, der Hotelier dahinter, baute 1900 einen Weg entlang der Felswand, und dann wollte er die Gäste von dort auf den Gipfel bringen, mehr als 150 Meter höher. Seine Konkurrenten bauten Bergbahnen. Er baute einen Lift: genau gesagt Europas höchsten Aussenlift, und das macht sich gut auf einem Plakat.",
          },
          {
            type: "image",
            photo: "hammetschwand-cliff-path",
            caption: "Der Felsenweg, der vom Bürgenstock zum Lift führt.",
          },
        ],
      },
      {
        id: "built-by-hand",
        heading: "Von Hand gebaut",
        blocks: [
          {
            type: "paragraph",
            text: "Bergleute aus Österreich und Italien bauten den Weg und den Liftschacht zwischen 1900 und 1905. Sie arbeiteten an Seilen hängend, bohrten die Löcher von Hand in den Fels und sprengten den unteren Teil des Liftschachts, rund 60 Meter hoch, senkrecht in den Fels. Der Turm ist ein Eisenfachwerk, gebaut wie eine Brücke, im Geist des Eiffelturms, und wurde vor Ort zusammengenietet. Die erste Kabine bestand aus verzinktem Fichtenholz und fasste acht Personen.",
          },
        ],
      },
      {
        id: "the-ride",
        heading: "Die Fahrt heute",
        blocks: [
          {
            type: "paragraph",
            text: "Der erste Lift brauchte für den Weg nach oben rund drei Minuten, bei einem Meter pro Sekunde. Heute bringt Sie eine Glaskabine in unter einer Minute 152,8 Meter hinauf. Nach einer Sanierung 1992 wurde der Lift sogar langsamer gemacht, damit die Gäste unterwegs mehr sehen. Oben schaut eine Plattform auf etwa 1130 Metern über den Vierwaldstättersee und die Berge ringsum. Im Sommer ist der Turm nachts beleuchtet und von Luzern aus zu sehen.",
          },
          {
            type: "image",
            photo: "hammetschwand-view",
            caption:
              "Der Vierwaldstättersee und die Rigi, gesehen vom Hammetschwand.",
          },
        ],
      },
      {
        id: "before-you-go",
        heading: "Vor der Fahrt",
        blocks: [
          {
            type: "paragraph",
            text: "Der Lift ist nichts für Menschen, die Höhe nicht mögen: Die Kabine hat Glaswände auf drei Seiten. Prüfen Sie Öffnungszeiten und Wetter vorher beim Bürgenstock Resort, und ziehen Sie Schuhe an, in denen man gehen kann, denn der Felsenweg führt zum Lift.",
          },
        ],
      },
    ],
    photo: "hammetschwand-lift",
    category: "lake",
    place: "Bürgenstock",
    readMinutes: 4,
    links: [],
    related: ["lake-steamboat", "musegg-morning"],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -1 }),
    },
    updatedAt: demoAt({ days: -1 }),
  },
  {
    id: "victorinox-story-en",
    slug: "victorinox-story",
    language: "en",
    title: "The knife that began in Ibach",
    excerpt:
      "How a cutler’s workshop in a village in Schwyz became Victorinox, and why a Swiss Army Knife makes a good keepsake.",
    author: { name: "Sonja", role: "Owner, Swiss Keepsakes Luzern" },
    intro:
      "Almost everyone has held a red Swiss Army Knife, but few know where it comes from. It began in 1884 in Ibach, a village in the canton of Schwyz, and the company is still there.",
    sections: [
      {
        id: "a-workshop-in-ibach",
        heading: "A workshop in Ibach",
        blocks: [
          {
            type: "paragraph",
            text: "In 1884 Karl Elsener opened a cutler’s workshop in Ibach. His mother Victoria supported him actively in the early years. In 1891 he was one of the driving forces behind a professional association of Swiss cutlers, and that year he and three fellow cutlers delivered the first soldier’s knives to the Swiss Army.",
          },
        ],
      },
      {
        id: "a-lighter-knife",
        heading: "A lighter knife for officers",
        blocks: [
          {
            type: "paragraph",
            text: "The first soldier’s knives had black oak handles that were heavy and bulky. Elsener soon designed a lighter, more elegant knife with red fibre handles and more tools, including a screwdriver and a corkscrew. In 1897 the Original Swiss Officer’s and Sports Knife was patented. It is known around the world as the Swiss Army Knife.",
          },
          {
            type: "image",
            photo: "victorinox-classic-sd",
            caption:
              "The Classic SD, 58 mm long, one of the models our designs come on. Photo: Victorinox.",
          },
        ],
      },
      {
        id: "a-name-for-his-mother",
        heading: "A name for his mother",
        blocks: [
          {
            type: "paragraph",
            text: "When his mother died in 1909, Elsener gave the brand her first name, Victoria, and registered the Cross and Shield emblem as a trademark. It is now a registered trademark in more than 120 countries. In 1921 stainless steel, known as inox, arrived, and the two words became the company’s name: Victoria and inox make Victorinox.",
          },
        ],
      },
      {
        id: "still-made-in-switzerland",
        heading: "Still made in Switzerland",
        blocks: [
          {
            type: "paragraph",
            text: "Victorinox is run by the fourth generation of the Elsener family, and since 2000 a family foundation has held 90 per cent of the shares. While other makers moved production abroad, the company stayed in Ibach. In July 2017 it celebrated its 500 millionth pocket knife. Every knife comes with a lifetime warranty against defects in material and workmanship.",
          },
        ],
      },
      {
        id: "in-lucerne",
        heading: "In Luzerne",
        blocks: [
          {
            type: "paragraph",
            text: "The Victorinox Store sits on Hirschenplatz 12 in the old town, with more than 120 square metres of knives, kitchen knives, watches and travel gear, and a configurator where you can personalise a knife on the spot. Our Luzerne in 90 minutes walk ends there.",
          },
          {
            type: "image",
            photo: "hirschenplatz",
            caption:
              "Hirschenplatz, the old town square where the Victorinox Store stands.",
          },
          {
            type: "paragraph",
            text: "Our own Victorinox range pairs a genuine knife in three sizes with a Luzerne or Alpine design, and the shop engraves a name and a date on the back. Pocket knives are not allowed in cabin baggage, so pack yours in your checked luggage.",
          },
        ],
      },
    ],
    photo: "victorinox-store",
    category: "craft",
    place: "Hirschenplatz",
    readMinutes: 4,
    links: [
      { kind: "gift", id: "p-vx-chapel-bridge" },
      { kind: "tour", id: "lucerne-90" },
    ],
    related: ["weinmarkt-oath", "needle-dam"],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -2 }),
    },
    updatedAt: demoAt({ days: -2 }),
  },
  {
    id: "victorinox-story-de",
    slug: "victorinox-story",
    language: "de",
    title: "Das Messer, das in Ibach begann",
    excerpt:
      "Wie aus einer Messerschmiede in einem Dorf im Kanton Schwyz Victorinox wurde, und warum ein Schweizer Taschenmesser ein gutes Andenken ist.",
    author: { name: "Sonja", role: "Inhaberin, Swiss Keepsakes Luzern" },
    intro:
      "Fast alle haben schon ein rotes Schweizer Taschenmesser in der Hand gehabt, aber nur wenige wissen, woher es kommt. Es begann 1884 in Ibach, einem Dorf im Kanton Schwyz, und die Firma ist noch immer dort.",
    sections: [
      {
        id: "a-workshop-in-ibach",
        heading: "Eine Werkstatt in Ibach",
        blocks: [
          {
            type: "paragraph",
            text: "1884 eröffnete Karl Elsener in Ibach eine Messerschmiede. Seine Mutter Victoria unterstützte ihn in den ersten Jahren tatkräftig. 1891 gehörte er zu den treibenden Kräften hinter einem Berufsverband der Schweizer Messerschmiede, und im selben Jahr lieferte er mit drei Berufskollegen die ersten Soldatenmesser an die Schweizer Armee.",
          },
        ],
      },
      {
        id: "a-lighter-knife",
        heading: "Ein leichteres Messer für Offiziere",
        blocks: [
          {
            type: "paragraph",
            text: "Die ersten Soldatenmesser hatten schwarze Eichengriffe, die schwer und sperrig waren. Elsener entwarf bald ein leichteres, eleganteres Messer mit roten Fiberschalen und mehr Werkzeugen, darunter Schraubenzieher und Korkenzieher. 1897 wurde das Original Schweizer Offiziers- und Sportmesser patentiert. In der ganzen Welt kennt man es als Schweizer Taschenmesser.",
          },
          {
            type: "image",
            photo: "victorinox-classic-sd",
            caption:
              "Das Classic SD, 58 mm lang, eines der Modelle, auf denen unsere Designs erhältlich sind. Foto: Victorinox.",
          },
        ],
      },
      {
        id: "a-name-for-his-mother",
        heading: "Ein Name für seine Mutter",
        blocks: [
          {
            type: "paragraph",
            text: "Als seine Mutter 1909 starb, gab Elsener der Marke ihren Vornamen, Victoria, und liess das Kreuz im Schild als Marke eintragen. Es ist heute in mehr als 120 Ländern als Marke eingetragen. 1921 kam rostfreier Stahl hinzu, Inox, und aus den beiden Wörtern wurde der Firmenname: Victoria und Inox ergeben Victorinox.",
          },
        ],
      },
      {
        id: "still-made-in-switzerland",
        heading: "Noch immer in der Schweiz gefertigt",
        blocks: [
          {
            type: "paragraph",
            text: "Victorinox wird von der vierten Generation der Familie Elsener geführt, und seit 2000 hält eine Familienstiftung 90 Prozent der Aktien. Während andere Hersteller die Produktion ins Ausland verlegten, blieb die Firma in Ibach. Im Juli 2017 feierte sie ihr 500-millionstes Taschenmesser. Auf jedes Messer gibt es lebenslang Garantie auf Material- und Verarbeitungsfehler.",
          },
        ],
      },
      {
        id: "in-lucerne",
        heading: "In Luzern",
        blocks: [
          {
            type: "paragraph",
            text: "Der Victorinox Store liegt am Hirschenplatz 12 in der Altstadt, auf mehr als 120 Quadratmetern mit Taschenmessern, Küchenmessern, Uhren und Reisegepäck und einem Konfigurator, an dem man ein Messer gleich vor Ort personalisieren kann. Unser Spaziergang «Luzern in 90 Minuten» endet dort.",
          },
          {
            type: "image",
            photo: "hirschenplatz",
            caption:
              "Der Hirschenplatz, der Altstadtplatz, an dem der Victorinox Store steht.",
          },
          {
            type: "paragraph",
            text: "Unser eigenes Victorinox-Sortiment verbindet ein echtes Messer in drei Grössen mit einem Luzerner oder alpinen Design, und der Laden graviert einen Namen und ein Datum auf die Rückseite. Taschenmesser sind im Handgepäck nicht erlaubt, packen Sie Ihres also in den aufgegebenen Koffer.",
          },
        ],
      },
    ],
    photo: "victorinox-store",
    category: "craft",
    place: "Hirschenplatz",
    readMinutes: 4,
    links: [
      { kind: "gift", id: "p-vx-chapel-bridge" },
      { kind: "tour", id: "lucerne-90" },
    ],
    related: ["weinmarkt-oath", "needle-dam"],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -2 }),
    },
    updatedAt: demoAt({ days: -2 }),
  },
  // German only: in EN, C19 leaves it out (D6).
  {
    id: "luzern-bei-nacht-de",
    slug: "luzern-bei-nacht",
    language: "de",
    title: "Luzern bei Nacht",
    excerpt:
      "Wenn die Altstadt still wird: beleuchtete Brücken, leere Gassen und ein Spaziergang mit Laterne.",
    author: { name: "Sonja", role: "Inhaberin, Swiss Keepsakes Luzern" },
    intro:
      "Wenn die Tagesgäste abgereist sind, wird es in der Altstadt still. Brücken und Türme sind beleuchtet, und ihr Licht spiegelt sich in der Reuss.",
    sections: [
      {
        id: "rathausquai",
        heading: "Am Rathausquai",
        blocks: [
          {
            type: "paragraph",
            text: "Ein guter Anfang ist der Rathausquai. Von dort sehen Sie die Kapellbrücke und den Wasserturm im Abendlicht, und mit etwas Glück ziehen Schwäne langsam vorbei.",
          },
          {
            type: "image",
            photo: "lucerne-water-tower",
            caption:
              "Kapellbrücke und Wasserturm bei Tag, mit einem Schwan auf der Reuss.",
          },
        ],
      },
      {
        id: "old-town-lanes",
        heading: "Durch die Gassen",
        blocks: [
          {
            type: "paragraph",
            text: "Danach lohnt sich ein Umweg durch die Gassen. Am Weinmarkt wirken die bemalten Fassaden im Laternenlicht ganz anders als am Tag.",
          },
          {
            type: "image",
            photo: "lucerne-old-town",
            caption:
              "Bemalte Fassaden am Hirschenplatz, so wie sie bei Tag aussehen.",
          },
        ],
      },
      {
        id: "lantern-walk",
        heading: "Mit der Laterne zum Löwen",
        blocks: [
          {
            type: "paragraph",
            text: "Ziehen Sie sich warm an, am Wasser wird es abends schnell kühl. Unser Laternenspaziergang «Luzern bei Nacht» führt vom Wasserturm durch die Altstadt bis zum Löwendenkmal und endet mit einem heissen Tee.",
          },
        ],
      },
    ],
    photo: "lucerne-night",
    category: "town",
    place: "Altstadt",
    readMinutes: 3,
    links: [],
    related: [],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -5, hours: 8 }),
    },
    updatedAt: demoAt({ days: -5, hours: 8 }),
  },
  // Draft with no links yet: in M17 the Owner links a gift and publishes it (outline step 12).
  {
    id: "pilatus-de",
    slug: "pilatus",
    language: "de",
    title: "Ein Tag auf dem Pilatus",
    excerpt:
      "Mit der Zahnradbahn hinauf, mit der Gondel hinunter: Luzerns Hausberg an einem Tag.",
    author: { name: "Sonja", role: "Inhaberin, Swiss Keepsakes Luzern" },
    intro:
      "Der Pilatus ist Luzerns Hausberg. An klaren Tagen sieht man ihn von fast überall in der Stadt, und viele Gäste möchten wenigstens einmal hinauf.",
    sections: [
      {
        id: "two-ways-up",
        heading: "Zwei Wege hinauf",
        blocks: [
          {
            type: "paragraph",
            text: "Von Alpnachstad fährt die Zahnradbahn hinauf, die als steilste der Welt gilt. Von Kriens aus geht es mit Gondel und Luftseilbahn. Viele fahren auf der einen Seite hinauf und auf der anderen hinunter.",
          },
          {
            type: "image",
            photo: "lucerne-kapellbruecke-1200",
            caption:
              "Der Pilatus über Luzern, hinter Wasserturm und Kapellbrücke.",
          },
        ],
      },
      {
        id: "before-you-go",
        heading: "Vor der Fahrt",
        blocks: [
          {
            type: "paragraph",
            text: "Die Zahnradbahn fährt nur in der warmen Jahreszeit, prüfen Sie also vorher den Fahrplan. Nehmen Sie eine warme Jacke mit: Auch wenn es in Luzern mild ist, kann es oben kalt und windig sein.",
          },
        ],
      },
    ],
    photo: "pilatus",
    category: "lake",
    place: "Pilatus",
    readMinutes: 4,
    links: [],
    related: [],
    publication: { status: "draft" },
    updatedAt: demoAt({ days: -2, hours: 6 }),
  },
];

/**
 * Illustrative comments by invented seed guests (the demo guest Anna comments live).
 * The EN Musegg story has one with a shop reply, one hidden (personal details, off topic),
 * one spam for the delete demo and one plain comment (outline §4, M18).
 * Every published version has 4–7 visible comments in its own language: at least one
 * shop reply by the story's author, one guest reply (A3) and one with no reply yet.
 * No guest comments twice on one version; Lars is left out after the spam c5. Shop
 * answers repeat only what the story, the tours or the gifts already say.
 */
export const commentSeed: ArticleComment[] = [
  {
    id: "c1",
    articleId: "musegg-morning-en",
    author: { kind: "guest", guestId: "g-marie" },
    text: "We went up on our last morning and had the wall almost to ourselves. Is it true that the Zyt clock strikes before all the others? We thought we heard it a minute early.",
    createdAt: demoAt({ days: -9, hours: 8 }),
    hidden: false,
  },
  {
    id: "c2",
    articleId: "musegg-morning-en",
    author: { kind: "shop", staffName: "Lukas" },
    text: "It is, Marie. The Zyt tower clock is the oldest in town, and by tradition it may strike one minute before every other clock in Luzerne. Thank you for going up so early!",
    createdAt: demoAt({ days: -8, hours: -1 }),
    hidden: false,
    parentId: "c1",
  },
  {
    id: "c3",
    articleId: "musegg-morning-en",
    author: { kind: "guest", guestId: "g-tom" },
    text: "Good tip about going early. By ten the stairs in the towers were busy, but the view over the roofs was worth it.",
    createdAt: demoAt({ days: -7, hours: 10 }),
    hidden: false,
  },
  {
    id: "c4",
    articleId: "musegg-morning-en",
    author: { kind: "guest", guestId: "g-elena" },
    text: "Anyone want to share a taxi to Zurich airport on Sunday? Call me on +41 79 000 00 00.",
    createdAt: demoAt({ days: -5, hours: 12 }),
    hidden: true,
  },
  {
    id: "c5",
    articleId: "musegg-morning-en",
    author: { kind: "guest", guestId: "g-lars" },
    text: "Designer watches and bags, 80% off today only!!! Order now at best-deals-shop.example",
    createdAt: demoAt({ days: -3, hours: -7 }),
    hidden: false,
  },
  {
    id: "c6",
    articleId: "musegg-morning-de",
    author: { kind: "guest", guestId: "g-daniel" },
    text: "Wir waren an einem Sonntagmorgen oben und hatten die Mauer fast für uns allein. Die Treppe im Männliturm ist steil, aber die Aussicht lohnt sich.",
    createdAt: demoAt({ days: -6, hours: 7 }),
    hidden: false,
  },
  // A guest reply (A3: signed-in guests can reply too, one level deep).
  {
    id: "c7",
    articleId: "musegg-morning-de",
    author: { kind: "guest", guestId: "g-peter" },
    text: "Danke für den Tipp! Wir gehen morgen früh hinauf, bevor es voll wird.",
    createdAt: demoAt({ days: -2, hours: 9 }),
    hidden: false,
    parentId: "c6",
  },
  // EN Musegg: a guest reply to Tom and one more plain comment, so after the spam c5 is
  // deleted in M18 five visible comments remain.
  {
    id: "c8",
    articleId: "musegg-morning-en",
    author: { kind: "guest", guestId: "g-peter" },
    text: "Same for us. We went back the next morning at eight and met only one jogger on the whole walkway.",
    createdAt: demoAt({ days: -6, hours: 9 }),
    hidden: false,
    parentId: "c3",
  },
  {
    id: "c9",
    articleId: "musegg-morning-en",
    author: { kind: "guest", guestId: "g-yuki" },
    text: "Not every tower is open, so do not give up at the first locked door. We walked on to the next one and had the top to ourselves for ten minutes.",
    createdAt: demoAt({ days: -4, hours: 1 }),
    hidden: false,
  },
  // DE Musegg
  {
    id: "c10",
    articleId: "musegg-morning-de",
    author: { kind: "guest", guestId: "g-sofia" },
    text: "Kann man die Türme auch im Winter besteigen? Wir kommen im Januar wieder nach Luzern.",
    createdAt: demoAt({ days: -9, hours: 2 }),
    hidden: false,
  },
  {
    id: "c11",
    articleId: "musegg-morning-de",
    author: { kind: "shop", staffName: "Lukas" },
    text: "Leider nicht, Sofia. Die Türme sind nur in der warmen Jahreszeit für Besucher geöffnet. Die Mauer mit ihren Türmen sehen Sie aber auch im Januar von der Altstadt aus.",
    createdAt: demoAt({ days: -8 }),
    hidden: false,
    parentId: "c10",
  },
  {
    id: "c12",
    articleId: "musegg-morning-de",
    author: { kind: "guest", guestId: "g-elena" },
    text: "Wir haben um zwölf Uhr beim Zytturm gewartet. Er hat tatsächlich als Erster geschlagen, kurz danach folgten die anderen Uhren der Stadt.",
    createdAt: demoAt({ days: -4, hours: 10 }),
    hidden: false,
  },
  // EN Lion Monument
  {
    id: "c13",
    articleId: "lion-monument-en",
    author: { kind: "guest", guestId: "g-marie" },
    text: "We came at about seven in the evening and had the pond almost to ourselves. Sitting by the water for a few minutes, as you suggest, made all the difference.",
    createdAt: demoAt({ days: -8, hours: 11 }),
    hidden: false,
  },
  {
    id: "c14",
    articleId: "lion-monument-en",
    author: { kind: "guest", guestId: "g-elena" },
    text: "Same at eight in the morning: a street sweeper, two ducks and us.",
    createdAt: demoAt({ days: -7, hours: 12 }),
    hidden: false,
    parentId: "c13",
  },
  {
    id: "c15",
    articleId: "lion-monument-en",
    author: { kind: "guest", guestId: "g-yuki" },
    text: "Is the lantern walk ever offered in English? My German is not good enough for two hours of stories.",
    createdAt: demoAt({ days: -7, hours: 1 }),
    hidden: false,
  },
  {
    id: "c16",
    articleId: "lion-monument-en",
    author: { kind: "shop", staffName: "Lukas" },
    text: "Not at the moment, Yuki. The lantern walk is in German only, but our old-town walk is guided in English. The lion is also worth a visit on your own in the evening, when he is lit.",
    createdAt: demoAt({ days: -7, hours: 6 }),
    hidden: false,
    parentId: "c15",
  },
  {
    id: "c17",
    articleId: "lion-monument-en",
    author: { kind: "guest", guestId: "g-sofia" },
    text: "I had read the Mark Twain line before we came and expected it to be exaggerated. It was not.",
    createdAt: demoAt({ days: -3, hours: 3 }),
    hidden: false,
  },
  // DE Lion Monument
  {
    id: "c18",
    articleId: "lion-monument-de",
    author: { kind: "guest", guestId: "g-daniel" },
    text: "Wir waren mit unseren Kindern dort. Zuerst wollten sie gleich weiter, dann sassen sie zehn Minuten am Teich und hatten tausend Fragen zum abgebrochenen Speer.",
    createdAt: demoAt({ days: -8, hours: 8 }),
    hidden: false,
  },
  {
    id: "c19",
    articleId: "lion-monument-de",
    author: { kind: "guest", guestId: "g-peter" },
    text: "Bei uns war es genau gleich. Unsere Tochter wollte danach alles über die Schweizergarde wissen.",
    createdAt: demoAt({ days: -5, hours: 11 }),
    hidden: false,
    parentId: "c18",
  },
  {
    id: "c20",
    articleId: "lion-monument-de",
    author: { kind: "guest", guestId: "g-tom" },
    text: "Was bedeutet die lateinische Inschrift über dem Löwen genau? Mein Schullatein reicht leider nicht mehr.",
    createdAt: demoAt({ days: -6, hours: 2 }),
    hidden: false,
  },
  {
    id: "c21",
    articleId: "lion-monument-de",
    author: { kind: "shop", staffName: "Lukas" },
    text: "Sinngemäss ehrt sie die Treue und Tapferkeit der Schweizergardisten, Tom. An sie erinnert das ganze Denkmal.",
    createdAt: demoAt({ days: -6, hours: 7 }),
    hidden: false,
    parentId: "c20",
  },
  {
    id: "c22",
    articleId: "lion-monument-de",
    author: { kind: "guest", guestId: "g-sofia" },
    text: "Gestern Nachmittag standen dort mehrere Reisegruppen. Heute kurz nach acht Uhr hatten wir den Löwen fast für uns allein.",
    createdAt: demoAt({ days: -1, hours: 2 }),
    hidden: false,
  },
  // EN Lake steamboat
  {
    id: "c23",
    articleId: "lake-steamboat-en",
    author: { kind: "guest", guestId: "g-daniel" },
    text: "Our two boys spent the whole crossing looking down into the engine room, exactly as you wrote. We only got them back on deck when we docked in Weggis.",
    createdAt: demoAt({ days: -7, hours: 3 }),
    hidden: false,
  },
  {
    id: "c24",
    articleId: "lake-steamboat-en",
    author: { kind: "guest", guestId: "g-elena" },
    text: "Ours too. Days later they are still talking about the pistons.",
    createdAt: demoAt({ days: -6, hours: 11 }),
    hidden: false,
    parentId: "c23",
  },
  {
    id: "c25",
    articleId: "lake-steamboat-en",
    author: { kind: "guest", guestId: "g-yuki" },
    text: "We only have one free afternoon. Is that enough for the lake, or does it need a whole day?",
    createdAt: demoAt({ days: -6 }),
    hidden: false,
  },
  {
    id: "c26",
    articleId: "lake-steamboat-en",
    author: { kind: "shop", staffName: "Sonja" },
    text: "An afternoon is plenty, Yuki. Sail for an hour, step off where you like and take a later boat back. Just check the time of the last boat before you set off.",
    createdAt: demoAt({ days: -6, hours: 5 }),
    hidden: false,
    parentId: "c25",
  },
  {
    id: "c27",
    articleId: "lake-steamboat-en",
    author: { kind: "guest", guestId: "g-tom" },
    text: "Take the jacket seriously. It felt like summer in town, and by the middle of the lake we were cold on the top deck.",
    createdAt: demoAt({ days: -4, hours: 6 }),
    hidden: false,
  },
  {
    id: "c28",
    articleId: "lake-steamboat-en",
    author: { kind: "guest", guestId: "g-marie" },
    text: "We did this last summer: stepped off in Vitznau for lunch and took a later boat back. No plan at all, and it was the best afternoon of our trip.",
    createdAt: demoAt({ days: -2, hours: -1 }),
    hidden: false,
  },
  // DE Lake steamboat
  {
    id: "c29",
    articleId: "lake-steamboat-de",
    author: { kind: "guest", guestId: "g-peter" },
    text: "Wir sind mit einem der alten Raddampfer bis Brunnen gefahren. Das Messing im Maschinenraum glänzt wirklich wie neu.",
    createdAt: demoAt({ days: -7, hours: 8 }),
    hidden: false,
  },
  {
    id: "c30",
    articleId: "lake-steamboat-de",
    author: { kind: "guest", guestId: "g-tom" },
    text: "Brunnen merken wir uns für den nächsten Besuch. Diesmal hat es nur bis Weggis gereicht.",
    createdAt: demoAt({ days: -6, hours: 10 }),
    hidden: false,
    parentId: "c29",
  },
  {
    id: "c31",
    articleId: "lake-steamboat-de",
    author: { kind: "guest", guestId: "g-sofia" },
    text: "Wie weit ist es vom Bahnhof bis zum Steg? Wir sind mit dem Kinderwagen unterwegs.",
    createdAt: demoAt({ days: -5, hours: 1 }),
    hidden: false,
  },
  {
    id: "c32",
    articleId: "lake-steamboat-de",
    author: { kind: "shop", staffName: "Sonja" },
    text: "Nur ein paar Gehminuten, Sofia: Die Stege liegen direkt vor dem Bahnhof. Fragen Sie beim Einsteigen kurz nach, wo der Kinderwagen am besten Platz hat.",
    createdAt: demoAt({ days: -5, hours: 5 }),
    hidden: false,
    parentId: "c31",
  },
  {
    id: "c33",
    articleId: "lake-steamboat-de",
    author: { kind: "guest", guestId: "g-daniel" },
    text: "Am Samstag lag Nebel auf dem See, und die Berge kamen erst nach einer halben Stunde aus dem Grau. Fast schöner als bei klarem Wetter.",
    createdAt: demoAt({ days: -1, hours: -2 }),
    hidden: false,
  },
  // EN Water Tower
  {
    id: "c34",
    articleId: "water-tower-en",
    author: { kind: "guest", guestId: "g-yuki" },
    text: "We were on the bridge at half past seven this morning, and the reflection was exactly as you describe. Ten minutes later the first tour group arrived.",
    createdAt: demoAt({ days: -5, hours: -2 }),
    hidden: false,
  },
  {
    id: "c35",
    articleId: "water-tower-en",
    author: { kind: "guest", guestId: "g-tom" },
    text: "Thanks for the timing. We will aim for seven tomorrow.",
    createdAt: demoAt({ days: -5, hours: 12 }),
    hidden: false,
    parentId: "c34",
  },
  {
    id: "c36",
    articleId: "water-tower-en",
    author: { kind: "guest", guestId: "g-marie" },
    text: "What do the paintings under the bridge roof show? We could not make sense of them without a guide.",
    createdAt: demoAt({ days: -4, hours: 4 }),
    hidden: false,
  },
  {
    id: "c37",
    articleId: "water-tower-en",
    author: { kind: "shop", staffName: "Sonja" },
    text: "They tell the story of Luzerne and its patron saints, Marie. They were hung between the roof beams in the 17th century, so everyone who crossed walked under the history of their town.",
    createdAt: demoAt({ days: -3 }),
    hidden: false,
    parentId: "c36",
  },
  {
    id: "c38",
    articleId: "water-tower-en",
    author: { kind: "guest", guestId: "g-elena" },
    text: "Tip for photos: go back in the evening when the lights come on. From the Rathausquai you see the tower and the bridge twice, once in the river.",
    createdAt: demoAt({ days: -2, hours: 11 }),
    hidden: false,
  },
  // DE Luzern bei Nacht
  {
    id: "c39",
    articleId: "luzern-bei-nacht-de",
    author: { kind: "guest", guestId: "g-peter" },
    text: "Wir standen gestern Abend am Rathausquai, und tatsächlich zogen zwei Schwäne langsam unter der Kapellbrücke durch. Ein schöner Anfang für den Abend.",
    createdAt: demoAt({ days: -4, hours: 11 }),
    hidden: false,
  },
  {
    id: "c40",
    articleId: "luzern-bei-nacht-de",
    author: { kind: "guest", guestId: "g-daniel" },
    text: "Bei uns waren es sogar drei. Die beleuchtete Brücke im Wasser war das schönste Bild unserer Ferien.",
    createdAt: demoAt({ days: -3, hours: 12 }),
    hidden: false,
    parentId: "c39",
  },
  {
    id: "c41",
    articleId: "luzern-bei-nacht-de",
    author: { kind: "guest", guestId: "g-marie" },
    text: "Wie lange dauert der Laternenspaziergang? Ist er für unsere achtjährige Tochter nicht zu lang?",
    createdAt: demoAt({ days: -3, hours: 9 }),
    hidden: false,
  },
  {
    id: "c42",
    articleId: "luzern-bei-nacht-de",
    author: { kind: "shop", staffName: "Lukas" },
    text: "Rund zwei Stunden, Marie, auf etwa anderthalb Kilometern, teilweise über Kopfsteinpflaster und Treppen. Warm angezogen schaffen das die meisten Kinder in dem Alter gut, und zum Schluss gibt es einen heissen Tee.",
    createdAt: demoAt({ days: -1, hours: -1 }),
    hidden: false,
    parentId: "c41",
  },
  {
    id: "c43",
    articleId: "luzern-bei-nacht-de",
    author: { kind: "guest", guestId: "g-tom" },
    text: "Am Weinmarkt war es nach zehn Uhr fast ganz still, nur unsere Schritte auf dem Pflaster waren zu hören. Und wirklich: warm anziehen, am Wasser wurde es schnell kalt.",
    createdAt: demoAt({ days: -1, hours: 11 }),
    hidden: false,
  },
];
