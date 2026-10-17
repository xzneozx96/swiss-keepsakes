import type { AdviceRequest } from "@/features/requests/types";
import type { Plan } from "../lib/plan";

import { useChat } from "@ai-sdk/react";
import { Button } from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useLayoutEffect, useMemo, useRef, useState } from "react";

import { ScriptedChatTransport } from "../lib/transport";

import { ItineraryCard } from "./itinerary-card";
import {
  DatePicker,
  DietPicker,
  InterestsPicker,
  NextPicker,
  PartyPicker,
  StayPicker,
  TimePicker,
} from "./pickers";

import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { Reasoning } from "@/components/ai-elements/reasoning";
import { Tool, type ToolState } from "@/components/ai-elements/tool";
import { useDemo } from "@/features/demo";
import { demoNow } from "@/features/demo/clock";
import {
  AssistantAvatar,
  AssistantHeader,
  TypingBubble,
} from "@/features/requests/components/advice-chat";
import { mailAdviceRequest } from "@/features/requests/lib/request-mail";

const enter =
  "motion-safe:transition motion-safe:duration-300 motion-safe:ease-out motion-safe:starting:translate-y-2 motion-safe:starting:opacity-0";

const TITLES: Record<string, string> = {
  list_hotels: "Look up central hotels",
  check_opening_status: "Check what is open that day",
  find_lunch: "Find lunch options",
  build_itinerary: "Build the itinerary",
  get_booking_info: "Get booking details",
  create_inquiry: "Send the plan to the team",
};

const PICKERS = {
  ask_stay: StayPicker,
  ask_party: PartyPicker,
  ask_date: DatePicker,
  ask_time: TimePicker,
  ask_interests: InterestsPicker,
  ask_diet: DietPicker,
  ask_next: NextPicker,
} as const;

interface ToolPart {
  type: string;
  toolCallId: string;
  state: ToolState;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

function Assistant({ children }: { children: React.ReactNode }) {
  return (
    <div className={`flex items-end gap-2 ${enter}`}>
      <AssistantAvatar />
      <div className="max-w-[85%] rounded-3xl rounded-es-md bg-surface px-4 py-3 text-body shadow-surface">
        {children}
      </div>
    </div>
  );
}

function Guest({ children }: { children: React.ReactNode }) {
  return (
    <div className={`flex justify-end ${enter}`}>
      <div className="max-w-[80%] rounded-3xl rounded-ee-md bg-foreground px-4 py-3 text-body text-background">
        {children}
      </div>
    </div>
  );
}

/**
 * The trip planner demo (R19): a real AI SDK chat whose transport is scripted. The model's
 * thinking, its tool calls and its questions all arrive as streamed message parts, so the
 * guest sees an agent at work; every question is a tool the guest answers by picking.
 */
export function PlannerChat({ onLeave }: { onLeave: () => void }) {
  const navigate = useNavigate();
  const { update, setRole } = useDemo();
  const updateRef = useRef(update);

  updateRef.current = update;

  const transport = useMemo(
    () =>
      new ScriptedChatTransport({
        createInquiry: ({ answers }) => {
          const requestId = `adv-${Date.now().toString(36)}`;

          updateRef.current((s) => {
            const request: AdviceRequest = {
              id: requestId,
              sentAt: demoNow(s.clockStartedAt).toISOString(),
              language: "en",
              email: "demo.guest@example.com",
              answers: answers.map((a, i) => ({
                questionId: `planner-${i}`,
                question: a.question,
                questionLanguage: "en",
                answer: a.answer,
              })),
            };

            return mailAdviceRequest(
              {
                ...s,
                data: {
                  ...s.data,
                  adviceRequests: [...s.data.adviceRequests, request],
                },
              },
              request,
              s.data.adviceQuestions.recipientEmail,
            );
          });

          return requestId;
        },
      }),
    [],
  );

  const { messages, sendMessage, addToolOutput, status } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  const rootRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);

  useLayoutEffect(() => {
    const measure = () =>
      setTop(rootRef.current?.getBoundingClientRect().top ?? 0);

    window.scrollTo(0, 0);
    measure();
    window.addEventListener("resize", measure);

    return () => window.removeEventListener("resize", measure);
  }, []);

  const lastBuildId = useMemo(
    () =>
      messages
        .flatMap((m) => m.parts)
        .filter((p) => p.type === "tool-build_itinerary")
        .map((p) => (p as unknown as ToolPart).toolCallId)
        .at(-1),
    [messages],
  );

  const busy = status === "submitted" || status === "streaming";

  const renderTool = (part: ToolPart) => {
    const name = part.type.slice(5);
    const Picker = PICKERS[name as keyof typeof PICKERS];

    if (Picker) {
      if (part.state === "output-available")
        return <Guest>{String(part.output?.label ?? "")}</Guest>;
      if (part.state !== "input-available") return null;

      return (
        <Picker
          disabled={busy}
          input={part.input ?? {}}
          onSubmit={(output) => {
            if (name === "ask_next" && output.id === "tours") {
              void navigate({ to: "/tours" });

              return;
            }
            void addToolOutput({
              tool: name,
              toolCallId: part.toolCallId,
              output,
            });
          }}
        />
      );
    }

    const title = TITLES[name] ?? name;

    if (name === "build_itinerary" && part.state === "output-available") {
      return (
        <div className="flex flex-col gap-2">
          <Tool
            input={part.input}
            output={part.output}
            state={part.state}
            title={title}
          />
          {part.toolCallId === lastBuildId && (
            <ItineraryCard plan={part.output as unknown as Plan} />
          )}
        </div>
      );
    }
    if (name === "get_booking_info" && part.state === "output-available") {
      const out = part.output as {
        name: string;
        phone: string;
        bookUrl: string | null;
        price: string;
      };

      return (
        <div className="flex flex-col gap-2">
          <Tool
            input={part.input}
            output={part.output}
            state={part.state}
            title={title}
          />
          <div className="ms-10 flex w-[calc(100%-2.5rem)] flex-col gap-2 rounded-3xl bg-surface p-4 shadow-surface">
            <p className="font-serif font-semibold">{out.name}</p>
            <p className="text-sm text-muted">{out.price}</p>
            <div className="flex flex-wrap gap-2">
              {out.bookUrl && (
                <a
                  className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
                  href={out.bookUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Book online
                </a>
              )}
              <a
                className="rounded-full border border-separator px-4 py-2 text-sm font-medium"
                href={`tel:${out.phone.replace(/ /g, "")}`}
              >
                Call {out.phone}
              </a>
            </div>
          </div>
        </div>
      );
    }
    if (name === "create_inquiry" && part.state === "output-available") {
      const requestId = String(part.output?.requestId);

      return (
        <div className="flex flex-col gap-2">
          <Tool
            input={part.input}
            output={part.output}
            state={part.state}
            title={title}
          />
          <div className="ms-10 flex w-[calc(100%-2.5rem)] flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface">
            <p className="font-medium">Your plan is with the team.</p>
            <Button
              fullWidth
              variant="secondary"
              onPress={() => {
                setRole("owner");
                void navigate({
                  to: "/store/requests/advice/$requestId",
                  params: { requestId },
                });
              }}
            >
              View as the shop team
            </Button>
          </div>
        </div>
      );
    }

    return (
      <Tool
        input={part.input}
        output={part.output}
        state={part.state}
        title={title}
      />
    );
  };

  return (
    <div
      ref={rootRef}
      className="flex flex-col overflow-hidden"
      style={{ height: `calc(100dvh - ${top}px)` }}
    >
      <AssistantHeader onBack={onLeave} />

      <Conversation>
        <ConversationContent>
          {messages.length === 0 && (
            <>
              <Assistant>
                Hi! I plan Lucerne days from real opening hours, so you are
                never sent somewhere that is closed. I will ask a few quick
                questions.
              </Assistant>
              <div className="flex flex-wrap gap-2 ps-10">
                <button
                  className="rounded-2xl border-2 border-transparent bg-surface px-3.5 py-2.5 font-medium shadow-surface outline-none transition-colors hover:bg-surface-secondary focus-visible:focus-ring"
                  type="button"
                  onClick={() =>
                    void sendMessage({ text: "Plan my day in Lucerne" })
                  }
                >
                  Plan my day in Lucerne
                </button>
              </div>
            </>
          )}

          {messages.map((m) =>
            m.role === "user" ? (
              <Guest key={m.id}>
                {m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
              </Guest>
            ) : (
              <div key={m.id} className="flex flex-col gap-3">
                {m.parts.map((p, i) => {
                  if (p.type === "reasoning")
                    return (
                      <Reasoning
                        key={i}
                        isStreaming={p.state === "streaming"}
                        text={p.text}
                      />
                    );
                  if (p.type === "text")
                    return p.text ? (
                      <Assistant key={i}>{p.text}</Assistant>
                    ) : null;
                  if (p.type.startsWith("tool-"))
                    return (
                      <div key={i}>{renderTool(p as unknown as ToolPart)}</div>
                    );

                  return null;
                })}
              </div>
            ),
          )}
          {status === "submitted" && (
            <TypingBubble label="The assistant is typing" />
          )}
        </ConversationContent>
      </Conversation>

      <p className="shrink-0 border-t border-separator bg-background px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] text-center text-xs text-muted">
        Pick an option above to continue.
      </p>
    </div>
  );
}
