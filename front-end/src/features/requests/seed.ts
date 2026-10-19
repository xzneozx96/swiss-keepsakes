import type {
  AdviceQuestionSet,
  AdviceRequest,
  PrivateTourRequest,
} from './types'

import { demoAt } from '@/features/demo/clock'

/**
 * Sample trip-advice questions (outline A5): the PRD §12 examples, not the shop's final
 * set. "Anything else" has no German text on purpose, to show the missing-translation
 * notice on C21 and the warning in M19 (D7, AC30).
 */
export const adviceQuestionSeed: AdviceQuestionSet = {
  // The shop's request mailbox, separate from the guest-facing hello@ address.
  recipientEmail: 'requests@swisskeepsakes.example',
  questions: [
    {
      id: 'adults',
      text: {
        en: 'How many adults are travelling?',
        de: 'Wie viele Erwachsene reisen mit?',
      },
      type: 'number',
      min: 1,
      required: true,
    },
    {
      id: 'children',
      text: {
        en: 'How many children are travelling?',
        de: 'Wie viele Kinder reisen mit?',
      },
      type: 'number',
      required: true,
    },
    {
      id: 'interests',
      text: {
        en: 'What would you like to see or do?',
        de: 'Was möchten Sie sehen oder erleben?',
      },
      type: 'multi',
      options: [
        {
          id: 'history',
          label: { en: 'History and old town', de: 'Geschichte und Altstadt' },
        },
        {
          id: 'lake',
          label: { en: 'The lake and boats', de: 'See und Schiffe' },
        },
        { id: 'mountains', label: { en: 'Mountains', de: 'Berge' } },
        {
          id: 'food',
          label: { en: 'Food and chocolate', de: 'Essen und Schokolade' },
        },
        {
          id: 'gifts',
          label: { en: 'Shopping for gifts', de: 'Geschenke einkaufen' },
        },
      ],
      required: true,
    },
    {
      id: 'arrival',
      text: {
        en: 'When do you arrive in Luzerne?',
        de: 'Wann kommen Sie in Luzern an?',
      },
      type: 'date',
      required: false,
    },
    {
      id: 'departure',
      text: {
        en: 'When do you leave Luzerne?',
        de: 'Wann reisen Sie aus Luzern ab?',
      },
      type: 'date',
      required: false,
    },
    {
      id: 'style',
      text: {
        en: 'How do you like to travel?',
        de: 'Wie reisen Sie am liebsten?',
      },
      type: 'single',
      options: [
        {
          id: 'group',
          label: { en: 'Group tour', de: 'Geführte Gruppe' },
        },
        {
          id: 'own',
          label: { en: 'On our own', de: 'Auf eigene Faust' },
        },
      ],
      required: false,
    },
    {
      id: 'notes',
      text: { en: 'Anything else we should know?' },
      type: 'text',
      required: false,
    },
  ],
  // Edited after the first seeded request, which keeps its older wording (AC18).
  updatedAt: demoAt({ days: -5 }),
}

/**
 * Two sent C21 requests for M19, with invented guests. The EN one was sent before the set
 * was last edited, so two of its questions keep their older wording (AC18). The DE one
 * shows the untranslated "anything else" question as the guest saw it, in English (D7).
 */
export const adviceRequestSeed: AdviceRequest[] = [
  {
    id: 'adv-1',
    sentAt: demoAt({ days: -9, hours: 9 }),
    language: 'en',
    email: 'h.whitfield@example.com',
    answers: [
      {
        questionId: 'adults',
        question: 'How many adults are travelling?',
        questionLanguage: 'en',
        answer: '2',
      },
      {
        questionId: 'children',
        question: 'How many children (under 16)?',
        questionLanguage: 'en',
        answer: '2',
      },
      {
        questionId: 'interests',
        question: 'What are you interested in?',
        questionLanguage: 'en',
        answer: 'History and old town, The lake and boats',
      },
      {
        questionId: 'arrival',
        question: 'When do you arrive in Luzerne?',
        questionLanguage: 'en',
        answer: '21.10.2026',
      },
      {
        questionId: 'departure',
        question: 'When do you leave Luzerne?',
        questionLanguage: 'en',
        answer: '24.10.2026',
      },
      {
        questionId: 'style',
        question: 'How do you like to travel?',
        questionLanguage: 'en',
        answer: 'On our own',
      },
      {
        questionId: 'notes',
        question: 'Anything else we should know?',
        questionLanguage: 'en',
        answer:
          'Our children are 7 and 10. Is the Musegg wall all right for them?',
      },
    ],
    readAt: demoAt({ days: -8, hours: -1 }),
  },
  {
    id: 'adv-2',
    sentAt: demoAt({ days: -1, hours: 9 }),
    language: 'de',
    email: 'm.huber@example.com',
    answers: [
      {
        questionId: 'adults',
        question: 'Wie viele Erwachsene reisen mit?',
        questionLanguage: 'de',
        answer: '2',
      },
      {
        questionId: 'children',
        question: 'Wie viele Kinder reisen mit?',
        questionLanguage: 'de',
        answer: '0',
      },
      {
        questionId: 'interests',
        question: 'Was möchten Sie sehen oder erleben?',
        questionLanguage: 'de',
        answer: 'Berge, Essen und Schokolade',
      },
      {
        questionId: 'arrival',
        question: 'Wann kommen Sie in Luzern an?',
        questionLanguage: 'de',
        answer: '17.10.2026',
      },
      {
        questionId: 'departure',
        question: 'Wann reisen Sie aus Luzern ab?',
        questionLanguage: 'de',
        answer: '19.10.2026',
      },
      {
        questionId: 'style',
        question: 'Wie reisen Sie am liebsten?',
        questionLanguage: 'de',
        answer: 'Geführte Gruppe',
      },
      {
        questionId: 'notes',
        question: 'Anything else we should know?',
        questionLanguage: 'en',
        answer:
          'Wir feiern unseren 30. Hochzeitstag. Haben Sie einen Tipp für ein ruhiges Abendessen am See?',
      },
    ],
  },
]

/** Two C22 requests for M20 from invented guests: one new, one the shop has answered (D9). */
export const privateTourRequestSeed: PrivateTourRequest[] = [
  {
    id: 'pt-1',
    sentAt: demoAt({ days: -1, hours: 11 }),
    language: 'en',
    email: 'j.morgan@example.com',
    groupSize: 6,
    dateFrom: '2026-10-24',
    dateTo: '2026-10-25',
    interests:
      'A family trip with grandparents in their eighties. A gentle walk through the old town with a coffee stop would be ideal.',
  },
  {
    id: 'pt-2',
    sentAt: demoAt({ days: -7, hours: 4 }),
    language: 'de',
    email: 's.baumann@example.com',
    groupSize: 14,
    dateFrom: '2026-10-16',
    dateTo: '2026-10-17',
    interests:
      'Ausflug mit unserem Team. Gern Geschichte der Altstadt, zum Schluss ein Apéro.',
    answeredAt: demoAt({ days: -6, hours: -1 }),
  },
]
