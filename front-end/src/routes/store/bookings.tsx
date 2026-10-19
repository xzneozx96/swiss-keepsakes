import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/store/bookings')({ component: Outlet })
