import { Button } from '@heroui/react'
import { useNavigate } from '@tanstack/react-router'

import { useLocale } from '@/contexts/locale-context'
import { useDemoActions } from '@/features/demo'
import { useTours } from '@/features/tours/hooks/use-tours'

/**
 * Prototype-bar control (English, outside the product UI): removes every tour with its
 * departures and bookings so C08 shows its empty state, then opens the Tour tab.
 * Reset restores the fixtures.
 */
export function ToursDemoControl({ onDone }: { onDone: () => void }) {
  const { language } = useLocale()
  const { update } = useDemoActions()
  const { tours } = useTours()
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">Tours</p>
      <Button
        className="self-start"
        isDisabled={tours.length === 0}
        size="sm"
        variant="tertiary"
        onPress={() => {
          update(s =>
            s.data.tours
              ? {
                  ...s,
                  data: {
                    ...s.data,
                    tours: {
                      ...s.data.tours,
                      tours: [],
                      departures: [],
                      bookings: [],
                    },
                  },
                }
              : s,
          )
          onDone()
          void navigate({ to: '/$lang/tours', params: { lang: language } })
        }}
      >
        Empty the tour list
      </Button>
      <p className="text-sm text-muted">
        Removes every tour with its departures and bookings, so the Tour tab
        shows its empty state. Reset restores them.
      </p>
    </div>
  )
}
