import { useEffect } from "react";

import { useTourActions, useTours } from "../hooks/use-tours";

import { hasOverdueToCancel } from "./lib/transitions";

/**
 * Stands in for the scheduled balance-deadline check (R07) while a merchant screen is open:
 * cancels the bookings whose snapshotted policy says so. Idempotent, so a repeat is harmless.
 */
export function useOverdueCheck() {
  const { data, now } = useTours();
  const { checkOverdue } = useTourActions();
  const due = hasOverdueToCancel(data, now);

  useEffect(() => {
    if (due) checkOverdue();
  }, [due, checkOverdue]);
}
