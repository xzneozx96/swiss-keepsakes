import type { ContentLanguage } from '@sk/domain/content'

// New, original stories and editorial reviews for the seeded places (owner decisions of 2026-11-03, standing order 19).
// Written from public sources, never copied: each story lists the pages it was researched from. The text is plain:
// a string is a paragraph, `{ h }` a level 2 heading, `{ ul }` a bullet list. seed-place-stories.ts turns it into the
// story body and adds the closing "Sources" line, which guests see (decision: a visible source line builds trust and
// the editor already allows links).
// Facts that the sources gave in conflicting forms are written loosely on purpose ("in the 17th century").

export type PlaceStoryBlock = string | { h: string } | { ul: string[] }

export interface PlaceStoryText {
  title: string
  excerpt: string
  blocks: PlaceStoryBlock[]
}

export interface PlaceStory {
  key: string
  kind: 'story' | 'editorial_review'
  // The English slug is the "already seeded" test: a story whose slug exists in either language is skipped.
  slug: Record<ContentLanguage, string>
  // English slugs of the places the story is linked to. The first one is the subject of a review.
  places: string[]
  // Places that get this story as their main story, when they have none (stories only).
  mainStoryFor: string[]
  // The cover is the cover of this place (media the seed already holds); no new image is added.
  coverFrom: string
  blogCategories: string[]
  interests: string[]
  stayTag: 'short_stay' | 'multi_day' | 'both'
  // Keys of other stories shown under "More to discover" (3 at most).
  related: string[]
  // Day the facts of a review were checked.
  checkedOn?: string
  sources: { name: string, url: string }[]
  versions: Record<ContentLanguage, PlaceStoryText>
}

// The 13 stories on dev on 2026-11-03: the 12 prototype stories and one QA story. The delete step removes a group only
// when its id is listed here and every slug of its versions is too.
export const legacyStoryGroups: { id: string, slugs: string[] }[] = [
  { id: '01a186d2-6d6c-7b40-a2fc-30f817179a4e', slugs: ['musegg-morning'] },
  { id: '01a186d2-7c03-75ef-a383-4f708bc2ddaa', slugs: ['lion-monument'] },
  { id: '01a186d2-8a69-7816-8479-8d4612af9273', slugs: ['lake-steamboat'] },
  { id: '01a186d2-981c-7b21-91e6-abea64c0e524', slugs: ['water-tower'] },
  { id: '01a186d2-a479-7a2a-b5e3-39d8808b743b', slugs: ['weinmarkt-oath'] },
  { id: '01a186d2-b369-702c-9688-3b67e6d09d67', slugs: ['spreuer-bridge'] },
  { id: '01a186d2-c1cc-7d9f-a1e6-8bee0f60e7a0', slugs: ['needle-dam'] },
  { id: '01a186d2-d02d-7056-a95e-99c9746bcb2c', slugs: ['old-pharmacy'] },
  { id: '01a186d2-de9c-7b1d-b741-cb50549898ef', slugs: ['hammetschwand-lift'] },
  { id: '01a186d2-ed02-7185-a367-34ba00f646fe', slugs: ['victorinox-story'] },
  { id: '01a186d2-fa7a-7e97-ad7c-5d51b3f18d75', slugs: ['luzern-bei-nacht'] },
  { id: '01a186d3-0541-76f7-977c-6c13795b3ecf', slugs: ['pilatus'] },
  { id: '01a18a51-6cce-7540-b7b1-908ad9d820ba', slugs: ['qa-story-c2cd1d'] },
]

export const placeStories: PlaceStory[] = [
  {
    key: 'chapel-bridge',
    kind: 'story',
    slug: { en: 'crossing-the-chapel-bridge', de: 'ueber-die-kapellbruecke' },
    places: ['chapel-bridge-and-water-tower', 'chapel-bridge'],
    mainStoryFor: ['chapel-bridge-and-water-tower', 'chapel-bridge'],
    coverFrom: 'chapel-bridge-and-water-tower',
    blogCategories: ['history'],
    interests: ['history-culture'],
    stayTag: 'both',
    related: ['spreuer-bridge', 'jesuit-church'],
    sources: [
      { name: 'Wikipedia: Chapel Bridge', url: 'https://en.wikipedia.org/wiki/Chapel_Bridge' },
    ],
    versions: {
      en: {
        title: 'Crossing the Chapel Bridge',
        excerpt: 'Walk across Lucerne\'s wooden bridge, pass the Water Tower and read the story of the 1993 fire in the painted panels above your head.',
        blocks: [
          'Lucerne\'s Chapel Bridge is the view that most visitors photograph first. It is worth more than a photo. Walk across it slowly, and you cross the Reuss on a covered wooden footbridge that has linked the two halves of the old town for centuries.',
          { h: 'A bridge built as a defence' },
          'The bridge dates from around 1365 and was part of the town\'s fortifications. It was once longer than it is today. About 205 metres remain, carried on piers standing in the river.',
          'Halfway across, the bridge passes the octagonal Water Tower. The tower is a little older than the bridge. Over the centuries it served as a watchtower, an archive, a treasury and a prison. You cannot go up inside, but you walk right past its stone base.',
          { h: 'Look up: the painted panels' },
          'Under the roof hang triangular panels painted in the 17th century by Hans Heinrich Wägmann. They show scenes from the history of Lucerne and of Switzerland, so a walk across the bridge is also a short history lesson. Keep your head tilted back and move slowly, because the pictures sit high in the roof.',
          { h: 'The fire of 1993' },
          'On 18 August 1993 a fire destroyed a large part of the bridge and about two thirds of the paintings. The city rebuilt the bridge, and it reopened on 14 April 1994. Only part of the pictures could be fully restored, so the panels hold both survivors and losses.',
          { h: 'Visiting' },
          {
            ul: [
              'The bridge is always open, free, and for pedestrians only.',
              'Come before 08:00 if you can. The light comes from the side and the bridge is almost empty.',
              'Allow 10 to 15 minutes to cross, longer if you stop for photos.',
              'Take your time in the middle of the bridge: from there you can watch the birds on the Reuss and look along the river.',
              'The Spreuer Bridge, Lucerne\'s other covered wooden bridge, and the Jesuit Church are both a short walk away.',
            ],
          },
        ],
      },
      de: {
        title: 'Über die Kapellbrücke',
        excerpt: 'Gehen Sie über Luzerns Holzbrücke, kommen Sie am Wasserturm vorbei und lesen Sie in den Bildtafeln über Ihrem Kopf die Geschichte des Brandes von 1993.',
        blocks: [
          'Die Kapellbrücke ist die Ansicht, die die meisten Gäste in Luzern als Erstes fotografieren. Sie verdient mehr als ein Foto. Wenn Sie langsam hinübergehen, überqueren Sie die Reuss auf einem gedeckten Holzsteg, der seit Jahrhunderten die beiden Hälften der Altstadt verbindet.',
          { h: 'Eine Brücke als Teil der Verteidigung' },
          'Die Brücke stammt aus der Zeit um 1365 und gehörte zur Stadtbefestigung. Früher war sie länger als heute. Rund 205 Meter sind erhalten, getragen von Pfeilern im Fluss.',
          'Auf halbem Weg führt die Brücke am achteckigen Wasserturm vorbei. Der Turm ist etwas älter als die Brücke. Im Lauf der Jahrhunderte diente er als Wachturm, Archiv, Schatzkammer und Gefängnis. Hinaufsteigen können Sie nicht, aber Sie gehen unmittelbar an seinem steinernen Sockel vorbei.',
          { h: 'Schauen Sie nach oben: die Bildtafeln' },
          'Unter dem Dach hängen dreieckige Tafeln, die im 17. Jahrhundert von Hans Heinrich Wägmann gemalt wurden. Sie zeigen Szenen aus der Geschichte Luzerns und der Schweiz. Ein Spaziergang über die Brücke ist deshalb auch eine kleine Geschichtsstunde. Legen Sie den Kopf in den Nacken und gehen Sie langsam, denn die Bilder hängen hoch im Dachstuhl.',
          { h: 'Der Brand von 1993' },
          'Am 18. August 1993 zerstörte ein Feuer einen grossen Teil der Brücke und etwa zwei Drittel der Bilder. Die Stadt baute die Brücke wieder auf, am 14. April 1994 wurde sie eröffnet. Nur ein Teil der Bilder liess sich vollständig restaurieren, die Tafeln erzählen also auch vom Verlust.',
          { h: 'Gut zu wissen' },
          {
            ul: [
              'Die Brücke ist immer geöffnet, gratis und nur für Fussgänger.',
              'Kommen Sie wenn möglich vor 08:00 Uhr. Das Licht fällt dann seitlich ein, und die Brücke ist fast leer.',
              'Für die Überquerung genügen 10 bis 15 Minuten, mit Fotostopps etwas mehr.',
              'Bleiben Sie in der Mitte der Brücke ruhig stehen: Von dort sehen Sie die Vögel auf der Reuss und blicken den Fluss entlang.',
              'Die Spreuerbrücke, Luzerns zweite gedeckte Holzbrücke, und die Jesuitenkirche sind nur wenige Gehminuten entfernt.',
            ],
          },
        ],
      },
    },
  },
  {
    key: 'spreuer-bridge',
    kind: 'story',
    slug: { en: 'dance-of-death-on-the-spreuer-bridge', de: 'totentanz-auf-der-spreuerbruecke' },
    places: ['spreuer-bridge'],
    mainStoryFor: ['spreuer-bridge'],
    coverFrom: 'spreuer-bridge',
    blogCategories: ['history'],
    interests: ['history-culture'],
    stayTag: 'both',
    related: ['chapel-bridge', 'weinmarkt'],
    sources: [
      { name: 'Wikipedia: Spreuer Bridge', url: 'https://en.wikipedia.org/wiki/Spreuer_Bridge' },
    ],
    versions: {
      en: {
        title: 'The Dance of Death on the Spreuer Bridge',
        excerpt: 'Lucerne\'s quieter wooden bridge hides a set of 17th-century paintings in its roof. Here is what they show and how to find them.',
        blocks: [
          'Most visitors head straight for the Chapel Bridge. A few minutes downstream, the Spreuer Bridge is smaller, quieter and, in one way, stranger. Its roof carries a cycle of paintings about death.',
          { h: 'Why "Spreuer"?' },
          'The name comes from the German word Spreu, which means chaff. This is the farthest bridge downriver in Lucerne, and chaff could be dumped into the Reuss from here. A first bridge stood here in the 13th century. The wooden bridge you cross today links the Mühlenplatz with the Kasernenplatz and is about 81 metres long. A flood destroyed an earlier bridge in 1566, and it was built again.',
          { h: 'The Dance of Death' },
          'In the 17th century the painter Kaspar Meglinger and his helpers filled the triangular gables under the roof with a "Dance of Death". The idea was common in Europe at the time: Death leads people from every walk of life away, from the pope to the farmer and from the child to the merchant, and nobody can refuse. Of the 67 original panels, 45 survive.',
          'The pictures are blunt, and their message was clear to people at the time: in the end, everyone is equal.',
          { h: 'How to see them' },
          {
            ul: [
              'Look up as you walk. The panels hang high in the gables and are easy to miss from the street.',
              'Stop at the middle of the bridge and turn slowly. You can read the whole row in order.',
              'The bridge is always open, free, and for pedestrians only. It is usually quieter than the Chapel Bridge.',
              'Combine the two bridges for a short loop: cross one, walk along the river and come back over the other.',
            ],
          },
          { h: 'Before you leave' },
          'Take a minute at the end of the bridge to look back along the river. From the Mühlenplatz side the roofline and the water make one of the calmest views in the old town.',
        ],
      },
      de: {
        title: 'Der Totentanz auf der Spreuerbrücke',
        excerpt: 'Luzerns ruhigere Holzbrücke birgt im Dach eine Bilderfolge aus dem 17. Jahrhundert. Was sie zeigt und wie Sie sie finden.',
        blocks: [
          'Die meisten Gäste gehen direkt zur Kapellbrücke. Ein paar Minuten flussabwärts liegt die Spreuerbrücke. Sie ist kleiner, ruhiger und in einer Hinsicht auch eigenartiger: Unter ihrem Dach hängt eine Bilderfolge über den Tod.',
          { h: 'Woher der Name kommt' },
          'Der Name geht auf das Wort Spreu zurück, die Hülsen des Getreides. Es ist die flussabwärts letzte Brücke Luzerns, und von hier konnte Spreu in die Reuss geschüttet werden. Schon im 13. Jahrhundert stand an dieser Stelle eine Brücke. Die heutige Holzbrücke verbindet den Mühlenplatz mit dem Kasernenplatz und ist etwa 81 Meter lang. Ein Hochwasser zerstörte 1566 eine frühere Brücke, danach wurde sie neu gebaut.',
          { h: 'Der Totentanz' },
          'Im 17. Jahrhundert füllte der Maler Kaspar Meglinger mit seinen Helfern die dreieckigen Giebelfelder unter dem Dach mit einem «Totentanz». Das Motiv war damals in ganz Europa verbreitet: Der Tod führt Menschen aus allen Ständen weg, vom Papst bis zum Bauern, vom Kind bis zum Kaufmann, und niemand kann sich ihm entziehen. Von den ursprünglich 67 Tafeln sind 45 erhalten.',
          'Die Bilder sind unverblümt, und ihre Botschaft war den Menschen damals klar: Am Ende sind alle gleich.',
          { h: 'So finden Sie die Bilder' },
          {
            ul: [
              'Schauen Sie beim Gehen nach oben. Die Tafeln hängen hoch in den Giebeln und sind von der Strasse aus leicht zu übersehen.',
              'Bleiben Sie in der Mitte der Brücke stehen und drehen Sie sich langsam. So können Sie die ganze Reihe der Reihe nach lesen.',
              'Die Brücke ist immer geöffnet, gratis und nur für Fussgänger. Meist ist es hier ruhiger als auf der Kapellbrücke.',
              'Verbinden Sie die beiden Brücken zu einer kurzen Runde: Gehen Sie über die eine, am Fluss entlang und über die andere zurück.',
            ],
          },
          { h: 'Bevor Sie weitergehen' },
          'Nehmen Sie sich am Ende der Brücke eine Minute und blicken Sie zurück den Fluss entlang. Von der Seite des Mühlenplatzes bilden Dachlinie und Wasser eine der ruhigsten Ansichten der Altstadt.',
        ],
      },
    },
  },
  {
    key: 'jesuit-church',
    kind: 'story',
    slug: { en: 'inside-the-jesuit-church', de: 'in-der-jesuitenkirche' },
    places: ['jesuit-church'],
    mainStoryFor: ['jesuit-church'],
    coverFrom: 'jesuit-church',
    blogCategories: ['history'],
    interests: ['history-culture'],
    stayTag: 'both',
    related: ['chapel-bridge', 'weinmarkt'],
    sources: [
      { name: 'Wikipedia: Jesuit Church, Lucerne', url: 'https://en.wikipedia.org/wiki/Jesuit_Church,_Lucerne' },
      { name: 'Wikipedia: Jesuitenkirche (Luzern)', url: 'https://de.wikipedia.org/wiki/Jesuitenkirche_(Luzern)' },
    ],
    versions: {
      en: {
        title: 'Inside the Jesuit Church',
        excerpt: 'Switzerland\'s first large Baroque church sits right on the Reuss. Step inside for white stucco, painted ceilings and a calm break from the old town.',
        blocks: [
          'From the street, the Jesuit Church looks calm and almost plain. Then you open the door, and the inside is bright, curved and richly decorated. It is the finest Baroque room in Lucerne.',
          { h: 'How it came to be' },
          'The city council invited the Jesuits to Lucerne in 1573 to run a school. The church was built between 1666 and 1677 and is often called the first large Baroque church in Switzerland. It is dedicated to St Francis Xavier, who is also the patron saint of the city. The architect is not certain: several names are put forward by historians.',
          'The Jesuit college itself opened in 1577, supported by Mayor Ludwig Pfyffer, who gave money every year from his own means. Money stayed short for a while: the high altar was finished only about four years after the church was consecrated. In the inner chapel, vestments of Brother Klaus (Nicholas of Flüe), the hermit and national patron saint, are kept.',
          'The two onion-shaped towers look as old as the church, but they were added much later, in 1893.',
          { h: 'What to look at' },
          {
            ul: [
              'The white stucco on the walls and the vault. The stucco of the nave dates from around 1750.',
              'The wall and ceiling paintings by the brothers Torricelli.',
              'The high altar, with a painting of St Francis Xavier.',
              'The organ, built in 1982, which reuses parts of an older organ from 1897.',
            ],
          },
          'The church was the school church of the Jesuit grammar school until 1966. It is still a place of worship, so services take place here.',
          { h: 'Visiting' },
          {
            ul: [
              'It is a short walk from the Chapel Bridge, right by the river.',
              'Opening times change by weekday: at the time of writing, the church opens at 06:30, and on Monday and Thursday only at 09:30. It closes at 18:30. Check on the day.',
              'Please keep quiet and keep your phone away from the people who come to pray.',
            ],
          },
        ],
      },
      de: {
        title: 'In der Jesuitenkirche',
        excerpt: 'Die erste grosse Barockkirche der Schweiz steht direkt an der Reuss. Treten Sie ein für weissen Stuck, bemalte Decken und eine ruhige Pause in der Altstadt.',
        blocks: [
          'Von der Strasse aus wirkt die Jesuitenkirche ruhig und fast schlicht. Öffnen Sie die Tür, und der Raum ist hell, geschwungen und reich geschmückt. Es ist der schönste Barockraum Luzerns.',
          { h: 'Wie die Kirche entstand' },
          'Der Luzerner Rat lud die Jesuiten 1573 ein, in der Stadt eine Schule zu führen. Die Kirche wurde zwischen 1666 und 1677 gebaut und gilt als erste grosse Barockkirche der Schweiz. Sie ist dem heiligen Franz Xaver gewidmet, der auch Stadtpatron ist. Wer die Kirche entworfen hat, ist nicht sicher: Die Forschung nennt mehrere Namen.',
          'Das Jesuitenkolleg selbst wurde 1577 eröffnet, unterstützt von Schultheiss Ludwig Pfyffer, der jedes Jahr Geld aus eigenen Mitteln gab. Das Geld blieb eine Weile knapp: Der Hochaltar wurde erst etwa vier Jahre nach der Weihe der Kirche aufgestellt. In der Innenkapelle werden Gewänder von Bruder Klaus (Niklaus von Flüe) aufbewahrt, dem Einsiedler und Landespatron.',
          'Die beiden Zwiebeltürme wirken so alt wie die Kirche, wurden aber erst viel später gebaut, nämlich 1893.',
          { h: 'Worauf Sie achten sollten' },
          {
            ul: [
              'Der weisse Stuck an den Wänden und am Gewölbe. Der Stuck im Kirchenschiff stammt aus der Zeit um 1750.',
              'Die Wand- und Deckenmalereien der Brüder Torricelli.',
              'Der Hochaltar mit dem Bild des heiligen Franz Xaver.',
              'Die Orgel von 1982, in der Teile einer älteren Orgel von 1897 weiterleben.',
            ],
          },
          'Bis 1966 war die Kirche die Schulkirche des Jesuitengymnasiums. Sie ist weiterhin ein Ort des Gebets, deshalb finden hier Gottesdienste statt.',
          { h: 'Gut zu wissen' },
          {
            ul: [
              'Die Kirche liegt direkt am Fluss, nur wenige Gehminuten von der Kapellbrücke entfernt.',
              'Die Öffnungszeiten hängen vom Wochentag ab: Zum Zeitpunkt dieses Textes öffnet die Kirche um 06:30 Uhr, am Montag und Donnerstag erst um 09:30 Uhr. Sie schliesst um 18:30 Uhr. Prüfen Sie es am besten am Tag selbst.',
              'Bitte verhalten Sie sich ruhig und nehmen Sie Rücksicht auf Menschen, die zum Beten kommen.',
            ],
          },
        ],
      },
    },
  },
  {
    key: 'old-pharmacy',
    kind: 'story',
    slug: { en: 'the-old-pharmacy-on-bahnhofstrasse', de: 'die-alte-apotheke-an-der-bahnhofstrasse' },
    places: ['alte-suidtersche-apotheke'],
    mainStoryFor: ['alte-suidtersche-apotheke'],
    coverFrom: 'alte-suidtersche-apotheke',
    blogCategories: ['old-town-history'],
    interests: ['history-culture'],
    stayTag: 'short_stay',
    related: ['weinmarkt', 'jesuit-church'],
    sources: [
      { name: 'ryo.co: The Old Pharmacy', url: 'https://ryo.co/en/destinations/switzerland/places/the-old-pharmacy/' },
      { name: 'Fodor\'s: Alte Suidtersche Apotheke', url: 'https://fodors.fodors.com/world/europe/switzerland/things-to-do/shopping/health-amp-beauty' },
    ],
    versions: {
      en: {
        title: 'The old pharmacy on Bahnhofstrasse',
        excerpt: 'A pharmacy that still trades in a historic old-town house, with its name painted in Gothic letters on the wall.',
        blocks: [
          'Between the station and the river, Bahnhofstrasse is a street of shops and traffic, and it is easy to walk straight past the Alte Suidtersche Apotheke. That would be a pity. The house at number 21 is one of the best-preserved corners of the old town, and its pharmacy is still open for business.',
          { h: 'A house you recognise from the street' },
          'The pharmacy is in the Clooshaus, on the corner with Burgerstrasse. Two things catch the eye. The first is the name of the pharmacy, painted in Gothic letters on the wall. The second is the silhouette of the house, with a small tower and a balcony.',
          'A travel guide says that the pharmacy has traded here since 1833 and that the inside has changed little since then. That is worth knowing, but it comes from one source only, so take it as a pointer and not as a firm date.',
          { h: 'A working pharmacy' },
          'This is not a museum. People come here for medicine, and the staff serve them first. If you need something, such as a plaster, a cream or travel sickness tablets, it is a pleasant place to buy it. If you only want to look, the outside is the best part, and you can see it at any time of day.',
          { h: 'Practical' },
          {
            ul: [
              'Address: Bahnhofstrasse 21, 6003 Luzern.',
              'The counter is open Monday to Friday from 08:00 to 18:30 and on Saturday from 08:00 to 16:00, with a break around midday. It is closed on Sunday. Check the sign on the door before you go.',
              'Come in the afternoon if you want to see the inside, and in any light to see the painted name.',
              'The Kornmarkt and the Weinmarkt are a few minutes away on foot, so this stop fits well into a walk through the old town.',
              'Bring your camera: the painted lettering and the tower photograph well from the other side of the street.',
            ],
          },
        ],
      },
      de: {
        title: 'Die alte Apotheke an der Bahnhofstrasse',
        excerpt: 'Eine Apotheke, die noch immer in einem historischen Altstadthaus arbeitet, mit ihrem Namen in gotischen Buchstaben an der Wand.',
        blocks: [
          'Zwischen Bahnhof und Fluss ist die Bahnhofstrasse eine Strasse voller Läden und Verkehr, und man geht leicht an der Alten Suidterschen Apotheke vorbei. Das wäre schade. Das Haus an der Nummer 21 ist eine der besterhaltenen Ecken der Altstadt, und die Apotheke ist weiterhin geöffnet.',
          { h: 'Ein Haus, das man von der Strasse aus erkennt' },
          'Die Apotheke befindet sich im Clooshaus, an der Ecke zur Burgerstrasse. Zwei Dinge fallen auf. Das eine ist der Name der Apotheke, der in gotischen Buchstaben an die Wand gemalt ist. Das andere ist die Silhouette des Hauses mit einem kleinen Turm und einem Balkon.',
          'Ein Reiseführer schreibt, die Apotheke bestehe hier seit 1833 und innen habe sich seither wenig verändert. Das ist gut zu wissen, stammt aber nur aus einer Quelle. Nehmen Sie es also als Hinweis und nicht als gesichertes Datum.',
          { h: 'Eine Apotheke, die arbeitet' },
          'Dies ist kein Museum. Die Menschen kommen wegen Medikamenten, und das Personal bedient sie zuerst. Wenn Sie etwas brauchen, etwa ein Pflaster, eine Creme oder Tabletten gegen Reiseübelkeit, ist es ein angenehmer Ort, um es zu kaufen. Wenn Sie nur schauen möchten, ist die Aussenseite das Schönste, und die sehen Sie zu jeder Tageszeit.',
          { h: 'Praktisches' },
          {
            ul: [
              'Adresse: Bahnhofstrasse 21, 6003 Luzern.',
              'Der Schalter ist von Montag bis Freitag von 08:00 bis 18:30 Uhr und am Samstag von 08:00 bis 16:00 Uhr geöffnet, mit einer Pause um die Mittagszeit. Am Sonntag ist geschlossen. Prüfen Sie das Schild an der Tür, bevor Sie gehen.',
              'Kommen Sie am Nachmittag, wenn Sie das Innere sehen möchten. Den gemalten Namen erkennen Sie bei jedem Licht.',
              'Kornmarkt und Weinmarkt liegen nur wenige Gehminuten entfernt. Der Halt passt gut in einen Spaziergang durch die Altstadt.',
              'Nehmen Sie die Kamera mit: Die gemalte Schrift und der Turm lassen sich von der anderen Strassenseite gut fotografieren.',
            ],
          },
        ],
      },
    },
  },
  {
    key: 'fritschi',
    kind: 'story',
    slug: { en: 'fritschi-and-the-painted-house', de: 'fritschi-und-das-bemalte-haus' },
    places: ['haus-zum-fritschi'],
    mainStoryFor: ['haus-zum-fritschi'],
    coverFrom: 'haus-zum-fritschi',
    blogCategories: ['legends'],
    interests: ['history-culture'],
    stayTag: 'both',
    related: ['weinmarkt', 'chapel-bridge'],
    sources: [
      { name: 'Wikipedia: Zunft zu Safran (Luzern)', url: 'https://de.wikipedia.org/wiki/Zunft_zu_Safran_(Luzern)' },
      { name: 'Luzerner Fasnachtskomitee: Zunft zu Safran', url: 'https://www.lfk.ch/zuenfte-gesellschaften/zunft-zu-safran' },
    ],
    versions: {
      en: {
        title: 'Fritschi and the painted house',
        excerpt: 'Masks, jesters and carnival figures cover a house on Sternenplatz. Meet Bruder Fritschi, the guild figure who opens Lucerne\'s carnival.',
        blocks: [
          'On Sternenplatz, one house is hard to miss. Masks, jesters and other figures of the Lucerne carnival are painted across its upper floors. This is the Haus zum Fritschi, and it is one of the most colourful façades in the old town.',
          { h: 'Who is Fritschi?' },
          'Bruder Fritschi, or Brother Fritschi, is an invented figure. He belongs to the Zunft zu Safran, one of Lucerne\'s oldest guilds. The guild goes back to about 1400, when it began as an association of merchants, and later took in craftsmen too. Today it has around 450 members. Its head, the Zunftmeister, is also called the Fritschivater.',
          'The name Fritschi became part of the guild\'s own name, too. Once craftsmen such as masons and carpenters had joined the merchants, people spoke of the society "zum Saffran, called zum Fritschi".',
          'One legend says that Bruder Fritschi left money to the guild on one condition: during carnival, the guild must serve wine to the poor. Whether or not it is true, the story fits the spirit of the festival.',
          { h: 'Carnival in Lucerne' },
          'Lucerne\'s carnival, the Fasnacht, begins on the Thursday before Ash Wednesday, called Schmutziger Donnerstag. It starts early, with a wake-up call at 5:00 in the morning and a loud bang, the Urknall. Later in the day the Fritschi procession moves through the city.',
          'You will also find the Fritschi fountain nearby on the Kapellplatz. It is a good second stop.',
          { h: 'Seeing the house' },
          {
            ul: [
              'Step back to the far side of Sternenplatz to fit the whole façade into one photo.',
              'The ground floor holds the Restaurant Fritschi. The painted upper floors are best seen from outside.',
              'The guild itself has its own guild house in another building, the Nölliturm, so do not look for the guild offices here.',
              'If you visit in winter, check the dates of the Fasnacht. The streets fill with costumes, and the old town looks quite different.',
              'The Fasnacht is loud and crowded. If you prefer a quiet look at the façade, come on an ordinary weekday.',
            ],
          },
        ],
      },
      de: {
        title: 'Fritschi und das bemalte Haus',
        excerpt: 'Masken, Narren und Fasnachtsfiguren bedecken ein Haus am Sternenplatz. Lernen Sie Bruder Fritschi kennen, die Zunftfigur, die Luzerns Fasnacht eröffnet.',
        blocks: [
          'Am Sternenplatz fällt ein Haus sofort auf. Masken, Narren und andere Figuren der Luzerner Fasnacht sind über seine oberen Stockwerke gemalt. Es ist das Haus zum Fritschi, und es hat eine der farbigsten Fassaden der Altstadt.',
          { h: 'Wer ist Fritschi?' },
          'Bruder Fritschi ist eine erfundene Figur. Er gehört zur Zunft zu Safran, einer der ältesten Zünfte Luzerns. Die Zunft reicht bis um 1400 zurück, damals als Vereinigung von Kaufleuten, später kamen auch Handwerker dazu. Heute hat sie rund 450 Mitglieder. Ihr Vorsteher, der Zunftmeister, wird auch Fritschivater genannt.',
          'Der Name Fritschi wurde auch Teil des Zunftnamens. Nachdem sich Handwerker wie Steinmetze und Zimmerleute den Kaufleuten angeschlossen hatten, sprach man von der «Gesellschaft zum Saffran, genannt zum Fritschi».',
          'Einer Sage nach hinterliess Bruder Fritschi der Zunft Geld unter einer Bedingung: Während der Fasnacht muss die Zunft den Armen Wein ausschenken. Ob es stimmt oder nicht, die Geschichte passt zum Geist des Festes.',
          { h: 'Fasnacht in Luzern' },
          'Die Luzerner Fasnacht beginnt am Donnerstag vor Aschermittwoch, am Schmutzigen Donnerstag. Sie beginnt früh, mit der Tagwache um 5 Uhr morgens und einem lauten Knall, dem Urknall. Später am Tag zieht der Fritschi-Umzug durch die Stadt.',
          'Ganz in der Nähe, auf dem Kapellplatz, steht auch der Fritschibrunnen. Er ist ein guter zweiter Halt.',
          { h: 'Das Haus ansehen' },
          {
            ul: [
              'Gehen Sie auf die andere Seite des Sternenplatzes zurück, dann passt die ganze Fassade auf ein Foto.',
              'Im Erdgeschoss befindet sich das Restaurant Fritschi. Die bemalten Obergeschosse sehen Sie am besten von aussen.',
              'Die Zunft selbst hat ihr Zunfthaus in einem anderen Gebäude, dem Nölliturm. Suchen Sie die Zunftstube also nicht hier.',
              'Wenn Sie im Winter kommen, prüfen Sie die Daten der Fasnacht. Dann füllen sich die Strassen mit Kostümen, und die Altstadt sieht ganz anders aus.',
              'Die Fasnacht ist laut und voll. Wenn Sie die Fassade lieber in Ruhe ansehen möchten, kommen Sie an einem gewöhnlichen Wochentag.',
            ],
          },
        ],
      },
    },
  },
  {
    key: 'lion-monument',
    kind: 'story',
    slug: { en: 'the-dying-lion-of-lucerne', de: 'der-sterbende-loewe-von-luzern' },
    places: ['lion-monument'],
    mainStoryFor: ['lion-monument'],
    coverFrom: 'lion-monument',
    blogCategories: ['history'],
    interests: ['history-culture'],
    stayTag: 'both',
    related: [],
    sources: [
      { name: 'Wikipedia: Lion Monument', url: 'https://en.wikipedia.org/wiki/Lion_Monument' },
      { name: 'Luzern Tourismus: Löwendenkmal', url: 'https://www.luzern.com/de/poi/loewendenkmal' },
    ],
    versions: {
      en: {
        title: 'The dying lion of Lucerne',
        excerpt: 'A huge lion carved into a rock face remembers the Swiss Guards who died in Paris in 1792. Here is the story behind it and how to visit.',
        blocks: [
          'A lion lies against a rock face in a quiet corner of Lucerne, a spear in its side and a paw on a shield. It is one of the most visited sights in Switzerland, and people tend to fall silent in front of it.',
          { h: 'What it remembers' },
          'On 10 August 1792, during the French Revolution, a crowd stormed the Tuileries Palace in Paris. Swiss Guards, who served the French king, defended it, and many were killed. The monument honours them. Its inscription names roughly 760 dead and 350 survivors. Above the lion is the Latin line HELVETIORUM FIDEI AC VIRTUTI, which means "To the loyalty and bravery of the Swiss".',
          { h: 'How it was made' },
          'Karl Pfyffer von Altishofen, a former officer of the Guard, organised the money for the monument, mostly from European royal houses. The Danish sculptor Bertel Thorvaldsen made the design. The stonemason Lukas Ahorn then carved the lion straight into a sandstone cliff in 1820 and 1821. It is about 10 metres long and 6 metres high. The lion lies on a shield with the French lilies, and a second shield with the Swiss cross stands beside it.',
          'Mark Twain visited and called it "the most mournful and moving piece of stone in the world". Not everyone agreed on its meaning, though. Some Swiss critics saw it as praise of the king\'s side in the revolution. Today it is protected as a monument.',
          { h: 'Visiting' },
          {
            ul: [
              'Entry is free and there are no fixed hours. The city has looked at a small fee, so check if you are travelling later.',
              'Look at the stone after rain. The soft sandstone absorbs water, and the lion looks darker.',
              'The pool at its foot reflects the lion, which makes a good photo.',
              'The Glacier Garden and the Bourbaki Panorama are next door, if you want to make an afternoon of it.',
            ],
          },
        ],
      },
      de: {
        title: 'Der sterbende Löwe von Luzern',
        excerpt: 'Ein riesiger Löwe in einer Felswand erinnert an die 1792 in Paris gefallenen Schweizergardisten. Die Geschichte dahinter und wie Sie ihn besuchen.',
        blocks: [
          'In einer ruhigen Ecke Luzerns liegt ein Löwe an einer Felswand, einen Speer in der Flanke und eine Pfote auf einem Schild. Es ist eine der meistbesuchten Sehenswürdigkeiten der Schweiz, und vor dem Löwen verstummen viele Menschen.',
          { h: 'Woran er erinnert' },
          'Am 10. August 1792 stürmte während der Französischen Revolution eine Menge den Tuilerienpalast in Paris. Schweizergardisten, die im Dienst des französischen Königs standen, verteidigten ihn, und viele von ihnen kamen ums Leben. Das Denkmal ehrt sie. Seine Inschrift nennt rund 760 Gefallene und 350 Überlebende. Über dem Löwen steht der lateinische Satz HELVETIORUM FIDEI AC VIRTUTI, auf Deutsch «Der Treue und Tapferkeit der Schweizer».',
          { h: 'Wie es entstand' },
          'Karl Pfyffer von Altishofen, ein ehemaliger Offizier der Garde, organisierte das Geld für das Denkmal, grösstenteils von europäischen Fürstenhäusern. Der dänische Bildhauer Bertel Thorvaldsen schuf den Entwurf. Der Steinmetz Lukas Ahorn hat den Löwen dann 1820 und 1821 direkt in eine Sandsteinwand gehauen. Er ist etwa 10 Meter lang und 6 Meter hoch. Der Löwe liegt auf einem Schild mit den französischen Lilien, daneben steht ein zweiter Schild mit dem Schweizerkreuz.',
          'Mark Twain besuchte ihn und nannte ihn «das traurigste und bewegendste Stück Stein der Welt». Über die Bedeutung war man sich aber nicht überall einig. Manche Kritiker in der Schweiz sahen darin ein Lob der Seite des Königs in der Revolution. Heute steht das Denkmal unter Schutz.',
          { h: 'Gut zu wissen' },
          {
            ul: [
              'Der Eintritt ist frei, feste Öffnungszeiten gibt es nicht. Die Stadt hat eine kleine Gebühr geprüft, schauen Sie also nach, wenn Sie später reisen.',
              'Sehen Sie sich den Stein nach einem Regen an. Der weiche Sandstein saugt Wasser auf, und der Löwe wirkt dunkler.',
              'Das Wasserbecken zu Füssen des Löwen spiegelt ihn, das ergibt ein gutes Foto.',
              'Der Gletschergarten und das Bourbaki-Panorama liegen gleich nebenan, wenn Sie einen ganzen Nachmittag einplanen möchten.',
            ],
          },
        ],
      },
    },
  },
  {
    key: 'weinmarkt',
    kind: 'story',
    slug: { en: 'a-pause-on-the-weinmarkt', de: 'eine-pause-am-weinmarkt' },
    places: ['weinmarkt'],
    mainStoryFor: ['weinmarkt'],
    coverFrom: 'weinmarkt',
    blogCategories: ['old-town-history'],
    interests: ['history-culture'],
    stayTag: 'short_stay',
    related: ['old-pharmacy', 'fritschi', 'jesuit-church'],
    sources: [
      { name: 'Luzern Tourismus: Weinmarkt', url: 'https://www.luzern.com/de/poi/weinmarkt' },
    ],
    versions: {
      en: {
        title: 'A pause on the Weinmarkt',
        excerpt: 'A small old-town square where Lucerne swore its oath in 1332. Come for the fountain, the painted façades and a quiet bench.',
        blocks: [
          'The Weinmarkt is a small square in the car-free old town, and you could cross it in half a minute. That would be a waste. Historic houses with painted façades stand around it, and a fountain in the middle makes it a good place to sit.',
          { h: 'The oath of 1332' },
          'This square is where the people of Lucerne swore their alliance with Uri, Schwyz and Unterwalden in 1332. That alliance made Lucerne part of the early Swiss Confederation, and the Weinmarkt is the place that Lucerne remembers it by. Until the middle of the 16th century the square was also a fish market. It took its present shape in 1841, when a two-storey wooden market hall, once used for meat, bread and leather, was taken down.',
          { h: 'The fountain' },
          'In the middle stands the Weinmarkt fountain. A sculptor called Konrad Lux made the first fountain in 1481 and worked on it for about ten years. Its basin was hexagonal at first and later replaced with an octagonal one. The fountain you see today has a shaft carved by the sculptor Leopold Häfliger from shell limestone. The old original is kept in the Historical Museum on the Pfistergasse. The fountain gives drinking water, so you can fill a bottle.',
          { h: 'Look up' },
          'The houses around the square carry painted façades with coats of arms, dates and sayings. Stand at the fountain and turn slowly. Each house has its own picture, and you can spend a quarter of an hour reading them. Take your time with the sayings and dates. They are short, and they are the details that most visitors walk past.',
          { h: 'Visiting' },
          {
            ul: [
              'The square is always open and free.',
              'Come in the morning if you would like the square to yourself.',
              'It is a good place to pause on a walk through the old town.',
              'The old pharmacy on Bahnhofstrasse and the Jesuit Church are a short walk away.',
            ],
          },
        ],
      },
      de: {
        title: 'Eine Pause am Weinmarkt',
        excerpt: 'Ein kleiner Altstadtplatz, auf dem Luzern 1332 seinen Eid schwor. Kommen Sie für den Brunnen, die bemalten Fassaden und eine ruhige Bank.',
        blocks: [
          'Der Weinmarkt ist ein kleiner Platz in der autofreien Altstadt, den Sie in einer halben Minute überqueren könnten. Das wäre schade. Um den Platz stehen historische Häuser mit bemalten Fassaden, und der Brunnen in der Mitte lädt zum Sitzen ein.',
          { h: 'Der Schwur von 1332' },
          'Auf diesem Platz schworen die Luzernerinnen und Luzerner 1332 ihr Bündnis mit Uri, Schwyz und Unterwalden. Dieses Bündnis machte Luzern zu einem Teil der frühen Eidgenossenschaft, und der Weinmarkt ist der Ort, mit dem sich Luzern daran erinnert. Bis zur Mitte des 16. Jahrhunderts war der Platz auch ein Fischmarkt. Seine heutige Form erhielt er 1841, als eine zweigeschossige hölzerne Markthalle, die einst für Fleisch, Brot und Leder genutzt wurde, abgebrochen wurde.',
          { h: 'Der Brunnen' },
          'In der Mitte steht der Weinmarktbrunnen. Einen ersten Brunnen schuf 1481 ein Bildhauer namens Konrad Lux, der rund zehn Jahre daran arbeitete. Sein Becken war zuerst sechseckig und wurde später durch ein achteckiges ersetzt. Der Brunnenstock, den Sie heute sehen, stammt vom Bildhauer Leopold Häfliger, aus Muschelkalk gehauen. Das alte Original steht im Historischen Museum an der Pfistergasse. Der Brunnen gibt Trinkwasser, Sie können also Ihre Flasche füllen.',
          { h: 'Schauen Sie nach oben' },
          'Die Häuser rund um den Platz tragen bemalte Fassaden mit Wappen, Jahreszahlen und Sprüchen. Stellen Sie sich an den Brunnen und drehen Sie sich langsam. Jedes Haus hat sein eigenes Bild, und Sie können eine Viertelstunde damit verbringen, sie zu lesen. Nehmen Sie sich Zeit für die Sprüche und Jahreszahlen. Sie sind kurz, und es sind genau die Einzelheiten, an denen die meisten Gäste vorbeigehen.',
          { h: 'Gut zu wissen' },
          {
            ul: [
              'Der Platz ist immer zugänglich und gratis.',
              'Kommen Sie am Vormittag, wenn Sie den Platz für sich haben möchten.',
              'Er ist ein guter Ort für eine Pause auf einem Spaziergang durch die Altstadt.',
              'Die alte Apotheke an der Bahnhofstrasse und die Jesuitenkirche sind nur wenige Schritte entfernt.',
            ],
          },
        ],
      },
    },
  },
  {
    key: 'bachmann-review',
    kind: 'editorial_review',
    slug: { en: 'confiserie-bachmann-at-lucerne-station', de: 'confiserie-bachmann-im-bahnhof-luzern' },
    places: ['bachmann-at-bahnhof-luzern-ug'],
    mainStoryFor: [],
    // The place has no cover or photo on dev, so this review stays a draft until one is added.
    coverFrom: 'bachmann-at-bahnhof-luzern-ug',
    blogCategories: [],
    interests: ['food-drink', 'shopping-keepsakes'],
    stayTag: 'both',
    related: [],
    checkedOn: '2026-11-03',
    sources: [
      { name: 'Confiserie Bachmann: Bahnhof UG', url: 'https://www.confiserie.ch/de/bahnhof-ug' },
    ],
    versions: {
      en: {
        title: 'Confiserie Bachmann at Lucerne station',
        excerpt: 'A Lucerne confectioner with a shop on the underground level of the station: what it sells, when it is open and how to find it.',
        blocks: [
          'Confiserie Bachmann is a Lucerne confectioner that describes itself as a family business, in the same hands for four generations and active since 1897. This branch is in the station, which makes it an easy stop if you are leaving the city or just arriving.',
          { h: 'What it is known for' },
          'The shop sells chocolates and pralinés, cakes, bread and snacks, and seasonal specialities. The Luzerner Chatzestreckerli is listed among its specialities. The company also offers party platters and gifts for businesses. The shop is a place to buy something to take with you. Public information does not say whether it has a seating area.',
          { h: 'How to find it' },
          'The shop is on the underground level (UG) of Bahnhof Luzern, 6002 Luzern. Look for the signs to the lower level of the station.',
          { h: 'Opening hours' },
          {
            ul: [
              'Monday to Friday: 06:15 to 21:00',
              'Saturday: 06:30 to 20:00',
              'Sunday: 07:30 to 20:00',
              'Holiday hours can differ. The company lists its own special times on its website.',
            ],
          },
          'Facts checked on 3 November 2026 against the company\'s own page. Prices and the current range change, so check in the shop.',
        ],
      },
      de: {
        title: 'Confiserie Bachmann im Bahnhof Luzern',
        excerpt: 'Ein Luzerner Confiseur mit einem Laden im Untergeschoss des Bahnhofs: was es dort gibt, wann geöffnet ist und wie Sie ihn finden.',
        blocks: [
          'Confiserie Bachmann ist ein Luzerner Confiseur, der sich als Familienbetrieb beschreibt, seit vier Generationen in derselben Hand und seit 1897 tätig. Diese Filiale liegt im Bahnhof und ist damit ein einfacher Halt, wenn Sie die Stadt verlassen oder gerade ankommen.',
          { h: 'Wofür der Laden bekannt ist' },
          'Im Laden gibt es Schokolade und Pralinen, Kuchen, Brot und Snacks sowie saisonale Spezialitäten. Das Luzerner Chatzestreckerli gehört zu den aufgeführten Spezialitäten. Das Unternehmen bietet ausserdem Apéro-Platten und Geschenke für Firmen an. Der Laden eignet sich vor allem, um etwas zum Mitnehmen zu kaufen. Ob es einen Sitzbereich gibt, geht aus den öffentlichen Angaben nicht hervor.',
          { h: 'So finden Sie den Laden' },
          'Der Laden liegt im Untergeschoss (UG) des Bahnhofs Luzern, 6002 Luzern. Folgen Sie den Schildern zur unteren Ebene des Bahnhofs.',
          { h: 'Öffnungszeiten' },
          {
            ul: [
              'Montag bis Freitag: 06:15 bis 21:00 Uhr',
              'Samstag: 06:30 bis 20:00 Uhr',
              'Sonntag: 07:30 bis 20:00 Uhr',
              'An Feiertagen können die Zeiten abweichen. Das Unternehmen nennt seine besonderen Zeiten auf der eigenen Webseite.',
            ],
          },
          'Die Angaben wurden am 3. November 2026 anhand der Seite des Unternehmens geprüft. Preise und das aktuelle Sortiment ändern sich, fragen Sie also im Laden nach.',
        ],
      },
    },
  },
]
