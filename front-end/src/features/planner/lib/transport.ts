import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";

import { nextTurn, type AgentHooks, type Step } from "./agent";

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);

    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });

const words = (text: string) => text.match(/\S+\s*/g) ?? [];

let counter = 0;
const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${counter++}`;

/**
 * Streams scripted turns in the exact chunk format a model-backed endpoint would send
 * (reasoning, tool calls, text), so a real backend can replace this transport later
 * without changing the chat UI.
 */
export class ScriptedChatTransport implements ChatTransport<UIMessage> {
  constructor(private hooks: AgentHooks) {}

  async sendMessages({
    messages,
    abortSignal,
  }: Parameters<ChatTransport<UIMessage>["sendMessages"]>[0]) {
    const turn = nextTurn(messages, this.hooks);

    return new ReadableStream<UIMessageChunk>({
      start: async (controller) => {
        const send = (chunk: UIMessageChunk) => controller.enqueue(chunk);
        const aborted = () => abortSignal?.aborted ?? false;
        let stepOpen = false;
        let previous: Step["kind"] | null = null;

        const openStep = () => {
          if (!stepOpen) send({ type: "start-step" });
          stepOpen = true;
        };
        const closeStep = () => {
          if (stepOpen) send({ type: "finish-step" });
          stepOpen = false;
        };

        send({ type: "start" });
        for (const step of turn) {
          if (aborted()) break;
          if (previous === "tool" && step.kind !== "tool") closeStep();
          openStep();
          previous = step.kind;

          if (step.kind === "reasoning" || step.kind === "text") {
            const id = uid(step.kind);
            const [start, delta, end] =
              step.kind === "reasoning"
                ? ([
                    "reasoning-start",
                    "reasoning-delta",
                    "reasoning-end",
                  ] as const)
                : (["text-start", "text-delta", "text-end"] as const);

            await sleep(step.kind === "reasoning" ? 350 : 250, abortSignal);
            send({ type: start, id });
            for (const w of words(step.text)) {
              if (aborted()) break;
              send({ type: delta, id, delta: w });
              await sleep(step.kind === "reasoning" ? 32 : 24, abortSignal);
            }
            send({ type: end, id });
          } else {
            const toolCallId = uid("call");

            send({ type: "tool-input-start", toolCallId, toolName: step.name });
            await sleep(step.kind === "ask" ? 200 : 350, abortSignal);
            send({
              type: "tool-input-available",
              toolCallId,
              toolName: step.name,
              input: step.input,
            });
            if (step.kind === "tool") {
              await sleep(step.ms ?? 800, abortSignal);
              send({
                type: "tool-output-available",
                toolCallId,
                output: step.output,
              });
            }
          }
        }
        closeStep();
        send({ type: "finish" });
        controller.close();
      },
    });
  }

  async reconnectToStream() {
    return null;
  }
}
