import type { Article, ArticleComment } from "./types";

import { demoAt } from "@/features/demo/clock";

/**
 * Stories for C19, C20 and M17 (outline §4). Written as inspiration in the shop's voice,
 * not as a guest's testimony, and they link only published gifts and tours (PRD §11).
 * Facts are the widely published history of each place; the shop should check the wording
 * before launch. Three stories exist in both languages and share a slug (D6); the water
 * tower is EN only, Luzern bei Nacht is DE only, and the Pilatus story is a DE draft.
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
      "Climb the old town wall before the city wakes up, and see Lucerne laid out between the lake and the hills.",
    author: { name: "Lukas", role: "Shop manager, Swiss Keepsakes Luzern" },
    intro:
      "The Musegg wall runs along the hill above the old town. It was built in the late 14th century to guard Lucerne from the north, and long stretches of it still stand.",
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
            title: "Lucerne city wall with 9 Musegg towers",
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
            text: "Listen for the Zyt tower. Its clock is the oldest in town, and by tradition it may strike one minute before every other clock in Lucerne.",
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
    readMinutes: 4,
    links: [
      { kind: "tour", id: "time-history-loyalty" },
      { kind: "gift", id: "p-postcards" },
    ],
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
    author: { name: "Lukas", role: "Ladenleiter, Swiss Keepsakes Luzern" },
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
            title: "Lucerne city wall with 9 Musegg towers",
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
    readMinutes: 4,
    links: [
      { kind: "tour", id: "time-history-loyalty" },
      { kind: "gift", id: "p-postcards" },
    ],
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
    author: { name: "Lukas", role: "Shop manager, Swiss Keepsakes Luzern" },
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
    readMinutes: 6,
    links: [{ kind: "tour", id: "time-history-loyalty" }],
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
    author: { name: "Lukas", role: "Ladenleiter, Swiss Keepsakes Luzern" },
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
    readMinutes: 6,
    links: [{ kind: "tour", id: "time-history-loyalty" }],
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
    author: { name: "Ngọc", role: "Owner, Swiss Keepsakes Luzern" },
    intro:
      "Lake Lucerne still has a fleet of paddle steamers, the oldest of them more than a hundred years old. They carry you from the middle of town to the villages along the shore.",
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
    author: { name: "Ngọc", role: "Inhaberin, Swiss Keepsakes Luzern" },
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
      "The stone tower in the river was guarding Lucerne before the Chapel Bridge was built.",
    author: { name: "Ngọc", role: "Owner, Swiss Keepsakes Luzern" },
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
            text: "The tower appears on two of our gifts: a limited-edition print of the tower at dawn, and the etching on the Kapellbrücke pocket knife. The old-town walk starts at the bridge.",
          },
        ],
      },
    ],
    photo: "lucerne-water-tower",
    readMinutes: 3,
    links: [
      { kind: "tour", id: "lucerne-90" },
      { kind: "gift", id: "p-print" },
      { kind: "gift", id: "p-knife" },
    ],
    related: [],
    publication: {
      status: "published",
      publishedAt: demoAt({ days: -6, hours: -1 }),
    },
    updatedAt: demoAt({ days: -6, hours: -1 }),
  },
  // German only: in EN, C19 leaves it out (D6).
  {
    id: "luzern-bei-nacht-de",
    slug: "luzern-bei-nacht",
    language: "de",
    title: "Luzern bei Nacht",
    excerpt:
      "Wenn die Altstadt still wird: beleuchtete Brücken, leere Gassen und ein Spaziergang mit Laterne.",
    author: { name: "Lukas", role: "Ladenleiter, Swiss Keepsakes Luzern" },
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
    author: { name: "Ngọc", role: "Inhaberin, Swiss Keepsakes Luzern" },
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
    text: "It is, Marie. The Zyt tower clock is the oldest in town, and by tradition it may strike one minute before every other clock in Lucerne. Thank you for going up so early!",
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
    author: { kind: "shop", staffName: "Ngọc" },
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
    author: { kind: "shop", staffName: "Ngọc" },
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
    author: { kind: "shop", staffName: "Ngọc" },
    text: "They tell the story of Lucerne and its patron saints, Marie. They were hung between the roof beams in the 17th century, so everyone who crossed walked under the history of their town.",
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
