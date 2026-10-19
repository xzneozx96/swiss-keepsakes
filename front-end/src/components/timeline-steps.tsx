import { StatusSuccessIcon } from '@/components/icons'

/**
 * The C15 Progress stepper (1.13r) on the shared card surface: logged steps with a filled check
 * and their time, upcoming ones with a hollow dot. The latest logged step is bold; the connector
 * is solid between logged steps and dashed toward upcoming ones.
 */
export function TimelineSteps({
  steps,
  label,
  upcomingLabel,
}: {
  /** `time` is set for steps that happened; upcoming steps have none. */
  steps: { text: string, time?: string }[]
  label: string
  upcomingLabel?: string
}) {
  const lastDone = steps.filter(step => step.time).length - 1

  return (
    <ol
      aria-label={label}
      className="flex flex-col rounded-3xl bg-surface p-4 shadow-surface"
    >
      {steps.map((step, i) => {
        const done = Boolean(step.time)
        const next = steps[i + 1]

        return (
          <li
            key={`${i}-${step.text}`}
            className="relative flex gap-3 pb-5 last:pb-0"
          >
            {next && (
              <span
                aria-hidden
                className={`absolute start-[11px] top-7 bottom-1 border-s-2 ${next.time ? 'border-success' : 'border-dashed border-separator'}`}
              />
            )}
            {done
              ? (
                  <StatusSuccessIcon
                    aria-hidden
                    className="shrink-0 text-success"
                    size={24}
                    weight="Filled"
                  />
                )
              : (
                  <span
                    aria-hidden
                    className="m-1 size-4 shrink-0 rounded-full border-2 border-separator bg-surface"
                  />
                )}
            <div className="flex min-w-0 flex-col">
              <span
                className={
                  i === lastDone ? 'font-semibold' : done ? '' : 'text-muted'
                }
              >
                {step.text}
              </span>
              <span className="text-sm text-muted tabular-nums">
                {step.time ?? upcomingLabel}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
