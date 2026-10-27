import { Link } from '@tanstack/react-router'

import { AssistantIcon } from '@/components/icons'
import { MusicLauncher } from '@/components/music-launcher'
import { useLocale } from '@/contexts/locale-context'

/** Clears the 58px tab bar on C01, or the in-flow action bar on C20. */
const offset = {
  tabBar: 'bottom-[calc(env(safe-area-inset-bottom,0px)+72px)]',
  actionBar: 'bottom-[calc(env(safe-area-inset-bottom,0px)+88px)]',
} as const

/**
 * Floating entry to the AI trip assistant, bottom-right on C01 and C20 (spec §3.1, D1,
 * R19): the assistant's icon alone, named for screen readers, with a slow ripple, in the
 * assistant's gradient like the tab bar button.
 */
export function TripAdviceButton({ above }: { above: keyof typeof offset }) {
  const { language, t } = useLocale()

  // On the tab-bar screen the spacer lets the last content scroll clear of the music button.
  // Above an action bar there is none: the buttons float over the content, as a FAB does,
  // rather than leave a blank band the width of the screen (owner, 16.10.2026).
  return (
    <>
      {above === 'tabBar' && <div aria-hidden className="shrink-0 h-14" />}
      <div
        className={`pointer-events-none fixed inset-x-0 z-20 mx-auto flex max-w-[430px] flex-col items-end gap-3 px-4 ${offset[above]}`}
      >
        {/* The background music launcher stacks directly on the assistant (owner, 16.10.2026). */}
        <MusicLauncher stacked />
        {above !== 'tabBar' && (
          <Link
            aria-label={t('advice.fab')}
            className="group pointer-events-auto relative flex size-14 items-center justify-center rounded-full bg-assistant text-white shadow-overlay outline-none transition-transform focus-visible:focus-ring active:scale-95"
            to="/$lang/plan"
            params={{ lang: language }}
          >
            {/* Two slow ripples, half a cycle apart, so one is always moving (owner, 14.10.2026). */}
            {[0, 1200].map(delay => (
              <span
                key={delay}
                aria-hidden
                className="absolute inset-0 hidden rounded-full bg-[#d52b1e]/45 motion-safe:block motion-safe:animate-ping motion-safe:[animation-duration:2.4s]"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
            <AssistantIcon
              aria-hidden
              className="relative animate-sparkle"
              size={26}
              weight="Filled"
            />
          </Link>
        )}
      </div>
    </>
  )
}
