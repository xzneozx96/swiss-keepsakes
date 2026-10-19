interface PaymentLike {
  status: string;
  amount: number;
  at: string;
}

/** Same window for a keepsake order (M08) and a tour booking: a repeat inside it warns before it is recorded. */
const DUPLICATE_WINDOW_MS = 10 * 60_000;

export function findDuplicatePayment<P extends PaymentLike>(
  payments: readonly P[],
  amount: number,
  at: string,
): P | undefined {
  return payments.find(
    (p) =>
      p.status === "succeeded" &&
      p.amount === amount &&
      Math.abs(Date.parse(p.at) - Date.parse(at)) <= DUPLICATE_WINDOW_MS,
  );
}
