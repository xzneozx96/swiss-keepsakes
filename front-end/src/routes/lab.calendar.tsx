import { createFileRoute } from "@tanstack/react-router";

import { CalendarLab } from "@/features/lab/calendar/calendar-lab";

export const Route = createFileRoute("/lab/calendar")({
  component: CalendarLab,
});
