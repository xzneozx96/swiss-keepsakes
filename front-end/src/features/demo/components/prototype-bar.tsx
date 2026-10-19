import type { Role } from '../types'
import type { Language } from '@/contexts/locale-context'

import {
  Button,
  Description,
  Drawer,
  Label,
  Radio,
  RadioGroup,
} from '@heroui/react'
// import { Link, useNavigate } from "@tanstack/react-router";
import { useNavigate } from '@tanstack/react-router'
import { lazy, Suspense, useState } from 'react'

import { PrototypeIcon, ResetIcon } from '@/components/icons'
import { useLocale } from '@/contexts/locale-context'

// import { ProposalsToggle } from "./proposal-mark";

// import { SignInDemoHint } from "@/features/auth/components/sign-in-demo-hint";
// import { CartDemoControl } from "@/features/cart/components/cart-demo-control";
// import { CheckoutDemoControl } from "@/features/checkout/components/checkout-demo-control";
import { MailPanel } from '@/features/notifications/components/mail-panel'
import { attributedPartnerId } from '@/features/partners/referral'
import { demoNow } from '../clock'
import { useDemo } from '../demo-store'
// import { PaymentDemoControl } from "@/features/payment/components/payment-demo-control";
// import { TourBookingDemoControl } from "@/features/tours/booking/booking-demo-control";
// import { TransactionsDemoControl } from "@/features/transactions/components/transactions-demo-control";
// import { OrderDetailDemoControl } from "@/features/transactions/order-detail/components/order-detail-demo-control";
// import { ToursDemoControl } from "@/features/tours/discovery/tours-demo-control";
// import { TourDemoControl } from "@/features/tours/merchant/tour-demo-control";

const QRCodeSVG = lazy(() =>
  import('qrcode.react').then(m => ({ default: m.QRCodeSVG })),
)

/**
 * Presenter controls, deliberately outside the product design: an ink strip with a
 * monospace "Prototype" label. Copy stays in English because it is not part of the product.
 */
const roles: {
  id: Role
  label: string
  detail: string
  home: '/' | '/store' | '/partner'
}[] = [
  {
    id: 'guest',
    label: 'Guest',
    detail: 'Anna Keller, browsing the shop',
    home: '/',
  },
  {
    id: 'owner',
    label: 'Merchant · Owner',
    detail: 'Sonja',
    home: '/store',
  },
  {
    id: 'manager',
    label: 'Merchant · Store Manager',
    detail: 'Lukas',
    home: '/store',
  },
  {
    id: 'partner',
    label: 'Partner',
    detail: 'Hotel am See, commission report',
    home: '/partner',
  },
]

const languages: { id: Language, label: string }[] = [
  { id: 'en', label: 'EN' },
  { id: 'de', label: 'DE' },
]

export function PrototypeBar() {
  const { state, setRole, reset } = useDemo()
  const partners = state.data.partners
  const { language, setLanguage } = useLocale()
  const navigate = useNavigate()
  const current = roles.find(r => r.id === state.role) ?? roles[0]
  const [open, setOpen] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)

  const chooseRole = (value: string) => {
    const next = roles.find(r => r.id === value)

    if (!next)
      return
    setRole(next.id)
    setOpen(false)
    void navigate({ to: next.home })
  }

  // Arriving through a partner QR records a visit; arriving directly keeps any source
  // still inside its 30 days (PRD §10.1). A demo with no source starts from Reset.
  const arrive = (code: string | null) => {
    setRole('guest')
    setOpen(false)
    setQrCode(null)
    if (code)
      void navigate({ to: '/r/$code', params: { code } })
    else void navigate({ to: '/' })
  }

  const sourceId = attributedPartnerId(
    state.data.referralVisits,
    demoNow(state.clockStartedAt),
  )
  // Hash routing, so the scannable link is this deployment's origin plus #/r/{code}.
  const qrUrl = (code: string) =>
    `${window.location.origin}${window.location.pathname}#/r/${code}`
  const qrPartner = partners.find(p => p.code === qrCode)

  const sourceName
    = partners.find(p => p.id === sourceId)?.name ?? 'none (direct)'

  return (
    <div
      aria-label="Prototype controls"
      className="flex items-center gap-2 bg-foreground px-4 py-1.5 pt-[calc(env(safe-area-inset-top,0px)+6px)] text-xs text-white"
      role="region"
    >
      <span className="flex shrink-0 items-center gap-1.5 font-mono tracking-wide uppercase opacity-80">
        <PrototypeIcon size={14} />
        Prototype
      </span>

      <Drawer isOpen={open} onOpenChange={setOpen}>
        <Button
          className="ms-auto h-7 min-w-0 rounded-full bg-white/12 px-3 text-xs text-white"
          size="sm"
          variant="ghost"
        >
          <span className="truncate">{current.label}</span>
        </Button>
        <Drawer.Backdrop>
          <Drawer.Content placement="bottom">
            <Drawer.Dialog>
              <Drawer.Handle />
              <Drawer.Header>
                <Drawer.Heading>Prototype controls</Drawer.Heading>
              </Drawer.Header>
              <Drawer.Body className="flex flex-col gap-6">
                <RadioGroup
                  name="role"
                  value={state.role}
                  onChange={chooseRole}
                >
                  <Label>View as</Label>
                  {roles.map(role => (
                    <Radio key={role.id} value={role.id}>
                      <Radio.Content>
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                        {role.label}
                      </Radio.Content>
                      <Description>{role.detail}</Description>
                    </Radio>
                  ))}
                </RadioGroup>
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">Arrive as a guest</p>
                  <div className="flex flex-wrap gap-2">
                    {partners.map(p => (
                      <Button
                        key={p.id}
                        size="sm"
                        variant={qrCode === p.code ? 'secondary' : 'tertiary'}
                        onPress={() =>
                          setQrCode(qrCode === p.code ? null : p.code)}
                      >
                        Via {p.name} QR
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="tertiary"
                      onPress={() => arrive(null)}
                    >
                      Directly
                    </Button>
                  </div>
                  {qrPartner && (
                    <div className="flex flex-col items-center gap-3 rounded-3xl bg-white p-4 text-center">
                      <Suspense
                        fallback={
                          <div className="aspect-square w-full max-w-56" />
                        }
                      >
                        <QRCodeSVG
                          aria-label={`QR code for ${qrPartner.name}`}
                          className="h-auto w-full max-w-56"
                          level="M"
                          marginSize={2}
                          size={224}
                          value={qrUrl(qrPartner.code)}
                        />
                      </Suspense>
                      <p className="max-w-full text-xs break-all text-muted">
                        {qrUrl(qrPartner.code)}
                      </p>
                      <Button
                        size="sm"
                        variant="tertiary"
                        onPress={() => arrive(qrPartner.code)}
                      >
                        Open on this device
                      </Button>
                    </div>
                  )}
                  <p className="text-sm text-muted">
                    Source for the next order (last click within 30 days):{' '}
                    {sourceName}
                  </p>
                </div>
                {/* Hidden for the client demo: only the role and QR sections show.
                <p className="text-sm text-muted">
                  Sample photos are credited on the{" "}
                  <Link
                    className="underline underline-offset-4"
                    to="/credits"
                    onClick={() => setOpen(false)}
                  >
                    photo credits page
                  </Link>
                  .
                </p>
                <CartDemoControl onDone={() => setOpen(false)} />
                <CheckoutDemoControl onDone={() => setOpen(false)} />
                <TransactionsDemoControl onDone={() => setOpen(false)} />
                <OrderDetailDemoControl onDone={() => setOpen(false)} />
                <PaymentDemoControl onDone={() => setOpen(false)} />
                <TourBookingDemoControl onDone={() => setOpen(false)} />
                <ToursDemoControl onDone={() => setOpen(false)} />
                <TourDemoControl onDone={() => setOpen(false)} />
                <ProposalsToggle />
                <SignInDemoHint />
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium">Demo data</p>
                  <p className="text-sm text-muted">
                    Everything you do is kept in this browser. Reset restores
                    the sample orders and restarts the demo clock at 13.10.2026,
                    10:00.
                  </p>
                </div>
                */}
              </Drawer.Body>
              <Drawer.Footer>
                <Button slot="close" variant="tertiary">
                  Close
                </Button>
                <Button slot="close" variant="secondary" onPress={reset}>
                  <ResetIcon size={20} />
                  Reset demo
                </Button>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>

      <MailPanel />

      <div
        aria-label="Language"
        className="flex rounded-full bg-white/12 p-0.5"
        role="group"
      >
        {languages.map(l => (
          <button
            key={l.id}
            aria-pressed={language === l.id}
            className={`h-6 rounded-full px-2.5 font-medium outline-none focus-visible:ring-2 focus-visible:ring-white ${
              language === l.id ? 'bg-white text-foreground' : 'text-white/80'
            }`}
            type="button"
            onClick={() => setLanguage(l.id)}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}
