import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_guest/$lang/tours')({ ssr: true, component: Outlet })
