# Trip planner demo: spec (draft for owner review)

Replaces the question-set chat behind the floating assistant (`/plan`, `AdviceChat`) with a scripted, pick-only trip planner. Purpose: show the client how an AI agent handles a visitor inquiry end to end. No model calls. All answers are picked, never typed.

Research date: 16 Oct 2026. Raw reports: `/tmp/opencode/research-sights.md`, `research-hotels-transport.md`, `research-restaurants.md`.

## 1. Rules

1. **Real data only.** Every fact shown to the guest comes from section 6 to 8. Anything marked UNVERIFIED is not narrated. Venue hours or prices that could not be verified are left out of generated plans.
2. **Window.** Demo dates run **17 Oct 2026 to 31 Mar 2027**. Summer 2027 timetables are not published, so it is out of scope.
3. **No invented forecast.** The assistant never claims a weather forecast. It may say "winter in Lucerne" and offer a Plan B.
4. **English only** for this release.
5. **No text input.** The composer is replaced by the current picker. Each pick appears as the guest's bubble. Tapping an earlier bubble rewinds and replays from that step.
6. Reuse `AssistantSays`, `AssistantAvatar`, `TYPING_MS` (650 ms) and the reduced-motion rule from `advice-chat.tsx`.

## 2. Flow

```
0 Welcome → 1 Staying → 2 Party → 2b Child ages → 3 Date → 3b Start & length
→ 4 Interests → 4b Follow-ups → 5 Pace → 6 Reasoning → 7 Itinerary → 8 Refine → 9 Hand off
```

| # | Assistant | Picker | Stored slot |
|---|---|---|---|
| 0 | "Hi! I'm your Lucerne trip planner. Answer a few quick questions and I'll build your day." | Let's go / See a sample plan | none |
| 1 | "Where are you staying?" | 6 hotels (section 6), Haven't booked yet, Day trip from Zürich | `base` |
| 2 | "Who's travelling?" | Stepper: Adults 1–8, Children 0–6 | `adults`, `children` |
| 2b | if children: "How old is child 1?" | Under 6 / 6–15, per child | `childBands[]` |
| 3 | "Which day?" | Next 14 days as chips, plus calendar limited to the window | `date` |
| 3b | "When do you set off, and for how long?" | 08:30 / 10:00 / 12:00 / 14:00. Half day (about 4 h) / Full day (about 7 h) | `start`, `length` |
| 4 | "What do you enjoy? Pick any." | Scenic views / History & culture / Local food / Shopping / Relaxing | `interests[]` |
| 4b | follow-ups below | | |
| 5 | "What pace suits you?" | Relaxed (3 stops) / Balanced (4) / Packed (5) | `pace` |
| 6 | "Great, give me a moment…" | none, 2.5 s trace | none |
| 7 | "Here's your day" | Itinerary card | none |
| 8 | "Want to adjust anything?" | Refine chips | `tweaks[]` |
| 9 | "Ready to make it happen?" | CTAs | none |

**Follow-ups (4b):**

| Trigger | Question | Options |
|---|---|---|
| Local food | "Any dietary needs?" | No preference / Vegetarian |
| Shopping | "What are you looking for?" | Swiss knives / Watches / Chocolate |
| Day trip | "When do you arrive at Lucerne station?" | 08:30 / 10:00 / 12:00 |

Children's age bands are Under 6 and 6–15 because the real ticket prices change at 6 and 16.

Dietary is limited to "No preference / Vegetarian". Halal, gluten-free and children's menus are not verified at any venue.

## 3. Availability rules

The date decides which stops can appear. The reasoning trace says why a stop was dropped.

| Stop | Available | Reason / source |
|---|---|---|
| Zytturm and Musegg wall | 17 Oct–1 Nov only, 08:00–19:00. Not with a child under 6 | Closed 2 Nov–31 Mar. Not stroller-suitable (museggmauer.ch) |
| Pilatus Dragon Ride | 1–31 Dec 2026 only, up 08:30–16:00, last down 16:45 | Closed 19 Oct–27 Nov. 28–30 Nov price unverified. Jan–Mar 2027 timetable unpublished |
| Hammetschwand lift | Never in the window | Seasonal, reopens about April 2027 |
| Short Catamaran Cruise (55 min) | 19 Oct–12 Dec, hourly 09:07–19:07 (Fri–Sat to 22:07) | After 12 Dec: unverified, offer with "check timetable" or drop |
| Rosengart | Nov–Dec daily 11–17. Jan–25 Mar Tue–Sun 12–17. Closed 25 Dec, and Mondays 1 Jan–22 Mar and 4–9 Feb | rosengart.ch |
| Kunstmuseum | Closed Mondays. Wed 11–19, other days 11–18. Closed 8, 24, 25, 31 Dec | kunstmuseumluzern.ch |
| Gletschergarten | Daily. 10–18 until 31 Oct, then 10–17 | gletschergarten.ch |
| Bourbaki Panorama | Same hours as Gletschergarten | bourbakipanorama.ch |
| Verkehrshaus | Daily. 10–18 summer, 10–17 winter | verkehrshaus.ch |
| Shops | Mon–Fri to 19:00, Sat to 17:00, Thu late to 21:00, **Sun closed**. Exceptions: station shops (Läderach, Sun 10–20), Sprüngli (Sun 11–18). Sunday sales 13 and 20 Dec | city-luzern.ch, SBB, spruengli.ch |
| Galliker, Old Swiss House | Closed Sun and Mon | official sites |
| Stadtkeller folklore show | **17–31 Oct only**, evening 20:00. Book by phone or email | stadtkeller.ch |
| Old Suidter pharmacy | **Not offered.** Working pharmacy, Sunday closed | suidter.ch |

Events shown as a "Good to know" note when the date falls inside: Blues Festival 7–15 Nov, Advent opens 21 Nov, ice rink 20 Nov–1 Jan, Christmas Train 22 Nov–27 Dec, Lilu Light Festival 14–24 Jan. Fasnacht dates are derived, not published, so they are not used. Christmas market dates were not found.

Visitor Card: guests in city hotels ride city buses and trains free in Zone 10. The Kriens boundary is unverified, so no claim is made about Pilatus access.

## 4. Itinerary generation

Pick a template from interests plus available stops, then trim or extend to the pace count. Times are computed from start time, durations and walking legs. A lunch is inserted around 12:00–13:30 for half day starts at 08:30 to 10:00 and full days.

| Template | When | Spine |
|---|---|---|
| Old Town classic | Default | Chapel Bridge, Weinmarkt, Spreuer Bridge + Needle Dam, lunch, Lion Monument + Gletschergarten |
| Family | Any child | Chapel Bridge, Short Catamaran Cruise (to 12 Dec), lunch, Verkehrshaus or Gletschergarten. No Zytturm if child is under 6 |
| Food and shopping | Food or Shopping | Old Town stroll, lunch, Sprüngli or Läderach, shop stop (Sun: station only) |
| Culture | History & culture | Rosengart, Bourbaki Panorama, Gletschergarten, Kunstmuseum |
| Scenic | Scenic or Relaxing | Cruise, Gütsch funicular, Zytturm (to 1 Nov) or Pilatus (Dec) |
| Day trip | Base is Zürich | Train arrival, then Old Town classic. Return to Zürich by train, 42–50 min, two direct trains an hour |

**Reasoning lines** are templated and must reference slots and rules, for example:
- "Staying at Hotel des Balances, so Chapel Bridge is 5 minutes away."
- "Child under 6, so I left out the Zytturm: its stairs aren't suitable for strollers."
- "The Zytturm closes for winter on 2 November, so I'm using the Needle Dam instead."
- "It's Sunday and most shops are closed, so I put chocolate at the station."
- "Galliker is closed on Mondays, so I chose Wilden Mann."

**Cost line** is computed from real prices and age bands (section 7). Under-6 tickets are free for the museums and Gletschergarten.

## 5. Refine and hand off

Refine chips, each usable once: Less walking, Add shopping, Winter-proof (indoor Plan B), Swap lunch, Start later (+1 h, +2 h). Changes animate as diffs.

Hand off:
- **Book a tour** opens the existing tour list.
- **Request a table** is available for venues with online booking: Wilden Mann, Old Swiss House, Taube. Others show phone or email.
- **Send to our team** creates an `AdviceRequest` in the existing store. The slots and itinerary become the question and answer pairs, so the merchant inbox shows a structured brief. The email is taken from the signed-in demo guest or a preset demo address, shown as a confirm chip. Nothing is typed.
- **View as staff** is a demo toggle that opens that merchant request.

## 6. Hotels (verified live Oct 2026)

Walking minutes are OSM routing estimates, accurate to about 1–2 min. Recompute with a routing service during the build.

| Hotel | Address | Station | Chapel Bridge | Lion Monument | Boat pier |
|---|---|---|---|---|---|
| Hotel Schweizerhof | Schweizerhofquai 3 | 9 | 5 | 8 | 6 |
| Art Deco Hotel Montana | Adligenswilerstrasse 22 | 19 | 15 | 12 | 17 |
| Romantik Hotel Wilden Mann | Bahnhofstrasse 30 | 9 | 5 | 17 | 7 |
| Hotel des Balances | Weinmarkt | 9 | 5 | 13 | 7 |
| Radisson Blu Hotel Lucerne | Inseliquai 12 (not confirmed on official site) | 4 | 12 | 19 | 6 |
| Hotel Waldstätterhof | Zentralstrasse 4 | 4 | 7 | 15 | 3 |

## 7. Stops (verified)

| Stop | Cost (CHF) | Time | Narration facts allowed |
|---|---|---|---|
| Chapel Bridge and Water Tower | Free | 15–30 min | 14th-century covered bridge. Water Tower is older (c. 1300). Fire of 18 Aug 1993, reopened 14 Apr 1994. Painted panel cycle |
| Weinmarkt | Free | 10–15 min | Fish and wine market recorded c. 1300. Fountain of 1481 (original in the Historical Museum). Site of the first town hall until 1447 |
| Spreuer Bridge | Free | 10–15 min | Built c. 1408. Dance of Death cycle by Caspar Meglinger, 1625–1635, 65 panels. Step-free only from the Mühlenplatz side |
| Needle Dam | Free | 5–10 min | Built 1859–1861. Needles set and removed by hand to regulate the lake level. No needle count |
| Zytturm | Free | 20–40 min | Clock from 1535. Strikes the hour one minute before all other city clocks. Tower built c. 1400–1442 (sources differ). 104 steps |
| Lion Monument | Free | 15–30 min | Inaugurated 1821, to the Swiss Guards killed 10 Aug 1792. Mark Twain's "most mournful and moving piece of stone in the world" |
| Gletschergarten | 24 / 18 reduced / 12 (6–16) / under 6 free. Family 60 | 1–2 h | Next to the Lion Monument. Indoor and outdoor |
| Bourbaki Panorama | 15 / 12 / 7 (6–16) | 45–60 min | 112 m × 10 m painting of 1881. Next to the Lion Monument |
| Verkehrshaus | 37 / 16 (under 16) / under 6 free | 2–3 h | Indoor. Day pass 62 / 29 |
| Rosengart | 20 / 18 / 10 student / 10 (7–16) | 1–2 h | Indoor, 3 min from the station |
| Kunstmuseum Luzern | 15 / 12 / 6 (16–25) / free to 16. Free first Sunday | 1–1.5 h | Indoor, in the KKL building |
| Short Catamaran Cruise | from 21.60 (see open item 2) | 55 min | Lucerne to Kehrsiten-Bürgenstock and back, from Pier 3 by the KKL |
| Gütsch funicular | 3 single | about 1 h | 90 m height gain in 1.5 min. Daily 04:30–01:15 (third-party source) |
| Pilatus Dragon Ride | Winter 60 / 30 (Dec–Apr) | 4–5 h | Dragon Ride gondola is 3 min 39 s. Cogwheel is closed from 29 Nov. Weather dependent |

Hammetschwand figures are kept for the future: 153 m, about 60 s (not 152 m).

## 8. Food (verified)

| Venue | Rest days | Price notes | Booking |
|---|---|---|---|
| Wilden Mann (Sauvage, Burgerstube) | None, daily 11–22 | Weekday 2-course lunch 28. Chügelipastetli 42 | Online |
| Rathaus Brauerei | None | Mains about 24–47.50 | Phone or email |
| Wirtshaus Taube | None, 11:30–23:30, kitchen to 21:30 | Chügelipastetli 41.50 | Online |
| Wirtshaus Galliker | **Sun, Mon** | Chügelipastetli | Phone or email |
| Old Swiss House | **Sun, Mon** | Mains 51–69, Wiener Schnitzel 66 | Online |
| Ristorante Barbatti | None (bar closed Sun, Mon) | Pasta 22–39, mains 45–59 | n/a |
| Confiserie Bachmann, Schwanenplatz 7 | None, Mon–Wed 7–19, Thu 7–21, Fri–Sat 7–20, Sun 9:30–20 | Not verified | n/a |
| Kanchi (vegetarian menu), Zürichstrasse 4 | None, 11–14 and 17–23 | Vegetarian menu 42 per person | n/a |
| Stadtkeller folklore evening | 17–31 Oct only | Fondue 39.50, mains 30.50–56 (2025 menu) | Phone or email |

Not offered: Fritschi (official site suspended), Hans im Glück, Bar Pur, Heini (prices unverified).

## 9. Corrections to the client's text

Narrate the corrected form. Raise these with the client:

| Item | Client text | Corrected |
|---|---|---|
| Old Swiss House | 15 GaultMillau points | 14 (official site) |
| Barbatti | Tuscan, since 1949 | Venetian kitchen. 1949 unverified |
| Galliker | Origins 1681 | The name dates to 1681, not the restaurant. No longer family-run |
| Taube | 1772 | Unverified |
| Zytturm | "First strike" decree of 1385 | Clock of 1535. Strikes one minute before the other clocks |
| Nadelwehr | About 170 needles | Unsupported. Count omitted |
| Hammetschwand | 152 m | 153 m |
| Weinmarkt | Site of the 1332 oath | Unsupported. Omitted |
| Old Suidter pharmacy | A visitable sight | A working pharmacy at Bahnhofstrasse 21, not a stop |
| Chapel Bridge | Built 1333 | Sources differ (c. 1300 or 1333). Say "14th century" |

## 10. Open items

1. **Window.** This spec assumes 17 Oct 2026–31 Mar 2027. Confirm.
2. **Cruise.** Operator's shop says "from 21.60" and luzern.com says "from 13.80". The winter timetable end is 12 Dec in one source and 16 Apr 2027 in another. Verify with SGV before build.
3. **Email on send.** Needs an email but no typing is allowed. Proposed: a preset demo address shown as a confirm chip.
4. **Merchant question-set editor.** It no longer drives the chat. Keep it as is, or hide it. Needs an owner decision.
5. **Images.** The client supplied no photos for stops. Itinerary cards use an icon, not a photo, unless licensed photos are supplied.
6. **Walking times.** Recompute all legs in the build with a routing service. Current values are estimates.
7. **Still unverified.** Victorinox Lucerne hours, Bucherer Sunday hours, Jesuit Church and Hofkirche visiting hours, Pilatus 2027 timetable, and stroller access at most indoor sights. These are excluded from plans.
