import type {
  Subcategory,
  LocalizedText,
  PickupPlace,
  Product,
  Review,
  Shop,
} from "./types";

import { demoAt } from "@/features/demo/clock";
import { storyFromChapters } from "@/lib/rich-text";

/** Sample data for the prototype. Names, addresses and texts are invented. */

export const shop: Shop = {
  name: "Swiss Keepsakes Luzern",
  ownerName: "Chị Ngọc",
  email: "hello@swisskeepsakes.example",
  // Sample number for the prototype, not a real line.
  phone: "+41 41 000 12 34",
};

/** The pilot store's five keepsake sub-categories; the merchant edits them on M26 (PRD §7.0). */
export const subcategories: Subcategory[] = [
  {
    id: "pocket-knives",
    categoryId: "keepsakes",
    name: { en: "Pocket knives", de: "Taschenmesser" },
    photo: "pocket-knife",
    tagline: {
      en: "Folding knives, engraved by hand in the old town",
      de: "Klappmesser, von Hand graviert in der Altstadt",
    },
  },
  {
    id: "gift-boxes",
    categoryId: "keepsakes",
    name: { en: "Gift boxes", de: "Geschenkboxen" },
    photo: "gift-box",
    tagline: {
      en: "Small things from Lucerne makers, packed together",
      de: "Kleine Dinge von Luzerner Herstellern, zusammen verpackt",
    },
  },
  {
    id: "chocolate",
    categoryId: "keepsakes",
    name: { en: "Chocolate", de: "Schokolade" },
    photo: "pralines",
    tagline: {
      en: "Pralines and bars from local chocolatiers",
      de: "Pralinen und Tafeln von lokalen Confiserien",
    },
  },
  {
    id: "prints",
    categoryId: "keepsakes",
    name: { en: "Prints", de: "Drucke" },
    photo: "art-print",
    tagline: {
      en: "Lucerne on paper, by local illustrators",
      de: "Luzern auf Papier, von lokalen Illustratorinnen und Illustratoren",
    },
  },
  {
    id: "small-gifts",
    categoryId: "keepsakes",
    name: { en: "Small gifts", de: "Kleine Geschenke" },
    photo: "keyring",
    tagline: {
      en: "Keyrings, postcards and things that fit in a pocket",
      de: "Schlüsselanhänger, Postkarten und Dinge für die Tasche",
    },
  },
];

const standardCancellation = {
  en: "Free cancellation until you pay. After payment, cancellation is possible until preparation starts; the amount paid is refunded.",
  de: "Kostenlos stornierbar, bis Sie bezahlen. Nach der Zahlung ist eine Stornierung bis zum Beginn der Vorbereitung möglich; der bezahlte Betrag wird erstattet.",
};

export const products: Product[] = [
  {
    id: "p-knife",
    photo: "pocket-knife",
    photos: ["engraving", "artisan-workshop"],
    // Demo story (owner request 13.10.2026): the business plan lists a Chapel Bridge
    // knife design and sells "a keepsake with a story". Facts are the widely published
    // history of the bridge; the shop should check the wording before launch.
    longStory: storyFromChapters({
      title: {
        en: "The bridge on the handle",
        de: "Die Brücke auf dem Griff",
      },
      chapters: [
        {
          photo: "lucerne-kapellbruecke-1200",
          title: {
            en: "A bridge built to guard the town",
            de: "Eine Brücke, die die Stadt schützte",
          },
          body: {
            en: "In the 14th century Lucerne built a covered wooden walkway across the Reuss, right where the river leaves the lake. It was part of the town’s defences: the roof kept the guards dry, and the bridge closed off the old town from the water. Beside it stands the eight-sided Water Tower, older than the bridge itself. Over the centuries it served as an archive, a treasury and a prison.",
            de: "Im 14. Jahrhundert baute Luzern einen gedeckten Holzsteg über die Reuss, genau dort, wo der Fluss den See verlässt. Er gehörte zur Stadtbefestigung: Das Dach hielt die Wachen trocken, und die Brücke schloss die Altstadt zum Wasser hin ab. Daneben steht der achteckige Wasserturm, älter als die Brücke selbst. Im Lauf der Jahrhunderte diente er als Archiv, Schatzkammer und Gefängnis.",
          },
        },
        {
          photo: "lucerne-old-town",
          title: {
            en: "A history book under the roof",
            de: "Ein Geschichtsbuch unter dem Dach",
          },
          body: {
            en: "In the 17th century, painted triangular panels were hung between the roof beams. They told the story of Lucerne and its patron saints to everyone who crossed. Merchants on their way to market, children, soldiers: they all walked under the history of their own town, one panel at a time.",
            de: "Im 17. Jahrhundert wurden bemalte dreieckige Tafeln zwischen die Dachbalken gehängt. Sie erzählten allen, die die Brücke überquerten, die Geschichte Luzerns und seiner Stadtpatrone. Händler auf dem Weg zum Markt, Kinder, Soldaten: Sie alle gingen unter der Geschichte ihrer eigenen Stadt hindurch, Tafel für Tafel.",
          },
        },
        {
          photo: "lucerne-night",
          title: {
            en: "The night it burned",
            de: "Die Nacht, in der sie brannte",
          },
          body: {
            en: "In August 1993 a fire destroyed much of the bridge and many of its paintings. Lucerne did not wait: the bridge was rebuilt and reopened the following year. Look up as you cross today and you can still find darkened panels among the restored ones. The town chose to keep the scars visible.",
            de: "Im August 1993 zerstörte ein Brand grosse Teile der Brücke und viele ihrer Bilder. Luzern wartete nicht: Die Brücke wurde wieder aufgebaut und im folgenden Jahr neu eröffnet. Wer heute nach oben schaut, entdeckt zwischen den restaurierten Tafeln noch angekohlte. Die Stadt hat die Narben bewusst sichtbar gelassen.",
          },
        },
        {
          photo: "engraving",
          title: {
            en: "Why it is on this knife",
            de: "Warum sie auf diesem Messer ist",
          },
          body: {
            en: "The etching on the handle shows the bridge and the Water Tower as you see them from the Rathausquai. Add a name, and the shop engraves it by hand in the old town, a short walk from the bridge. It is a small, useful thing to carry home, and each time you open it, you are back on the bridge for a moment.",
            de: "Die Ätzung auf dem Griff zeigt die Brücke und den Wasserturm, wie man sie vom Rathausquai aus sieht. Mit einem Namen graviert der Laden das Messer von Hand in der Altstadt, nur ein paar Schritte von der Brücke entfernt. Ein kleines, nützliches Andenken: Jedes Mal, wenn Sie es öffnen, stehen Sie für einen Moment wieder auf der Brücke.",
          },
        },
      ],
    }),
    slug: "kapellbruecke-pocket-knife",
    subcategoryId: "pocket-knives",
    name: { en: "Kapellbrücke pocket knife", de: "Kapellbrücke Taschenmesser" },
    story: {
      en: "A stainless steel pocket knife with the Chapel Bridge etched on the handle. Add a name and the shop engraves it by hand in the old town.",
      de: "Ein Taschenmesser aus rostfreiem Stahl mit der Kapellbrücke auf dem Griff. Mit Namen graviert die Werkstatt in der Altstadt es von Hand.",
    },
    cancellationPolicy: standardCancellation,
    variants: [
      { id: "s", label: { en: "Small", de: "Klein" }, price: 4900, stock: 6 },
      { id: "m", label: { en: "Medium", de: "Mittel" }, price: 5400, stock: 4 },
      { id: "l", label: { en: "Large", de: "Gross" }, price: 6400, stock: 2 },
    ],
    preparationDays: 3,
    dayMode: "working-days",
    paymentPolicy: { kind: "full", firstDueHours: 24 },
    commissionRate: 0.1,
    engraving: { maxLength: 12 },
  },
  {
    id: "p-giftbox",
    photo: "gift-box",
    photos: ["candle", "postcards"],
    longStory: storyFromChapters({
      title: {
        en: "A market stall in a box",
        de: "Ein Marktstand in der Schachtel",
      },
      chapters: [
        {
          photo: "candle",
          title: {
            en: "Three makers, one lid",
            de: "Drei Hände, ein Deckel",
          },
          body: {
            en: "Lucerne has always been a town of small trades: candle makers, bakers, printers, each with a bench a few streets from the next. This box puts three of them side by side. The candle is for the evening, the postcards are for writing home, and the almond biscuits are for the train.",
            de: "Luzern war schon immer eine Stadt der kleinen Handwerke: Kerzenmacher, Bäcker, Drucker, jeder mit seiner Werkbank nur ein paar Gassen vom nächsten entfernt. Diese Box stellt drei davon nebeneinander. Die Kerze ist für den Abend, die Postkarten sind zum Schreiben nach Hause, und das Mandelgebäck begleitet Sie im Zug.",
          },
        },
        {
          photo: "postcards",
          title: {
            en: "Something to write on, something to light",
            de: "Etwas zum Schreiben, etwas zum Anzünden",
          },
          body: {
            en: "Put the card on the table, light the candle, write two lines about the lake. People who unpack the box in their hotel room often do exactly this on the first evening. The box is made to be opened slowly, not carried unopened to the airport.",
            de: "Karte auf den Tisch, Kerze anzünden, zwei Zeilen über den See schreiben. Viele packen die Box schon am ersten Abend im Hotelzimmer aus und tun genau das. Die Box ist zum langsamen Öffnen gedacht, nicht zum ungeöffneten Mitnehmen zum Flughafen.",
          },
        },
        {
          photo: "gift-box",
          title: {
            en: "Packed by hand, ready to give",
            de: "Von Hand verpackt, bereit zum Verschenken",
          },
          body: {
            en: "Each box is packed in the old-town shop a day or two before you collect it, so the biscuits are fresh and nothing rattles. If you are giving it away, it already looks like a present. If you are keeping it, nobody will blame you.",
            de: "Jede Box wird ein bis zwei Tage vor der Abholung im Laden in der Altstadt gepackt, damit das Gebäck frisch ist und nichts klappert. Wenn Sie sie verschenken, sieht sie schon aus wie ein Geschenk. Wenn Sie sie behalten, macht Ihnen niemand einen Vorwurf.",
          },
        },
      ],
    }),
    slug: "lucerne-gift-box",
    subcategoryId: "gift-boxes",
    name: { en: "Lucerne gift box", de: "Luzerner Geschenkbox" },
    story: {
      en: "Three small things from Lucerne makers in one box: a candle, a postcard set and almond biscuits from the lake.",
      de: "Drei kleine Dinge von Luzerner Herstellern in einer Box: eine Kerze, ein Postkartenset und Mandelgebäck vom See.",
    },
    cancellationPolicy: standardCancellation,
    variants: [
      {
        id: "std",
        label: { en: "Standard", de: "Standard" },
        price: 8900,
        stock: 5,
      },
    ],
    preparationDays: 2,
    dayMode: "calendar-days",
    paymentPolicy: {
      kind: "deposit",
      depositPercent: 30,
      firstDueHours: 24,
      balanceDueDaysAfterPickup: 4,
    },
    commissionRate: 0.15,
  },
  {
    id: "p-chocolate",
    photo: "pralines",
    photos: ["chocolate-bar"],
    longStory: storyFromChapters({
      title: {
        en: "Why Swiss chocolate melts",
        de: "Warum Schweizer Schokolade schmilzt",
      },
      chapters: [
        {
          photo: "chocolate-bar",
          title: {
            en: "Before it was smooth",
            de: "Bevor sie zart war",
          },
          body: {
            en: "For centuries chocolate was a rough, gritty drink. In 1875 Daniel Peter of Vevey mixed cocoa with condensed milk from his neighbour Henri Nestlé and made the first milk chocolate. It was the start of Switzerland’s reputation.",
            de: "Jahrhundertelang war Schokolade ein raues, körniges Getränk. 1875 mischte Daniel Peter aus Vevey Kakao mit der Kondensmilch seines Nachbarn Henri Nestlé und erfand die erste Milchschokolade. Es war der Anfang des Schweizer Rufs.",
          },
        },
        {
          photo: "pralines",
          title: {
            en: "The machine left running",
            de: "Die Maschine, die weiterlief",
          },
          body: {
            en: "In 1879 Rodolphe Lindt developed conching, the long stirring that makes chocolate silky instead of grainy. The story goes that a machine was simply left running for days. Whatever really happened, that patience is what you taste when a praline melts slowly.",
            de: "1879 entwickelte Rodolphe Lindt das Conchieren, das lange Rühren, das Schokolade seidig statt körnig macht. Erzählt wird, eine Maschine sei einfach tagelang weitergelaufen. Wie es auch war: Diese Geduld schmeckt man, wenn eine Praline langsam schmilzt.",
          },
        },
        {
          photo: "gift-box",
          title: {
            en: "Twelve pieces, packed the day before",
            de: "Zwölf Stück, am Vortag verpackt",
          },
          body: {
            en: "The twelve pralines come from a Lucerne chocolatier and are packed the day before you collect them. Chocolate is a fresh product, so we keep the gap short. Let each piece come to room temperature before you eat it.",
            de: "Die zwölf Pralinen stammen von einer Luzerner Confiserie und werden am Vortag der Abholung verpackt. Schokolade ist ein frisches Produkt, darum halten wir die Zeit kurz. Lassen Sie jedes Stück vor dem Essen Zimmertemperatur annehmen.",
          },
        },
      ],
    }),
    slug: "chocolate-set",
    subcategoryId: "chocolate",
    name: { en: "Chocolate set", de: "Schokoladenset" },
    story: {
      en: "Twelve pralines from a Lucerne chocolatier, packed the day before you pick them up.",
      de: "Zwölf Pralinen einer Luzerner Confiserie, am Vortag der Abholung verpackt.",
    },
    cancellationPolicy: standardCancellation,
    variants: [
      {
        id: "12",
        label: { en: "12 pieces", de: "12 Stück" },
        price: 2400,
        stock: 12,
      },
    ],
    preparationDays: 1,
    dayMode: "calendar-days",
    paymentPolicy: { kind: "later", dueDaysAfterPickup: 2 },
    commissionRate: 0.15,
  },
  {
    id: "p-print",
    photo: "art-print",
    photos: ["lucerne-kapellbruecke-1200"],
    longStory: storyFromChapters({
      title: {
        en: "The tower that stayed standing",
      },
      chapters: [
        {
          photo: "lucerne-water-tower",
          title: {
            en: "An octagon in the river",
          },
          body: {
            en: "The Water Tower is about 34 metres tall and stands in the Reuss, eight-sided and a little crooked-looking from every angle. It was built around 1300, before the bridge beside it. Over the centuries it served as a lookout, an archive, a treasury and a prison.",
          },
        },
        {
          photo: "lucerne-night",
          title: {
            en: "The night of the fire",
          },
          body: {
            en: "On 18 August 1993 fire tore through the Chapel Bridge. Only the bridgeheads and the Water Tower came through it. The bridge reopened in April 1994, and the tower, blackened but standing, had held its place in the river the whole time.",
          },
        },
        {
          photo: "art-print",
          title: {
            en: "Why dawn",
          },
          body: {
            en: "The illustrator drew the tower at dawn because that is when the old town belongs to the swans and the early walkers. The giclée print is signed and numbered, an edition of 50, on a 30 × 40 cm sheet. It is printed to order and packed flat.",
          },
        },
      ],
    }),
    slug: "limited-edition-print",
    subcategoryId: "prints",
    // English only on purpose: shows the missing-translation notice (AC30, R02).
    name: { en: "Limited-edition print: Water Tower at dawn" },
    story: {
      en: "A signed giclée print, edition of 50, by a Lucerne illustrator. 30 × 40 cm, packed flat.",
    },
    cancellationPolicy: {
      en: "Free cancellation until you pay. Prints are made to order, so they cannot be cancelled after payment.",
    },
    variants: [
      { id: "std", label: { en: "30 × 40 cm" }, price: 11900, stock: 1 },
    ],
    preparationDays: 2,
    dayMode: "working-days",
    paymentPolicy: { kind: "full", firstDueHours: 24 },
    commissionRate: 0.15,
  },
  {
    id: "p-keyring",
    photo: "keyring",
    longStory: storyFromChapters({
      title: {
        en: "The mountain with a dragon in its name",
        de: "Der Berg mit dem Drachen im Namen",
      },
      chapters: [
        {
          photo: "pilatus",
          title: {
            en: "A mountain that was feared",
            de: "Ein Berg, vor dem man sich fürchtete",
          },
          body: {
            en: "Mount Pilatus rises above Lucerne like a wall. Old stories tied it to Pontius Pilate, who was said to be buried in a lake on the mountain. For a long time, people believed that disturbing the lake would bring storms down on the town, and climbing the mountain was forbidden.",
            de: "Der Pilatus steigt über Luzern auf wie eine Mauer. Alte Geschichten verbanden ihn mit Pontius Pilatus, der in einem See auf dem Berg begraben liegen soll. Lange glaubte man, wer den See störe, bringe Stürme über die Stadt, und das Besteigen des Berges war verboten.",
          },
        },
        {
          photo: "lucerne-night",
          title: {
            en: "The dragon legends",
            de: "Die Drachensagen",
          },
          body: {
            en: "Pilatus is also called the Dragon Mountain. Tales of dragons living in its caves were told in Lucerne for centuries. Look up at the ridge on a cloudy day and you will understand how it started.",
            de: "Der Pilatus heisst auch Drachenberg. In Luzern erzählte man sich über Jahrhunderte von Drachen in seinen Höhlen. Schauen Sie an einem Wolkentag zum Grat hinauf, und Sie verstehen, wie es anfing.",
          },
        },
        {
          photo: "keyring",
          title: {
            en: "A small mountain for your keys",
            de: "Ein kleiner Berg für Ihre Schlüssel",
          },
          body: {
            en: "The keyring is cast in brass in the outline of the Pilatus ridge. It is small enough to forget about, and heavy enough that you will notice it every time you reach for your keys.",
            de: "Der Schlüsselanhänger ist aus Messing in der Silhouette des Pilatus-Grats gegossen. Er ist klein genug, um ihn zu vergessen, und schwer genug, um ihn bei jedem Griff zum Schlüssel zu spüren.",
          },
        },
      ],
    }),
    slug: "pilatus-keyring",
    subcategoryId: "small-gifts",
    name: { en: "Pilatus keyring", de: "Pilatus Schlüsselanhänger" },
    story: {
      en: "A brass keyring shaped like Mount Pilatus.",
      de: "Ein Schlüsselanhänger aus Messing in Form des Pilatus.",
    },
    cancellationPolicy: standardCancellation,
    variants: [
      {
        id: "std",
        label: { en: "Brass", de: "Messing" },
        price: 1200,
        stock: 0,
      },
    ],
    preparationDays: 1,
    dayMode: "working-days",
    paymentPolicy: { kind: "full", firstDueHours: 24 },
    commissionRate: 0.1,
  },
  {
    id: "p-name-knife",
    photo: "engraving",
    photos: ["pocket-knife", "artisan-workshop"],
    longStory: storyFromChapters({
      title: {
        en: "A name on the blade",
        de: "Ein Name auf der Klinge",
      },
      chapters: [
        {
          photo: "engraving",
          title: {
            en: "Why we put names on things",
            de: "Warum wir Dinge beschriften",
          },
          body: {
            en: "A pocket knife is one of the few objects people carry for decades. Engraving a name turns it from a tool into a keepsake: it was yours, or it was a gift to you. In Switzerland, a good knife is often passed on, and the name is the first thing that tells the story.",
            de: "Ein Taschenmesser ist einer der wenigen Gegenstände, die man jahrzehntelang bei sich trägt. Mit einer Gravur wird aus dem Werkzeug ein Andenken: Es gehörte Ihnen, oder man hat es Ihnen geschenkt. In der Schweiz wird ein gutes Messer oft weitergegeben, und der Name erzählt als Erstes davon.",
          },
        },
        {
          photo: "artisan-workshop",
          title: {
            en: "Twelve characters",
            de: "Zwölf Zeichen",
          },
          body: {
            en: "There is room for up to twelve characters. That is enough for a first name, a nickname, or a short date. People often choose the name of the person who will carry it, and sometimes the name of the place where it was bought.",
            de: "Es ist Platz für bis zu zwölf Zeichen. Das reicht für einen Vornamen, einen Spitznamen oder ein kurzes Datum. Viele wählen den Namen der Person, die das Messer tragen wird, manchmal auch den Namen des Ortes, an dem es gekauft wurde.",
          },
        },
        {
          photo: "pocket-knife",
          title: {
            en: "Oak, worn in by use",
            de: "Eiche, vom Gebrauch geglättet",
          },
          body: {
            en: "The handle is oak. It starts crisp and lightly textured, and with use the wood darkens and softens where your thumb rests. After a year in a pocket it looks different from every other knife, which is the point.",
            de: "Der Griff ist aus Eiche. Anfangs ist er frisch und leicht strukturiert, mit der Zeit wird das Holz dunkler und weicher, dort wo der Daumen liegt. Nach einem Jahr in der Tasche sieht es anders aus als jedes andere Messer, und genau das ist der Sinn.",
          },
        },
      ],
    }),
    slug: "personal-name-knife",
    subcategoryId: "pocket-knives",
    name: { en: "Personal name knife", de: "Namensmesser" },
    story: {
      en: "A slim folding knife with an oak handle and room for up to 12 characters, engraved by hand.",
      de: "Ein schlankes Klappmesser mit Eichengriff und Platz für bis zu 12 Zeichen, von Hand graviert.",
    },
    cancellationPolicy: standardCancellation,
    variants: [
      { id: "oak", label: { en: "Oak", de: "Eiche" }, price: 6900, stock: 5 },
      // Shows the "variant not sold" state on C03.
      {
        id: "walnut",
        label: { en: "Walnut", de: "Nussbaum" },
        price: 7900,
        stock: 3,
        notForSale: true,
      },
    ],
    preparationDays: 3,
    dayMode: "working-days",
    paymentPolicy: { kind: "full", firstDueHours: 24 },
    commissionRate: 0.1,
    engraving: { maxLength: 12 },
  },
  {
    id: "p-candle-box",
    photo: "candle",
    photos: ["postcards"],
    longStory: storyFromChapters({
      title: {
        en: "An evening by the lake",
        de: "Ein Abend am See",
      },
      chapters: [
        {
          photo: "lake-steamboat",
          title: {
            en: "Light on the water",
            de: "Licht auf dem Wasser",
          },
          body: {
            en: "When the last steamers come in, Lake Lucerne turns the colour of the sky and the old town lights come on one by one. This box is made for that hour. Light the candle, put the postcards on the table, and the room starts to feel like the shore.",
            de: "Wenn die letzten Dampfschiffe einlaufen, nimmt der Vierwaldstättersee die Farbe des Himmels an, und in der Altstadt gehen die Lichter an. Diese Box ist für diese Stunde gemacht. Kerze anzünden, Postkarten auf den Tisch, und der Raum fühlt sich nach Ufer an.",
          },
        },
        {
          photo: "candle",
          title: {
            en: "Beeswax, slowly",
            de: "Bienenwachs, langsam",
          },
          body: {
            en: "The candle is made from beeswax by a Lucerne chandler. Beeswax burns slowly and gives a warm, steady flame. It smells faintly of honey, not of perfume, and it burns long enough to outlast the evening you lit it for.",
            de: "Die Kerze ist aus Bienenwachs und stammt von einer Luzerner Kerzenmacherin. Bienenwachs brennt langsam und gibt eine warme, ruhige Flamme. Sie duftet leicht nach Honig, nicht nach Parfüm, und ihr Licht überdauert den Abend, für den Sie sie angezündet haben.",
          },
        },
        {
          photo: "postcards",
          title: {
            en: "Two cards, kept in kraft",
            de: "Zwei Karten in Kraftpapier",
          },
          body: {
            en: "Two postcards of the lake come in the box, packed in plain kraft paper. Write one to someone at home, and keep the other for yourself. A card with a stamp on it travels slowly, and that is part of its charm.",
            de: "Zwei Postkarten vom See liegen in der Box, verpackt in schlichtes Kraftpapier. Schreiben Sie eine nach Hause und behalten Sie die andere für sich. Eine Karte mit Briefmarke reist langsam, und das gehört zu ihrem Charme.",
          },
        },
      ],
    }),
    slug: "lakeside-candle-box",
    subcategoryId: "gift-boxes",
    name: { en: "Lakeside candle box", de: "Kerzenbox Seeufer" },
    story: {
      en: "A beeswax candle from a Lucerne chandler with two postcards of the lake, packed in a kraft box.",
      de: "Eine Bienenwachskerze einer Luzerner Kerzenmacherin mit zwei Postkarten vom See, in einer Kraftpapierbox.",
    },
    cancellationPolicy: standardCancellation,
    variants: [
      {
        id: "std",
        label: { en: "Standard", de: "Standard" },
        price: 3400,
        stock: 8,
      },
    ],
    preparationDays: 1,
    dayMode: "calendar-days",
    paymentPolicy: { kind: "full", firstDueHours: 24 },
    commissionRate: 0.15,
  },
  {
    id: "p-chocolate-bars",
    photo: "chocolate-bar",
    longStory: storyFromChapters({
      title: {
        en: "Three bars, three moods",
        de: "Drei Tafeln, drei Stimmungen",
      },
      chapters: [
        {
          photo: "pralines",
          title: {
            en: "Seventy percent, and nothing else",
            de: "Siebzig Prozent, sonst nichts",
          },
          body: {
            en: "The first bar is 70% dark: cocoa, sugar and very little else. It is the one to try first, because there is nowhere for it to hide. A good dark bar should snap cleanly and melt slowly, and taste a little different at the end than at the start.",
            de: "Die erste Tafel hat 70 % Kakao: Kakao, Zucker und sonst fast nichts. Sie probieren Sie am besten zuerst, denn sie kann sich nirgends verstecken. Eine gute dunkle Tafel bricht sauber, schmilzt langsam und schmeckt am Ende ein wenig anders als am Anfang.",
          },
        },
        {
          photo: "chocolate-bar",
          title: {
            en: "Hazelnut and sea salt",
            de: "Haselnuss und Meersalz",
          },
          body: {
            en: "The other two bars add one thing each: roasted hazelnut, or a pinch of sea salt. The nut adds warmth, and the salt makes the cocoa taste louder.",
            de: "Die anderen beiden Tafeln fügen je eine Sache hinzu: geröstete Haselnuss oder eine Prise Meersalz. Die Nuss gibt Wärme, und das Salz lässt den Kakao lauter schmecken.",
          },
        },
        {
          photo: "gift-box",
          title: {
            en: "A small maker, a small batch",
            de: "Kleine Manufaktur, kleine Menge",
          },
          body: {
            en: "The bars come from a small Lucerne maker, not a factory line. Small batches mean small differences from one season to the next, and we think that is a good thing. Try the three side by side, and you will find a favourite quickly.",
            de: "Die Tafeln stammen von einer kleinen Luzerner Manufaktur, nicht vom Fliessband. Kleine Mengen bedeuten kleine Unterschiede von Saison zu Saison, und wir finden das gut. Probieren Sie die drei nebeneinander, und Sie haben schnell Ihre Lieblingstafel.",
          },
        },
      ],
    }),
    slug: "dark-chocolate-trio",
    subcategoryId: "chocolate",
    name: { en: "Dark chocolate trio", de: "Dunkles Schokoladentrio" },
    story: {
      en: "Three bars from a small Lucerne maker: 70% dark, dark with hazelnut, dark with sea salt.",
      de: "Drei Tafeln einer kleinen Luzerner Manufaktur: 70 % dunkel, dunkel mit Haselnuss, dunkel mit Meersalz.",
    },
    cancellationPolicy: standardCancellation,
    variants: [
      {
        id: "3",
        label: { en: "3 bars", de: "3 Tafeln" },
        price: 1800,
        stock: 20,
      },
    ],
    preparationDays: 1,
    dayMode: "calendar-days",
    paymentPolicy: { kind: "later", dueDaysAfterPickup: 2 },
    commissionRate: 0.15,
  },
  {
    id: "p-old-town-print",
    photo: "lucerne-old-town",
    longStory: storyFromChapters({
      title: {
        en: "The houses that tell stories",
        de: "Die Häuser, die Geschichten erzählen",
      },
      chapters: [
        {
          photo: "lucerne-old-town",
          title: {
            en: "Where Lucerne swore its oath",
            de: "Wo Luzern den Eid schwor",
          },
          body: {
            en: "The Weinmarkt is one of the old town’s best-known squares. In 1332 the people of Lucerne swore their alliance with Uri, Schwyz and Unterwalden here. A fountain has stood here since 1481, and you can still sit beside it and look at the painted façades around the square.",
            de: "Der Weinmarkt ist einer der bekanntesten Plätze der Altstadt. Hier schworen die Luzerner 1332 ihren Bund mit Uri, Schwyz und Unterwalden. Seit 1481 steht hier ein Brunnen, und noch heute kann man daneben sitzen und die bemalten Fassaden rund um den Platz betrachten.",
          },
        },
        {
          photo: "art-print",
          title: {
            en: "Painted so you would read the house",
            de: "Bemalt, damit man das Haus lesen kann",
          },
          body: {
            en: "Painted façades were once a way of showing who lived where and what the house stood for. Scenes, saints and trade signs covered the walls. Walking the old town is a little like reading a book printed on the buildings.",
            de: "Bemalte Fassaden zeigten einst, wer wo wohnte und wofür das Haus stand. Szenen, Heilige und Zunftzeichen bedeckten die Wände. Ein Gang durch die Altstadt ist ein bisschen wie das Lesen eines Buches, das auf die Häuser gedruckt wurde.",
          },
        },
        {
          photo: "postcards",
          title: {
            en: "On cotton paper",
            de: "Auf Baumwollpapier",
          },
          body: {
            en: "The print is 21 × 30 cm on cotton paper, which holds the soft colours of the façades better than ordinary card. Frame it, or just pin it where you will see it in the morning.",
            de: "Der Druck misst 21 × 30 cm auf Baumwollpapier, das die weichen Farben der Fassaden besser trägt als gewöhnlicher Karton. Rahmen Sie ihn, oder hängen Sie ihn dort auf, wo Sie ihn am Morgen sehen.",
          },
        },
      ],
    }),
    slug: "old-town-facades-print",
    subcategoryId: "prints",
    name: { en: "Old town façades print", de: "Druck Altstadtfassaden" },
    story: {
      en: "The painted façades of the Weinmarkt as a 21 × 30 cm print on cotton paper.",
      de: "Die bemalten Fassaden am Weinmarkt als Druck im Format 21 × 30 cm auf Baumwollpapier.",
    },
    cancellationPolicy: standardCancellation,
    variants: [
      {
        id: "a4",
        label: { en: "21 × 30 cm", de: "21 × 30 cm" },
        price: 3900,
        stock: 10,
      },
    ],
    preparationDays: 2,
    dayMode: "working-days",
    paymentPolicy: { kind: "full", firstDueHours: 24 },
    commissionRate: 0.15,
  },
  {
    id: "p-postcards",
    photo: "postcards",
    longStory: storyFromChapters({
      title: {
        en: "Eight small windows onto Lucerne",
        de: "Acht kleine Fenster auf Luzern",
      },
      chapters: [
        {
          photo: "musegg-wall",
          title: {
            en: "From the towers",
            de: "Von den Türmen aus",
          },
          body: {
            en: "The set starts on the Musegg Wall, the old town wall with nine towers still standing. The Zytturm clock there dates from 1535 and is said to strike the hour a minute before the others in town. The illustrator drew the towers as you would see them, walking up from the lake.",
            de: "Das Set beginnt auf der Museggmauer, der alten Stadtmauer mit neun noch stehenden Türmen. Die Uhr im Zytturm stammt von 1535 und soll die Stunde eine Minute vor allen anderen in der Stadt schlagen. Die Illustratorin hat die Türme gezeichnet, wie man sie beim Aufstieg vom See sieht.",
          },
        },
        {
          photo: "postcards",
          title: {
            en: "A hand that remembers",
            de: "Eine Hand, die sich erinnert",
          },
          body: {
            en: "Each card is drawn, not photographed. A drawing keeps what a photo drops: the slight tilt of a roof, the swan that was there for a second. The eight scenes lead you from the towers to the lake.",
            de: "Jede Karte ist gezeichnet, nicht fotografiert. Eine Zeichnung behält, was ein Foto weglässt: die leichte Neigung eines Dachs, den Schwan, der nur kurz da war. Die acht Szenen führen Sie von den Türmen bis zum See.",
          },
        },
        {
          photo: "lake-steamboat",
          title: {
            en: "Write one, keep one",
            de: "Eine schreiben, eine behalten",
          },
          body: {
            en: "Send seven and keep one. It costs less than a coffee, and it will be on someone’s fridge long after the trip is over.",
            de: "Schicken Sie sieben und behalten Sie eine. Das kostet weniger als ein Kaffee, und sie hängt noch lange nach der Reise am Kühlschrank von jemandem.",
          },
        },
      ],
    }),
    slug: "lucerne-postcard-set",
    subcategoryId: "small-gifts",
    name: { en: "Lucerne postcard set", de: "Luzerner Postkartenset" },
    story: {
      en: "Eight postcards drawn by a local illustrator, from the Musegg towers to the lake.",
      de: "Acht Postkarten einer lokalen Illustratorin, von den Musegg-Türmen bis zum See.",
    },
    cancellationPolicy: standardCancellation,
    variants: [
      {
        id: "8",
        label: { en: "8 cards", de: "8 Karten" },
        price: 1400,
        stock: 30,
      },
    ],
    preparationDays: 1,
    dayMode: "calendar-days",
    paymentPolicy: { kind: "full", firstDueHours: 24 },
    commissionRate: 0.1,
  },
  {
    id: "p-swiss-chocolate-box",
    photo: "pralines",
    photos: ["chocolate-bar"],
    longStory: storyFromChapters({
      title: {
        en: "A box worth keeping",
        de: "Eine Box zum Aufbewahren",
      },
      chapters: [
        {
          photo: "engraving",
          title: {
            en: "Burned into the lid",
            de: "In den Deckel gebrannt",
          },
          body: {
            en: "The lid is wood, and the Chapel Bridge is burned into it, line by line. A burned line does not rub off. The bridge stays sharp on the lid for as long as the box exists.",
            de: "Der Deckel ist aus Holz, und die Kapellbrücke ist Linie für Linie hineingebrannt. Eine eingebrannte Linie wischt nicht ab. Die Brücke bleibt auf dem Deckel scharf, solange es die Box gibt.",
          },
        },
        {
          photo: "pralines",
          title: {
            en: "Twenty-four pralines",
            de: "Vierundzwanzig Pralinen",
          },
          body: {
            en: "Inside are twenty-four pralines. Eat them over a few days, or share them at one table. Chocolate this fine is meant to be eaten slowly, one at a time.",
            de: "Darin liegen vierundzwanzig Pralinen. Essen Sie sie über ein paar Tage, oder teilen Sie sie an einem Tisch. So feine Schokolade isst man langsam, eine nach der anderen.",
          },
        },
        {
          photo: "gift-box",
          title: {
            en: "After the pralines",
            de: "Nach den Pralinen",
          },
          body: {
            en: "When the last praline is gone, the box stays. People keep jewellery in them, or letters, or small things from the trip. A box with a bridge on it gets reused more often than thrown out.",
            de: "Wenn die letzte Praline weg ist, bleibt die Box. Manche bewahren darin Schmuck auf, Briefe oder kleine Dinge von der Reise. Eine Box mit einer Brücke darauf wird öfter wiederverwendet als weggeworfen.",
          },
        },
      ],
    }),
    slug: "praline-gift-box",
    subcategoryId: "gift-boxes",
    name: { en: "Praline gift box", de: "Pralinen-Geschenkbox" },
    story: {
      en: "Twenty-four pralines in a wooden box with the Chapel Bridge burned into the lid.",
      de: "Vierundzwanzig Pralinen in einer Holzbox mit der Kapellbrücke auf dem Deckel.",
    },
    cancellationPolicy: standardCancellation,
    variants: [
      {
        id: "24",
        label: { en: "24 pieces", de: "24 Stück" },
        price: 7900,
        stock: 4,
      },
    ],
    preparationDays: 2,
    dayMode: "calendar-days",
    paymentPolicy: {
      kind: "deposit",
      depositPercent: 30,
      firstDueHours: 24,
      balanceDueDaysAfterPickup: 4,
    },
    commissionRate: 0.15,
  },
];

/**
 * Seed for demo data only. Screens read `state.data.pickupPlaces`, so M14 edits show on
 * C03, C15 and the mails (outline D4).
 */
export const pickupPlaceSeed: PickupPlace[] = [
  {
    id: "altstadt",
    name: { en: "Shop Altstadt", de: "Laden Altstadt" },
    address: "Kornmarkt 9, 6004 Luzern",
    openingHours: { en: "Mon–Sat 10:00–18:30", de: "Mo–Sa 10:00–18:30" },
    instructions: {
      en: "Show your order reference at the counter.",
      de: "Zeigen Sie Ihre Bestellnummer an der Kasse.",
    },
  },
  {
    id: "bahnhof",
    name: { en: "Pickup point Bahnhof", de: "Abholstelle Bahnhof" },
    address: "Zentralstrasse 1, 6003 Luzern",
    openingHours: {
      en: "Mon–Fri 08:00–19:00, Sat 09:00–17:00",
      de: "Mo–Fr 08:00–19:00, Sa 09:00–17:00",
    },
    instructions: {
      en: "Locker desk next to the main hall. Bring your order reference.",
      de: "Schalter neben der Haupthalle. Bringen Sie Ihre Bestellnummer mit.",
    },
  },
];

/** Reviews written for the demo path (S4, AC17). */
const featuredReviews: Review[] = [
  {
    id: "r1",
    productId: "p-knife",
    guestName: "Marie D.",
    rating: 5,
    text: {
      en: "Picked it up the day before our train. The engraving is neat and the shop was lovely.",
      de: "Am Tag vor unserer Zugfahrt abgeholt. Die Gravur ist sauber und der Laden sehr schön.",
    },
    // After Marie's order SK-1017 was completed (AC17: reviews only after completion).
    createdAt: demoAt({ days: -1, hours: 4 }),
    purchasedAt: demoAt({ days: -3, hours: 4 }),
    // The one gift review with a shop reply, shown beside reviews without one (spec §4.11).
    reply: {
      text: "Thank you, Marie. We are glad the knife was ready before your train. Safe travels!",
      language: "en",
      by: shop.ownerName,
      at: demoAt({ days: -1, hours: 6 }),
    },
  },
  {
    id: "r2",
    productId: "p-knife",
    guestName: "Kenji T.",
    rating: 4,
    text: {
      en: "A good gift for my father. I wish the large size had a second colour.",
      de: "Ein gutes Geschenk für meinen Vater. Die grosse Ausführung hätte ich gern in einer zweiten Farbe.",
    },
    createdAt: demoAt({ days: -21 }),
    purchasedAt: demoAt({ days: -23 }),
  },
  {
    id: "r3",
    productId: "p-giftbox",
    guestName: "Sofia R.",
    rating: 5,
    text: {
      en: "Lovely mix of small things, and the biscuits did not last the train ride home.",
      de: "Eine schöne Mischung kleiner Dinge, und das Gebäck hat die Zugfahrt nicht überlebt.",
    },
    createdAt: demoAt({ days: -15 }),
    purchasedAt: demoAt({ days: -17 }),
  },
  {
    id: "r4",
    productId: "p-giftbox",
    guestName: "Daniel M.",
    rating: 4,
    text: {
      en: "Nicely packed. The candle smells of honey.",
      de: "Schön verpackt. Die Kerze riecht nach Honig.",
    },
    createdAt: demoAt({ days: -30 }),
    purchasedAt: demoAt({ days: -32 }),
  },
  {
    id: "r5",
    productId: "p-chocolate",
    guestName: "Yuki T.",
    rating: 5,
    text: {
      en: "Twelve pralines, each different. Picked up the next morning without any fuss.",
      de: "Zwölf Pralinen, jede anders. Am nächsten Morgen problemlos abgeholt.",
    },
    createdAt: demoAt({ days: -12 }),
    purchasedAt: demoAt({ days: -14 }),
  },
  {
    id: "r6",
    productId: "p-candle-box",
    guestName: "Lena K.",
    rating: 4,
    text: {
      en: "A calm little gift. I would have liked a third postcard.",
      de: "Ein ruhiges kleines Geschenk. Eine dritte Postkarte hätte mir gefallen.",
    },
    createdAt: demoAt({ days: -6 }),
    purchasedAt: demoAt({ days: -8 }),
  },
];

/**
 * Sample reviews so every gift has 5–10 (owner request 13.10.2026). Texts come from a
 * pool per category, rotated per product; every third review carries guest photos
 * (stand-in shots from src/assets/photos). Ratings are mixed so averages differ.
 */
type PoolEntry = { rating: Review["rating"]; text: LocalizedText };

const reviewPools: Record<string, PoolEntry[]> = {
  "pocket-knives": [
    {
      rating: 5,
      text: {
        en: "The name came out crisp and even. We collected it on our last morning.",
        de: "Der Name ist sauber und gleichmässig graviert. Wir haben es am letzten Morgen abgeholt.",
      },
    },
    {
      rating: 5,
      text: {
        en: "Solid in the hand and smaller than I expected, which suits a pocket. My brother loved it.",
        de: "Liegt gut in der Hand und ist kleiner als gedacht, passt also in jede Tasche. Mein Bruder war begeistert.",
      },
    },
    {
      rating: 5,
      text: {
        en: "They showed me the engraving before wrapping it. A lovely touch.",
        de: "Man hat mir die Gravur vor dem Einpacken gezeigt. Ein schönes Detail.",
      },
    },
    {
      rating: 3,
      text: {
        en: "Good knife, but the box felt a bit plain for the price.",
        de: "Gutes Messer, aber die Schachtel wirkte für den Preis etwas schlicht.",
      },
    },
    {
      rating: 5,
      text: {
        en: "Picked it up on the way to the station. Ready on the confirmed day, no waiting.",
        de: "Auf dem Weg zum Bahnhof abgeholt. Am bestätigten Tag bereit, ohne Wartezeit.",
      },
    },
    {
      rating: 4,
      text: {
        en: "Bought two for my sons with their initials. Both look great, the small one is a bit light.",
        de: "Zwei für meine Söhne mit ihren Initialen gekauft. Beide sehen toll aus, das kleine ist etwas leicht.",
      },
    },
    {
      rating: 5,
      text: {
        en: "The bridge etching is finer than in the photos.",
        de: "Die Brücke auf dem Griff ist feiner als auf den Fotos.",
      },
    },
    {
      rating: 4,
      text: {
        en: "Took three working days, as the page said. Worth planning for if you are only in town briefly.",
        de: "Hat wie angegeben drei Arbeitstage gedauert. Lohnt sich einzuplanen, wenn man nur kurz in der Stadt ist.",
      },
    },
  ],
  "gift-boxes": [
    {
      rating: 5,
      text: {
        en: "Everything inside was clearly chosen with care. The candle smells wonderful.",
        de: "Alles in der Box ist mit Sorgfalt ausgewählt. Die Kerze duftet wunderbar.",
      },
    },
    {
      rating: 5,
      text: {
        en: "A good gift for my colleagues at home, and it fits in a suitcase easily.",
        de: "Ein gutes Geschenk für die Kolleginnen zu Hause, und es passt gut in den Koffer.",
      },
    },
    {
      rating: 4,
      text: {
        en: "Paying a deposit first felt unusual, but the shop explained it clearly.",
        de: "Die Anzahlung war zuerst ungewohnt, aber der Laden hat es gut erklärt.",
      },
    },
    {
      rating: 4,
      text: {
        en: "Beautifully wrapped. I would have liked a small card with the makers’ names.",
        de: "Schön verpackt. Eine kleine Karte mit den Namen der Hersteller hätte ich mir gewünscht.",
      },
    },
    {
      rating: 5,
      text: {
        en: "The biscuits were gone before we reached Zurich.",
        de: "Das Gebäck war weg, bevor wir in Zürich ankamen.",
      },
    },
    {
      rating: 5,
      text: {
        en: "Collected it at the station pickup point, quick and friendly.",
        de: "An der Abholstelle am Bahnhof abgeholt, schnell und freundlich.",
      },
    },
    {
      rating: 3,
      text: {
        en: "Nice mix, but smaller than I imagined for the price.",
        de: "Schöne Mischung, aber für den Preis kleiner als gedacht.",
      },
    },
    {
      rating: 5,
      text: {
        en: "My mother keeps the box on her shelf now.",
        de: "Meine Mutter hat die Box jetzt im Regal stehen.",
      },
    },
  ],
  chocolate: [
    {
      rating: 5,
      text: {
        en: "Fresh and not too sweet. The hazelnut one was my favourite.",
        de: "Frisch und nicht zu süss. Die mit Haselnuss war mein Favorit.",
      },
    },
    {
      rating: 4,
      text: {
        en: "Survived a warm train ride in my bag without melting.",
        de: "Hat eine warme Zugfahrt in der Tasche ohne zu schmelzen überstanden.",
      },
    },
    {
      rating: 5,
      text: {
        en: "Paying after pickup was easy, I paid at the counter.",
        de: "Bezahlen nach der Abholung war einfach, ich habe an der Kasse bezahlt.",
      },
    },
    {
      rating: 4,
      text: {
        en: "Lovely, though I wish there was a list of the flavours.",
        de: "Sehr fein, eine Liste der Sorten hätte ich mir aber gewünscht.",
      },
    },
    {
      rating: 5,
      text: {
        en: "Bought one set and came back for a second the next day.",
        de: "Ein Set gekauft und am nächsten Tag ein zweites geholt.",
      },
    },
    {
      rating: 3,
      text: {
        en: "Good quality, but pricey compared with the supermarket.",
        de: "Gute Qualität, aber teuer im Vergleich zum Supermarkt.",
      },
    },
    {
      rating: 5,
      text: {
        en: "The packaging looks like a real Lucerne souvenir.",
        de: "Die Verpackung sieht aus wie ein echtes Luzerner Andenken.",
      },
    },
    {
      rating: 5,
      text: {
        en: "Ready the next morning, on the day the shop confirmed.",
        de: "Am nächsten Morgen bereit, am Tag, den der Laden bestätigt hatte.",
      },
    },
  ],
  prints: [
    {
      rating: 5,
      text: {
        en: "The colours are softer and nicer than on screen.",
        de: "Die Farben sind weicher und schöner als am Bildschirm.",
      },
    },
    {
      rating: 5,
      text: {
        en: "Packed flat between two boards and made it home without a crease.",
        de: "Flach zwischen zwei Kartons verpackt und ohne Knick nach Hause gekommen.",
      },
    },
    {
      rating: 5,
      text: {
        en: "Framed it the week we got back. It brings the trip back every day.",
        de: "Gleich nach der Rückkehr gerahmt. Erinnert jeden Tag an die Reise.",
      },
    },
    {
      rating: 4,
      text: {
        en: "Excellent paper. Slightly smaller than I pictured.",
        de: "Ausgezeichnetes Papier. Etwas kleiner als gedacht.",
      },
    },
    {
      rating: 5,
      text: {
        en: "Signed by the illustrator, which makes it special.",
        de: "Von der Illustratorin signiert, das macht es besonders.",
      },
    },
    {
      rating: 4,
      text: {
        en: "Hard to choose between the prints. We will come back for another.",
        de: "Die Wahl fiel schwer. Wir kommen für einen zweiten wieder.",
      },
    },
    {
      rating: 3,
      text: {
        en: "Good, but I would have liked a frame option.",
        de: "Gut, aber eine Rahmenoption hätte ich mir gewünscht.",
      },
    },
    {
      rating: 5,
      text: {
        en: "Wrapped with care, with a sheet of tissue paper inside.",
        de: "Sorgfältig eingepackt, mit Seidenpapier dazwischen.",
      },
    },
  ],
  "small-gifts": [
    {
      rating: 5,
      text: {
        en: "Cute and light, perfect for friends back home.",
        de: "Hübsch und leicht, ideal für Freunde zu Hause.",
      },
    },
    {
      rating: 4,
      text: {
        en: "Feels sturdy and well finished.",
        de: "Fühlt sich robust und gut verarbeitet an.",
      },
    },
    {
      rating: 5,
      text: {
        en: "Bought several as small thank-you gifts.",
        de: "Mehrere als kleine Dankeschöns gekauft.",
      },
    },
    {
      rating: 5,
      text: {
        en: "Lovely drawings. The Musegg towers are my favourite.",
        de: "Schöne Zeichnungen. Die Musegg-Türme gefallen mir am besten.",
      },
    },
    {
      rating: 4,
      text: { en: "Simple but well made.", de: "Schlicht, aber gut gemacht." },
    },
    {
      rating: 3,
      text: {
        en: "A little expensive for what it is.",
        de: "Für das, was es ist, etwas teuer.",
      },
    },
    {
      rating: 5,
      text: {
        en: "Fits in a pocket, exactly what I wanted.",
        de: "Passt in die Tasche, genau was ich wollte.",
      },
    },
    {
      rating: 5,
      text: {
        en: "Easy pickup on the way to the boat.",
        de: "Einfache Abholung auf dem Weg zum Schiff.",
      },
    },
  ],
};

const reviewPhotos: Record<string, string[][]> = {
  "pocket-knives": [["engraving", "pocket-knife"], ["pocket-knife"]],
  "gift-boxes": [["gift-box", "candle"], ["postcards"]],
  chocolate: [["pralines"], ["chocolate-bar", "pralines"]],
  prints: [["art-print", "lucerne-old-town"], ["lucerne-kapellbruecke-1200"]],
  "small-gifts": [["keyring"], ["postcards", "lucerne-old-town"]],
};

const reviewerNames = [
  "Emma W.",
  "Lucas B.",
  "Aiko S.",
  "Chen L.",
  "Olivia P.",
  "Mateo G.",
  "Hannah K.",
  "Priya N.",
  "Tom H.",
  "Isabelle R.",
  "Jonas F.",
  "Mei L.",
  "Noah D.",
  "Sara M.",
  "Ravi K.",
  "Julia S.",
  "Ben A.",
  "Clara V.",
];

const sampleReviews: Review[] = products.flatMap((product, productIndex) => {
  const pool = reviewPools[product.subcategoryId];
  const photoSets = reviewPhotos[product.subcategoryId];
  // A sub-category the merchant added after the seed has no sample reviews.
  if (!pool || !photoSets) return [];
  const existing = featuredReviews.filter(
    (r) => r.productId === product.id,
  ).length;
  // 5–10 per gift in total, varied per product.
  const count = 5 + ((productIndex * 7) % 6) - existing;

  return Array.from({ length: Math.max(0, count) }, (_, i) => {
    const entry = pool[(i + productIndex * 3) % pool.length];

    return {
      id: `s-${product.id}-${i}`,
      productId: product.id,
      guestName:
        reviewerNames[(i * 5 + productIndex * 7) % reviewerNames.length],
      rating: entry.rating,
      text: entry.text,
      createdAt: demoAt({ days: -(2 + i * 11 + productIndex * 2) }),
      // Picked up and completed one to four days before the review.
      purchasedAt: demoAt({
        days: -(2 + i * 11 + productIndex * 2) - 1 - ((i + productIndex) % 4),
      }),
      ...(i % 3 === 1 && {
        photos: photoSets[(i + productIndex) % photoSets.length],
      }),
    };
  });
});

export const reviews: Review[] = [...featuredReviews, ...sampleReviews];
