/**
 * Copy of the guest onboarding: N01, the two-step flow, and the N24 card and Account row of T-E4.5b. The interest
 * labels are the `places.interest.*` keys. German review by the merchant is still open (docs/ux/onboarding-design.md §4).
 */
export const onboardingEn = {
  'onboarding.back': 'Back',
  'onboarding.skip': 'Skip',
  'onboarding.close': 'Close',
  'onboarding.step': '{step} of 2',
  'onboarding.progress': 'Question {step} of 2',
  'onboarding.stay.title': 'How long are you in Lucerne?',
  'onboarding.stay.subtitle': 'Two quick questions, so we can put the right things first.',
  'onboarding.stay.short_stay.label': 'Just today',
  'onboarding.stay.short_stay.hint': 'A few hours, often with a group',
  'onboarding.stay.multi_day.label': 'A few days',
  'onboarding.stay.multi_day.hint': 'One night or more',
  'onboarding.stay.continue': 'Continue',
  'onboarding.interests.title': 'What would you like to see?',
  'onboarding.interests.subtitle': 'Pick one or more.',
  'onboarding.interests.show': 'Show my Lucerne',
  'onboarding.interests.save': 'Save',
  'onboarding.privacy': 'Your answers stay on this phone.',
  'onboarding.forget': 'Forget my answers',
  'onboarding.nudge.title': 'Find what you’ll love in Lucerne',
  'onboarding.nudge.description': 'Tell us about what you love, and discover places picked just for you.',
  'onboarding.nudge.button': 'Personalize my visit',
  'onboarding.nudge.hide': 'Hide for now',
  'onboarding.account.row': 'Your trip',
  'onboarding.account.empty': 'Not set yet',
} as const
