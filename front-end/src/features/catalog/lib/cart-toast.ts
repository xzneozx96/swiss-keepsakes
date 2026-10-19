import { toast } from '@heroui/react'

/** The open "Added to cart" toast; a new add replaces it instead of stacking. */
let openId: string | undefined

export function closeCartToast(): void {
  if (openId)
    toast.close(openId)
}

export function trackCartToast(id: string): void {
  openId = id
}

export function forgetCartToast(id: string): void {
  if (openId === id)
    openId = undefined
}
