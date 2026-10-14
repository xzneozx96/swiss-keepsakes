import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/store/bookings")({ component: Outlet });
