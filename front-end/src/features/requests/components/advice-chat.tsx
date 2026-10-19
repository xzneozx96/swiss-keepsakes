import type { AdviceQuestion } from "../types";

import {
  Button,
  Chip,
  FieldError,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { useAdvice } from "../hooks/use-advice";
import { isAnswered, looksLikeEmail, numberStart } from "../lib/answers";

import { AdviceAnswer } from "./advice-answer";

import { AssistantIcon, InfoIcon, SendIcon } from "@/components/icons";
import { BackButton } from "@/components/layout/cart-button";
import { useLocale } from "@/contexts/locale-context";
import { shop } from "@/features/catalog/seed";

const isChoice = (q: AdviceQuestion) =>
  q.type === "single" || q.type === "multi";

const reduceMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** How long the assistant "types" before its next message (Chatwoot-style rhythm). */
const TYPING_MS = 650;

/** New messages rise in once; with reduced motion they simply appear. */
const enter =
  "motion-safe:transition motion-safe:duration-300 motion-safe:ease-out motion-safe:starting:translate-y-2 motion-safe:starting:opacity-0";

/** The assistant's avatar: ink circle, the same mark in the header and beside messages. */
export function AssistantAvatar({ size = "size-8" }: { size?: string }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-assistant text-white ${size}`}
    >
      <AssistantIcon
        className="animate-sparkle"
        size={size === "size-8" ? 16 : 20}
        weight="Filled"
      />
    </span>
  );
}

/** An assistant message, left. The avatar shows beside the last message of a run. */
export function AssistantSays({
  children,
  lang,
  avatar = true,
}: {
  children: React.ReactNode;
  lang?: string;
  avatar?: boolean;
}) {
  return (
    <li className={`flex items-end gap-2 ${enter}`}>
      {avatar ? (
        <AssistantAvatar />
      ) : (
        <span aria-hidden className="w-8 shrink-0" />
      )}
      <div
        className="max-w-[85%] rounded-3xl rounded-es-md bg-surface px-4 py-3 text-body shadow-surface"
        lang={lang}
      >
        {children}
      </div>
    </li>
  );
}

/** The guest's message, right, in ink. */
function GuestSays({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <li className={`flex justify-end ${enter}`}>
      <div
        className={`max-w-[80%] rounded-3xl rounded-ee-md px-4 py-3 text-body ${
          muted
            ? "border border-separator text-muted italic"
            : "bg-foreground text-background"
        }`}
      >
        {children}
      </div>
    </li>
  );
}

/** Three dots while the assistant "types" its next message. */
export function TypingBubble({ label }: { label: string }) {
  return (
    <li
      aria-label={label}
      className={`flex items-end gap-2 ${enter}`}
      role="status"
    >
      <AssistantAvatar />
      <div className="flex gap-1 rounded-3xl rounded-es-md bg-surface px-4 py-4 shadow-surface">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            aria-hidden
            className="size-2 rounded-full bg-muted motion-safe:animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </li>
  );
}

/** The trip assistant's header: back, avatar, name with the AI label, the shop. */
export function AssistantHeader({ onBack }: { onBack?: () => void }) {
  const { t } = useLocale();

  return (
    <header className="z-20 flex shrink-0 items-center gap-3 border-b border-separator/70 bg-background px-4 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-3">
      {onBack && <BackButton label={t("advice.back")} onPress={onBack} />}
      <AssistantAvatar size="size-10" />
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-2 font-semibold">
          {t("advice.title")}
          <Chip size="sm" variant="secondary">
            <Chip.Label>{t("advice.ai")}</Chip.Label>
          </Chip>
        </span>
        <span className="truncate text-xs text-muted">{shop.name}</span>
      </div>
    </header>
  );
}

/**
 * C21 Trip assistant (spec §4.10, R19, AC18, AC34): a chat with the shop's AI assistant.
 * For now it asks only the shop's questions, in order, one message at a time; the matching
 * input sits in the composer and each answer becomes the guest's message. It answers nothing
 * typed freely and generates no plan. Then the email, a summary to send or change, and the
 * sent screen's thank-you. No sign-in, no promised reply time.
 */
export function AdviceChat({ onLeave }: { onLeave: () => void }) {
  const { t } = useLocale();
  const advice = useAdvice();
  const navigate = useNavigate();
  const { questions, step, emailStep, summaryStep } = advice;
  // Changing an answer from the summary: answering goes straight back to it.
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStep, setErrorStep] = useState(step);

  // An error belongs to the question it was raised on.
  if (errorStep !== step) {
    setErrorStep(step);
    setError(null);
  }
  // The assistant "types" after the guest moves forward; Back, Change and reload skip it.
  const [typing, setTyping] = useState(false);
  const lastStep = useRef(step);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);

  // Full height under whatever sits above (the prototype bar): header and composer stay put
  // and only the conversation scrolls, as a chat widget does on a phone.
  useLayoutEffect(() => {
    const measure = () =>
      setTop(rootRef.current?.getBoundingClientRect().top ?? 0);

    window.scrollTo(0, 0);
    measure();
    window.addEventListener("resize", measure);

    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const forward = step > lastStep.current;

    lastStep.current = step;
    if (!forward || reduceMotion()) return;
    setTyping(true);
    const timer = window.setTimeout(() => setTyping(false), TYPING_MS);

    return () => window.clearTimeout(timer);
  }, [step]);

  // Keep the newest message in view, inside the conversation only.
  useEffect(() => {
    const list = listRef.current;

    if (!list) return;
    requestAnimationFrame(() =>
      list.scrollTo({
        top: list.scrollHeight,
        behavior: reduceMotion() ? "auto" : "smooth",
      }),
    );
  }, [step, typing]);

  const after = (from: number) =>
    changing
      ? summaryStep
      : from + 1 === questions.length
        ? emailStep
        : from + 1;

  const back = () => {
    if (changing) {
      setChanging(false);
      advice.goTo(summaryStep);
    } else if (step === 0) onLeave();
    else advice.goTo(step - 1);
  };

  const answer = (q: AdviceQuestion, skip = false) => {
    const value = advice.values[q.id];

    if (skip) advice.setValue(q.id, undefined);
    // A count starts at its minimum, so sending it untouched answers it.
    else if (q.type === "number" && value === undefined)
      advice.setValue(q.id, numberStart(q));
    else if (!advice.canLeave(q)) {
      setError(t("advice.required"));

      return;
    }
    if (changing && after(step) === summaryStep) setChanging(false);
    advice.goTo(after(step));
  };

  const sendEmail = () => {
    const email = advice.email.trim();

    if (!email) return setError(t("advice.email.error"));
    if (!looksLikeEmail(email)) return setError(t("advice.email.invalid"));
    advice.goTo(summaryStep);
  };

  const send = () => {
    const result = advice.send();

    if (result.ok)
      void navigate({
        to: "/plan/sent",
        search: { request: result.requestId },
        replace: true,
      });
  };

  const question = step < questions.length ? questions[step] : undefined;

  const answerInput = (q: AdviceQuestion) => (
    <AdviceAnswer
      label={shown(q).text}
      question={q}
      value={advice.values[q.id]}
      onAnswer={(v) => {
        advice.setValue(q.id, v);
        setChanging(false);
        advice.goTo(after(step));
      }}
      onChange={(v) => {
        advice.setValue(q.id, v);
        setError(null);
      }}
    />
  );
  const shown = (q: AdviceQuestion) => advice.questionText(q);
  const askedUpTo = Math.min(step, questions.length);

  const ask = (q: AdviceQuestion) => {
    const text = shown(q);

    return (
      <AssistantSays lang={text.language}>
        {!q.required && (
          <span className="mb-1 block text-xs text-muted">
            {t("advice.optional")}
          </span>
        )}
        {text.text}
        {text.isFallback && (
          <span className="mt-2 flex items-start gap-1.5 text-xs text-muted">
            <InfoIcon aria-hidden className="mt-0.5 shrink-0" size={14} />
            {t(
              text.language === "en" ? "advice.onlyIn.en" : "advice.onlyIn.de",
            )}
          </span>
        )}
      </AssistantSays>
    );
  };

  return (
    <div
      ref={rootRef}
      className="flex flex-col overflow-hidden"
      style={{ height: `calc(100dvh - ${top}px)` }}
    >
      <AssistantHeader onBack={back} />

      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <ol
          aria-label={t("advice.thread")}
          aria-live="polite"
          className="flex flex-col gap-3 px-4 pt-5 pb-6"
        >
          <AssistantSays avatar={false}>
            {t("advice.greeting", { shop: shop.name })}
          </AssistantSays>
          <AssistantSays avatar={false}>{t("advice.intro")}</AssistantSays>

          {questions.slice(0, askedUpTo).map((q) => (
            <QuestionAndAnswer
              key={q.id}
              answer={advice.answerText(q)}
              ask={ask(q)}
              skippedLabel={t("advice.skipped")}
            />
          ))}
          {!typing && question && ask(question)}
          {!typing && question && isChoice(question) && (
            // Choices are offered in the conversation, under the question (owner, 14.10.2026).
            <li className="flex flex-col gap-1 ps-10">
              {question.type === "multi" && (
                <span className="text-xs text-muted">
                  {t("advice.multiHint")}
                </span>
              )}
              {answerInput(question)}
            </li>
          )}

          {step >= emailStep && !(typing && step === emailStep) && (
            <AssistantSays>{t("advice.email.ask")}</AssistantSays>
          )}
          {step >= summaryStep && (
            <>
              <GuestSays>{advice.email}</GuestSays>
              {!typing && (
                <AssistantSays>
                  <span className="mb-3 block">
                    {t("advice.summary.intro")}
                  </span>
                  <dl className="flex flex-col divide-y divide-separator">
                    {questions.map((q, i) => {
                      const text = shown(q);

                      return (
                        <div
                          key={q.id}
                          className="flex items-start gap-2 py-2.5"
                        >
                          <div className="flex min-w-0 flex-1 flex-col">
                            <dt
                              className="text-xs text-muted"
                              lang={text.language}
                            >
                              {text.text}
                            </dt>
                            <dd
                              className={
                                advice.answerText(q)
                                  ? "font-medium"
                                  : "text-muted"
                              }
                            >
                              {advice.answerText(q) || t("advice.skipped")}
                            </dd>
                          </div>
                          <button
                            aria-label={t("advice.summary.changeLabel", {
                              question: text.text,
                            })}
                            className="-me-1 shrink-0 rounded-full px-1 py-2 text-sm font-medium underline underline-offset-4 outline-none focus-visible:focus-ring"
                            type="button"
                            onClick={() => {
                              setChanging(true);
                              advice.goTo(i);
                            }}
                          >
                            {t("advice.summary.change")}
                          </button>
                        </div>
                      );
                    })}
                    <div className="flex items-start gap-2 py-2.5">
                      <div className="flex min-w-0 flex-1 flex-col">
                        <dt className="text-xs text-muted">
                          {t("advice.summary.email")}
                        </dt>
                        <dd className="font-medium break-all">
                          {advice.email}
                        </dd>
                      </div>
                      <button
                        aria-label={t("advice.summary.changeLabel", {
                          question: t("advice.email.label"),
                        })}
                        className="-me-1 shrink-0 rounded-full px-1 py-2 text-sm font-medium underline underline-offset-4 outline-none focus-visible:focus-ring"
                        type="button"
                        onClick={() => advice.goTo(emailStep)}
                      >
                        {t("advice.summary.change")}
                      </button>
                    </div>
                  </dl>
                </AssistantSays>
              )}
            </>
          )}
          {typing && <TypingBubble label={t("advice.typing")} />}
        </ol>
      </div>

      {/* A required single choice answers in the conversation, so it needs no composer. */}
      {!typing &&
        !(question?.type === "single" && question.required && !error) && (
          <div
            data-composer
            className="flex max-h-[55%] shrink-0 flex-col gap-3 overflow-y-auto border-t border-separator bg-background px-4 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]"
          >
            {error && (
              <p className="text-sm text-danger" role="alert">
                {error}
              </p>
            )}

            {question && (
              <>
                {!isChoice(question) && answerInput(question)}
                {/* A single choice answers on tap; every other input sends here. A count
                    always shows a value, so an optional one (M19, 4.14) can be sent as shown
                    or skipped. */}
                {question.type !== "single" &&
                  (question.required ||
                    question.type === "number" ||
                    isAnswered(advice.values[question.id])) && (
                    <Button
                      fullWidth
                      size="lg"
                      onPress={() => answer(question)}
                    >
                      <SendIcon aria-hidden size={18} />
                      {t("advice.send")}
                    </Button>
                  )}
                {!question.required &&
                  !isAnswered(advice.values[question.id]) && (
                    <Button
                      fullWidth
                      size="lg"
                      variant="secondary"
                      onPress={() => answer(question, true)}
                    >
                      {t("advice.skip")}
                    </Button>
                  )}
              </>
            )}

            {step === emailStep && (
              <form
                noValidate
                className="flex items-start gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendEmail();
                }}
              >
                <TextField
                  fullWidth
                  isRequired
                  className="flex-1"
                  isInvalid={error !== null}
                  name="email"
                  type="email"
                  value={advice.email}
                  onChange={(v) => {
                    advice.setEmail(v);
                    setError(null);
                  }}
                >
                  <Label className="sr-only">{t("advice.email.label")}</Label>
                  <Input
                    autoComplete="email"
                    inputMode="email"
                    placeholder={t("advice.email.placeholder")}
                  />
                  <FieldError className="sr-only">{error}</FieldError>
                </TextField>
                <Button
                  isIconOnly
                  aria-label={t("advice.send")}
                  size="lg"
                  type="submit"
                >
                  <SendIcon aria-hidden size={18} />
                </Button>
              </form>
            )}
            {step === emailStep && (
              <p className="text-xs text-muted">{t("advice.email.help")}</p>
            )}

            {step === summaryStep && (
              <Button fullWidth size="lg" onPress={send}>
                <SendIcon aria-hidden size={18} />
                {t("advice.summary.send")}
              </Button>
            )}
          </div>
        )}
    </div>
  );
}

/** An asked question with the guest's reply under it, or "Skipped". */
function QuestionAndAnswer({
  ask,
  answer,
  skippedLabel,
}: {
  ask: React.ReactNode;
  answer: string;
  skippedLabel: string;
}) {
  return (
    <>
      {ask}
      {answer ? (
        <GuestSays>{answer}</GuestSays>
      ) : (
        <GuestSays muted>{skippedLabel}</GuestSays>
      )}
    </>
  );
}
