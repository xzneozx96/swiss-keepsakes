# Lucerne tours: research brief (shared by all researchers)

Client brief: `/home/ross-geller/Documents/Minastik documents/swiss-native/[EN] Lucerne_Storyteling.pdf`
(18 pages; read the pages for your locations). Date today: 2026-10-15.

We are replacing the sample tours in the Swiss Keepsakes prototype with 11 tours built from
that brief. Your job: research each assigned location properly, write the website story for it,
and find a real photo. You do NOT edit anything under `front-end/`.

## The 11 tours (so you know where your location is used)

City routes (stop order from the brief):
1. Lucerne in 90 minutes: Chapel Bridge, Kornmarkt, Weinmarkt, Hirschenplatz, Victorinox Store (Hirschenplatz 12)
2. Time, history and loyalty (half day): Musegg Wall / Zyt Tower, Hofkirche, Lion Monument, Old Swiss House (meal, optional), Jesuit Church
3. The city's quieter lives (3-5 h): Ritter's Palace, Jesuit Church, Suidter Pharmacy, Weinmarkt, Hirschenplatz, Lion Monument
4. Lucerne at your own pace (2-3 h): Chapel Bridge, Jesuit Church, Kornmarkt, Weinmarkt, Hirschenplatz, Lion Monument

Alpine journeys (one tour each, by vehicle from Lucerne): Furka, Grimsel, Susten, Gotthard,
Nufenen, Brienzer Rothorn, Finsterwald honey.

A location story is written once and reused in every tour that visits the place, so write it
to stand alone, not "as the third stop of tour 2".

## Rules

1. **Research, don't paraphrase the brief.** The brief is a short storytelling outline. Go to
   primary or official sources (luzern.com, myswitzerland.com, the owner/operator site, the
   Swiss Federal Office of Culture inventory, Historisches Lexikon der Schweiz (hls-dhs-dss.ch),
   museum and heritage pages, reputable books/press). Wikipedia is fine as a pointer, not as the
   only source for a fact.
2. **Fact-check every historical claim in the brief** that touches your locations. For each,
   mark: CONFIRMED / CORRECTED (give the right fact) / UNVERIFIED. The brief may contain
   errors; report them, do not silently fix. Known one to check hard: the brief ties the
   "Dance of Death" to Ritter's Palace. Check where Lucerne's Totentanz paintings actually are.
3. **Every fact in a story needs a source URL** in your notes. If you cannot source it, leave it
   out of the story or label it as legend/interpretation in the text ("legend says...").
   Interpretation stays interpretation (e.g. the Zyt clock striking one minute early: the brief
   itself says the symbolic reading is not proven history).
4. **Never promise access.** Pharmacy interior, Ritter's Palace courtyard, private beehouse,
   Musegg tower interiors, passes, steam railway and boats are seasonal or by permission. Put
   that in the practical note, with the current 2026 opening/season dates and a source.
   Today is 2026-10-15: say what is open now and when the next season starts.
5. **No sales copy.** Victorinox/watch/honey items are proposed products, not confirmed stock.
   Don't write "buy" lines. Keepsake ideas are optional and go in the notes, not the story.
6. **Voice** (match these existing chapters, which are the house style): plain, concrete,
   second person where natural, short sentences, one specific detail per paragraph, no
   "hidden gem", "nestled", "tapestry", "rich history", "steeped in", em-dash flourishes or
   rhetorical questions in the story. Example, ~60 words:
   "The walk starts on the Chapel Bridge, a covered wooden bridge across the Reuss, right where
   the river leaves the lake. Beside it stands the octagonal Water Tower, about 34 metres high.
   Both were part of the town's defences before they became its postcard."
   Target **85-120 words** per story, one title (4-8 words, concrete, no colon).
7. **German**: write DE yourself, natural not literal. Swiss spelling: **ss, never ß**
   ("Strasse", "Gruss"), "Gotthardpass", Luzern, Vierwaldstättersee, Kapellbrücke.
8. **Photos: Unsplash and Pexels only**, downloaded. No Wikimedia Commons, no AI images, and do
   NOT reuse the AI watercolour pictures embedded in the client PDF.
   Official Swiss-tourism/Luzern Tourismus/operator images need a licence from the client:
   list them as *candidate URLs only*, never download them into the repo.
   - Find with WebSearch (e.g. `unsplash Zytturm Luzern`, `pexels Furka Pass`), open the photo
     page, take the photographer, title and licence from the page.
   - Download to `docs/content/lucerne-tours/images/<location-slug>/<name>.jpg`
     (Unsplash: `https://images.unsplash.com/photo-...?w=1600&q=85`; Pexels: the
     `https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg?auto=compress&w=1600` URL).
     Use `curl -sL -o`. One directory per location; keep scripts elsewhere.
   - **Open every downloaded file with the Read tool and look at it.** Confirm it really shows
     the named place (Unsplash/Pexels titles are often generic or wrong: a "Lucerne" photo may
     be Interlaken). Write what you actually see. Landscape orientation preferred (the site
     crops to 4:3).
   - Give 1-3 candidates per location, rank them, say which is best and why.
   - If neither site has a genuine photo of the exact place, say **GAP** plainly and name the
     nearest honest substitute (e.g. a general Lucerne skyline), or none. Do not pass off a
     different place.

## Output: one markdown file per researcher

Write `docs/content/lucerne-tours/research/<your-group>.md` (path given in your task). For each
location use exactly this structure so it can be merged mechanically:

```
## <location-slug> — <Name>
Used in tours: <numbers/names>

### Fact-check of the brief
- "<claim from brief>" — CONFIRMED|CORRECTED|UNVERIFIED — <fact> — <source URL>

### Sourced facts
- <fact> — <source URL>

### Place data
- Coordinates [lon, lat] (WGS84, decimal, 5 dp) — <source>
- Address / where exactly to stand
- 2026 access: <open now? seasonal dates? permission needed?> — <source>
- Step-free access / stairs: <fact> — <source>
- Time to allow (minutes)

### Story
EN title: ...
EN body: (85-120 words)
DE title: ...
DE body:

### Stop card
EN description (1-2 sentences, what the guest does here): ...
DE description: ...
EN note (practical tip, optional, <=25 words): ...
DE note: ...

### Photo
- file: docs/content/lucerne-tours/images/<slug>/<file>.jpg (what the image actually shows)
- photographer / title / source page URL / licence (Unsplash License | Pexels License)
- verified by viewing: yes + one-line description
- other candidates + official-image candidate URLs (not downloaded)
- GAP: yes/no
```

Alpine locations additionally need, after "Place data":

```
### Journey plan (one-day version, vehicle, starting from Lucerne Bahnhofplatz)
- Suggested stops in order (3-5), each with [lon, lat], and the cumulative minutes from the
  start, driving time included. Mark times as ESTIMATE unless a source gives them.
- Total duration (minutes), return time to Lucerne.
- 2026 season: pass opening/closing dates (typical and this year), road-closure rule, source.
- Safety lines from the brief to keep: use designated viewpoints; never walk in tunnels or on
  unsafe edges; warm layers.
```

Brienzer Rothorn: the brief says two days is better; produce a realistic **one-day** version
with fewer stops (say what you dropped). Finsterwald: verify what and where Finsterwald is
(Entlebuch region, canton Lucerne), the real honey/beekeeping tradition there and the
Entlebuch UNESCO Biosphere; do NOT invent a named beekeeper or promise a beehouse visit.

End your file with a short `## Open questions for the client` list (things only the client can
confirm: access, partners, prices, meeting points).

Finish by replying with a 5-10 line summary: files written, which brief claims were CORRECTED,
which photos are GAPs. Do not paste the stories into the reply.
