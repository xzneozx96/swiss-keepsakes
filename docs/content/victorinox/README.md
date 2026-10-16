# Victorinox section, 16 Oct 2026

Code: `front-end/src/features/catalog/victorinox.ts` (products), `features/discovery/` (home section),
`features/content/seed.ts` (brand story `victorinox-story`).

## What was found on victorinox.com
- No Victorinox product shows a Lucerne, Alpine-pass or Finsterwald design. The only official knife with the
  Chapel Bridge is the Cadet Swiss Spirit Limited Edition 2022 (12,000 pieces, sold out).
- Real products used for the three sizes (specs from the product pages):

| Size | Model | Item no. | Functions | Weight |
|---|---|---|---|---|
| Small, 58 mm | Classic SD | 0.6223 | 7 | 21 g |
| Medium, 91 mm | Spartan | 1.3603 | 12 | 59 g |
| Large, 111 mm | Picknicker | 0.8353 | 11 | 105 g |

- The Lucerne store (Hirschenplatz 12) has a knife configurator and engraving. Victorinox also offers custom
  digital printing for business customers, which is the likely route for the designs.
- Brand history (1884 to 1921), 500 millionth knife (July 2017), 90 per cent family foundation, lifetime warranty:
  victorinox.com history page and swiss.com ("Lifelong companions").

## The 12 designs
Client concepts, not Victorinox catalogue items. Lucerne icons: swan, Chapel Bridge, Pilatus, Lion Monument,
old town on the Reuss, paddle steamer. Alpine passes: Furka, Grimsel, Susten, Gotthard, Nufenen. Finsterwald: bee.
The AI board images from the client were not used (Vietnamese text, invented art).

## Corrections to the client boards
| Board said | Used | Why |
|---|---|---|
| Susten 2,261 m | 2,224 m | Swiss sources, and our tour research |
| Chapel Bridge "about 1333" | no date, "14th century" elsewhere | Sources differ; see the sight stories |

## Photos
Product photos of the three knives are Victorinox's own (copyright Victorinox AG), downloaded from victorinox.com for
the demo only. Credits in `front-end/src/assets/photos/CREDITS.txt`. They need Victorinox's written permission
before a public launch. Scenery photos on the products are the existing Wikimedia and Unsplash set.

## Open points for the client
- Who prints the designs, and may "Limited Edition" or the Victorinox name and logo be used on the site?
- Prices are sample values (CHF 49, 54 and 64 per size).
- Production time is set to 3 working days; Victorinox's business printing and engraving lead times are longer.
- Opening hours and stock of the Victorinox Store are not on victorinox.com.
