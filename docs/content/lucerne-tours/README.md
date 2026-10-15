# Lucerne tours: what changed and what the client must confirm

Source: client brief `[EN] Lucerne_Storyteling.pdf` (Oct 2026). The five sample tours were replaced by
the 11 tours below. All prices, capacities, departure dates and meeting points are **sample values**.

## The 11 tours

| id | Tour | Type | Duration | Stops |
|---|---|---|---|---|
| `lucerne-90` | Lucerne in 90 minutes | guided, day-trip group | 1.5 h | Chapel Bridge, Kornmarkt, Weinmarkt, Hirschenplatz, Victorinox Store |
| `time-history-loyalty` | Time, history and loyalty | guided, multi-day group | 4 h | Musegg/Zyt Tower, Hofkirche, Lion Monument, Old Swiss House, Jesuit Church |
| `quieter-lives` | The city's quieter lives | self-guided, multi-day independent | 4 h | Ritter Palace, Jesuit Church, Suidter pharmacy, Weinmarkt, Hirschenplatz, Lion Monument |
| `own-pace` | Lucerne at your own pace | self-guided, day-trip independent | 2.5 h | Chapel Bridge, Jesuit Church, Kornmarkt, Weinmarkt, Hirschenplatz, Lion Monument |
| `furka` | Furka Pass | vehicle day | 5.5 h | Furka summit, Belvédère / Rhône Glacier, Gletsch |
| `grimsel` | Grimsel Pass | vehicle day | 5.5 h | Handegg, Räterichsboden, Hospiz / Lake Grimsel, summit |
| `susten` | Susten Pass | vehicle day | 5 h | Summit tunnel viewpoint, Steingletscher |
| `gotthard` | Gotthard Pass | vehicle day | 7 h | Devil's Bridge, summit, Tremola, Airolo |
| `nufenen` | Nufenen Pass | vehicle day | 7.5 h | Airolo, All'Acqua, summit, Ulrichen |
| `rothorn` | Brienzer Rothorn | vehicle + cable car + steam railway, one-day version | 7 h | Sörenberg, summit, Planalp, Brienz |
| `finsterwald-honey` | Finsterwald honey | vehicle morning | 3.5 h | Finsterwald, moor path |

Durations are in half hours because the app shows `durationMinutes / 60`. Pass journey times are
estimates from the research (OSRM car time + about 40 per cent + stop time).

## Where things live

- Tours, stops, departures: `front-end/src/features/tours/lucerne/tours.ts`
- 19 stop stories (EN + DE), generated from the research notes: `front-end/src/features/tours/lucerne/stops.ts`
  (regenerate with `python3 -I docs/content/lucerne-tours/build_stop_stories.py`)
- Research notes with sources per fact: `research/g1..g4-*.md`, photo notes `research/commons-*.md`
- Photos: 22 new files in `front-end/src/assets/photos`, built by `build_photos.sh` from `images/` (Unsplash)
  and `images-commons/` (Wikimedia Commons, used only for gaps, owner-approved 15 Oct 2026). Credits are in
  `front-end/src/assets/photos/CREDITS.txt`.
- Reviews: 6 kept for `lucerne-90`, 26 new sample reviews for the other tours (`tours/reviews/seed.ts`).

## Old demo state, new home

| Old | New | Note |
|---|---|---|
| `old-town` + walk-13/14/16/18/19/20/23 | `lucerne-90`, ids kept | all hard-coded bookings, fillers, overdue/cancel/late-payment fixtures unchanged; end times moved from 2 h to 90 min |
| `lake` + lake-11/15/17 | `time-history-loyalty`, ids renamed `history-11/15/17` | pay-later, grace-period and delivered-booking fixtures kept |
| `workshop` + workshop-17 (sold out) | `quieter-lives`, `quiet-17` | capacity 6, filled by the two seeded bookings; still sold out |
| `night` (German only, R02/AC30) | **dropped** | owner: all tours bilingual. The German-only fallback is no longer demonstrable |
| `pilatus` (unpublished "Coming soon") | **dropped** | owner: treat all tours as ready. The "Coming soon" card state is no longer demonstrable |
| `emptyTourDraft`, sample bookings | `lucerne-90`, `walk-16/13/20` | |
| article links (`old-town`, `night`, `lake`) | Musegg and Lion articles to `time-history-loyalty`, water-tower article to `lucerne-90`; the night-walk and steamboat articles lost their tour link | |

`DEMO_VERSION` went 12 to 13, so browsers holding the old tours reset on next load.

## Corrections to the brief (found in research)

- Jesuit Church: foundation stone 3 Dec 1666, consecrated 29 Aug 1677; the green onion domes date from 1893.
- Hofkirche: the towers' style is disputed (luzern.com says Romanesque elements remain; the brief says Gothic).
- Lion Monument: designed by Thorvaldsen, carved by Ahorn (the brief omits both). The death toll is contested.
- Zyt clock: 1535 and the early strike are confirmed; sources say it strikes before the church or town-hall clock, not "the other clocks"; neither explanation is proven.
- Nufenen is 2,478 m (brief: 2,477). The Rothorn's Sörenberg lift is a 2023 aerial tramway; steam is not guaranteed on every train.
- Suidter pharmacy is at Bahnhofstrasse 21, two doors from the Ritter Palace, not near Hirschenplatz. The herbal-tea claim is unverified and left out.
- Ritter Palace does hold a Dance of Death (Jakob von Wyl, c. 1615); Lucerne's better-known cycle is on the Spreuerbrücke.
- Hotel Belvédère (Furka) has been closed since 2015. Susten tunnel and bridge counts conflict across sources, so no number is used.
- Finsterwald: no beekeeper, apiary or visit offer could be verified. The story names none and the tour says the beehouse visit depends on the owner.

## Shared code touched

- `tours/map/messages.ts`: map heading "Your route through Lucerne" became "Your route" (and the loading text "Opening the map…"), because seven tours now leave the city.
- `demo/seed.ts`: `DEMO_VERSION` 12 to 13. A browser holding v12 data resets to the new seed on next load, which **wipes that browser's demo state** (bookings made in it, role, language). Checked with a v12 payload in localStorage.
- Departure ids renamed in `merchant/lib/fixtures.ts`, `tours/seed.ts` and `content/seed.ts`; `lake-*` became `history-*`, `workshop-17` became `quiet-17`.

## Known weak spots

- The detail page shows a fixed "Small group" label for every tour (existing behaviour in `tour-detail-page.tsx`), so the two self-guided routes also say "Small group". Fixing it needs a per-tour field.
- The "Lucerne railway station" start stop of each vehicle tour shows the Chapel Bridge hero (no station photo), and in-between stops (Airolo, Handegg, All'Acqua, Ulrichen, Planalp, Gletsch) reuse the nearest photo of the same tour rather than a photo of that exact place.

- **Seasonality ignored on purpose** (owner decision): the alpine tours have departures from 20 Oct to 2 Nov 2026. In reality the passes
  close around 27 Oct (snow can close them earlier), the Rothorn steam railway ends 25 Oct, and the Musegg towers close 1 Nov.
  Pass tour conditions say the journey runs only when the pass is open.
- **Photos to replace before launch**: the Nufenen shot is moody and shows peaks, not the road; the beehouse photo is from Obwalden and the
  Entlebuch landscape shows meadows, not moor; the Weinmarkt, Kornmarkt and Susten shots are overcast. Commons images are CC BY / CC BY-SA and
  must stay credited. Official Luzern Tourismus / Victorinox images are candidates only (licence needed).
- Weinmarkt, Hirschenplatz and Victorinox coordinates come from OpenStreetMap; luzern.com gives none.
- Several sources did not load for the researchers (zentralplus, MySwitzerland route pages, the federal inventory PDF); those facts are flagged
  as single-source in the notes.
- Regression drives and reports under `docs/ux/prototype/reports` and `.check/drv` still hard-code the old tour slugs and ids and will fail.

## Open questions for the client

1. Are routes 3 and 4 self-guided (as built) or guided in small groups?
2. Real prices, capacities, meeting points; is the alpine vehicle chauffeured, and does it collect guests at Brienz?
3. Does the Old Swiss House, the pharmacy, Ritter's courtyard or any beekeeper agree to groups? None is promised in the copy.
4. Will Luzern Tourismus / Victorinox licence official photos?
5. Hirschenplatz name origin (inn "Zum Hirschen") rests on tour-guide sources; keep or drop?
6. Victorinox store opening hours (a third-party listing says Saturday closed).
7. 2027 opening dates of the passes and the Rothorn railway.
