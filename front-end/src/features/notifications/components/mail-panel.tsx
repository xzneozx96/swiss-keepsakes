import { Button, Drawer, Tabs } from '@heroui/react'
import { lazy, Suspense, useState } from 'react'

import { EmailIcon } from '@/components/icons'
import { useDemo } from '@/features/demo'

const MailList = lazy(() =>
  import('./mail-list').then(module => ({ default: module.MailList })),
)

/**
 * Prototype Mail panel (outline §3): emails are never sent; each one the demo "sends"
 * is listed here per recipient, rendered in the recipient's language. Presenter chrome
 * stays in English like the rest of the prototype bar; the emails themselves do not.
 */
export function MailPanel() {
  const { state } = useDemo()
  const [open, setOpen] = useState(false)
  const mail = state.data.mail
  const guestMail = mail.filter(m => m.to === 'guest').reverse()
  const staffMail = mail.filter(m => m.to === 'staff').reverse()
  const partnerMail = mail.filter(m => m.to === 'partner').reverse()

  return (
    <Drawer isOpen={open} onOpenChange={setOpen}>
      <Button
        aria-label={`Mail, ${mail.length} emails`}
        className="h-7 min-w-0 shrink-0 gap-1 rounded-full bg-white/12 px-2 text-xs text-white"
        size="sm"
        variant="ghost"
      >
        {/* Icon and count only: the bar has no room for a word at 375px with a merchant role. */}
        <EmailIcon size={16} />
        {mail.length > 0 && (
          <span className="rounded-full bg-white px-1.5 text-[10px] leading-4 font-semibold text-foreground tabular-nums">
            {mail.length}
          </span>
        )}
      </Button>
      <Drawer.Backdrop>
        <Drawer.Content className="mx-auto max-w-[480px]" placement="bottom">
          <Drawer.Dialog className="flex h-[85dvh] flex-col">
            <Drawer.Handle />
            <Drawer.Header className="flex items-center justify-between">
              <Drawer.Heading>Mail (prototype)</Drawer.Heading>
              <Drawer.CloseTrigger aria-label="Close mail" />
            </Drawer.Header>
            <Drawer.Body className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+24px)] text-foreground">
              <p className="text-sm text-muted">
                Emails are not sent in the prototype. Each one appears here, in
                the recipient’s language, newest first.
              </p>
              <Suspense fallback={null}>
                <Tabs className="w-full">
                  <Tabs.ListContainer>
                    <Tabs.List aria-label="Recipient">
                      <Tabs.Tab id="guest">
                        Guest (
                        {guestMail.length}
                        )
                        <Tabs.Indicator />
                      </Tabs.Tab>
                      <Tabs.Tab id="staff">
                        Staff (
                        {staffMail.length}
                        )
                        <Tabs.Indicator />
                      </Tabs.Tab>
                      <Tabs.Tab id="partner">
                        Partner (
                        {partnerMail.length}
                        )
                        <Tabs.Indicator />
                      </Tabs.Tab>
                    </Tabs.List>
                  </Tabs.ListContainer>
                  <Tabs.Panel className="pt-3" id="guest">
                    <MailList items={guestMail} />
                  </Tabs.Panel>
                  <Tabs.Panel className="pt-3" id="staff">
                    <MailList
                      items={staffMail}
                      onOpenLink={() => setOpen(false)}
                    />
                  </Tabs.Panel>
                  <Tabs.Panel className="pt-3" id="partner">
                    <MailList items={partnerMail} />
                  </Tabs.Panel>
                </Tabs>
              </Suspense>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  )
}
