import { Alert } from "@heroui/react";

import { InfoIcon } from "@/components/icons";

/**
 * Tinted info Alert (alert--soft, as on C04) with the info icon and one line of text.
 * Moved from C06 (`review-view.tsx`) for the tour screens in round 2 (14.10.2026).
 */
export function InfoNote({ text }: { text: string }) {
  return (
    <Alert className="alert--soft alert--info w-full">
      <Alert.Indicator>
        <InfoIcon size={16} />
      </Alert.Indicator>
      <Alert.Content>
        <Alert.Description>{text}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
