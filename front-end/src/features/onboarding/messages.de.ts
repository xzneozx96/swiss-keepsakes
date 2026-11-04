import type { onboardingEn } from './messages'

/** German copy of the guest onboarding. Marked "proposal" in the design: Weiter, Mein Luzern zeigen, Speichern, the step text and N24. */
export const onboardingDe: Record<keyof typeof onboardingEn, string> = {
  'onboarding.back': 'Zurück',
  'onboarding.skip': 'Überspringen',
  'onboarding.close': 'Schliessen',
  'onboarding.step': '{step} von 2',
  'onboarding.progress': 'Frage {step} von 2',
  'onboarding.stay.title': 'Wie lange sind Sie in Luzern?',
  'onboarding.stay.subtitle': 'Zwei kurze Fragen, damit wir das Passende zuerst zeigen.',
  'onboarding.stay.short_stay.label': 'Nur heute',
  'onboarding.stay.short_stay.hint': 'Ein paar Stunden, oft mit einer Gruppe',
  'onboarding.stay.multi_day.label': 'Ein paar Tage',
  'onboarding.stay.multi_day.hint': 'Eine Nacht oder länger',
  'onboarding.stay.continue': 'Weiter',
  'onboarding.interests.title': 'Was möchten Sie sehen?',
  'onboarding.interests.subtitle': 'Wählen Sie eines oder mehrere.',
  'onboarding.interests.show': 'Mein Luzern zeigen',
  'onboarding.interests.save': 'Speichern',
  'onboarding.privacy': 'Ihre Antworten bleiben auf diesem Handy.',
  'onboarding.forget': 'Antworten löschen',
  'onboarding.nudge.title': 'Entdecken Sie, was Sie in Luzern begeistern wird',
  'onboarding.nudge.description': 'Erzählen Sie uns, was Sie lieben, und entdecken Sie Orte, die genau für Sie ausgewählt sind.',
  'onboarding.nudge.button': 'Meinen Besuch personalisieren',
  'onboarding.nudge.hide': 'Vorerst ausblenden',
  'onboarding.account.row': 'Ihre Reise',
  'onboarding.account.empty': 'Noch nicht festgelegt',
}
