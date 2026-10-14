import type { Language } from "@/contexts/locale-context";
import type { LocalizedText } from "@/features/catalog/types";

/** Answer types the merchant can pick per question (spec §4.10, M19). */
export type AdviceAnswerType = "number" | "single" | "multi" | "date" | "text";

export interface AdviceOption {
  id: string;
  label: LocalizedText;
}

export interface AdviceQuestion {
  id: string;
  /** A language may be missing; C21 then shows the other wording with a notice (D7). */
  text: LocalizedText;
  type: AdviceAnswerType;
  /** Number questions start at this value and cannot go below it (default 0). */
  min?: number;
  /** Choices for "single" and "multi" questions. */
  options?: AdviceOption[];
  required: boolean;
}

/** The shop's trip-advice questions (PRD §12). Question order is array order. */
export interface AdviceQuestionSet {
  /** Where N16 goes; the merchant can change it in M19. */
  recipientEmail: string;
  questions: AdviceQuestion[];
  updatedAt: string;
}

/** A count, an option id (single), option ids (multi), YYYY-MM-DD (date) or free text. */
export type AdviceValue = number | string | string[];

/** The question and answer as the guest saw them when sending (AC18): later edits don't change it. */
export interface AdviceAnswer {
  questionId: string;
  question: string;
  questionLanguage: Language;
  /** Display text, e.g. "History and old town, The lake and boats". */
  answer: string;
}

/** A sent C21 request, listed in M19. The shop replies by email outside the app. */
export interface AdviceRequest {
  id: string;
  sentAt: string;
  /** The guest's interface language when sending. */
  language: Language;
  email: string;
  answers: AdviceAnswer[];
  /** When the merchant first opened it; absent while new. */
  readAt?: string;
}

/** C21 in progress: keeps the set it started with, so merchant edits apply to new requests only. */
export interface AdviceDraft {
  set: AdviceQuestionSet;
  step: number;
  values: Record<string, AdviceValue>;
  email: string;
  startedAt: string;
}

/** A sent C22 request, listed in M20 (D8: no sign-in, group size 1–50). */
export interface PrivateTourRequest {
  id: string;
  sentAt: string;
  language: Language;
  email: string;
  groupSize: number;
  /** YYYY-MM-DD. */
  dateFrom: string;
  /** YYYY-MM-DD. */
  dateTo: string;
  /** Optional free text (A1); empty when the guest left it out. */
  interests: string;
  /** Set by hand in M20 once the shop has replied by email (D9). */
  answeredAt?: string;
}
