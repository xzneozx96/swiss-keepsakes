import type { Guest } from '@sk/domain/orders'
import type { AvatarPickError } from '../lib/avatar'

import { Button, FieldError, Input, Label, TextField } from '@heroui/react'
import { numberFormat } from '@sk/domain/shared'
import { useCanGoBack, useNavigate, useRouter } from '@tanstack/react-router'

import { useRef, useState } from 'react'

import { useConfirm } from '@/components/confirm-dialog'
import { CameraIcon, StatusDangerIcon } from '@/components/icons'

import { useLocale } from '@/contexts/locale-context'
import { useDemoActions } from '@/features/demo'
import {
  AVATAR_MAX_BYTES,
  avatarPickError,
  loadImage,
  releaseImage,
} from '../lib/avatar'
import { AvatarCropSheet } from './avatar-crop-sheet'
import { GuestAvatar } from './guest-avatar'

const errorKey = {
  type: 'account.edit.photo.errorType',
  size: 'account.edit.photo.errorSize',
  decode: 'account.edit.photo.errorDecode',
} as const

/**
 * Edit profile (1.12s, Instagram's Edit profile): the photo with Change photo and Remove
 * photo, the name, and the sign-in email (read-only). A new photo is positioned in a sheet
 * and saved at once; the name saves with Save.
 */
export function EditProfile({ guest }: { guest: Guest }) {
  const { t, intlLocale } = useLocale()
  const { update } = useDemoActions()
  const router = useRouter()
  const navigate = useNavigate()
  const canGoBack = useCanGoBack()
  const { confirm, dialog } = useConfirm()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [picked, setPicked] = useState<HTMLImageElement | null>(null)
  const [error, setError] = useState<{
    kind: AvatarPickError
    size: string
  } | null>(null)
  const [name, setName] = useState(guest.name)
  const invalid = name.trim().length === 0
  const changed = name.trim() !== guest.name

  const saveGuest = (patch: Partial<Guest>) =>
    update(s => ({
      ...s,
      data: {
        ...s.data,
        guests: s.data.guests.map(g =>
          g.id === guest.id ? { ...g, ...patch } : g,
        ),
      },
    }))

  const pick = async (file: File | undefined) => {
    if (!file)
      return
    const megabytes = (bytes: number) =>
      numberFormat(intlLocale, { maximumFractionDigits: 1 }).format(
        bytes / 1024 / 1024,
      )
    const fail = (kind: AvatarPickError) =>
      setError({ kind, size: megabytes(file.size) })
    const problem = avatarPickError(file)

    if (problem)
      return fail(problem)
    try {
      setError(null)
      setPicked(await loadImage(file))
    }
    catch {
      fail('decode')
    }
  }

  const closeCrop = () => {
    if (picked)
      releaseImage(picked)
    setPicked(null)
  }

  const removePhoto = async () => {
    if (
      await confirm({
        title: t('account.edit.remove.title'),
        body: t('account.edit.remove.body'),
        confirmLabel: t('account.edit.remove.confirm'),
      })
    ) {
      saveGuest({ avatar: undefined })
    }
  }

  const done = () =>
    canGoBack ? router.history.back() : void navigate({ to: '/account' })

  return (
    <>
      <section className="flex flex-col items-center gap-3">
        <button
          aria-label={t('account.edit.photo.change')}
          className="relative rounded-full outline-none focus-visible:focus-ring"
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          <GuestAvatar
            className="size-28 text-4xl shadow-surface ring-4 ring-surface"
            guest={guest}
          />
          <span
            aria-hidden
            className="absolute end-0 bottom-0 flex size-9 items-center justify-center rounded-full bg-foreground text-background ring-4 ring-background"
          >
            <CameraIcon size={18} />
          </span>
        </button>
        <div className="flex flex-wrap items-center justify-center gap-1">
          <Button
            className="font-semibold text-accent"
            size="sm"
            variant="ghost"
            onPress={() => fileInputRef.current?.click()}
          >
            {t('account.edit.photo.change')}
          </Button>
          {guest.avatar && (
            <Button
              className="text-muted"
              size="sm"
              variant="ghost"
              onPress={() => void removePhoto()}
            >
              {t('account.edit.photo.remove')}
            </Button>
          )}
        </div>
        <p className="text-center text-sm text-muted">
          {t('account.edit.photo.hint', {
            max: `${AVATAR_MAX_BYTES / 1024 / 1024} MB`,
          })}
        </p>
        {error && (
          <p
            className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger-soft-foreground"
            role="alert"
          >
            <StatusDangerIcon
              aria-hidden
              className="mt-0.5 shrink-0"
              size={16}
            />
            {t(errorKey[error.kind], { size: `${error.size} MB` })}
          </p>
        )}
        <input
          ref={fileInputRef}
          accept="image/*"
          className="sr-only"
          data-testid="avatar-input"
          tabIndex={-1}
          type="file"
          onChange={(e) => {
            void pick(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </section>

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault()
          if (invalid || !changed)
            return
          saveGuest({ name: name.trim() })
          done()
        }}
      >
        <div className="flex flex-col gap-5 rounded-2xl bg-surface p-4 shadow-surface">
          <TextField
            fullWidth
            autoComplete="name"
            isInvalid={invalid}
            name="name"
            value={name}
            onChange={setName}
          >
            <Label>{t('account.profile.name')}</Label>
            <Input />
            <FieldError>{t('account.profile.sheet.nameRequired')}</FieldError>
          </TextField>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">
              {t('account.profile.email')}
            </span>
            <span className="break-all text-muted">{guest.email}</span>
            <span className="text-sm text-muted">
              {t('account.profile.emailHint')}
            </span>
          </div>
        </div>
        <Button
          fullWidth
          className="h-14 text-base"
          isDisabled={invalid || !changed}
          type="submit"
        >
          {t('account.edit.save')}
        </Button>
      </form>

      {picked && (
        <AvatarCropSheet
          image={picked}
          onCancel={closeCrop}
          onSave={(avatar) => {
            saveGuest({ avatar })
            closeCrop()
          }}
        />
      )}
      {dialog}
    </>
  )
}
