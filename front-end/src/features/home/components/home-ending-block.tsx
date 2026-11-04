import { useVictorinoxItems } from '../hooks/use-victorinox-items'
import { HomeEnding } from './home-ending'

/**
 * The ending with its own keepsake read. While the read is out the showcase draws its skeleton; when it fails an error with retry
 * stands in for the showcase, and the thread and the banner stay. Never a blank page.
 */
export function HomeEndingBlock() {
  const { items, isPending, isFailed, retry } = useVictorinoxItems()

  return <HomeEnding isLoading={isPending && !isFailed} items={items} onRetry={isFailed ? retry : undefined} />
}
