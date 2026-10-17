import type { UIMessage } from "ai";
import type { AgentHooks } from "./agent";

import { Chat } from "@ai-sdk/react";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";

import { ScriptedChatTransport } from "./transport";

const KEY = "planner-chat";

/** The mounted screen points this at the demo store, so the long-lived chat can file inquiries. */
export const hooks: { createInquiry: AgentHooks["createInquiry"] } = {
  createInquiry: () => "",
};

function restore(): UIMessage[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? "[]") as UIMessage[];
  } catch {
    return [];
  }
}

export function saveMessages(messages: UIMessage[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(messages));
  } catch {
    // Storage can be full or blocked; the conversation then lasts until the tab reloads.
  }
}

const make = (messages: UIMessage[]) =>
  new Chat<UIMessage>({
    messages,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    transport: new ScriptedChatTransport({
      createInquiry: (summary) => hooks.createInquiry(summary),
    }),
  });

let chat: Chat<UIMessage> | null = null;

/** One chat for the whole session, so closing and reopening the assistant keeps the conversation. */
export function getChat() {
  chat ??= make(restore());

  return chat;
}

export function resetChat() {
  sessionStorage.removeItem(KEY);
  chat = make([]);

  return chat;
}
