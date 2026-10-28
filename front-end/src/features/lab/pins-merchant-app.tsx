import type { Pin } from './pins-merchant-data'
import type { PinsLabSearch } from './pins-merchant-search-params'

import { toast } from '@heroui/react'
import { useEffect, useState } from 'react'

import { onLabMessage, postToPage } from './pins-lab-sync'
import { useCopy } from './pins-merchant-copy'
import { blankPin, scenarioPin, seedPins } from './pins-merchant-data'
import { PinEditorScreen } from './pins-merchant-editor'
import { PinsList } from './pins-merchant-list'
import { PinsShell } from './pins-merchant-shell'

interface EditorView {
  initial: Pin
  isEvent: boolean
  startWithErrors: boolean
  run: number
}

function scenarioView(search: PinsLabSearch): EditorView {
  const initial = scenarioPin(search.scenario)

  return {
    initial,
    isEvent: search.scenario === 'new-event',
    startWithErrors: search.scenario === 'draft-errors',
    run: 0,
  }
}

/**
 * What the lab frame shows: the merchant shell with N16 or N17, on one list of pins kept in
 * memory, so hiding, deleting and saving show up in the list and on the guest phone beside
 * the frame. Nothing is stored.
 */
export function PinsLabApp({ search }: { search: PinsLabSearch }) {
  const { c } = useCopy()
  const [pins, setPins] = useState<Pin[]>(() => structuredClone(seedPins))
  const [listState, setListState] = useState(search.list)
  const [editor, setEditor] = useState<EditorView | null>(() => (search.screen === 'editor' ? scenarioView(search) : null))

  const open = (view: Omit<EditorView, 'run'>) => {
    setEditor(current => ({ ...view, run: (current?.run ?? 0) + 1 }))
    window.scrollTo(0, 0)
  }
  const back = () => {
    setEditor(null)
    setListState(state => (state === 'loading' || state === 'nomatch' ? 'normal' : state))
    window.scrollTo(0, 0)
  }

  // The guest phone draws what guests would see from this list ("no pins yet" means none).
  const shared = listState === 'empty' ? [] : pins

  useEffect(() => {
    postToPage({ type: 'pins', pins: shared })
  }, [shared])

  // "Edit this pin" on the guest phone opens it here.
  useEffect(() => onLabMessage((message) => {
    if (message.type !== 'edit')
      return
    const pin = pins.find(p => p.id === message.id)

    if (pin) {
      setEditor(current => ({ initial: structuredClone(pin), isEvent: false, startWithErrors: false, run: (current?.run ?? 0) + 1 }))
      window.scrollTo(0, 0)
    }
  }), [pins])

  return (
    <PinsShell>
      {editor
        ? (
            <PinEditorScreen
              key={editor.run}
              initial={editor.initial}
              isEvent={editor.isEvent}
              option={search.option}
              others={pins.filter(p => p.id !== editor.initial.id)}
              startWithErrors={editor.startWithErrors}
              onBack={back}
              onDelete={(id) => {
                setPins(pins.filter(p => p.id !== id))
                toast.success(c('toast.deleted'))
                back()
              }}
              onSaved={(saved) => {
                setPins(current => [saved, ...current.filter(p => p.id !== saved.id && p.id !== editor.initial.id)])
                setListState('normal')
              }}
            />
          )
        : (
            <PinsList
              pins={pins}
              state={listState}
              onAdd={kind => open({ initial: blankPin(kind === 'event'), isEvent: kind === 'event', startWithErrors: false })}
              onOpen={pin => open({ initial: structuredClone(pin), isEvent: false, startWithErrors: false })}
              onPinsChange={setPins}
            />
          )}
    </PinsShell>
  )
}
