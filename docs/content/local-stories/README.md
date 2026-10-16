# Local stories added 16 Oct 2026

Source: client message of 16 Oct 2026, saved as
`client-resources/Lucerne_Local_Stories_Sights_and_Dining.md`. The stories are in
`front-end/src/features/content/seed.ts` (EN and DE each, shared slug).

| Slug | Client item | Photos (src/assets/photos) |
|---|---|---|
| `weinmarkt-oath` | A4 Weinmarkt | `weinmarkt`, `hirschenplatz` |
| `spreuer-bridge` | A7 Spreuer Bridge | `spreuer-bridge`, `nadelwehr`, `spreuer-totentanz` |
| `needle-dam` | A6 Needle Dam | `nadelwehr`, `spreuer-bridge` |
| `old-pharmacy` | A3 Alte Suidtersche Apotheke | `suidter-pharmacy`, `ritter-palace` |
| `hammetschwand-lift` | A8 Hammetschwand lift | `hammetschwand-lift`, `hammetschwand-cliff-path`, `hammetschwand-view` (new, Wikimedia Commons) |

## Where the text differs from the client message

| Client said | Sources say | Used |
|---|---|---|
| Pharmacy founded by Otto Suidter in 1833 | Founded by Dr Leopold Suidter (1803–1855); Otto senior took over in 1855, Otto junior in 1901 and rebuilt it in 1906 (suidter.ch/geschichte) | Sources |
| Neo-Gothic facade in 1906, hundreds of herbs, poppy ornaments | Not found on the pharmacy's site; herb numbers conflict between reports | Left out |
| Needle dam has "more than 170" needles | 189 needles in the weir across the river and about 500 in the long weir (NZZ, 2006); needles 3.5 m, about 30 kg | Sources |
| Spreuer Bridge: 45 paintings by Meglinger, 1626–1635 | 45 survive of about 67–71; the cycle was painted c. 1616–1637 under Meglinger (kapellbruecke.com, Stadt Luzern, HLS) | "17th century, mostly under Meglinger"; "about seventy" and "45" |
| Weinmarkt "cradle of trade and physics"; guild houses over 500 years; wrought-iron signs | Fish market until mid-16th c.; wooden market hall until 1841; fountain by Konrad Lux, 1481 (luzern.com) | Sources; "physics" is a mistranslation, signs and 500 years left out |
| Hammetschwand "152 m, under a minute" | 152.8 m, about 48 s since the 1992 refit; 1905, Bucher-Durrer (Swiss National Museum, Schindler, MySwitzerland) | Confirmed |

## Not added as new stories
- Client A1 Chapel Bridge, A2 Lion Monument, A5 Zyt Tower, A9 Pilatus Dragon Ride: they overlap stories that already exist (`water-tower`, `lion-monument`, `musegg-morning`, `pilatus`). Merge facts into those if wanted.
- Restaurants B1–B8: a separate "Where to eat" section, not stories (see the chat advice and the client file).

## Still to confirm
- The Weinmarkt oath location and the fountain details come from luzern.com; the 1332 date is standard Swiss history.
- Opening times and season of the Hammetschwand lift; the pharmacy's hours.
- Photo credits are in `front-end/src/assets/photos/CREDITS.txt`.
