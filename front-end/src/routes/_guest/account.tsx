import type { AccountSection } from '@/features/account/lib/sections'
import type { MessageKey } from '@/i18n/en'

import { createFileRoute } from '@tanstack/react-router'

import { useLocale } from '@/contexts/locale-context'
import { useGuests } from '@/features/account/api/queries'
import { AccountHub } from '@/features/account/components/account-hub'
import { AccountScreen } from '@/features/account/components/account-screen'
import { EditProfile } from '@/features/account/components/edit-profile'
import { NotificationsPanel } from '@/features/account/components/notifications-panel'
import { PaymentsPanel } from '@/features/account/components/payments-panel'
import { ProfilePanel } from '@/features/account/components/profile-panel'
import { accountSections } from '@/features/account/lib/sections'
import { SignInPrompt } from '@/features/auth/components/account-profile'
import { useRequireSignIn } from '@/features/auth/hooks/use-require-sign-in'
import { useSignOut } from '@/features/auth/hooks/use-sign-out'
import { useDemoSelector } from '@/features/demo'
import { TransactionList } from '@/features/transactions/components/transaction-list'

// Account tab: signed-out prompt opens C05 (step 1.6); signed in, the settings-style hub (1.12s)
// whose rows drill into sub-screens kept in `?tab=`. The 1.12r tab values are sub-screens now,
// so /account?tab=payments and the tour flow's ?tab=bookings still land on that content.
export const Route = createFileRoute('/_guest/account')({
  // `tab: undefined` (not `{}`) drops an unknown value: the root route passes raw search params
  // through, so an omitted key would keep it.
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: AccountSection } => ({
    tab: accountSections.includes(search.tab as AccountSection)
      ? (search.tab as AccountSection)
      : undefined,
  }),
  component: AccountPage,
})

const sectionTitle: Record<AccountSection, MessageKey> = {
  orders: 'account.section.orders',
  bookings: 'account.section.bookings',
  payments: 'account.section.payments',
  profile: 'account.section.profile',
  notifications: 'account.section.notifications',
  edit: 'account.editProfile',
}

function AccountPage() {
  const { t } = useLocale()
  const { signOut, pending: signingOut } = useSignOut()
  const guests = useGuests()
  const signedInGuestId = useDemoSelector(s => s.data.signedInGuestId)
  const { tab } = Route.useSearch()
  const { requireSignIn } = useRequireSignIn()
  const guest = guests.find(g => g.id === signedInGuestId)

  if (!guest) {
    return (
      <div className="flex flex-col gap-8 px-4 pt-[calc(env(safe-area-inset-top,0px)+24px)]">
        <h1 className="font-serif text-display">{t('auth.account.title')}</h1>
        {/* Opens the C05 screen (1.6r) and comes back to the same account screen. */}
        <SignInPrompt
          onSignIn={() =>
            requireSignIn(undefined, tab ? `/account?tab=${tab}` : '/account')}
        />
      </div>
    )
  }

  if (!tab) {
    return (
      <AccountHub
        guest={guest}
        signingOut={signingOut}
        onSignOut={signOut}
      />
    )
  }

  return (
    <AccountScreen title={t(sectionTitle[tab])}>
      {tab === 'orders' && <TransactionList />}
      {tab === 'payments' && <PaymentsPanel />}
      {tab === 'profile' && <ProfilePanel />}
      {tab === 'notifications' && (
        <NotificationsPanel email={guest.email} guestId={guest.id} />
      )}
      {tab === 'edit' && <EditProfile guest={guest} />}
    </AccountScreen>
  )
}
