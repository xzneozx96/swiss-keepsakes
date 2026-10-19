import type { AdviceRequest } from "@/features/requests/types";
import type { Plan } from "../lib/plan";

import { useChat } from "@ai-sdk/react";
import { Button } from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getChat, hooks, resetChat, saveMessages } from "../lib/session";

import { ItineraryCard } from "./itinerary-card";
import {
  Row,
  DatePicker,
  DietPicker,
  Group,
  InterestsPicker,
  NextPicker,
  PartyPicker,
  StayPicker,
  TimePicker,
} from "./pickers";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
  type StepStatus,
} from "@/components/ai-elements/chain-of-thought";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import { ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { useDemoActions } from "@/features/demo";
import { demoNow } from "@/features/demo/clock";
import { AssistantHeader } from "@/features/requests/components/advice-chat";
import { mailAdviceRequest } from "@/features/requests/lib/request-mail";

const TITLES: Record<string, string> = {
  list_hotels: "Look up central hotels",
  check_opening_status: "Check what is open that day",
  find_lunch: "Find lunch options",
  build_itinerary: "Build the itinerary",
  get_booking_info: "Get booking details",
  create_inquiry: "Send the plan to our team",
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

type ToolState =
  "input-streaming" | "input-available" | "output-available" | "output-error";

interface ToolPart {
  type: string;
  toolCallId: string;
  state: ToolState;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

type TraceStep =
  | { kind: "reasoning"; key: string; text: string; status: StepStatus }
  | {
      kind: "tool";
      key: string;
      id: string;
      name: string;
      status: StepStatus;
      part: ToolPart;
    };

const toolStatus = (s: ToolState): StepStatus =>
  s === "input-streaming"
    ? "pending"
    : s === "input-available"
      ? "active"
      : s === "output-error"
        ? "error"
        : "complete";

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

/** The assistant speaks as plain text, with no bubble. */
function Assistant({ children }: { children: ReactNode }) {
  return (
    <p className="animate-rise text-body leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
      {children}
    </p>
  );
}

/** The guest's reply, a light bubble on the right. */
function Guest({ children }: { children: ReactNode }) {
  return (
    <div className="animate-rise flex justify-end">
      <div className="max-w-[82%] rounded-3xl bg-default px-4 py-2.5 text-body [overflow-wrap:anywhere]">
        {children}
      </div>
    </div>
  );
}

function Thinking() {
  return (
    <div
      aria-label="The assistant is typing"
      className="animate-rise flex gap-1 py-2"
      role="status"
    >
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          aria-hidden
          className="size-1.5 rounded-full bg-muted motion-safe:animate-bounce"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </div>
  );
}

/**
 * One collapsible trace per run of reasoning and tool calls (the agentic-rag ChainOfThought):
 * open and shimmering while the agent works, collapsed to a one-line summary afterwards.
 */
function TracePanel({
  steps,
  streaming,
  timings,
}: {
  steps: TraceStep[];
  streaming: boolean;
  timings: Map<string, number>;
}) {
  const [open, setOpen] = useState(streaming);
  const [startedAt] = useState(() => Date.now());
  const [sawStreaming, setSawStreaming] = useState(streaming);
  const [wasStreaming, setWasStreaming] = useState(streaming);
  const [elapsed, setElapsed] = useState(0);
  const tools = steps.filter((s) => s.kind === "tool").length;

  // A new run of thinking opens the panel again, whatever the guest did with it before.
  if (streaming !== wasStreaming) {
    setWasStreaming(streaming);
    if (streaming) {
      setSawStreaming(true);
      setOpen(true);
    }
  }

  useEffect(() => {
    if (streaming) return;
    const ended = Date.now();
    const frame = requestAnimationFrame(() =>
      setElapsed(Math.max(1, Math.round((ended - startedAt) / 1000))),
    );
    const timer = window.setTimeout(() => setOpen(false), 600);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [streaming, startedAt]);

  const done = sawStreaming ? `Thought for ${elapsed}s` : "Thought";
  const label = streaming
    ? "Thinking…"
    : `${done}${tools ? ` · ${tools} tool call${tools === 1 ? "" : "s"}` : ""}`;

  return (
    <ChainOfThought open={open} onOpenChange={setOpen}>
      <ChainOfThoughtHeader isStreaming={streaming} label={label} />
      <ChainOfThoughtContent>
        {steps.map((step, i) =>
          step.kind === "reasoning" ? (
            <ChainOfThoughtStep
              key={step.key}
              description={step.text}
              isLast={i === steps.length - 1}
              label={step.status === "active" ? "Thinking…" : "Thought"}
              status={step.status}
            />
          ) : (
            <ChainOfThoughtStep
              key={step.key}
              autoExpand={false}
              isLast={i === steps.length - 1}
              label={
                timings.has(step.id)
                  ? `${TITLES[step.name] ?? step.name} · ${seconds(timings.get(step.id)!)}`
                  : (TITLES[step.name] ?? step.name)
              }
              status={step.status}
            >
              <div className="space-y-2">
                {step.part.input != null && (
                  <ToolInput input={step.part.input} />
                )}
                {step.part.output != null && (
                  <ToolOutput output={step.part.output} />
                )}
              </div>
            </ChainOfThoughtStep>
          ),
        )}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}

/**
 * The trip planner demo (R19): a real AI SDK chat whose transport is scripted. The model's
 * thinking, its tool calls and its questions all arrive as streamed message parts, so the
 * guest sees an agent at work; every question is a tool the guest answers by picking.
 * The chat lives outside this component, so closing the assistant keeps the conversation.
 */
export function PlannerChat({ onLeave }: { onLeave: () => void }) {
  const navigate = useNavigate();
  const { update, setRole } = useDemoActions();

  // The scripted chat lives outside this component and calls back into it, so the handler is
  // registered after render. `update` never changes, so the handler is never stale.
  useEffect(() => {
    hooks.createInquiry = ({ answers }) => {
      const requestId = `adv-${Date.now().toString(36)}`;

      update((s) => {
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
    };
  }, [update]);

  const [chat, setChat] = useState(getChat);
  // The scripted answer arrives a word at a time; the screen redraws at most every 50 ms.
  const { messages, sendMessage, addToolOutput, status } = useChat({
    chat,
    experimental_throttle: 50,
  });

  const rootRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  const [timings, setTimings] = useState(() => new Map<string, number>());
  const started = useRef(new Map<string, number>());
  const recorded = useRef(new Set<string>());

  useLayoutEffect(() => {
    const measure = () =>
      setTop(rootRef.current?.getBoundingClientRect().top ?? 0);

    window.scrollTo(0, 0);
    measure();
    window.addEventListener("resize", measure);

    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const finished: [string, number][] = [];

    for (const part of messages.flatMap((m) => m.parts)) {
      if (!part.type.startsWith("tool-")) continue;
      const p = part as unknown as ToolPart;

      if (!started.current.has(p.toolCallId))
        started.current.set(p.toolCallId, Date.now());
      if (
        p.state === "output-available" &&
        !recorded.current.has(p.toolCallId)
      ) {
        recorded.current.add(p.toolCallId);
        finished.push([
          p.toolCallId,
          Date.now() - started.current.get(p.toolCallId)!,
        ]);
      }
    }
    // Tool times are measured as the stream arrives, so they can only be stored from here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (finished.length) setTimings((prev) => new Map([...prev, ...finished]));
  }, [messages]);

  useEffect(() => {
    if (status === "ready") saveMessages(messages);
  }, [messages, status]);

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

  const card = (part: ToolPart): ReactNode => {
    const name = part.type.slice(5);

    if (part.state !== "output-available") return null;
    if (name === "build_itinerary" && part.toolCallId === lastBuildId)
      return <ItineraryCard plan={part.output as unknown as Plan} />;
    if (name === "get_booking_info") {
      const out = part.output as {
        name: string;
        phone: string;
        bookUrl: string | null;
        price: string;
      };

      return (
        <div className="animate-rise flex w-full flex-col gap-2 rounded-3xl bg-surface p-4 shadow-surface">
          <p className="font-serif font-semibold">{out.name}</p>
          <p className="text-sm text-muted">{out.price}</p>
          <div className="flex flex-wrap gap-2">
            {out.bookUrl && (
              <a
                className="inline-flex min-h-11 items-center rounded-full bg-foreground px-4 text-sm font-medium text-background"
                href={out.bookUrl}
                rel="noreferrer"
                target="_blank"
              >
                Book online
              </a>
            )}
            <a
              className="inline-flex min-h-11 items-center rounded-full border border-field-border px-4 text-sm font-medium"
              href={`tel:${out.phone.replace(/ /g, "")}`}
            >
              Call {out.phone}
            </a>
          </div>
        </div>
      );
    }
    if (name === "create_inquiry") {
      const requestId = String(part.output?.requestId);

      return (
        <div className="animate-rise flex w-full flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface">
          <p className="font-medium">Your plan is with our team.</p>
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
            Open it in the inbox
          </Button>
        </div>
      );
    }

    return null;
  };

  const renderAsk = (part: ToolPart): ReactNode => {
    const name = part.type.slice(5);
    const Picker = PICKERS[name as keyof typeof PICKERS];

    if (!Picker) return null;
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
  };

  const renderAssistant = (
    message: (typeof messages)[number],
    isLast: boolean,
  ) => {
    const nodes: ReactNode[] = [];
    let steps: TraceStep[] = [];
    let cards: ReactNode[] = [];

    const flush = (tail: boolean) => {
      if (steps.length) {
        const active = steps.some(
          (s) => s.status === "active" || s.status === "pending",
        );

        nodes.push(
          <TracePanel
            key={`trace-${steps[0].key}`}
            steps={steps}
            streaming={active || (tail && isLast && busy)}
            timings={timings}
          />,
        );
      }
      cards.forEach((c, i) =>
        nodes.push(<div key={`card-${steps[0]?.key}-${i}`}>{c}</div>),
      );
      steps = [];
      cards = [];
    };

    message.parts.forEach((p, i) => {
      const key = `${message.id}-${i}`;

      if (p.type === "reasoning") {
        steps.push({
          kind: "reasoning",
          key,
          text: p.text,
          status: p.state === "streaming" ? "active" : "complete",
        });
      } else if (p.type === "text") {
        flush(false);
        if (p.text) nodes.push(<Assistant key={key}>{p.text}</Assistant>);
      } else if (p.type.startsWith("tool-")) {
        const part = p as unknown as ToolPart;
        const name = part.type.slice(5);

        if (name.startsWith("ask_")) {
          flush(false);
          nodes.push(<div key={key}>{renderAsk(part)}</div>);
        } else {
          steps.push({
            kind: "tool",
            key,
            id: part.toolCallId,
            name,
            status: toolStatus(part.state),
            part,
          });
          const c = card(part);

          if (c) cards.push(c);
        }
      }
    });
    flush(true);

    return nodes;
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
                Hi! I plan Luzerne days from real opening hours, so you are
                never sent somewhere that is closed. I will ask a few quick
                questions.
              </Assistant>
              <Group label="Start here">
                <Row
                  onClick={() =>
                    void sendMessage({ text: "Plan my day in Luzerne" })
                  }
                >
                  Plan my day in Luzerne
                </Row>
              </Group>
            </>
          )}

          {messages.map((m, mi) =>
            m.role === "user" ? (
              <Guest key={m.id}>
                {m.parts.map((p) => (p.type === "text" ? p.text : "")).join("")}
              </Guest>
            ) : (
              <div key={m.id} className="flex flex-col gap-4">
                {renderAssistant(m, mi === messages.length - 1)}
              </div>
            ),
          )}
          {status === "submitted" && <Thinking />}
        </ConversationContent>
      </Conversation>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-separator bg-background px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)] text-xs text-muted">
        <span>Tap an option to reply.</span>
        {messages.length > 0 && (
          <button
            className="min-h-11 rounded-full px-2 font-medium text-foreground underline underline-offset-2 outline-none focus-visible:focus-ring"
            type="button"
            onClick={() => {
              setTimings(new Map());
              started.current.clear();
              recorded.current.clear();
              setChat(resetChat());
            }}
          >
            Start over
          </button>
        )}
      </div>
    </div>
  );
}
