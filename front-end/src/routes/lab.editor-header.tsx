import { createFileRoute } from '@tanstack/react-router'

import { EditorHeaderLab } from '@/features/lab/editor-header/editor-header-lab'
import { noIndexHead } from '@/lib/no-index'

/** Lab: three options for the one header every merchant editor shares. Not part of the product. */
export const Route = createFileRoute('/lab/editor-header')({
  ssr: false,
  head: noIndexHead,
  component: EditorHeaderLab,
})
