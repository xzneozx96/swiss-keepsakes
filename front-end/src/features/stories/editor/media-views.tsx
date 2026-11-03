import type { ReactNodeViewProps } from '@tiptap/react'

import { Button, Input, Spinner, TextField } from '@heroui/react'
import { NodeViewWrapper, useEditorState } from '@tiptap/react'
import { use } from 'react'

import { ArrowDownIcon, ArrowUpIcon, CloseIcon, MusicIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'
import { useMediaFile } from '@/features/media/api/queries'
import { thumbOf } from '@/features/media/lib/rules'
import { youtubePoster } from '../lib/media-block'
import { BodyEditorContext } from './body-context'
import { moveMediaBlock } from './media-commands'

const TEXT_MAX = 300

type Kind = 'image' | 'video' | 'audio'

const toolClass = 'max-lg:size-11 max-lg:min-w-11'

/** Where the block sits among the top-level blocks, read from the live document so Move up and Move down follow a neighbour's move. */
function useEnds({ editor, getPos }: Pick<ReactNodeViewProps, 'editor' | 'getPos'>) {
  return useEditorState({
    editor,
    selector: ({ editor: e }) => {
      try {
        const pos = getPos()

        if (pos === undefined)
          return { first: true, last: true }
        const index = e.state.doc.resolve(pos).index(0)

        return { first: index === 0, last: index === e.state.doc.childCount - 1 }
      }
      catch {
        return { first: true, last: true }
      }
    },
  })
}

/**
 * One block in the body: the media (`children`), its own field, a caption, and Move up, Move down and Remove. The buttons and the
 * fields stop the editor's events (`stopEvent`), so typing here never changes the text selection. The picture is the drag handle.
 */
function Block({ kind, props, field, children }: {
  kind: Kind
  props: ReactNodeViewProps
  field: { label: string, placeholder?: string, attribute: string }
  children: React.ReactNode
}) {
  const { t } = useLocale()
  const { node, selected, editor, getPos, deleteNode, updateAttributes } = props
  const ends = useEnds(props)
  const label = t(`storyMedia.block.${kind}`)
  const move = (direction: -1 | 1) => {
    const pos = getPos()

    if (pos !== undefined)
      moveMediaBlock(editor, pos, direction)
  }

  return (
    <NodeViewWrapper className={`my-4 flex flex-col gap-2 rounded-2xl border border-separator bg-surface p-2 ${selected ? 'ring-2 ring-foreground' : ''}`} contentEditable={false} data-node={kind} role="group" aria-label={label}>
      <div className="relative overflow-hidden rounded-xl" data-drag-handle>{children}</div>
      <TextField fullWidth aria-label={field.label} value={String(node.attrs[field.attribute] ?? '')} onChange={value => updateAttributes({ [field.attribute]: value })}>
        <Input maxLength={TEXT_MAX} placeholder={field.placeholder ?? field.label} />
      </TextField>
      <TextField fullWidth aria-label={t('storyMedia.block.caption')} value={String(node.attrs.caption ?? '')} onChange={value => updateAttributes({ caption: value })}>
        <Input maxLength={TEXT_MAX} placeholder={t('storyMedia.block.captionPlaceholder')} />
      </TextField>
      <div className="flex gap-1">
        <Button isIconOnly aria-label={t('storyMedia.block.moveUp', { label })} className={toolClass} isDisabled={ends.first} size="sm" variant="ghost" onPress={() => move(-1)}>
          <ArrowUpIcon aria-hidden size={16} />
        </Button>
        <Button isIconOnly aria-label={t('storyMedia.block.moveDown', { label })} className={toolClass} isDisabled={ends.last} size="sm" variant="ghost" onPress={() => move(1)}>
          <ArrowDownIcon aria-hidden size={16} />
        </Button>
        <span className="flex-1" />
        <Button isIconOnly aria-label={t('storyMedia.block.remove', { label })} className={toolClass} size="sm" variant="ghost" onPress={() => deleteNode()}>
          <CloseIcon aria-hidden size={16} />
        </Button>
      </div>
    </NodeViewWrapper>
  )
}

const Frame = ({ children }: { children: React.ReactNode }) => <div className="relative flex aspect-video w-full items-center justify-center bg-gradient-to-b from-hero-sky via-hero-cream to-surface-tertiary">{children}</div>

function Unavailable() {
  const { t } = useLocale()

  return <p className="p-4 text-center text-sm text-muted" role="status">{t('storyMedia.block.unavailable')}</p>
}

export function ImageView(props: ReactNodeViewProps) {
  const { t } = useLocale()
  const context = use(BodyEditorContext)
  const file = useMediaFile(context?.storeId, String(props.node.attrs.mediaId ?? '') || null)
  const missing = file.isError || file.data?.status === 'retired'
  const src = file.data?.status === 'ready' ? thumbOf(file.data, 640) : null

  return (
    <Block field={{ label: t('storyMedia.block.alt'), placeholder: t('storyMedia.block.altPlaceholder'), attribute: 'alt' }} kind="image" props={props}>
      <Frame>
        {missing && <Unavailable />}
        {!missing && src && <img alt="" className="absolute inset-0 size-full object-cover" src={src} />}
        {!missing && !src && <Spinner size="sm" />}
      </Frame>
    </Block>
  )
}

export function VideoView(props: ReactNodeViewProps) {
  const { t } = useLocale()
  const id = String(props.node.attrs.youtubeId ?? '')

  return (
    <Block field={{ label: t('storyMedia.block.title.video'), attribute: 'title' }} kind="video" props={props}>
      <Frame>
        {id && <img alt="" className="absolute inset-0 size-full object-cover" src={youtubePoster(id)} />}
      </Frame>
    </Block>
  )
}

export function AudioView(props: ReactNodeViewProps) {
  const { t } = useLocale()
  const context = use(BodyEditorContext)
  const file = useMediaFile(context?.storeId, String(props.node.attrs.mediaId ?? '') || null)
  const missing = file.isError || file.data?.status === 'retired'

  return (
    <Block field={{ label: t('storyMedia.block.title.audio'), attribute: 'title' }} kind="audio" props={props}>
      {missing
        ? <Unavailable />
        : (
            <div className="flex items-center gap-3 bg-surface-secondary p-3">
              <MusicIcon aria-hidden size={20} />
              <span className="truncate text-sm text-muted">{file.data?.name ?? ''}</span>
            </div>
          )}
    </Block>
  )
}
