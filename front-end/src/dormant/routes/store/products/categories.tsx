import { createFileRoute } from '@tanstack/react-router'

import { CategoriesPage } from '@/features/merchant/products/components/categories-page'

// M26 Categories: the four fixed categories and the store's sub-categories under Keepsakes
// (PRD §7.0). Opened from Products.
export const Route = createFileRoute('/store/products/categories')({
  component: CategoriesPage,
})
