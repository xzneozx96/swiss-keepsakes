# Voice and copy brief

Read this before writing or rewriting guest or merchant copy, by hand or with a model. It records the voice the app already has, so a rewrite extends it instead of replacing it.

Sources: `PRODUCT.md`, the copy in `front-end/src/features/**/messages.ts` and `messages.de.ts`, and `docs/client-materials/Lucerne_Local_Stories_Sights_and_Dining.md`. Two decisions at the end need the owner's confirmation. Everything else is observed from the current copy.

## Two registers, deliberately different

| | Guest copy | Merchant copy |
| :-- | :-- | :-- |
| Job | Make someone want to go, or remember going | Tell someone what a control does, and what happens next |
| Person | Second person: *you* | Second person: *you* |
| Tense | Present | Present |
| Sentence | Short. One idea each | Short. One idea each |
| Feeling | Warm, specific, unsentimental | Calm, factual, complete |
| Length | As short as the story allows | As short as the consequence allows |
| Never | Prices, "book now", invented facts | Marketing adjectives, vagueness |

Merchant help text is the easier half and it already works. This brief is mostly about the guest half.

## The source material is an adaptation, not a translation

`docs/client-materials/Lucerne_Local_Stories_Sights_and_Dining.md` holds 17 items in Vietnamese, 5 of them also in German, and **no English**. The source register is lush tourism writing: long sentences, stacked metaphors, "a vivid medieval fairy tale", "a culinary staging that unfolds in two worlds".

The app's voice is the opposite, and it is better. The job is not to translate the ornament. It is to keep the fact and the emotion, and drop the ornament.

One concrete detail carries more feeling than three adjectives. That is the whole rule.

### Worked example, Chapel Bridge

Source, rendered close to the Vietnamese:

> Walking along the rustic wooden planks of Europe's oldest covered bridge, you feel as though you have wandered into a vivid medieval fairy tale, where the cosy wooden eaves shelter a series of unique seventeenth-century triangular paintings that whisper the rise and fall of old Swiss history.

House voice:

> Europe's oldest covered bridge. Under its roof, painted panels from the 1600s tell Swiss history one scene at a time. The octagonal water tower beside it is older than the bridge and has served as a treasury, a guard post and a prison. Fire nearly ended the bridge in 1993. Lucerne rebuilt it within a year.

Same facts. No "fairy tale", no "whisper", no "cosy". Short sentences, named things, and a last line that lands.

German, same meaning, German sentence order, Swiss spelling:

> Europas älteste gedeckte Brücke. Unter dem Dach erzählen bemalte Tafeln aus dem 17. Jahrhundert die Schweizer Geschichte, Szene für Szene. Der achteckige Wasserturm daneben ist älter als die Brücke und diente als Schatzkammer, Wachposten und Gefängnis. 1993 hätte ein Feuer die Brücke fast zerstört. Luzern baute sie in einem Jahr wieder auf.

## Rules that can be checked

1. **Second person, present tense.** "You cross the bridge", not "visitors may cross".
2. **One idea per sentence.** If a sentence has two commas and an "and", split it.
3. **Name the thing.** *Kapellbrücke*, *Löwendenkmal*, *Lozärner Chügelipastetli*. Not "the famous bridge" or "a local delicacy".
4. **One adjective per noun, maximum.** Two is a smell. Three is a rewrite.
5. **No superlatives of our own.** "Mark Twain called it the saddest stone in the world" is a fact with a source. "The most breathtaking monument in Switzerland" is an opinion we have not earned.
6. **Numbers stay exact.** 1356, 1792, 1821, 1993, 14 GaultMillau points. Never round a date for rhythm.
7. **No exclamation marks**, with one exception: the Swiss greeting (*Grüezi!*). `advice.greeting` may keep it. `requests/messages.ts:34` ("Thank you!") should lose its mark in the next edit of that file.
8. **No emoji. No em dashes as decoration.** A dash may separate an aside; it may not replace a full stop.
9. **End on something to do or something to feel**, not on a summary of what was just said.
10. **Say "you".** In guest copy, "guests" is the word we use about ourselves in a spec, not in a sentence aimed at a person.

## Banned words

These are the tells that make travel copy read as machine output. Each has a replacement in the right column.

| Banned | Write instead |
| :-- | :-- |
| nestled, tucked away | the actual position: *on the north bank*, *above the lake* |
| hidden gem, jewel, treasure | the thing, named |
| discover, unveil, immerse yourself | the action: *walk*, *climb*, *eat*, *look up* |

One approved exception: the owner's own line for the map section, `homePage.map.body`, uses "discover" (*"…then discover Lucerne at your own pace"*). It is the only place the word is allowed; do not copy it as licence elsewhere.
| breathtaking, stunning, iconic | what you see: *a dying lion carved into rock*, *painted panels under a wooden roof* |
| a must-see / must-visit | why it is worth the detour, in one clause |
| boasts, offers, features | the plain verb: *has*, *serves*, *opens* |
| culinary journey, feast for the senses | the dish, and how it is cooked |
| in the heart of | the street or square it is on |
| whether you are… or… | cut the frame, start with the subject |
| step back in time | the year, and what happened in it |

## Two languages, one meaning

`PRODUCT.md` requires that copy "preserve the selected language, price, date, and booking meaning together". Practically:

- **English is British**: *colour*, *cancelled*, *organiser*, *recognise*, *centre*. The app already does this. Do not Americanise.
- **German is Swiss**: **never `ß`, always `ss`** — *heisst*, *Schliessen*, *ausgebucht*, *gross*. The app follows this everywhere except three strings, which should be fixed: `features/categories/messages.de.ts:51` (`heißt`), `features/lab/calendar/calendar-overlays.tsx:63` (`Schließen`) and `features/merchant/calendar/calendar-messages.de.ts:7` (`Schließen`).
- **German addresses the guest as *Sie*.** 408 occurrences, zero *du*. Do not switch to *du* for warmth.
- **German is written in German, not translated word for word.** Verb at the end, compound nouns, no English clause order with German words.
- **German runs 15–30% longer.** Layout and truncation must not assume parity. A string that only fits in English is an unfinished string.
- **One meaning per key pair.** If the English is a pun, the German says the thing plainly rather than inventing a second joke.

### The city's name

| Context | Use | Evidence |
| :-- | :-- | :-- |
| English copy | **Lucerne** | 13 uses in `messages.ts` |
| German copy | **Luzern** | 17 uses in `messages.de.ts` |
| Never | ~~Luzerne~~ | 5 strays in English copy; 0 in German |

English examples inside the German dictionary may name the city in English: `keepsakes.basics.name.placeholder.en` ("Victorinox pocket knife, Lucerne designs") is correct as it stands.

Fix these five when their file is next edited:

- `features/tours/discovery/messages.ts` lines 2, 22, 35
- `features/requests/messages.ts` lines 92, 93 (mail subjects)

## Facts copy may not invent

`PRODUCT.md` constrains what stories and pages may claim. A model writing appealing copy will break these unless told:

- **No prices in stories, the map or shop lists.** Prices first appear on the product page. Never "from CHF 25" in a tour story.
- **Tours are free information**, with a PDF guide and an advisory route. No "book now", "reserve your seat", "limited places". Booking is hidden and out of scope.
- **Guests do not review places.** No invented guest quotes, star ratings or testimonials about sights.
- **The site is not a route planner** and never reads the visitor's location. No "we'll route you there".
- **CHF** is the currency. Times are Lucerne time where a time is given.
- **Do not add detail that is not in the source.** Opening hours, prices, "since 1356" — if the source does not say it, it does not ship.

## Before a string ships

1. Would a local say it that way?
2. Is every sentence one idea?
3. Is there a banned word left? Is there an adjective you would defend?
4. Does the German say the same thing in German word order, with `ss` and *Sie*?
5. Does it respect the facts in the section above?
6. Can you cut the first sentence and lose nothing? If yes, cut it.

## Applying this with a model

The copy lives in keyed dictionaries, so the model's real job is to change values, never keys.

- **One file pair per request.** `messages.ts` and `messages.de.ts` together, so the meaning stays paired.
- **Keys are the contract.** The German file is typed `Record<keyof typeof En, string>`. A renamed or dropped key fails the build; a silently invented one drifts. Reject any output that adds or renames keys.
- **Give the model this brief and the source item**, not "make it more appealing".
- **Ask for English first, review it, then German from the approved English.** Translating from unreviewed English copies the mistake into both languages.
- **Verify as code**, per `AGENTS.md`: `pnpm exec tsc --noEmit`, `pnpm test`, and `pnpm typecheck:tests` from `front-end/`. Do not run `pnpm lint:fix` — other sessions share the tree.
- **Keep the diff to the strings.** A model that reformats the file creates conflicts.

## Decisions the owner must confirm

1. ~~**The city's name.**~~ **Confirmed 2026-11-06:** *Lucerne* in English copy, *Luzern* in German copy. "Luzerne" is a misspelling and is not a brand form. English files were swept on the home screen; `features/content/seed.ts` still carries 33 "Luzerne" and 42 "Luzern", and needs the same sweep before its stories ship.
2. **The formal *Sie*.** The app uses *Sie* throughout. Confirm that stays, or that guest stories may use *du* to feel closer.

Until the *Sie* question is confirmed, follow the majority usage recorded above.
