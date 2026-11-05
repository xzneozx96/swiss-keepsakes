import { useEffect } from 'react'

/**
 * A numbered table whose page has no rows although the page is not the first (the last row of the last page was deleted, or a
 * link names a page past the end) moves to the last page that exists, by `go`, which should replace the address.
 * `list` is the server's answer for `page`; it is `undefined` while that answer is not in (or is the previous page's placeholder).
 */
export function useLastPageFallback(list: { rows: number, total: number } | undefined, page: number, pageSize: number, go: (page: number) => void) {
  const stuck = list !== undefined && list.rows === 0 && page > 1
  const last = list ? Math.max(1, Math.ceil(list.total / pageSize)) : 1

  useEffect(() => {
    if (stuck)
      go(last)
  }, [stuck, last, go])
}
