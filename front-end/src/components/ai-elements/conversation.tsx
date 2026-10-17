import type { ComponentProps } from "react";

import clsx from "clsx";
import { StickToBottom } from "use-stick-to-bottom";

export function Conversation({
  className,
  ...props
}: ComponentProps<typeof StickToBottom>) {
  return (
    <StickToBottom
      className={clsx("relative min-h-0 flex-1 overflow-y-hidden", className)}
      initial="smooth"
      resize="smooth"
      role="log"
      {...props}
    />
  );
}

export function ConversationContent({
  className,
  ...props
}: ComponentProps<typeof StickToBottom.Content>) {
  return (
    <StickToBottom.Content
      className={clsx("flex flex-col gap-3 px-4 pt-5 pb-6", className)}
      {...props}
    />
  );
}
