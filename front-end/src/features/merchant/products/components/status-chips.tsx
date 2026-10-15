import type { LanguageStatus } from "../lib/completeness";
import type { StatusTone } from "@/components/status-chip";

import { StatusChip } from "@/components/status-chip";
import { useLocale } from "@/contexts/locale-context";

/** "Published" or "Draft" (M11, outline step 8). */
export function PublishChip({ published }: { published: boolean }) {
  const { t } = useLocale();

  return (
    <StatusChip tone={published ? "success" : "neutral"}>
      {t(published ? "products.published" : "products.draft")}
    </StatusChip>
  );
}

const languageTone: Record<LanguageStatus, StatusTone> = {
  complete: "neutral",
  "de-missing": "warning",
  "en-missing": "warning",
  incomplete: "danger",
};

/** EN/DE completeness, computed from the required text (R02): "DE missing" is a warning. */
export function LanguageChip({ status }: { status: LanguageStatus }) {
  const { t } = useLocale();

  return (
    <StatusChip tone={languageTone[status]}>
      {t(`products.lang.${status}`)}
    </StatusChip>
  );
}
