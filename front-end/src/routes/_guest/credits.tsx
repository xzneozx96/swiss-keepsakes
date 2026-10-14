import { createFileRoute } from "@tanstack/react-router";

import credits from "@/assets/photos/CREDITS.txt?raw";
import { useLocale } from "@/contexts/locale-context";

/**
 * Photo credits, rendered from src/assets/photos/CREDITS.txt so the page and the file
 * cannot drift. CC BY and CC BY-SA photos require this attribution.
 */
export const Route = createFileRoute("/_guest/credits")({
  component: CreditsPage,
});

const blocks = credits
  .split(/\n\s*\n/)
  .map((block) => block.trim())
  .filter((block) => block.length > 0 && !block.startsWith("----"));

function Line({ text }: { text: string }) {
  if (/^https?:\/\//.test(text)) {
    return (
      <a
        className="break-all underline decoration-muted underline-offset-4 hover:decoration-foreground"
        href={text}
        rel="noreferrer"
        target="_blank"
      >
        {text}
      </a>
    );
  }

  return <span>{text}</span>;
}

function CreditsPage() {
  const { t } = useLocale();

  return (
    <div className="flex flex-col gap-4 pb-8">
      <h1 className="font-serif text-title">{t("credits.title")}</h1>
      <p className="text-body text-muted">{t("credits.intro")}</p>
      <ul className="flex flex-col gap-3">
        {blocks.map((block) => (
          <li
            key={block}
            className="flex flex-col gap-1 rounded-2xl bg-surface p-4 text-sm shadow-surface"
          >
            {block.split("\n").map((line) => (
              <Line key={line} text={line.trim()} />
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
