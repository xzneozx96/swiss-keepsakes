import type { LocalizedText, Product } from "./types";

import { storyFromChapters } from "@/lib/rich-text";

/**
 * The Victorinox range (owner request 16.10.2026): twelve Luzerne and Alpine designs, each
 * an ordinary keepsake with its own story. Every design comes in three sizes, which are
 * three genuine Victorinox models (specifications and photos from victorinox.com):
 * Classic SD 58 mm, Spartan 91 mm and Picknicker 111 mm. The shop engraves a name and a
 * date on the back. The designs are the client's own concepts (concept art from their
 * boards, not photos of real knives, and not Victorinox catalogue items); who prints them is
 * still to be confirmed. Prices are sample values.
 */

const knifePhotos = [
  "victorinox-classic-sd",
  "victorinox-spartan",
  "victorinox-picknicker",
];

const variants: Product["variants"] = [
  {
    id: "s",
    label: { en: "Small · 58 mm Classic SD", de: "Klein · 58 mm Classic SD" },
    price: 4900,
    stock: 6,
  },
  {
    id: "m",
    label: { en: "Medium · 91 mm Spartan", de: "Mittel · 91 mm Spartan" },
    price: 5400,
    stock: 4,
  },
  {
    id: "l",
    label: {
      en: "Large · 111 mm Picknicker",
      de: "Gross · 111 mm Picknicker",
    },
    price: 6400,
    stock: 2,
  },
];

const aboutTheKnife: LocalizedText = {
  en: "Victorinox has made its knives in Ibach, in the canton of Schwyz, since 1884, and every one carries a lifetime warranty against defects in material and workmanship. The small size is the 58 mm Classic SD (7 functions, 21 g), small enough for a keyring. The medium is the 91 mm Spartan (12 functions, 59 g), with a corkscrew and a can opener. The large is the 111 mm Picknicker (11 functions, 105 g), with a lockable blade.\n\nOn the back the shop engraves a name and a date, up to 20 characters. Pocket knives are not allowed in cabin baggage, so pack it in your checked luggage.",
  de: "Victorinox stellt seine Messer seit 1884 in Ibach im Kanton Schwyz her, und auf jedes gibt es lebenslang Garantie auf Material- und Verarbeitungsfehler. Die kleine Grösse ist das 58 mm lange Classic SD (7 Funktionen, 21 g), klein genug für den Schlüsselbund. Die mittlere ist das 91 mm lange Spartan (12 Funktionen, 59 g) mit Korkenzieher und Dosenöffner. Die grosse ist das 111 mm lange Picknicker (11 Funktionen, 105 g) mit feststellbarer Klinge.\n\nAuf der Rückseite graviert der Laden einen Namen und ein Datum, bis zu 20 Zeichen. Taschenmesser sind im Handgepäck nicht erlaubt, packen Sie es also in den aufgegebenen Koffer.",
};

interface Design {
  id: string;
  slug: string;
  photo: string;
  extraPhoto: string;
  name: LocalizedText;
  story: LocalizedText;
  chapterTitle: LocalizedText;
  chapterBody: LocalizedText;
  onKnifeTitle: LocalizedText;
  onKnifeBody: LocalizedText;
  storyTitle: LocalizedText;
}

const designs: Design[] = [
  {
    id: "p-vx-swan",
    slug: "victorinox-swan",
    photo: "lucerne-swan",
    extraPhoto: "lucerne-kapellbruecke-1200",
    name: {
      en: "Victorinox Swan on the lake",
      de: "Victorinox Schwan auf dem See",
    },
    story: {
      en: "The white swans of Lake Luzerne on a genuine Swiss Army Knife, with your name and a date on the back.",
      de: "Die weissen Schwäne des Vierwaldstättersees auf einem echten Schweizer Taschenmesser, mit Ihrem Namen und einem Datum auf der Rückseite.",
    },
    storyTitle: {
      en: "The swans of Lake Luzerne",
      de: "Die Schwäne vom Vierwaldstättersee",
    },
    chapterTitle: { en: "A gift from a king", de: "Das Geschenk eines Königs" },
    chapterBody: {
      en: "Local history says the swans began in 1690, when Louis XIV of France rewarded Ludwig Christoph Pfyffer von Wyher, a Luzerne captain in the Swiss Guard, with four white swans. He gave them to the city, and the town soon passed rules to protect them.\n\nToday you meet them along the lakefront and by the Chapel Bridge. The city asks visitors not to feed them, because bread makes them bold and unhealthy, so watch from a distance.",
      de: "Die Lokalgeschichte erzählt, dass alles 1690 begann, als Ludwig XIV. von Frankreich den Luzerner Schweizergardehauptmann Ludwig Christoph Pfyffer von Wyher mit vier weissen Schwänen belohnte. Er schenkte sie der Stadt, und bald erliess Luzern Regeln zu ihrem Schutz.\n\nHeute begegnen Sie ihnen am Seeufer und bei der Kapellbrücke. Die Stadt bittet darum, sie nicht zu füttern, weil Brot sie aufdringlich und krank macht, schauen Sie also aus der Ferne zu.",
    },
    onKnifeTitle: { en: "Why a swan", de: "Warum ein Schwan" },
    onKnifeBody: {
      en: "A swan on calm water is what most people remember of an evening in Luzerne. This design keeps that moment small enough for a pocket.",
      de: "Ein Schwan auf ruhigem Wasser ist das, woran sich die meisten nach einem Abend in Luzern erinnern. Dieses Design hält den Moment klein genug für die Tasche.",
    },
  },
  {
    id: "p-vx-chapel-bridge",
    slug: "victorinox-chapel-bridge",
    photo: "lucerne-kapellbruecke-1200",
    extraPhoto: "lucerne-night",
    name: { en: "Victorinox Chapel Bridge", de: "Victorinox Kapellbrücke" },
    story: {
      en: "The Chapel Bridge and the Water Tower on a genuine Swiss Army Knife, with your name and a date on the back.",
      de: "Die Kapellbrücke und der Wasserturm auf einem echten Schweizer Taschenmesser, mit Ihrem Namen und einem Datum auf der Rückseite.",
    },
    storyTitle: {
      en: "The bridge on the handle",
      de: "Die Brücke auf dem Griff",
    },
    chapterTitle: {
      en: "The bridge that was rebuilt",
      de: "Die Brücke, die neu entstand",
    },
    chapterBody: {
      en: "The Chapel Bridge crosses the Reuss where the river leaves the lake. It was once part of the town’s defences, and so was the eight-sided Water Tower beside it, which is the older of the two. Triangular paintings hang under the roof.\n\nIn the night of 18 August 1993 a fire destroyed much of the bridge and about two thirds of its paintings. Luzerne rebuilt it in eight months and reopened it on 14 April 1994.",
      de: "Die Kapellbrücke führt über die Reuss, dort wo der Fluss den See verlässt. Sie gehörte einst zur Stadtbefestigung, ebenso der achteckige Wasserturm daneben, der älter ist als die Brücke. Unter dem Dach hängen dreieckige Bilder.\n\nIn der Nacht auf den 18. August 1993 zerstörte ein Brand grosse Teile der Brücke und rund zwei Drittel der Bilder. Luzern baute sie in acht Monaten wieder auf und eröffnete sie am 14. April 1994 neu.",
    },
    onKnifeTitle: { en: "Why the bridge", de: "Warum die Brücke" },
    onKnifeBody: {
      en: "It is the one picture of Luzerne everybody knows. On the knife it sits on the front of the handle, as you see it from the Rathausquai.",
      de: "Es ist das Bild von Luzern, das alle kennen. Auf dem Messer steht es vorne auf dem Griff, so wie man es vom Rathausquai sieht.",
    },
  },
  {
    id: "p-vx-pilatus",
    slug: "victorinox-pilatus",
    photo: "pilatus",
    extraPhoto: "lucerne-kapellbruecke-1200",
    name: { en: "Victorinox Pilatus", de: "Victorinox Pilatus" },
    story: {
      en: "Mount Pilatus and the Dragon Ride cable car on a genuine Swiss Army Knife, with your name and a date on the back.",
      de: "Der Pilatus und die Luftseilbahn Dragon Ride auf einem echten Schweizer Taschenmesser, mit Ihrem Namen und einem Datum auf der Rückseite.",
    },
    storyTitle: { en: "The mountain of dragons", de: "Der Drachenberg" },
    chapterTitle: {
      en: "Dragons and a steep railway",
      de: "Drachen und eine steile Bahn",
    },
    chapterBody: {
      en: "Pilatus was once feared. Luzerne forbade climbing it in the Middle Ages, and people told of dragons in its caves. A dragon stone said to have fallen in 1421 is kept in Luzerne’s nature museum.\n\nThe mountain is also a place of engineering. The Pilatus Railway opened in 1889 and is still the steepest cogwheel railway in the world, with a gradient of up to 48 per cent. From Fräkmüntegg the Dragon Ride cable car reaches the summit at 2,132 m in about three and a half minutes.",
      de: "Der Pilatus wurde einst gefürchtet. Im Mittelalter verbot Luzern die Besteigung, und man erzählte von Drachen in den Höhlen. Ein Drachenstein, der 1421 gefallen sein soll, liegt im Natur-Museum Luzern.\n\nDer Berg ist auch ein Ort der Technik. Die Pilatusbahn wurde 1889 eröffnet und ist bis heute die steilste Zahnradbahn der Welt, mit bis zu 48 Prozent Steigung. Ab Fräkmüntegg erreicht die Luftseilbahn Dragon Ride den Gipfel auf 2132 m in etwa dreieinhalb Minuten.",
    },
    onKnifeTitle: { en: "Why Pilatus", de: "Warum der Pilatus" },
    onKnifeBody: {
      en: "From almost anywhere in Luzerne you can see it, and many guests go up at least once. The red cabin on the front is the Dragon Ride.",
      de: "Man sieht ihn von fast überall in Luzern, und viele fahren mindestens einmal hinauf. Die rote Kabine vorne ist die Dragon Ride.",
    },
  },
  {
    id: "p-vx-lion",
    slug: "victorinox-lion",
    photo: "lion-monument",
    extraPhoto: "musegg-wall",
    name: { en: "Victorinox Lion Monument", de: "Victorinox Löwendenkmal" },
    story: {
      en: "The dying lion of Luzerne on a genuine Swiss Army Knife, with your name and a date on the back.",
      de: "Der sterbende Löwe von Luzern auf einem echten Schweizer Taschenmesser, mit Ihrem Namen und einem Datum auf der Rückseite.",
    },
    storyTitle: { en: "The lion who remembers", de: "Der Löwe, der erinnert" },
    chapterTitle: { en: "Carved into the rock", de: "In den Fels gehauen" },
    chapterBody: {
      en: "The Lion Monument remembers the Swiss Guards who died in Paris on 10 August 1792, defending the Tuileries Palace in the French Revolution. The Danish sculptor Bertel Thorvaldsen designed it, and it was carved into a sandstone cliff in 1820 and 1821.\n\nThe lion is wounded, a broken spear in his side, one paw on a shield. The writer Mark Twain called it the saddest and most moving piece of stone in the world.",
      de: "Das Löwendenkmal erinnert an die Schweizergardisten, die am 10. August 1792 in Paris bei der Verteidigung des Tuilerienpalasts in der Französischen Revolution starben. Der dänische Bildhauer Bertel Thorvaldsen entwarf es, und 1820 und 1821 wurde es in eine Sandsteinwand gehauen.\n\nDer Löwe ist verwundet, ein abgebrochener Speer steckt in seiner Seite, eine Pranke ruht auf einem Schild. Der Schriftsteller Mark Twain nannte es das traurigste und bewegendste Stück Stein der Welt.",
    },
    onKnifeTitle: { en: "Why the lion", de: "Warum der Löwe" },
    onKnifeBody: {
      en: "A pocket knife is something people keep for decades, and the lion is a monument to keeping faith. The design is in grey stone tones, with ivy at the edge of the rock.",
      de: "Ein Taschenmesser behalten Menschen jahrzehntelang, und der Löwe ist ein Denkmal der Treue. Das Design ist in grauen Steintönen gehalten, mit Efeu am Rand des Felsens.",
    },
  },
  {
    id: "p-vx-old-town",
    slug: "victorinox-old-town",
    photo: "jesuit-church",
    extraPhoto: "lucerne-old-town",
    name: {
      en: "Victorinox Old town on the Reuss",
      de: "Victorinox Altstadt an der Reuss",
    },
    story: {
      en: "The old town houses and the Jesuit Church by the Reuss on a genuine Swiss Army Knife, with your name and a date on the back.",
      de: "Die Altstadthäuser und die Jesuitenkirche an der Reuss auf einem echten Schweizer Taschenmesser, mit Ihrem Namen und einem Datum auf der Rückseite.",
    },
    storyTitle: {
      en: "The old town on the river",
      de: "Die Altstadt am Fluss",
    },
    chapterTitle: {
      en: "Twin towers by the water",
      de: "Zwei Türme am Wasser",
    },
    chapterBody: {
      en: "The two green onion-dome towers of the Jesuit Church stand right beside the Reuss. The foundation stone was laid on 3 December 1666 and the church was consecrated on 29 August 1677. It was the first large Baroque church in Switzerland. The domes were added only in 1893.\n\nAlong the river, the old town’s painted houses stand shoulder to shoulder. Go early, before the shops open, when the quay is quiet and the colours show best.",
      de: "Die beiden grünen Zwiebeltürme der Jesuitenkirche stehen unmittelbar an der Reuss. Der Grundstein wurde am 3. Dezember 1666 gelegt, die Kirche am 29. August 1677 geweiht. Es war die erste grosse Barockkirche der Schweiz. Die Kuppeln kamen erst 1893 dazu.\n\nAm Fluss stehen die bemalten Häuser der Altstadt Schulter an Schulter. Gehen Sie früh, bevor die Läden öffnen, wenn der Quai still ist und die Farben am besten wirken.",
    },
    onKnifeTitle: { en: "Why the old town", de: "Warum die Altstadt" },
    onKnifeBody: {
      en: "It is where the Victorinox store sits too, on Hirschenplatz, in the same row of old façades. The design shows the old town as it looks from the river.",
      de: "Hier liegt auch der Victorinox Store am Hirschenplatz, in derselben Reihe alter Fassaden. Das Design zeigt die Altstadt, wie man sie vom Fluss aus sieht.",
    },
  },
  {
    id: "p-vx-steamboat",
    slug: "victorinox-steamboat",
    photo: "lake-steamboat",
    extraPhoto: "lucerne-water-tower",
    name: { en: "Victorinox Paddle steamer", de: "Victorinox Raddampfer" },
    story: {
      en: "A historic Lake Luzerne paddle steamer on a genuine Swiss Army Knife, with your name and a date on the back.",
      de: "Ein historischer Raddampfer vom Vierwaldstättersee auf einem echten Schweizer Taschenmesser, mit Ihrem Namen und einem Datum auf der Rückseite.",
    },
    storyTitle: { en: "Five paddle steamers", de: "Fünf Raddampfer" },
    chapterTitle: {
      en: "The steamers of the lake",
      de: "Die Dampfer des Sees",
    },
    chapterBody: {
      en: "Luzerne’s first paddle steamer, the Stadt Luzern, sailed in 1837. Today five historic steamers still run, all built between 1901 and 1928: the Uri, the oldest paddle steamer in Switzerland, then the Unterwalden, the Schiller, the Gallia and the Stadt Luzern, the flagship.\n\nIn the 1950s and 60s plans to replace them with motor boats met resistance, and a preservation society was founded to keep them. On 2 May 1980 Queen Elizabeth II crossed the lake on the Stadt Luzern.",
      de: "Luzerns erster Raddampfer, die «Stadt Luzern», fuhr 1837. Heute sind noch fünf historische Dampfer unterwegs, alle zwischen 1901 und 1928 gebaut: die «Uri», der älteste Raddampfer der Schweiz, dann «Unterwalden», «Schiller», «Gallia» und die «Stadt Luzern» als Flaggschiff.\n\nIn den 1950er- und 60er-Jahren stiessen Pläne, sie durch Motorschiffe zu ersetzen, auf Widerstand, und ein Verein zu ihrer Erhaltung wurde gegründet. Am 2. Mai 1980 fuhr Königin Elisabeth II. auf der «Stadt Luzern» über den See.",
    },
    onKnifeTitle: { en: "Why a steamer", de: "Warum ein Dampfer" },
    onKnifeBody: {
      en: "A day on the lake is the slowest way to see Luzerne, and the steamer is the best part of it. The design shows one with the Swiss flag at the stern.",
      de: "Ein Tag auf dem See ist die gemütlichste Art, Luzern zu sehen, und der Dampfer ist der schönste Teil davon. Das Design zeigt einen mit der Schweizer Flagge am Heck.",
    },
  },
  {
    id: "p-vx-furka",
    slug: "victorinox-furka",
    photo: "furka-hairpins",
    extraPhoto: "furka-rhone-glacier",
    name: { en: "Victorinox Furka Pass", de: "Victorinox Furkapass" },
    story: {
      en: "The Furka Pass, 2,429 m, on a genuine Swiss Army Knife, with your name and a date on the back.",
      de: "Der Furkapass, 2429 m, auf einem echten Schweizer Taschenmesser, mit Ihrem Namen und einem Datum auf der Rückseite.",
    },
    storyTitle: {
      en: "Furka, the glacier road",
      de: "Furka, die Gletscherstrasse",
    },
    chapterTitle: {
      en: "Hairpins above the Rhône Glacier",
      de: "Kehren über dem Rhonegletscher",
    },
    chapterBody: {
      en: "The Furka road was built by Uri and Valais between 1863 and 1866, and postal coaches used it from 1867 to 1920. In 1874 the Rhône Glacier still reached close to the hotels of Gletsch. By 2014 it had pulled back about two kilometres, and a lake now lies where the ice stood opposite the hotel in 1980.\n\nIn 1964 the pass was a location for the James Bond film Goldfinger. The summit is at 2,429 m.",
      de: "Die Furkastrasse bauten Uri und Wallis zwischen 1863 und 1866, und die Postkutschen fuhren von 1867 bis 1920 darüber. 1874 reichte der Rhonegletscher noch bis nahe an die Hotels von Gletsch. Bis 2014 hatte er sich um etwa zwei Kilometer zurückgezogen, und ein See liegt dort, wo 1980 das Eis noch gegenüber dem Hotel stand.\n\n1964 war der Pass Drehort des James-Bond-Films Goldfinger. Der Scheitel liegt auf 2429 m.",
    },
    onKnifeTitle: { en: "Why Furka", de: "Warum die Furka" },
    onKnifeBody: {
      en: "It is the pass with the most famous hairpins. The design shows the road winding up through snow, with a stylised mountain on the back.",
      de: "Es ist der Pass mit den berühmtesten Kehren. Das Design zeigt die Strasse, die sich durch den Schnee hinaufwindet, mit einem stilisierten Berg auf der Rückseite.",
    },
  },
  {
    id: "p-vx-grimsel",
    slug: "victorinox-grimsel",
    photo: "grimsel-dam",
    extraPhoto: "grimsel-hospiz",
    name: { en: "Victorinox Grimsel Pass", de: "Victorinox Grimselpass" },
    story: {
      en: "The Grimsel Pass, 2,164 m, on a genuine Swiss Army Knife, with your name and a date on the back.",
      de: "Der Grimselpass, 2164 m, auf einem echten Schweizer Taschenmesser, mit Ihrem Namen und einem Datum auf der Rückseite.",
    },
    storyTitle: {
      en: "Grimsel, the lake and the granite",
      de: "Grimsel, der See und der Granit",
    },
    chapterTitle: {
      en: "A hospice under the water",
      de: "Ein Hospiz unter Wasser",
    },
    chapterBody: {
      en: "For centuries the Grimsel was a mule track between the Haslital and the Valais, with a hospice for travellers at the top. The carriage road opened in 1894. Between 1920 and 1950, power stations changed the valley: Kraftwerke Oberhasli dammed the Grimselsee, and the old hospice sank beneath it.\n\nThe new Hospiz stands on a rock spur between the two dams, with smooth pale granite running down to the water. The pass reaches 2,164 m.",
      de: "Jahrhundertelang war die Grimsel ein Saumpfad zwischen dem Haslital und dem Wallis, mit einem Hospiz für Reisende auf der Passhöhe. Die Kunststrasse wurde 1894 eröffnet. Zwischen 1920 und 1950 veränderten Kraftwerke das Tal: Die Kraftwerke Oberhasli stauten den Grimselsee, und das alte Hospiz versank darin.\n\nDas neue Hospiz steht auf einem Felssporn zwischen den beiden Staumauern, glatter heller Granit reicht bis ans Wasser. Der Pass erreicht 2164 m.",
    },
    onKnifeTitle: { en: "Why Grimsel", de: "Warum die Grimsel" },
    onKnifeBody: {
      en: "The design shows the dam and the blue-green lake. Granite is what the valley is made of, and it is as hard to wear down as a good blade.",
      de: "Das Design zeigt die Staumauer und den blaugrünen See. Granit ist, woraus das Tal besteht, und er ist so schwer abzunutzen wie eine gute Klinge.",
    },
  },
  {
    id: "p-vx-susten",
    slug: "victorinox-susten",
    photo: "susten-steinsee",
    extraPhoto: "furka-hairpins",
    name: { en: "Victorinox Susten Pass", de: "Victorinox Sustenpass" },
    story: {
      en: "The Susten Pass, 2,224 m, on a genuine Swiss Army Knife, with your name and a date on the back.",
      de: "Der Sustenpass, 2224 m, auf einem echten Schweizer Taschenmesser, mit Ihrem Namen und einem Datum auf der Rückseite.",
    },
    storyTitle: { en: "Susten, the quiet pass", de: "Susten, der stille Pass" },
    chapterTitle: {
      en: "A road for cars from the start",
      de: "Eine Strasse von Anfang an für Autos",
    },
    chapterBody: {
      en: "The Susten was the first new alpine road in Switzerland planned for motor cars. It was built from 1938 and opened on 7 September 1946, and it climbs to 2,224 m with a gradient of no more than 9 per cent. Soldiers, convicts and interned Poles and Russians dug much of it with shovels and picks.\n\nAt the top the road runs through a tunnel about 325 metres long, with a coat of arms at its middle that marks the border between Bern and Uri.",
      de: "Der Susten war die erste neue Alpenstrasse der Schweiz, die für Automobile geplant wurde. Sie wurde ab 1938 gebaut, am 7. September 1946 eröffnet und steigt auf 2224 m, mit höchstens 9 Prozent Steigung. Soldaten, Sträflinge und internierte Polen und Russen gruben vieles davon mit Schaufel und Pickel.\n\nAuf der Passhöhe führt die Strasse durch einen rund 325 Meter langen Tunnel, in dessen Mitte ein Wappen die Grenze zwischen Bern und Uri markiert.",
    },
    onKnifeTitle: { en: "Why Susten", de: "Warum der Susten" },
    onKnifeBody: {
      en: "Fewer people know it than the Furka or the Grimsel, which is its charm. The design shows a mountain hut and a calm road through green meadows.",
      de: "Weniger Leute kennen ihn als die Furka oder die Grimsel, und genau das macht seinen Reiz aus. Das Design zeigt eine Berghütte und eine ruhige Strasse durch grüne Wiesen.",
    },
  },
  {
    id: "p-vx-gotthard",
    slug: "victorinox-gotthard",
    photo: "gotthard-devils-bridge",
    extraPhoto: "gotthard-tremola",
    name: { en: "Victorinox Gotthard Pass", de: "Victorinox Gotthardpass" },
    story: {
      en: "The Gotthard Pass, 2,106 m, and the Devil’s Bridge on a genuine Swiss Army Knife, with your name and a date on the back.",
      de: "Der Gotthardpass, 2106 m, und die Teufelsbrücke auf einem echten Schweizer Taschenmesser, mit Ihrem Namen und einem Datum auf der Rückseite.",
    },
    storyTitle: {
      en: "Gotthard and the Devil’s Bridge",
      de: "Gotthard und die Teufelsbrücke",
    },
    chapterTitle: {
      en: "The devil, a goat and a bridge",
      de: "Der Teufel, eine Geiss und eine Brücke",
    },
    chapterBody: {
      en: "North of Andermatt the Reuss runs through the Schöllenen Gorge. Between about 1150 and 1230 people found a way through it and built a bridge, the Devil’s Bridge. Nobody knows who built it. Legend says the devil did, and that the villagers cheated him by sending a goat across first.\n\nThe stone bridge you can walk over today dates from 1830. On the south side the Tremola climbs to the pass in 24 hairpin bends on granite cobbles. The railway tunnel opened in 1882, the road tunnel in 1980.",
      de: "Nördlich von Andermatt fliesst die Reuss durch die Schöllenenschlucht. Zwischen etwa 1150 und 1230 fand man einen Weg hindurch und baute eine Brücke, die Teufelsbrücke. Niemand weiss, wer sie gebaut hat. Die Sage erzählt, der Teufel habe es getan, und die Dorfbewohner hätten ihn überlistet, indem sie zuerst eine Geiss hinüberschickten.\n\nDie steinerne Brücke, über die man heute geht, stammt von 1830. Auf der Südseite steigt die Tremola in 24 Kehren auf Granitpflaster zum Pass. Der Eisenbahntunnel wurde 1882 eröffnet, der Strassentunnel 1980.",
    },
    onKnifeTitle: { en: "Why Gotthard", de: "Warum der Gotthard" },
    onKnifeBody: {
      en: "The Gotthard has joined north and south for centuries. The design shows the stone arches of the road and a tunnel mouth on the back.",
      de: "Der Gotthard verbindet seit Jahrhunderten Nord und Süd. Das Design zeigt die steinernen Bögen der Strasse und auf der Rückseite ein Tunnelportal.",
    },
  },
  {
    id: "p-vx-nufenen",
    slug: "victorinox-nufenen",
    photo: "nufenen-pass",
    extraPhoto: "gotthard-tremola",
    name: { en: "Victorinox Nufenen Pass", de: "Victorinox Nufenenpass" },
    story: {
      en: "The Nufenen Pass, 2,478 m, on a genuine Swiss Army Knife, with your name and a date on the back.",
      de: "Der Nufenenpass, 2478 m, auf einem echten Schweizer Taschenmesser, mit Ihrem Namen und einem Datum auf der Rückseite.",
    },
    storyTitle: {
      en: "Nufenen, the highest of them all",
      de: "Nufenen, der höchste von allen",
    },
    chapterTitle: {
      en: "Between Valais and Ticino",
      de: "Zwischen Wallis und Tessin",
    },
    chapterBody: {
      en: "At 2,478 metres the Nufenen Pass links Ulrichen in the Valais with Airolo in Ticino. It is the highest road pass that lies entirely in Switzerland. The Umbrail is higher, but it sits on the Italian border.\n\nFor centuries only a footpath crossed here, used to drive cattle and carry cheese. A road for cars opened in 1969. The road is usually open from late May to late October, depending on snow.",
      de: "Auf 2478 Metern verbindet der Nufenenpass Ulrichen im Wallis mit Airolo im Tessin. Es ist der höchste Strassenpass, der ganz in der Schweiz liegt. Der Umbrail ist höher, liegt aber an der italienischen Grenze.\n\nJahrhundertelang führte nur ein Fussweg hinüber, auf dem man Vieh trieb und Käse trug. 1969 wurde eine Strasse für Autos eröffnet. Sie ist in der Regel von Ende Mai bis Ende Oktober offen, je nach Schnee.",
    },
    onKnifeTitle: { en: "Why Nufenen", de: "Warum der Nufenen" },
    onKnifeBody: {
      en: "Open ground, wind and a long view into both valleys. The design shows a stack of stones, the small sign people leave at the top.",
      de: "Offenes Gelände, Wind und ein weiter Blick in beide Täler. Das Design zeigt einen Steinturm, das kleine Zeichen, das Besucher auf der Passhöhe hinterlassen.",
    },
  },
  {
    id: "p-vx-finsterwald",
    slug: "victorinox-finsterwald",
    photo: "finsterwald-beehouse",
    extraPhoto: "finsterwald-entlebuch",
    name: {
      en: "Victorinox Finsterwald bees",
      de: "Victorinox Finsterwalder Bienen",
    },
    story: {
      en: "A bee and a beehouse from Finsterwald on a genuine Swiss Army Knife, with your name and a date on the back.",
      de: "Eine Biene und ein Bienenhaus aus Finsterwald auf einem echten Schweizer Taschenmesser, mit Ihrem Namen und einem Datum auf der Rückseite.",
    },
    storyTitle: { en: "The village of the bees", de: "Das Dorf der Bienen" },
    chapterTitle: {
      en: "Honey from a biosphere reserve",
      de: "Honig aus einem Biosphärenreservat",
    },
    chapterBody: {
      en: "Finsterwald is a small village in the municipality of Entlebuch, canton Luzerne, on the road over the Glaubenberg. Moors surround it, and the whole Entlebuch region has been a UNESCO biosphere reserve since 2001, the first in Switzerland.\n\nHoney is one way to read such a landscape. Bees make blossom honey from nectar and darker forest honey from the sugary sap that aphids leave on trees, so the taste changes with place and weather. Switzerland has about 165,000 bee colonies, and each gives roughly 15 kilograms a year.",
      de: "Finsterwald ist ein kleines Dorf in der Gemeinde Entlebuch, Kanton Luzern, an der Strasse über den Glaubenberg. Moore umgeben es, und die ganze Region Entlebuch ist seit 2001 UNESCO-Biosphäre, die erste der Schweiz.\n\nHonig ist eine Art, eine solche Landschaft zu lesen. Bienen machen Blütenhonig aus Nektar und dunkleren Waldhonig aus dem zuckerhaltigen Saft, den Blattläuse auf Bäumen hinterlassen, und so ändert sich der Geschmack mit Ort und Wetter. Die Schweiz hat rund 165 000 Bienenvölker, und jedes liefert etwa 15 Kilogramm im Jahr.",
    },
    onKnifeTitle: { en: "Why a bee", de: "Warum eine Biene" },
    onKnifeBody: {
      en: "A small knife with a big story about mountain meadows, beekeeping and Swiss tradition. The design shows a beehouse, a church and wildflowers, with honeycomb on the back.",
      de: "Ein kleines Messer mit einer grossen Geschichte über Bergwiesen, Imkerei und Schweizer Tradition. Das Design zeigt ein Bienenhaus, eine Kirche und Wiesenblumen, auf der Rückseite Honigwaben.",
    },
  },
];

export function victorinoxProducts(
  cancellationPolicy: LocalizedText,
): Product[] {
  return designs.map((d) => ({
    id: d.id,
    // The cover is the design itself (the client's concept art); the scenery and the three
    // real Victorinox models follow.
    photo: `vx-${d.slug.replace("victorinox-", "")}`,
    photos: [d.photo, d.extraPhoto, ...knifePhotos],
    longStory: storyFromChapters({
      title: d.storyTitle,
      chapters: [
        { photo: d.photo, title: d.chapterTitle, body: d.chapterBody },
        { photo: d.extraPhoto, title: d.onKnifeTitle, body: d.onKnifeBody },
        {
          photo: knifePhotos[1],
          title: { en: "A genuine Victorinox", de: "Ein echtes Victorinox" },
          body: aboutTheKnife,
        },
      ],
    }),
    slug: d.slug,
    subcategoryId: "victorinox",
    name: d.name,
    story: d.story,
    cancellationPolicy,
    variants: variants.map((v) => ({ ...v })),
    preparationDays: 3,
    dayMode: "working-days",
    paymentPolicy: { kind: "full", firstDueHours: 24 },
    commissionRate: 0.1,
    engraving: { maxLength: 20 },
  }));
}
