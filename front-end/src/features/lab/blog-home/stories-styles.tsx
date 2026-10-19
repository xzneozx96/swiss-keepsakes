import type { Article } from "@/features/content/types";
import type { ReelsStyle } from "./reels";

import { ScrollShadow } from "@heroui/react";
import { Link } from "@tanstack/react-router";

import { CategoryPill, tint } from "./chips";
import { categoryPhoto, useBlogData } from "./data";
import { Reels } from "./reels";
import { TrailList } from "./trail";

import { PickupIcon } from "@/components/icons";
import { Media } from "@/components/media";

export type StoriesStyle =
  `reels-${ReelsStyle}` | "postcards" | "bento" | "trail" | "scrapbook";

const greetings = { en: "Greetings from", de: "Grüsse aus" };

function StoryLink({
  article,
  className,
  style,
  children,
}: {
  article: Article;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <Link
      className={`block outline-none focus-visible:focus-ring ${className ?? ""}`}
      params={{ slug: article.slug }}
      style={style}
      to="/stories/$slug"
    >
      {children}
    </Link>
  );
}

/** 2 · Postcards: each story is a Luzerne postcard with a stamp and a postmark, slightly tilted. */
function Postcards({ articles }: { articles: Article[] }) {
  const { areaOf, categoryOf, language } = useBlogData();
  const tilt = [-2, 1.5, -1, 2, -1.5, 1];

  return (
    <ScrollShadow
      hideScrollBar
      className="-mx-4"
      orientation="horizontal"
      size={0}
    >
      <ul className="flex snap-x snap-mandatory gap-4 px-5 pt-3 pb-5">
        {articles.map((article, i) => (
          <li key={article.id} className="w-[78%] shrink-0 snap-center">
            <StoryLink
              article={article}
              className="rounded-md bg-surface p-2.5 pb-4 shadow-[0_10px_24px_-10px_rgba(51,49,46,0.35)] transition-transform active:scale-[0.98]"
              style={{ transform: `rotate(${tilt[i % tilt.length]}deg)` }}
            >
              <div className="relative">
                <Media
                  alt=""
                  className="aspect-[4/3] rounded-sm"
                  photo={article.photo}
                />
                <span className="absolute top-2 right-2 block bg-white p-1 shadow-sm [clip-path:polygon(0_4%,4%_0,8%_4%,12%_0,16%_4%,20%_0,24%_4%,28%_0,32%_4%,36%_0,40%_4%,44%_0,48%_4%,52%_0,56%_4%,60%_0,64%_4%,68%_0,72%_4%,76%_0,80%_4%,84%_0,88%_4%,92%_0,96%_4%,100%_0,100%_100%,0_100%)]">
                  <Media
                    alt=""
                    className="h-12 w-10"
                    photo={categoryPhoto[categoryOf(article)]}
                  />
                </span>
                <span
                  aria-hidden
                  className="absolute top-10 right-[60px] flex size-16 -rotate-12 flex-col items-center justify-center rounded-full border-2 text-center text-[9px] leading-3 font-bold tracking-wider uppercase"
                  style={{
                    borderColor: `${tint[categoryOf(article)]}cc`,
                    color: tint[categoryOf(article)],
                  }}
                >
                  <span>Luzern</span>
                  <span className="max-w-12 truncate font-medium">
                    {areaOf(article)}
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-1 px-1.5 pt-3">
                <p className="font-serif text-[13px] text-muted italic">
                  {greetings[language]} {areaOf(article)}
                </p>
                <h3 className="font-serif text-[19px] leading-6 font-medium text-balance">
                  {article.title}
                </h3>
              </div>
            </StoryLink>
          </li>
        ))}
      </ul>
    </ScrollShadow>
  );
}

/** 3 · Bento: a mosaic of different-sized photo tiles, text on the photo, a colour per category. */
function Bento({ articles }: { articles: Article[] }) {
  const { c } = useBlogData();
  const shapes = [
    "col-span-2 aspect-[16/11]",
    "row-span-2",
    "aspect-square",
    "aspect-square",
    "col-span-2 aspect-[2/1]",
  ];

  return (
    <ul className="grid auto-rows-auto grid-cols-2 gap-2.5">
      {articles.slice(0, shapes.length).map((article, i) => {
        const big = i === 0;

        return (
          <li key={article.id} className={shapes[i]}>
            <StoryLink
              article={article}
              className="size-full rounded-3xl transition-transform active:scale-[0.98]"
            >
              <Media
                alt=""
                className="size-full min-h-full rounded-3xl"
                photo={article.photo}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute top-3 left-3">
                  <CategoryPill article={article} />
                </div>
                <div className="absolute inset-x-3 bottom-3 flex flex-col gap-1">
                  <h3
                    className={`font-serif font-medium text-balance text-white ${big ? "text-[24px] leading-[30px]" : "line-clamp-4 text-[15px] leading-5"}`}
                  >
                    {article.title}
                  </h3>
                  {big && (
                    <p className="text-[12px] text-white/80">
                      {article.author.name} · {c.minRead(article.readMinutes)}
                    </p>
                  )}
                </div>
              </Media>
            </StoryLink>
          </li>
        );
      })}
    </ul>
  );
}

/** 4 · Trail: stories as numbered stops on a dotted walk that zigzags down the page. */
function Trail({ articles }: { articles: Article[] }) {
  const { c, areaOf, categoryOf } = useBlogData();

  return (
    <TrailList
      stops={articles.slice(0, 5).map((article) => ({
        key: article.id,
        photo: article.photo,
        color: tint[categoryOf(article)],
        eyebrow: (
          <>
            <PickupIcon size={14} />
            {areaOf(article)}
          </>
        ),
        title: article.title,
        meta: c.minRead(article.readMinutes),
        action: { slug: article.slug },
      }))}
    />
  );
}

/** 5 · Scrapbook: taped polaroids in two staggered columns, each at its own angle. */
function Scrapbook({ articles }: { articles: Article[] }) {
  const { areaOf, categoryOf } = useBlogData();
  const tilt = [-3, 2.5, 1.5, -2, -1.5, 3];
  const items = articles.slice(0, 6);
  const columns = [
    items.filter((_, i) => i % 2 === 0),
    items.filter((_, i) => i % 2 === 1),
  ];

  return (
    <div className="grid grid-cols-2 gap-4 px-1 pt-2">
      {columns.map((column, col) => (
        <ul
          key={col}
          className={`flex flex-col gap-6 ${col === 1 ? "pt-10" : ""}`}
        >
          {column.map((article) => {
            const index = items.indexOf(article);

            return (
              <li key={article.id} className="relative">
                <span
                  aria-hidden
                  className="absolute -top-2.5 left-1/2 z-10 h-5 w-14 -translate-x-1/2 bg-[#f3e6c4]/85 shadow-sm"
                  style={{
                    transform: `translateX(-50%) rotate(${-tilt[index]! * 1.5}deg)`,
                  }}
                />
                <StoryLink
                  article={article}
                  className="bg-surface p-2 pb-3 shadow-[0_8px_20px_-8px_rgba(51,49,46,0.4)] transition-transform active:scale-[0.97]"
                  style={{ transform: `rotate(${tilt[index]}deg)` }}
                >
                  <Media alt="" className="aspect-square" photo={article.photo}>
                    <span
                      className="absolute right-1.5 bottom-1.5 size-3 rounded-full ring-2 ring-white"
                      style={{ backgroundColor: tint[categoryOf(article)] }}
                    />
                  </Media>
                  <p className="px-0.5 pt-2 font-serif text-[15px] leading-5 font-medium text-balance">
                    {article.title}
                  </p>
                  <p className="px-0.5 pt-1 font-serif text-[12px] text-muted italic">
                    {areaOf(article)}
                  </p>
                </StoryLink>
              </li>
            );
          })}
        </ul>
      ))}
    </div>
  );
}

export function StoriesBlock({
  style,
  articles,
}: {
  style: StoriesStyle;
  articles: Article[];
}) {
  const stories = articles.slice(0, 6);

  if (style.startsWith("reels-"))
    return (
      <Reels
        articles={stories}
        style={style.slice("reels-".length) as ReelsStyle}
      />
    );
  if (style === "postcards") return <Postcards articles={stories} />;
  if (style === "bento") return <Bento articles={stories} />;
  if (style === "trail") return <Trail articles={stories} />;

  return <Scrapbook articles={stories} />;
}
