import { useParams, useSearch } from '@tanstack/react-router'

/** The routes the screens link to, as stubs that show where they went. */
export function Stub({ label }: { label: string }) {
  const params = useParams({ strict: false }) as { placeId?: string }
  const search = useSearch({ strict: false }) as { start?: string }

  return <p data-testid={`at-${label}`}>{`${label}:${params.placeId ?? ''}:${search.start ?? ''}`}</p>
}
