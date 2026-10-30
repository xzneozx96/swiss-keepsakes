import { Button } from '@heroui/react'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { copy } from './copy'
import { OptionC } from './option-c'
import { OptionShell } from './parts'
import { useSamplePosition } from './sample'
import { useLinkReader } from './use-link-reader'

function CardC() {
  const { position, place, remove } = useSamplePosition()
  const reader = useLinkReader({ position, onPosition: place })

  return <OptionC position={position} reader={reader} onPlace={place} onRemove={remove} />
}

export function LocationCardLab() {
  const { t } = useLocale()
  const [resetKey, setResetKey] = useState(0)

  return (
    <div className="flex flex-1 flex-col gap-8 bg-default/40 px-4 py-8 xl:px-8">
      <header className="flex max-w-3xl flex-col gap-2">
        <Link className="text-label text-muted underline underline-offset-4" to="/lab">{copy.back}</Link>
        <h1 className="text-heading">{copy.title}</h1>
        <p className="text-sm text-pretty text-muted">{copy.intro}</p>
        <p className="sr-only" id="places-map-help">{t('places.map.keys')}</p>
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">{copy.practiceTitle}</summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 ps-5 text-muted">
            {copy.practice.map(line => <li key={line}>{line}</li>)}
          </ul>
        </details>
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">{copy.samplesTitle}</summary>
          <ul className="mt-2 flex flex-col gap-2 text-muted">
            {copy.samples.map(sample => (
              <li key={sample.label} className="flex flex-col gap-0.5">
                <span>{sample.label}</span>
                <code className="text-xs break-all text-foreground">{sample.text}</code>
              </li>
            ))}
          </ul>
        </details>
        <Button className="w-fit" size="sm" variant="secondary" onPress={() => setResetKey(key => key + 1)}>{copy.reset}</Button>
      </header>
      <div key={resetKey} className="max-w-2xl">
        <OptionShell option="c">
          <CardC />
        </OptionShell>
      </div>
    </div>
  )
}
