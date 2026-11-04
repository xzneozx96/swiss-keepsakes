import { createFileRoute, redirect } from '@tanstack/react-router'

// The old keepsake address, from when Products had Gifts and Tours tabs: bookmarks still land on the editor.
export const Route = createFileRoute('/store/products/gifts/$productId')({
  beforeLoad: ({ params, location }) => {
    throw redirect({ to: '/store/products/$productId', params, search: location.search, replace: true })
  },
})
