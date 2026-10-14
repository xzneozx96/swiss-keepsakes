import type { IconComponent } from "@/components/icons";

import { Chip } from "@heroui/react";

import {
  StatusDangerIcon,
  StatusInfoIcon,
  StatusNeutralIcon,
  StatusSuccessIcon,
  StatusWarningIcon,
} from "@/components/icons";

export type StatusTone = "info" | "success" | "warning" | "danger" | "neutral";

const toneIcon: Record<StatusTone, IconComponent> = {
  info: StatusInfoIcon,
  success: StatusSuccessIcon,
  warning: StatusWarningIcon,
  danger: StatusDangerIcon,
  neutral: StatusNeutralIcon,
};

// HeroUI has no info colour; info uses our info-soft tokens (Chip card).
const infoClass = "bg-info-soft text-info-soft-foreground";

/**
 * The one status label (Chip card): soft tint, size lg (28px), a 14px icon and words.
 * Used for order progress, payment and availability. Never colour alone.
 */
export function StatusChip({
  tone,
  children,
}: {
  tone: StatusTone;
  children: React.ReactNode;
}) {
  const Icon = toneIcon[tone];
  const color = tone === "neutral" || tone === "info" ? "default" : tone;

  return (
    <Chip
      className={tone === "info" ? infoClass : undefined}
      color={color}
      size="lg"
      variant="soft"
    >
      <Icon className="shrink-0" size={14} />
      <Chip.Label>{children}</Chip.Label>
    </Chip>
  );
}
