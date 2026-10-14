import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_guest/tours")({ component: Outlet });
