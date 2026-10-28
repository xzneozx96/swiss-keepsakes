/**
 * Lab data for the full-screen guest onboarding (N01, F1 chosen 28.10.2026) and the deep-link
 * nudge (N24, the top card while reading): extra copy and the visitor scenarios of the rule
 * matrix. Builds on `onboarding-data.ts`. Design only: nothing is stored.
 */
import type { Flow, Language } from '@/features/lab/onboarding-data'

import { interests } from '@/features/lab/onboarding-data'

export type Step = 1 | 2

/** How the flow ends. `finish` keeps what is answered; with nothing answered it counts as skipped. */
export type EndAction = 'finish' | 'skip-interests' | 'forget'

/**
 * What the × and Escape mean (and Skip on step 2): on step 1 they end the flow with nothing
 * saved (the stay is only saved by Continue); on step 2 of a first run they keep the stay and
 * drop the interests; when changing answers they keep what was already changed.
 */
export function closeAction(step: Step, editing: boolean): EndAction {
  return step === 2 && !editing ? 'skip-interests' : 'finish'
}

/** Brings the flow's interests in line with the keys a multi-select TagGroup reports. */
export function applyInterests(flow: Flow, keys: string[]) {
  for (const interest of interests) {
    if (keys.includes(interest) !== flow.answers.interests.includes(interest))
      flow.toggleInterest(interest)
  }
}

export type Scenario = 'home' | 'story' | 'qr' | 'returning' | 'staff'

/** Lab switcher: who arrives where, and what they should see. English only, like the lab chrome. */
export const scenarios: { id: Scenario, label: string, expect: string }[] = [
  {
    id: 'home',
    label: 'Guest, first visit, opens the home',
    expect: 'The full-screen flow covers the app, tab bar included. Skip on step 1 moves on to step 2 without saving a stay; the × or Escape closes the flow with nothing saved. On step 2, Skip, × and Escape close it and keep the stay. Any close is final: the flow never returns by itself.',
  },
  {
    id: 'story',
    label: 'Guest, first visit, from a story link',
    expect: 'The story shows at once. Once the first paragraph has scrolled away, a card drops in at the top; it tucks away as the guest reads on and comes back on scroll up, and never moves the text. Its × or Escape hides it for this visit. Hiding it is not a skip: the full-screen flow still comes the first time the guest taps Explore. Only closing the full-screen flow is final.',
  },
  {
    id: 'qr',
    label: 'Guest, first visit, from a partner QR code',
    expect: 'Same as a story link: the page the QR code opens shows at once, with the card while reading. Pages without a first paragraph (map pin, keepsake, short pages) never show the banner.',
  },
  {
    id: 'returning',
    label: 'Guest who answered before',
    expect: 'Nothing interrupts. The list is already sorted; “Change” and Account → Your trip reopen the flow, pre-filled. Close keeps what was changed.',
  },
  {
    id: 'staff',
    label: 'Signed-in merchant or partner',
    expect: 'Never sees the flow, the card or the sorted line (also true on /store, /partner, /admin, /sign-in, /invitation).',
  },
]

/** Copy the full-screen flow and the nudge add to `copy` in `onboarding-data.ts`. All DE here is a proposal. */
export const fsCopy = {
  en: {
    continue: 'Continue',
    show: 'Show my Lucerne',
    save: 'Save',
    stepOf: (step: number) => `${step} of 2`,
    nudgeTitle: 'Find what you’ll love in Lucerne',
    nudgeBody: 'Tell us a little about what you love, and discover places and stories picked just for you.',
    nudgeStart: 'Personalize my visit',
    nudgeHide: 'Hide for now',
  },
  de: {
    continue: 'Weiter',
    show: 'Mein Luzern zeigen',
    save: 'Speichern',
    stepOf: (step: number) => `${step} von 2`,
    nudgeTitle: 'Entdecken Sie, was Sie in Luzern begeistern wird',
    nudgeBody: 'Erzählen Sie uns ein wenig von Ihren Vorlieben und entdecken Sie Orte und Geschichten, die genau für Sie ausgewählt sind.',
    nudgeStart: 'Meinen Besuch personalisieren',
    nudgeHide: 'Vorerst ausblenden',
  },
}

/** Props of the flow's screens, rendered inside the stage's dialog. */
export interface ScreensProps {
  flow: Flow
  language: Language
  step: Step
  setStep: (step: Step) => void
  /** Pre-filled "change my answers" run, opened from the reopen entry. */
  editing: boolean
  /** Id for the step heading: it labels the dialog and takes focus on every step. */
  titleId: string
  end: (action: EndAction) => void
}
