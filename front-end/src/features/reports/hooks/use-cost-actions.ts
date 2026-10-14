import type { CostType, CostValue } from "../types";
import type { TransactionRef } from "@/features/partners/types";

import { useDemo } from "@/features/demo";
import { demoNow } from "@/features/demo/clock";
import { transactionKey } from "@/features/partners/lib/ledger";

/** M24 save (R14, D7): Owner and Manager enter or correct a transaction's actual costs. */
export function useCostActions() {
  const { state, update } = useDemo();

  return {
    canEdit: state.role === "owner" || state.role === "manager",
    save(
      transaction: TransactionRef,
      costs: Partial<Record<CostType, CostValue>>,
    ) {
      if (state.role !== "owner" && state.role !== "manager") return;
      const updatedBy = state.role;
      const key = transactionKey(transaction);

      update((s) => ({
        ...s,
        data: {
          ...s.data,
          costs: [
            ...s.data.costs.filter(
              (r) => transactionKey(r.transaction) !== key,
            ),
            {
              transaction,
              costs,
              updatedBy,
              // The live demo time, not useDemoNow(): that ticks every 30 s.
              updatedAt: demoNow(s.clockStartedAt).toISOString(),
            },
          ],
        },
      }));
    },
  };
}
