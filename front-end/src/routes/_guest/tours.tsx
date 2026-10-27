import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_guest/tours')({ ssr: true, component: Outlet })
