# How travel and food products present new places to eat

Research for the home section "Eat and drink like a local" (round 3 of the lab `/lab/home-food`, 05.11.2026; the lab was deleted once the section was built). It covers web sources only; no app was opened. Several sources are older articles, so a product may look different today.

## Patterns

1. **Heat map: a short list of new places with a time window (Eater).** A city's new, talked-about places are listed with a short description and refreshed monthly. The entries are numbered by location, not ranked, so a number is only a key between the list and the map. It works because "new" has a clear window and the list stays short. [Memphis Magazine on the Eater heat map](https://memphismagazine.com/food/the-eater-memphis-heat-map-where-to-eat-right-now/), [UT Austin, heat map genre conventions](https://sites.dwrl.utexas.edu/rhetoric-of-food/2017/03/29/1398/)
2. **Monthly round-up: a number, a name and a one-line tagline (Time Out).** Each entry has a number, the name with its neighbourhood, a short tagline ("The serious supper club"), one photo and a short write-up. The tagline is what you scan, and the photo and text are there for those who stop. [Time Out London, May 2026](https://www.timeout.com/london/news/the-11-best-new-london-restaurants-opening-in-may-2026-043026)
3. **Hit List: new places kept apart from the classics (The Infatuation).** The "Hit List" holds new places worth trying, and the "Greatest Hits" hold the essentials. The editorial voice is the identity, carried through every review card. It works because a visitor knows at once which of the two lists they are reading. [Washingtonian interview](https://washingtonian.com/2016/06/29/5-questions-infatuation-chris-stang-eeeeeats), [DesignRush on The Infatuation](https://www.designrush.com/best-design/the-infatuation)
4. **A list as one named object (Google Maps Trending, Top and Gems).** Each restaurant list has one name, a badge and one line on what it holds, such as "places that have recently seen a spike in popularity". The Trending list is refreshed weekly. It works because the whole set reads as one thing you can open. [Google, summer travel updates 2024](https://blog.google/products/maps/google-maps-updates-summer-travel-2024/)
5. **A guide with a cover (Apple Maps Guides).** Each guide is a curated collection from a trusted publisher, built around one theme, and it updates itself when places are added. A guide shows a cover first, then a list of places. It works because the source and the theme are clear before the list starts. [MacRumors, Guides in Apple Maps](https://macrumors.com/how-to/use-guides-in-apple-maps-ios), [Apple support](https://support.apple.com/en-us/guide/maps/mps77b2164f4/3.0/mac/11.0)
6. **A shelf for what is new (Resy "New On Resy").** In the Discover tab, a list of newly added restaurants sits beside the editorial Hit List and the "Climbing" list. It works because "new on the platform" gets its own plain label and does not compete with the curated picks. [Resy, Discover tab](https://blog.resy.com/newsroom/resy-launches-discover-tab/), [Resy lists](https://blog.resy.com/2024/02/resy-lists/)
7. **The printed city guide: photos first, the facts always in the same place (Cereal, Monocle, Wallpaper\*).** The Cereal redesign gave the space to photos and put each venue's facts "consistently at the top left corner". Venue pages are white, with generous white space and a pared-back neutral palette, and the photography is original, never press shots. It works because the calm comes from repetition and the photos do the selling. [Studio Faculty, Cereal City Guides](https://studiofaculty.com/work/cereal-city-guides), [We Heart, Cereal Guided](https://www.we-heart.com/?p=35519), [Travolution, Wallpaper\* City Guides app](https://travolution.com/news/wallpaper-magazine-unveils-city-guides-app)
8. **A host's personal picks (Airbnb guidebooks).** Hosts recommend nearby places with a short note on the food and the feel, and Airbnb adds a photo to most picks. It works because of the personal voice; the note is the value, not a rating. [Airbnb, create a guidebook](https://www.airbnb.com/resources/hosting-homes/a/create-a-guidebook-to-share-your-local-tips-23), [Host Tools on Airbnb guidebooks](https://hosttools.com/blog/short-term-rental-tips/airbnb-guidebook/)

## Clean and minimal, yet polished

- **Printed city guide (7).** This is the most restrained: white ground, photos and plain captions, with the facts always in the same spot. No badges and no overlays.
- **Guide with a cover (5) and list as one object (4).** These are clean because the section reads as one object with one entry point, not a pile of cards.
- **Round-up (2) and heat map (1).** These are clean when cut down to a number, a name and one line. They get noisy once ratings, prices and long write-ups are added.
- **Busier patterns.** Hit-list labels (3), shelves (6) and host notes (8) need more words or more labels, which makes them busier on a phone home screen.

## Used for the round 3 options

The owner picked G with changes on 05.11.2026. The built section (`front-end/src/features/home/components/food-map-section.tsx`) has the newest place as the events poster with its tip, then the next four in a rail of photo-and-caption cards. H, I and J were rejected.

- **G, Guide page:** pattern 7, photo and caption pairs in two stepped columns.
- **H, Contents page:** patterns 5 and 4, one card with a cover photo and the list.
- **I, Round-up:** patterns 2 and 1, a numbered list with a tagline and a small photo.
- **J, The shelf:** pattern 6, a compact two-column shelf of what is new.

## See these first card research

Research for the "See these first" card (lab `/lab/home-postcard`, round 2, 05.11.2026), after the owner turned down the dark postcard and options A to C (framed editorial, ticket stub, numbered split card). Web sources only; several are older or second-hand, so a product may look different today.

1. **Photo plate, one floating action (Airbnb).** A listing or experience card is a plain photo plate with a 14 px radius and no shadow. One small badge sits top-left, one round action (the heart) sits top-right, and the text sits under the photo, not on it. Experience cards use a taller 4:5 photo. It works because the photo stays clean and the one action is always in the same corner. [getdesign.md, Airbnb design system (third-party analysis)](https://getdesign.md/design-md/airbnb/preview), [Airbnb 2025 Summer Release](https://news.airbnb.com/?p=436338)
2. **Photo first, then directions (Google Maps things to do, 2023).** Things-to-do results became photos instead of link lists; a tap opens the detail with directions, for example to a boat tour's departure point. It works because the picture is the choice and the way there is one step away. [Skift](https://skift.com/2023/10/27/google-upgrades-maps-with-photo-first-searches-of-things-to-do)
3. **A short row of top sights (Google Search and Travel).** A city query often shows about four popular attractions as a row, and Google's destination pages opened with a photo, a little background and the must-see sights. It works because the set is small and the names do the work. [AccuRanker, Things to do](https://accuranker.com/help/serp-features/google-things-to-do), [Fortune on Google Destinations](https://fortune.com/2016/03/09/destination-google-mobile/)
4. **A cover with a mark (Apple Maps place card).** The place card header pairs a wide cover photo (a 2.5:1 crop) with a logo, shown together whenever a place is selected. It works because the photo sets the mood and a small fixed element gives identity. [Apple Business, place card](https://business.apple.com/docs/onboarding-guide/place-card)
5. **Curiosity with a place line (Atlas Obscura).** Every place card on the site uses the same thumbnail treatment, and a place page leans on photos and community tips. It works because the consistent card lets the odd title and the tip carry the story. [Atlas Obscura product blog](https://atlasobscura.com/product-blog), [Atlas Obscura app](https://apps.apple.com/us/app/id1563250221)
6. **The printed city guide (Cereal, Monocle).** See pattern 7 of the food research above: photos take the space and the facts sit in the same place on every page.

Clean and minimal: patterns 1, 2 and 4, a clean photo with one fixed action or mark. Patterns 3 and 5 are clean when the line under the name is short and factual (kind of place, street) rather than ratings.

Used for round 2 of the card lab:

- **D, Floating panel:** patterns 1 and 2. A full-bleed photo with a white panel floating over its lower edge, and Google Maps as the one round action in the photo's corner.
- **E, Postcard back:** a postcard metaphor (not a researched product). The photo as a perforated stamp, the tip as the written note, the name on the address lines, Google Maps as a postmark.
- **F, Top sight:** patterns 3 and 5. A photo on top, the name, a short fact line (kind of place and street, no rating), and two equal pill actions.

Outcome, 05.11.2026: after D (floating panel) was liked and D1 to D3 were tried, the owner sent two flight cards as references and chose **G, Immersive** (a white frame around a full-bleed photo that melts into a progressive blur, bold white name, street and hours, a white pill with a round frosted Google Maps button beside it), without the kind-of-place line and with the shorter label "Read the story". It replaced the postcard on the home; the lab `/lab/home-postcard` was deleted.
