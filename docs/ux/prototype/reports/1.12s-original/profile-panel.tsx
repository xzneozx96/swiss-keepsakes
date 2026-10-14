import type { Language } from "@/contexts/locale-context";
import type { Guest } from "@/features/orders/types";

import {
  Button,
  Drawer,
  FieldError,
  Input,
  Label,
  Radio,
  RadioGroup,
  TextField,
} from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { ChevronRightIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { TripProfile } from "@/features/checkout/components/trip-profile";
import { useTripProfile } from "@/features/checkout/hooks/use-trip-profile";
import { useDemo } from "@/features/demo";
import { renderMail } from "@/features/notifications/components/render-mail";
import { formatOrderDateTime } from "@/features/orders/lib/format";

const languages: Language[] = ["en", "de"];

/** Profile: personal details, app language, trip profile (R09, editable here) and recent emails. */
export function ProfilePanel({ guest }: { guest: Guest }) {
  const { t, language, setLanguage } = useLocale();
  const trip = useTripProfile();
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col gap-8">
      <section
        aria-labelledby="profile-details"
        className="flex flex-col gap-1"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-heading" id="profile-details">
            {t("account.profile.details.title")}
          </h2>
          <Button size="sm" variant="tertiary" onPress={() => setEditing(true)}>
            {t("account.profile.edit")}
          </Button>
        </div>
        <dl className="flex flex-col divide-y divide-separator">
          <div className="flex flex-col gap-0.5 py-3">
            <dt className="text-sm text-muted">{t("account.profile.name")}</dt>
            <dd className="font-medium">{guest.name}</dd>
          </div>
          <div className="flex flex-col gap-0.5 py-3">
            <dt className="text-sm text-muted">{t("account.profile.email")}</dt>
            <dd className="font-medium break-all">{guest.email}</dd>
            <dd className="text-sm text-muted">
              {t("account.profile.emailHint")}
            </dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="profile-language"
        className="flex flex-col gap-3"
      >
        <h2 className="text-heading" id="profile-language">
          {t("account.profile.language.title")}
        </h2>
        <RadioGroup
          aria-labelledby="profile-language"
          value={language}
          onChange={(v) => setLanguage(v as Language)}
        >
          {languages.map((l) => (
            <Radio key={l} lang={l} value={l}>
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                {t(`account.profile.language.${l}`)}
              </Radio.Content>
            </Radio>
          ))}
        </RadioGroup>
        <p className="text-sm text-muted">
          {t("account.profile.language.hint")}
        </p>
      </section>

      <TripProfile
        answers={trip.answers}
        skippedText={t("account.profile.trip.notAnswered")}
        status={trip.status === "answered" ? "answered" : "skipped"}
        onSave={trip.save}
        onSkip={trip.skip}
      />

      <RecentMail guestId={guest.id} />

      {editing && <NameSheet guest={guest} onClose={() => setEditing(false)} />}
    </div>
  );
}

/** The last emails the prototype sent this guest; each opens the order it is about. */
function RecentMail({ guestId }: { guestId: string }) {
  const { t, intlLocale } = useLocale();
  const { state } = useDemo();
  const mails = state.data.mail
    .filter((m) => m.to === "guest" && m.guestId === guestId)
    .slice(-3)
    .reverse();

  return (
    <section aria-labelledby="profile-mail" className="flex flex-col gap-1">
      <h2 className="text-heading" id="profile-mail">
        {t("account.profile.mail.title")}
      </h2>
      <p className="text-sm text-muted">{t("account.profile.mail.hint")}</p>
      {mails.length === 0 ? (
        <p className="py-3 text-sm text-muted">
          {t("account.profile.mail.none")}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-separator">
          {mails.map((mail) => {
            const body = (
              <>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium" lang={mail.language}>
                    {renderMail(mail).subject}
                  </span>
                  <span className="text-sm text-muted tabular-nums">
                    {formatOrderDateTime(mail.at, intlLocale)}
                  </span>
                </span>
                {mail.orderId && (
                  <ChevronRightIcon
                    aria-hidden
                    className="shrink-0 text-muted"
                    size={20}
                  />
                )}
              </>
            );

            return (
              <li key={mail.id}>
                {mail.orderId ? (
                  <Link
                    className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-3 outline-none focus-visible:focus-ring"
                    params={{ orderId: mail.orderId }}
                    to="/account/orders/$orderId"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 py-3">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Edit the name in a bottom sheet (decision: sheets, not new screens). The demo store keeps it. */
function NameSheet({ guest, onClose }: { guest: Guest; onClose: () => void }) {
  const { t } = useLocale();
  const { update } = useDemo();
  const [name, setName] = useState(guest.name);
  const invalid = name.trim().length === 0;

  const save = () => {
    update((s) => ({
      ...s,
      data: {
        ...s.data,
        guests: s.data.guests.map((g) =>
          g.id === guest.id ? { ...g, name: name.trim() } : g,
        ),
      },
    }));
    onClose();
  };

  return (
    <Drawer.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
      <Drawer.Content className="mx-auto max-w-[430px]" placement="bottom">
        <Drawer.Dialog className="flex max-h-[92dvh] flex-col">
          <Drawer.Handle />
          <Drawer.Header className="flex items-center justify-between">
            <Drawer.Heading className="text-title">
              {t("account.profile.sheet.title")}
            </Drawer.Heading>
            <Drawer.CloseTrigger
              aria-label={t("account.profile.sheet.close")}
            />
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
            <form
              className="flex flex-col gap-4"
              id="name-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!invalid) save();
              }}
            >
              <TextField
                fullWidth
                autoComplete="name"
                isInvalid={invalid}
                name="name"
                value={name}
                onChange={setName}
              >
                <Label>{t("account.profile.name")}</Label>
                <Input />
                <FieldError>
                  {t("account.profile.sheet.nameRequired")}
                </FieldError>
              </TextField>
            </form>
          </Drawer.Body>
          <Drawer.Footer className="flex flex-col gap-2 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
            <Button
              fullWidth
              className="h-14 text-base"
              form="name-form"
              isDisabled={invalid}
              type="submit"
            >
              {t("account.profile.sheet.save")}
            </Button>
            <Button fullWidth variant="tertiary" onPress={onClose}>
              {t("account.profile.sheet.cancel")}
            </Button>
          </Drawer.Footer>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
