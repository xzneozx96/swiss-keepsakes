import { Chip } from '@heroui/react'

import { AssistantIcon } from '@/components/icons'
import { BackButton } from '@/components/layout/cart-button'
import { LanguageButton } from '@/components/layout/language-button'

import { useLocale } from '@/contexts/locale-context'

/** New messages rise in once; with reduced motion they simply appear. */
const enter
  = 'motion-safe:transition motion-safe:duration-300 motion-safe:ease-out motion-safe:starting:translate-y-2 motion-safe:starting:opacity-0'

/** The assistant's avatar: ink circle, the same mark in the header and beside messages. */
export function AssistantAvatar({ size = 'size-8' }: { size?: string }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-assistant text-white ${size}`}
    >
      <AssistantIcon
        className="animate-sparkle"
        size={size === 'size-8' ? 16 : 20}
        weight="Filled"
      />
    </span>
  )
}

/** An assistant message, left. The avatar shows beside the last message of a run. */
export function AssistantSays({
  children,
  lang,
  avatar = true,
}: {
  children: React.ReactNode
  lang?: string
  avatar?: boolean
}) {
  return (
    <li className={`flex items-end gap-2 ${enter}`}>
      {avatar
        ? (
            <AssistantAvatar />
          )
        : (
            <span aria-hidden className="w-8 shrink-0" />
          )}
      <div
        className="max-w-[85%] rounded-3xl rounded-es-md bg-surface px-4 py-3 text-body shadow-surface"
        lang={lang}
      >
        {children}
      </div>
    </li>
  )
}

/** The trip assistant's header: back, avatar, name with the AI label, and a subtitle (the shop). */
export function AssistantHeader({ subtitle, onBack }: { subtitle: string, onBack?: () => void }) {
  const { t } = useLocale()

  return (
    <header className="z-20 flex shrink-0 items-center gap-3 border-b border-separator/70 bg-background px-4 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-3">
      {onBack && <BackButton label={t('advice.back')} onPress={onBack} />}
      <AssistantAvatar size="size-10" />
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2 font-semibold">
          {t('advice.title')}
          <Chip size="sm" variant="secondary">
            <Chip.Label>{t('advice.ai')}</Chip.Label>
          </Chip>
        </span>
        <span className="truncate text-xs text-muted">{subtitle}</span>
      </div>
      <span className="ms-auto shrink-0">
        <LanguageButton tone="bar" />
      </span>
    </header>
  )
}
