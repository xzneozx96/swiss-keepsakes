/** What the lab shows inside its frame: one design in the place editor's layout, a step list on the left and the white block on the right. */
import type { OptionsLabSearch } from './keepsake-options-data'

import { OptionsA1 } from './keepsake-options-a1'
import { OptionsA2 } from './keepsake-options-a2'
import { OptionsA3 } from './keepsake-options-a3'
import { VariantsB1 } from './keepsake-options-b1'
import { VariantsB2 } from './keepsake-options-b2'
import { VariantsB3 } from './keepsake-options-b3'
import { useVariantDraft } from './keepsake-options-b-state'
import { designs, keepsakes } from './keepsake-options-data'
import { useOptionsDraft } from './keepsake-options-state'

const STEPS = ['Name and text', 'Photos', 'Options', 'Variants', 'Stock', 'Review and publish']

function StepRail({ current }: { current: string }) {
  const at = STEPS.indexOf(current)

  return (
    <nav aria-label="Steps" className="hidden lg:block">
      <ol className="sticky top-6 flex flex-col gap-1">
        {STEPS.map((step, index) => (
          <li key={step} aria-current={step === current ? 'step' : undefined} className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm ${step === current ? 'bg-surface font-semibold shadow-surface' : 'text-muted'}`}>
            <span className={`grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums ${step === current ? 'bg-foreground text-background' : index < at ? 'bg-success-soft text-success-soft-foreground' : 'bg-default text-muted'}`}>{index + 1}</span>
            {step}
          </li>
        ))}
      </ol>
    </nav>
  )
}

function OptionsDesign({ search }: { search: OptionsLabSearch }) {
  const draft = useOptionsDraft(search.product, search.scenario)

  if (search.design === 'a2')
    return <OptionsA2 draft={draft} />
  if (search.design === 'a3')
    return <OptionsA3 draft={draft} />

  return <OptionsA1 draft={draft} />
}

function VariantsDesign({ search }: { search: OptionsLabSearch }) {
  const draft = useVariantDraft(search.product, search.scenario)

  if (search.design === 'b2')
    return <VariantsB2 draft={draft} />
  if (search.design === 'b3')
    return <VariantsB3 draft={draft} />

  return <VariantsB1 draft={draft} />
}

export function OptionsFrame({ search }: { search: OptionsLabSearch }) {
  const control = designs.find(design => design.id === search.design)?.control ?? 'options'
  const step = control === 'options' ? 'Options' : 'Variants'

  return (
    <div className="min-h-dvh bg-default/40 px-4 py-4 lg:px-6 lg:py-6">
      <div className="mx-auto grid max-w-[1100px] gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <StepRail current={step} />
        <main className="flex min-w-0 flex-col gap-3">
          <header className="flex flex-col gap-0.5">
            <p className="text-xs text-muted lg:hidden">{`Step ${STEPS.indexOf(step) + 1} of ${STEPS.length}`}</p>
            <h1 className="text-title">{keepsakes[search.product].name}</h1>
          </header>
          {/* Remount on every choice so each design starts from its own data. */}
          {control === 'options'
            ? <OptionsDesign key={`${search.design}-${search.product}-${search.scenario}`} search={search} />
            : <VariantsDesign key={`${search.design}-${search.product}-${search.scenario}`} search={search} />}
        </main>
      </div>
    </div>
  )
}
