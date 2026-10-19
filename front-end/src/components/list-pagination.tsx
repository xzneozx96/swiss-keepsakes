import { Pagination } from '@heroui/react'
import { numberFormat } from '@sk/domain/shared'

import { useState } from 'react'
import { useLocale } from '@/contexts/locale-context'

/** Rows per page on every list screen (owner request 15.10.2026). */
export const PAGE_SIZE = 10

/** Page numbers to show: the first, the last, and the current one with its neighbours. */
function pageList(page: number, pages: number): (number | 'gap')[] {
  const keep = new Set([1, pages, page - 1, page, page + 1])
  const out: (number | 'gap')[] = []

  for (let p = 1; p <= pages; p += 1) {
    if (keep.has(p))
      out.push(p)
    else if (out.at(-1) !== 'gap')
      out.push('gap')
  }

  return out
}

export interface PagerState {
  page: number
  pages: number
  total: number
  /** 1-based position of the first and last item on the page. */
  from: number
  to: number
  go: (page: number) => void
}

/**
 * A list cut into pages of 10. Goes back to page 1 when `resetKey` changes, e.g. on a new
 * tab, filter or search. `pager` feeds `Pager`, wherever it is placed.
 */
export function usePaged<T>(items: T[], resetKey = '') {
  const [state, setState] = useState({ key: resetKey, page: 1 })
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const page = Math.min(state.key === resetKey ? state.page : 1, pages)
  const start = (page - 1) * PAGE_SIZE
  const pager: PagerState = {
    page,
    pages,
    total: items.length,
    from: start + 1,
    to: Math.min(start + PAGE_SIZE, items.length),
    go: next => setState({ key: resetKey, page: next }),
  }

  return { pageItems: items.slice(start, start + PAGE_SIZE), pager }
}

/**
 * The HeroUI pagination, only when there is more than one page. In a table footer it is the
 * docs' pager (summary, Prev and Next with text); `compact` is the icon-only bar under a list.
 */
export function Pager({
  pager,
  compact = false,
}: {
  pager: PagerState
  compact?: boolean
}) {
  const { t, intlLocale } = useLocale()
  const { page, pages, total, from, to, go } = pager
  const count = (n: number) => numberFormat(intlLocale).format(n)

  if (pages < 2)
    return null

  return (
    <Pagination
      aria-label={t('pagination.label')}
      // HeroUI stacks the summary over the pages on narrow screens; keep one row, apart.
      className={`flex-row items-center justify-between gap-3 ${compact ? 'mt-4' : ''}`}
      size="sm"
    >
      <Pagination.Summary className="self-center text-sm text-muted tabular-nums">
        {to === from
          ? t('pagination.summaryOne', { item: count(to), total: count(total) })
          : t('pagination.summary', {
              from: count(from),
              to: count(to),
              total: count(total),
            })}
      </Pagination.Summary>
      <Pagination.Content className="self-center">
        <Pagination.Item>
          <Pagination.Previous
            aria-label={compact ? t('pagination.previous') : undefined}
            isDisabled={page === 1}
            onPress={() => go(page - 1)}
          >
            <Pagination.PreviousIcon />
            {!compact && t('pagination.prevText')}
          </Pagination.Previous>
        </Pagination.Item>
        {pageList(page, pages).map((p, i) =>
          p === 'gap'
            ? (
                <Pagination.Item key={`gap-${i}`}>
                  <Pagination.Ellipsis />
                </Pagination.Item>
              )
            : (
                <Pagination.Item key={p}>
                  <Pagination.Link
                    aria-label={t('pagination.page', { page: p })}
                    isActive={p === page}
                    onPress={() => go(p)}
                  >
                    {p}
                  </Pagination.Link>
                </Pagination.Item>
              ),
        )}
        <Pagination.Item>
          <Pagination.Next
            aria-label={compact ? t('pagination.next') : undefined}
            isDisabled={page === pages}
            onPress={() => go(page + 1)}
          >
            {!compact && t('pagination.nextText')}
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination>
  )
}
