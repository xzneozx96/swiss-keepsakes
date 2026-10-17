import { Media } from "@/components/media";

export interface JourneyStep {
  id: string;
  photo: string;
  color: string;
  eyebrow: string;
  title: string;
  line: string;
}

/**
 * "How I'll show you Lucerne" (Lab R3, owner 17.10.2026): the three parts of the home as
 * numbered round photos on a dotted path that zigzags down. A step scrolls to its part.
 */
export function JourneySteps({
  title,
  subtitle,
  steps,
}: {
  title: string;
  subtitle: string;
  steps: JourneyStep[];
}) {
  return (
    <section aria-labelledby="journey" className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-heading" id="journey">
          {title}
        </h2>
        <p className="text-label text-muted">{subtitle}</p>
      </div>
      <ol className="flex flex-col">
        {steps.map((step, i) => {
          const left = i % 2 === 0;

          return (
            <li key={step.id} className="flex flex-col">
              <button
                className={`flex w-full items-center gap-4 rounded-3xl outline-none focus-visible:focus-ring active:opacity-80 ${left ? "text-left" : "flex-row-reverse text-right"}`}
                type="button"
                onClick={() =>
                  document
                    .getElementById(step.id)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                <span className="relative shrink-0">
                  <Media
                    alt=""
                    className="size-28 rounded-full shadow-[0_8px_18px_-8px_rgba(51,49,46,0.5)] ring-4 ring-surface"
                    photo={step.photo}
                  />
                  <span
                    className={`absolute -top-1 flex size-8 items-center justify-center rounded-full font-serif text-[15px] font-medium text-white ring-[3px] ring-background ${left ? "-left-1" : "-right-1"}`}
                    style={{ backgroundColor: step.color }}
                  >
                    {i + 1}
                  </span>
                </span>
                <span
                  className={`flex min-w-0 flex-1 flex-col gap-1 ${left ? "items-start" : "items-end"}`}
                >
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: step.color }}
                  >
                    {step.eyebrow}
                  </span>
                  <span className="font-serif text-[18px] leading-6 font-medium text-balance">
                    {step.title}
                  </span>
                  <span className="text-label text-muted">{step.line}</span>
                </span>
              </button>
              {i < steps.length - 1 && (
                <svg
                  aria-hidden
                  className="h-10 w-full"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 40"
                >
                  <path
                    d={
                      left
                        ? "M15.6 0 C15.6 26 84.4 14 84.4 40"
                        : "M84.4 0 C84.4 26 15.6 14 15.6 40"
                    }
                    fill="none"
                    stroke="var(--accent)"
                    strokeDasharray="2 5"
                    strokeLinecap="round"
                    strokeWidth="2.5"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
