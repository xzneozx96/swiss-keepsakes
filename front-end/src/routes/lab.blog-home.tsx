import type { Effect } from "@/features/lab/blog-home/effects";
import type { TilesMode, Voice } from "@/features/lab/blog-home/options-v3";
import type { StoriesStyle } from "@/features/lab/blog-home/stories-styles";

import { Link, createFileRoute } from "@tanstack/react-router";

import { Snowfall, isFestiveSeason } from "@/features/lab/blog-home/effects";
import {
  AdventHome,
  CirclesHome,
  CoverHome,
  EditionHome,
} from "@/features/lab/blog-home/options";
import {
  ChaptersHome,
  StorybookHome,
  ThreadsHome,
} from "@/features/lab/blog-home/options-v2";
import { JourneyHome } from "@/features/lab/blog-home/options-v3";
import { LabTabBar } from "@/features/lab/blog-home/shared";
import { useDemoNow } from "@/features/demo";

const ADVENT_PREVIEW_DAY = 8;

const optionIds = [
  "R3",
  "R2-A",
  "R2-B",
  "R2-C",
  "R1-A",
  "R1-B",
  "R1-C",
  "R1-D",
] as const;
const storyStyleIds: StoriesStyle[] = [
  "reels-auto",
  "reels-player",
  "reels-viewer",
  "reels-moving",
  "postcards",
  "bento",
  "trail",
  "scrapbook",
];
const effectIds: Effect[] = ["off", "snow", "lights", "snowLights", "fullSnow"];

interface LabSearch {
  option: (typeof optionIds)[number];
  effect: Effect;
  tiles: TilesMode;
  voice: Voice;
  stories: StoriesStyle;
}

const pick = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T => (allowed.includes(value as T) ? (value as T) : fallback);

/**
 * Lab: stories-first home structures for the personal Lucerne blog, with Christmas effects.
 * The choices live in the URL so Back from the lab story list returns to the same view.
 */
export const Route = createFileRoute("/lab/blog-home")({
  validateSearch: (
    search: Partial<Record<keyof LabSearch, unknown>>,
  ): LabSearch => ({
    option: pick(search.option, optionIds, "R3"),
    effect: pick(search.effect, effectIds, "snow"),
    tiles: pick(search.tiles, ["map", "recap"] as const, "map"),
    voice: pick(search.voice, ["we", "brand", "me"] as const, "me"),
    stories: pick(search.stories, storyStyleIds, "reels-moving"),
  }),
  component: BlogHomeLab,
});

const options = [
  {
    id: "R2-A",
    round: 2,
    title: "A · Chapters",
    note: "Hero, then chapter 1 Stories (category circles, one lead story, three more). The tiles “Discover Lucerne, bring it home” act as a bridge and jump to chapters 2 Tours, 3 Victorinox, 4 Keepsakes.",
    Option: ChaptersHome,
  },
  {
    id: "R2-B",
    round: 2,
    title: "B · Storybook",
    note: "The category circles sit right under the hero. Stories swipe like a book of large photo cards. Tours, Victorinox and Keepsakes follow, and the tiles close the page as “Bring Lucerne home”.",
    Option: StorybookHome,
  },
  {
    id: "R2-C",
    round: 2,
    title: "C · Story threads",
    note: "Like A, with a two-column story grid. Each later chapter opens with the story behind it (the steamboat before Tours, a postcard story before Keepsakes). Tiles worded “From the stories to the streets”.",
    Option: ThreadsHome,
  },
  {
    id: "R1-A",
    round: 1,
    title: "A · Cover story",
    note: "One hand-picked story fills the first screen. Category chips filter a vertical feed. The shop comes after the stories.",
    Option: CoverHome,
  },
  {
    id: "R1-B",
    round: 1,
    title: "B · Story circles",
    note: "Category circles, a swipeable featured deck, then a compact list.",
    Option: CirclesHome,
  },
  {
    id: "R1-C",
    round: 1,
    title: "C · Today’s edition",
    note: "A dated newspaper-style header, one lead story, numbered short reads and the writers’ picks.",
    Option: EditionHome,
  },
  {
    id: "R1-D",
    round: 1,
    title: "D · Advent edition",
    note: `A December-only home with an Advent calendar as the hero, previewed as ${ADVENT_PREVIEW_DAY} December.`,
    Option: AdventHome,
  },
] as const;

const effects: { id: Effect; label: string; note: string }[] = [
  { id: "off", label: "Off", note: "No effect." },
  {
    id: "snow",
    label: "Snow on hero",
    note: "Recommended. Light snowfall over the hero banner only. It stops once the hero scrolls away, so it never covers text you are reading.",
  },
  {
    id: "lights",
    label: "Lights",
    note: "A warm-white string of lights hanging along the top of the hero, gently twinkling.",
  },
  {
    id: "snowLights",
    label: "Snow + lights",
    note: "Both together, still on the hero only.",
  },
  {
    id: "fullSnow",
    label: "Full-screen snow",
    note: "For comparison, not recommended: snow over the whole screen, including the stories while you read.",
  },
];

const chip =
  "h-9 rounded-full border border-separator bg-surface px-3.5 text-sm font-medium outline-none focus-visible:focus-ring aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background";

const tilesModes: { id: TilesMode; label: string }[] = [
  { id: "map", label: "Journey map at top" },
  { id: "recap", label: "Recap at end" },
];

const storyStyles: {
  id: StoriesStyle;
  group: "reels" | "earlier";
  label: string;
  note: string;
}[] = [
  {
    id: "reels-auto",
    group: "reels",
    label: "R1 · Auto-play rail",
    note: "The rail plays itself: every five seconds the next story slides in, and it loops. The segments show where you are among the stories. Press and hold to pause, swipe to jump. It only plays while on screen.",
  },
  {
    id: "reels-player",
    group: "reels",
    label: "R2 · Story player",
    note: "One large card that plays like Instagram: photos cross-fade every five seconds, tap the left third to go back and the rest to go on, hold to pause, and “Read the story” opens it.",
  },
  {
    id: "reels-viewer",
    group: "reels",
    label: "R3 · Tap to watch",
    note: "Still covers with a play badge, two and a bit on screen. A tap opens the full-screen story player at that story; it closes after the last one or with the cross.",
  },
  {
    id: "reels-moving",
    group: "reels",
    label: "R4 · Moving photos (chosen)",
    note: "No timer at all: each photo drifts slowly (a Ken Burns effect), so the rail feels alive without pretending to play. The calmest option.",
  },
  {
    id: "postcards",
    group: "earlier",
    label: "Postcards",
    note: "Each story is a tilted Lucerne postcard with a stamp of its category, a postmark with the place and “Greetings from …”.",
  },
  {
    id: "bento",
    group: "earlier",
    label: "Bento mosaic",
    note: "A mosaic of different-sized photo tiles with the title on the photo and a colour per category.",
  },
  {
    id: "trail",
    group: "earlier",
    label: "Story trail",
    note: "Stories as numbered stops on a dotted walk. Now used for the three steps above the stories.",
  },
  {
    id: "scrapbook",
    group: "earlier",
    label: "Scrapbook",
    note: "Taped polaroids at different angles in two staggered columns.",
  },
];

const voiceModes: { id: Voice; label: string }[] = [
  { id: "we", label: "We · Lukas & Ngọc" },
  { id: "brand", label: "Swiss Keepsakes" },
  { id: "me", label: "I · Ngọc" },
];

const R3_NOTE =
  "One narrator, one journey. Hero welcome and who is talking, then 01 Read it (stories; circles open the story list), 02 Walk it (each tour shows the story it comes from), 03 Keep it (Victorinox and keepsakes as one ending), and “Ask us” as the epilogue.";

function BlogHomeLab() {
  const { option: optionId, effect, tiles, voice, stories } = Route.useSearch();
  const navigate = Route.useNavigate();
  const set = (patch: Partial<LabSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const now = useDemoNow();
  const option = options.find((o) => o.id === optionId);
  const effectNote = effects.find((e) => e.id === effect)?.note;
  const Option = option?.Option;
  const shownEffect = effect === "fullSnow" ? "off" : effect;

  return (
    <div className="flex flex-1 flex-col items-center bg-default/40">
      <header className="flex w-full max-w-[430px] flex-col gap-3 px-4 pt-5 pb-4">
        <Link
          className="self-start text-label text-muted underline underline-offset-4"
          to="/lab"
        >
          Lab
        </Link>
        <h1 className="text-heading">
          Stories-first home: structures and Christmas effects
        </h1>

        <div className="flex flex-col gap-2">
          <p className="text-label font-medium text-muted">
            Round 3 · Read it, walk it, keep it (picked: journey map, I · Ngọc,
            R4 moving photos)
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              aria-pressed={optionId === "R3"}
              className={chip}
              type="button"
              onClick={() => set({ option: "R3" })}
            >
              Journey home
            </button>
          </div>
          {optionId === "R3" && (
            <>
              <div
                aria-label="Tiles"
                className="flex flex-wrap items-center gap-2"
                role="group"
              >
                <span className="text-label text-muted">Tiles</span>
                {tilesModes.map((m) => (
                  <button
                    key={m.id}
                    aria-pressed={tiles === m.id}
                    className={chip}
                    type="button"
                    onClick={() => set({ tiles: m.id })}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <div
                aria-label="Voice"
                className="flex flex-wrap items-center gap-2"
                role="group"
              >
                <span className="text-label text-muted">Voice</span>
                {voiceModes.map((m) => (
                  <button
                    key={m.id}
                    aria-pressed={voice === m.id}
                    className={chip}
                    type="button"
                    onClick={() => set({ voice: m.id })}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {(["reels", "earlier"] as const).map((group) => (
                <div
                  key={group}
                  aria-label={group === "reels" ? "Reels" : "Earlier styles"}
                  className="flex flex-wrap items-center gap-2"
                  role="group"
                >
                  <span className="text-label text-muted">
                    {group === "reels" ? "Reels" : "Earlier"}
                  </span>
                  {storyStyles
                    .filter((m) => m.group === group)
                    .map((m) => (
                      <button
                        key={m.id}
                        aria-pressed={stories === m.id}
                        className={`${chip} ${group === "earlier" ? "text-muted" : ""}`}
                        type="button"
                        onClick={() => set({ stories: m.id })}
                      >
                        {m.label}
                      </button>
                    ))}
                </div>
              ))}
              <p className="text-label text-muted">
                {storyStyles.find((m) => m.id === stories)?.note}
              </p>
            </>
          )}
        </div>

        {([2, 1] as const).map((round) => (
          <div key={round} className="flex flex-col gap-2">
            <p className="text-label font-medium text-muted">
              {round === 2
                ? "Round 2 (story not coherent, kept for reference)"
                : "Round 1 (rejected, kept for reference)"}
            </p>
            <div
              aria-label={`Round ${round} options`}
              className="flex flex-wrap gap-2"
              role="group"
            >
              {options
                .filter((o) => o.round === round)
                .map((o) => (
                  <button
                    key={o.id}
                    aria-pressed={optionId === o.id}
                    className={`${chip} text-muted`}
                    type="button"
                    onClick={() => set({ option: o.id })}
                  >
                    {o.title}
                  </button>
                ))}
            </div>
          </div>
        ))}
        <p className="text-label text-muted">{option?.note ?? R3_NOTE}</p>

        <div
          aria-label="Christmas effect"
          className="flex flex-wrap gap-2"
          role="group"
        >
          {effects.map((e) => (
            <button
              key={e.id}
              aria-pressed={effect === e.id}
              className={chip}
              type="button"
              onClick={() => set({ effect: e.id })}
            >
              {e.label}
            </button>
          ))}
        </div>
        <p className="text-label text-muted">
          {effectNote} On the live site this would switch on automatically from
          24 November to 6 January (
          {isFestiveSeason(now) ? "on today" : "off today"}) and never runs for
          guests who turn on reduced motion.
        </p>
      </header>

      <div className="relative flex w-full max-w-[430px] flex-col bg-background sm:mb-8 sm:shadow-overlay">
        {effect === "fullSnow" && (
          <div className="pointer-events-none sticky top-0 z-20 -mb-[100dvh] h-dvh">
            <Snowfall count={70} />
          </div>
        )}
        {Option ? (
          <Option
            key={optionId}
            effect={shownEffect}
            today={ADVENT_PREVIEW_DAY}
          />
        ) : (
          <JourneyHome
            effect={shownEffect}
            storiesStyle={stories}
            tiles={tiles}
            voice={voice}
          />
        )}
        <LabTabBar />
      </div>
    </div>
  );
}
