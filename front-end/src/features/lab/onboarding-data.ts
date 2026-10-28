/**
 * Lab data for the guest onboarding (N01): copy, the AC38-based story fixture, a lab-only
 * ranker (PRD §3.2) and the flow state. Design only: nothing here reads or writes
 * `sk.onboarding`.
 */
import { useState } from 'react'

export type Language = 'en' | 'de'
export type Segment = 'short-stay' | 'multi-day'
export type Interest
  = | 'history-culture'
    | 'food-drink'
    | 'lake-mountains'
    | 'shopping-keepsakes'
    | 'local-activities'
export type Phase = 'step1' | 'step2' | 'answered' | 'dismissed' | 'editing'
export type Page = 'home' | 'story'

export interface Answers {
  segment: Segment | null
  interests: Interest[]
}

export const segments: Segment[] = ['short-stay', 'multi-day']
export const interests: Interest[] = [
  'history-culture',
  'food-drink',
  'lake-mountains',
  'shopping-keepsakes',
  'local-activities',
]

export const segmentPhotos: Record<Segment, string> = {
  'short-stay': 'lucerne-swan',
  'multi-day': 'rigi-kaltbad',
}

/** Visitor-facing words. "short-stay" and "multi-day" stay internal. DE is a proposal. */
export const copy = {
  en: {
    intro: 'Two quick questions, so we can put the right things first.',
    stayQuestion: 'How long are you in Lucerne?',
    stay: {
      'short-stay': { label: 'Just today', hint: 'A few hours, often with a group' },
      'multi-day': { label: 'A few days', hint: 'One night or more' },
    },
    interestQuestion: 'What would you like to see?',
    interestHint: 'Pick one or more.',
    interests: {
      'history-culture': 'History and culture',
      'food-drink': 'Food and drink',
      'lake-mountains': 'Lake and mountains',
      'shopping-keepsakes': 'Shopping and keepsakes',
      'local-activities': 'Local activities',
    },
    skip: 'Skip',
    back: 'Back',
    close: 'Close',
    privacy: 'Your answers stay on this phone.',
    sortedFor: 'Sorted for',
    change: 'Change',
    newest: 'Newest first',
    personalise: 'Sort for my trip',
    yourTrip: 'Your trip',
    notSet: 'Not set yet',
    forget: 'Forget my answers',
    forYou: 'For you',
    listTitle: 'Stories and places',
    storyMore: 'More stories',
    readTime: 'min read',
    hello: 'Grüezi!',
    homeTitle: 'Stories from Lucerne',
    accountTitle: 'Account',
    signIn: 'Sign in',
    signInHint: 'To buy a keepsake or comment',
    languageRow: 'Language',
    languageValue: 'English',
    tabs: ['Explore', 'Keepsakes', 'Assistant', 'Tours', 'Account'],
  },
  de: {
    intro: 'Zwei kurze Fragen, damit wir das Passende zuerst zeigen.',
    stayQuestion: 'Wie lange sind Sie in Luzern?',
    stay: {
      'short-stay': { label: 'Nur heute', hint: 'Ein paar Stunden, oft mit einer Gruppe' },
      'multi-day': { label: 'Ein paar Tage', hint: 'Eine Nacht oder länger' },
    },
    interestQuestion: 'Was möchten Sie sehen?',
    interestHint: 'Wählen Sie eines oder mehrere.',
    interests: {
      'history-culture': 'Geschichte und Kultur',
      'food-drink': 'Essen und Trinken',
      'lake-mountains': 'See und Berge',
      'shopping-keepsakes': 'Shopping und Andenken',
      'local-activities': 'Lokale Aktivitäten',
    },
    skip: 'Überspringen',
    back: 'Zurück',
    close: 'Schliessen',
    privacy: 'Ihre Antworten bleiben auf diesem Handy.',
    sortedFor: 'Sortiert für',
    change: 'Ändern',
    newest: 'Neueste zuerst',
    personalise: 'Für meine Reise sortieren',
    yourTrip: 'Ihre Reise',
    notSet: 'Noch nicht festgelegt',
    forget: 'Antworten löschen',
    forYou: 'Für Sie',
    listTitle: 'Geschichten und Orte',
    storyMore: 'Weitere Geschichten',
    readTime: 'Min. Lesezeit',
    hello: 'Grüezi!',
    homeTitle: 'Geschichten aus Luzern',
    accountTitle: 'Konto',
    signIn: 'Anmelden',
    signInHint: 'Um ein Andenken zu kaufen oder zu kommentieren',
    languageRow: 'Sprache',
    languageValue: 'Deutsch',
    tabs: ['Entdecken', 'Andenken', 'Assistent', 'Touren', 'Konto'],
  },
}

interface Story {
  id: string
  photo: string
  title: Record<Language, string>
  kind: Record<Language, string>
  minutes: number
  stay: Segment | 'both'
  interests: Interest[]
  publishedAt: string
}

const restaurant = { en: 'Restaurant', de: 'Restaurant' }
const story = { en: 'Story', de: 'Geschichte' }

/** A to D are the four restaurants of AC38; E and F are tagged so that B stays last for short-stay. */
export const stories: Story[] = [
  {
    id: 'A',
    photo: 'kornmarkt',
    title: { en: 'Rösti on the Kornmarkt in twenty minutes', de: 'Rösti am Kornmarkt in zwanzig Minuten' },
    kind: restaurant,
    minutes: 3,
    stay: 'short-stay',
    interests: ['food-drink'],
    publishedAt: '2026-10-12',
  },
  {
    id: 'B',
    photo: 'old-swiss-house',
    title: { en: 'A long lunch at the Old Swiss House', de: 'Ein langes Mittagessen im Old Swiss House' },
    kind: restaurant,
    minutes: 5,
    stay: 'multi-day',
    interests: ['food-drink'],
    publishedAt: '2026-10-20',
  },
  {
    id: 'C',
    photo: 'weinmarkt',
    title: { en: 'Coffee on the Weinmarkt', de: 'Kaffee am Weinmarkt' },
    kind: restaurant,
    minutes: 2,
    stay: 'both',
    interests: [],
    publishedAt: '2026-10-24',
  },
  {
    id: 'D',
    photo: 'lucerne-water-tower',
    title: { en: 'A quick bite by the Water Tower', de: 'Ein schneller Happen beim Wasserturm' },
    kind: restaurant,
    minutes: 2,
    stay: 'short-stay',
    interests: [],
    publishedAt: '2026-10-16',
  },
  {
    id: 'E',
    photo: 'vx-chapel-bridge',
    title: { en: 'The paintings under the Chapel Bridge', de: 'Die Bilder unter der Kapellbrücke' },
    kind: story,
    minutes: 6,
    stay: 'both',
    interests: ['history-culture'],
    publishedAt: '2026-10-26',
  },
  {
    id: 'F',
    photo: 'rigi-kulm',
    title: { en: 'Sunrise from Rigi Kulm', de: 'Sonnenaufgang auf Rigi Kulm' },
    kind: story,
    minutes: 4,
    stay: 'both',
    interests: ['lake-mountains'],
    publishedAt: '2026-10-22',
  },
]

/**
 * PRD §3.2 for the lab only (the product will use `rankItems`): stay match, counting "both",
 * then the number of matching interests, then newest. No answers means newest first (O25).
 */
export function rankStories({ segment, interests: picked }: Answers): Story[] {
  const newest = [...stories].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  )
  const stayScore = (s: Story) =>
    segment && (s.stay === 'both' || s.stay === segment) ? 1 : 0
  const interestScore = (s: Story) =>
    s.interests.filter(i => picked.includes(i)).length

  return [...newest].sort(
    (a, b) => stayScore(b) - stayScore(a) || interestScore(b) - interestScore(a),
  )
}

export const noAnswers: Answers = { segment: null, interests: [] }
const returningAnswers: Answers = { segment: 'short-stay', interests: ['food-drink'] }

/** The onboarding's state. Local React state only. */
export function useOnboardingFlow() {
  const [phase, setPhase] = useState<Phase>('step1')
  const [answers, setAnswers] = useState<Answers>(noAnswers)
  const [version, setVersion] = useState(0)
  const hasAnswers = answers.segment !== null || answers.interests.length > 0

  return {
    phase,
    answers,
    version,
    hasAnswers,
    chooseSegment(segment: Segment) {
      setAnswers(a => ({ ...a, segment }))
      if (phase === 'step1')
        setPhase('step2')
    },
    toggleInterest(interest: Interest) {
      setAnswers(a => ({
        ...a,
        interests: a.interests.includes(interest)
          ? a.interests.filter(i => i !== interest)
          : [...a.interests, interest],
      }))
    },
    /** Done, close and skip all end here: closing counts as skipping (§3.1). */
    finish: () => setPhase(hasAnswers ? 'answered' : 'dismissed'),
    skipInterests() {
      setAnswers(a => ({ ...a, interests: [] }))
      setPhase(answers.segment ? 'answered' : 'dismissed')
    },
    edit: () => setPhase('editing'),
    forget() {
      setAnswers(noAnswers)
      setPhase('dismissed')
    },
    /** A new visitor: a first visit, or one who answered before. The list snaps, no animation. */
    reset(returning: boolean) {
      setPhase(returning ? 'answered' : 'step1')
      setAnswers(returning ? returningAnswers : noAnswers)
      setVersion(v => v + 1)
    },
  }
}

export type Flow = ReturnType<typeof useOnboardingFlow>

/** "Just today · Food and drink", or undefined with no answers. */
export function answerSummary(answers: Answers, language: Language) {
  const c = copy[language]
  const parts = [
    answers.segment && c.stay[answers.segment].label,
    ...answers.interests.map(i => c.interests[i]),
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' · ') : undefined
}
