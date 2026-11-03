/** What the lab v2 shows inside its frame: one option design in the keepsake editor's layout (step list left, block right). */
import type { OptionDesignSearch } from './option-design-data'

import { keepsakes } from './keepsake-options-data'
import { OptionsO1 } from './option-design-o1'
import { OptionsO2 } from './option-design-o2'
import { OptionsO3 } from './option-design-o3'
import { useOptionDesign } from './option-design-state'

const STEPS = ['Details', 'Options', 'Variants', 'Review and publish']
const CURRENT = 1

function StepRail() {
  return (
    <nav aria-label="Steps" className="hidden lg:block">
      <ol className="flex flex-col gap-1">
        {STEPS.map((step, index) => (
          <li key={step} aria-current={index === CURRENT ? 'step' : undefined} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm ${index === CURRENT ? 'bg-surface font-semibold shadow-surface' : 'text-muted'}`}>
            <span className={`grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums ${index === CURRENT ? 'bg-foreground text-background' : index < CURRENT ? 'bg-success-soft text-success-soft-foreground' : 'bg-default text-muted'}`}>{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
    </nav>
  )
}

function Design({ search }: { search: OptionDesignSearch }) {
  const draft = useOptionDesign(search.product, search.state)

  if (search.design === 'o2')
    return <OptionsO2 draft={draft} />
  if (search.design === 'o3')
    return <OptionsO3 draft={draft} />

  return <OptionsO1 draft={draft} />
}

export function OptionDesignFrame({ search }: { search: OptionDesignSearch }) {
  return (
    <div className="min-h-dvh bg-default/40 px-4 py-5 lg:px-6 lg:py-8">
      <div className="mx-auto grid max-w-[1100px] gap-5 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <StepRail />
        <main className="flex min-w-0 flex-col gap-4">
          <header className="flex flex-col gap-0.5">
            <p className="text-xs text-muted lg:hidden">{`Step ${CURRENT + 1} of ${STEPS.length} · ${STEPS[CURRENT]}`}</p>
            <h1 className="text-title">{keepsakes[search.product].name}</h1>
          </header>
          {/* Remount on every choice so each design starts from its own data. */}
          <Design key={`${search.design}-${search.product}-${search.state}`} search={search} />
        </main>
      </div>
    </div>
  )
}
