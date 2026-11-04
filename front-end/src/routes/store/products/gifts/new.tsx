import { createFileRoute, redirect } from '@tanstack/react-router'

// The old address of the create flow; a static segment, so it wins over the $productId redirect next to it.
export const Route = createFileRoute('/store/products/gifts/new')({
  beforeLoad: ({ location }) => {
    throw redirect({ to: '/store/products/new', search: location.search, replace: true })
  },
})
