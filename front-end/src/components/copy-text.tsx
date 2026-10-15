import { Button } from "@heroui/react";
import { useState } from "react";

import { CopiedIcon, CopyIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";

/**
 * A value the user can select or copy (an email, an order reference): the label, the value
 * on one line, and a copy icon in the top-right corner that turns into a tick once copied
 * (owner review 15.10.2026). The one copy field of the app; guest and merchant screens alike.
 */
export function CopyText({
  label,
  value,
  isMono = false,
  className = "rounded-2xl bg-surface-secondary",
}: {
  label: string;
  value: string;
  /** A code-like value, e.g. an order reference: monospace and larger. */
  isMono?: boolean;
  /** The surface: a grey field inside a card by default, a card of its own on a page. */
  className?: string;
}) {
  const { t } = useLocale();
  const [copied, setCopied] = useState<boolean | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={`relative flex flex-col py-3 ps-4 pe-12 ${className}`}>
      <span className="text-xs text-muted">{label}</span>
      {/* One line; a very long value ends in "…" and the full text stays selectable. */}
      <span
        className={`truncate select-all ${isMono ? "font-mono text-lg font-medium" : "font-medium"}`}
        title={value}
      >
        {value}
      </span>
      {copied === false && (
        <span className="mt-1 text-xs text-muted">{t("copyText.failed")}</span>
      )}
      <Button
        isIconOnly
        aria-label={t("copyText.copy", { label })}
        className="absolute end-2 top-2"
        size="sm"
        variant="ghost"
        onPress={() => void copy()}
      >
        {copied ? (
          <CopiedIcon aria-hidden className="text-success" size={18} />
        ) : (
          <CopyIcon aria-hidden size={18} />
        )}
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? t("copyText.copied", { label }) : ""}
      </span>
    </div>
  );
}
