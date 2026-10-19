import type { Partner, PartnerPayout } from "../types";
import type { DemoData } from "@/features/demo/types";

import { commissionItems } from "../lib/ledger";
import { linkOpens } from "../lib/link-opens";

import { useDemoNow, useDemoActions, useDemoSelector } from "@/features/demo";

export interface NewPartner {
  name: string;
  kind: Partner["kind"];
  email: string;
  code: string;
}

/** A referral code from a name: letters and digits, upper case, at most 12 ("Guide Anna" → "GUIDEANNA"). */
export function suggestCode(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

export const isValidCode = (code: string) => /^[A-Z0-9]{3,12}$/.test(code);

const TOKEN_CHARS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const randomToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => TOKEN_CHARS[b % TOKEN_CHARS.length])
    .join("");

/**
 * True delete only for a partner with no link opens and no transactions, e.g. one added by
 * mistake (D17). Everyone else is archived, so the ledger and reports keep their history.
 */
export function canDeletePartner(
  data: Pick<
    DemoData,
    "orders" | "tours" | "commissionAdjustments" | "referralVisits"
  >,
  partnerId: string,
): boolean {
  return (
    !linkOpens(data).some((o) => o.partnerId === partnerId) &&
    commissionItems(data, partnerId).length === 0
  );
}

/** M15 and M16 partner management: add, archive, restore, delete (D17), payouts, report link. */
export function usePartnerActions() {
  const { update } = useDemoActions();
  const demoPartners = useDemoSelector((s) => s.data.partners);
  const role = useDemoSelector((s) => s.role);
  const now = useDemoNow();

  const setPartners = (change: (partners: Partner[]) => Partner[]) =>
    update((s) => ({
      ...s,
      data: { ...s.data, partners: change(s.data.partners) },
    }));

  return {
    /** Adds the partner with a fresh report link; returns its id. */
    add(input: NewPartner): string {
      const base = suggestCode(input.name).toLowerCase() || "partner";
      let id = base;

      for (let n = 2; demoPartners.some((p) => p.id === id); n++) {
        id = `${base}-${n}`;
      }
      update((s) => ({
        ...s,
        data: {
          ...s.data,
          partners: [
            ...s.data.partners,
            {
              id,
              name: input.name.trim(),
              kind: input.kind,
              code: input.code,
              email: input.email.trim(),
              reportToken: randomToken(),
              revokedTokens: [],
            },
          ],
        },
      }));

      return id;
    },
    archive(partnerId: string) {
      setPartners((partners) =>
        partners.map((p) =>
          p.id === partnerId ? { ...p, archivedAt: now.toISOString() } : p,
        ),
      );
    },
    restore(partnerId: string) {
      setPartners((partners) =>
        partners.map((p) =>
          p.id === partnerId ? { ...p, archivedAt: undefined } : p,
        ),
      );
    },
    remove(partnerId: string) {
      setPartners((partners) => partners.filter((p) => p.id !== partnerId));
    },
    /** M16 "Record as paid" (5.4, AC13): money paid outside the app; Owner or Manager. */
    recordPayout(
      payout: Omit<PartnerPayout, "id" | "recordedAt" | "recordedBy">,
    ) {
      if (role !== "owner" && role !== "manager") return;
      const recordedBy = role;

      update((s) => ({
        ...s,
        data: {
          ...s.data,
          partnerPayouts: [
            ...s.data.partnerPayouts,
            {
              ...payout,
              id: `payout-${payout.partnerId}-${now.getTime()}`,
              recordedBy,
              recordedAt: now.toISOString(),
            },
          ],
        },
      }));
    },
    /** M16, Owner only (R10, Q5): the current report link stops working at once. */
    revokeReportLink(partnerId: string) {
      if (role !== "owner") return;
      setPartners((partners) =>
        partners.map((p) =>
          p.id === partnerId && p.reportToken
            ? {
                ...p,
                reportToken: null,
                revokedTokens: [...p.revokedTokens, p.reportToken],
              }
            : p,
        ),
      );
    },
    /** M16, Owner only (R10): a new private report link after a revoke. */
    issueReportLink(partnerId: string) {
      if (role !== "owner") return;
      setPartners((partners) =>
        partners.map((p) =>
          p.id === partnerId && !p.reportToken
            ? { ...p, reportToken: randomToken() }
            : p,
        ),
      );
    },
  };
}
