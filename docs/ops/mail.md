# Mail

Mail goes over SMTP (architecture D12). A business command queues a `mail` job and a `notifications.sent_mail` row in its own transaction. Each mail goes to one plain address. A list, a display name or a header line in `to` is refused, and the command rolls back. An invitation mail's job holds the invitation id, never the link or its token. The worker builds the link when it sends (architecture section 8). The worker renders the template in the language stored with the job and sends it to the SMTP server that `SMTP_*` names. N01, N18 and N20 go out as text plus HTML (multipart/alternative, plain text first). The other templates are not built on the server yet. The code is in `api/src/modules/notifications/` and `api/src/platform/mail.ts`.

## Settings

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` and `SMTP_FROM`, described in `api/.env.example`. `SMTP_FROM_NAME` is optional and sets the sender's display name (default `Swiss Keepsakes`, plain text up to 80 characters, no angle brackets, quotes or line breaks). It is not one of the six, so setting it alone does not start the SMTP setting. Set all six or none. A partial setting stops startup and names the missing variables.
- With none set, the service still starts. The worker logs a warning with `"event":"mail.smtp-unset"`, and every mail fails with `ESMTPUNSET`, retries, and then raises the alert below. The service has no setting that tells production from development, so it cannot refuse to start without SMTP in production only.
- `SMTP_SECURE=true` uses TLS from the first byte (port 465). `SMTP_SECURE=false` upgrades with STARTTLS (port 587), and the service refuses a server that does not offer it, so the password never travels in clear.
- Local and staging use the owner's test SMTP account (Gmail). Gmail sends only from the signed-in account and limits daily sending, so it suits tests only. Production uses the store's own mail host, which is still open (Q15).

## The sign-in code mail (N01)

Better Auth queues N01 for each emailed sign-in code, in the language the SPA sent in `Accept-Language`, or English (`api/src/platform/auth.ts`). The request does not wait for SMTP. The job holds the plain code, because the worker renders it later. The job overrides the queue's retry policy so that no attempt starts after the code expired. It retries twice, 20 seconds apart, an attempt may run 60 seconds, a job still unsent after 300 seconds is dropped, and a finished job is deleted after 1 hour. A dropped job leaves its `sent_mail` row `queued`, which the stale list finds after 2 hours. The code itself is useless after 5 minutes. When an N01 mail fails for good, the `mail-failed` handler removes `params.code` from the job and from its dead-letter copy before it marks the row failed.

## Retries and the alert

- The `mail` queue retries a failed attempt 5 times with exponential backoff from 30 s. The last attempt runs about 15 to 30 minutes after the first.
- A failure that a retry cannot fix skips the retries and goes to the alert at once. These are an SMTP 5xx reply (RFC 5321), such as `EAUTH 535` or `EENVELOPE 550`, and `MailRenderError`. A 4xx reply, a lost connection and `ESMTPUNSET` retry.
- Each failed attempt adds 1 to `attempts` and sets `last_error` to the error code and the SMTP reply code, for example `EAUTH 535`. The job throws a `MailAttemptError` that holds only the same two values, so pg-boss's `output` and the dead-letter copy's `source_output` hold them too. The server's reply text is never stored, because it can quote the address.
- After the last attempt, or after a failure that skips the retries, pg-boss moves the job to the `mail-failed` queue. Its handler sets the row to `failed` and logs one error line with `"event":"mail.failed"`, the mail id, the template, the number of attempts and the last error. Until Sentry arrives (E2.9), that line is the alert. It never holds the address or the link.
- The `mail-failed` queue retries its handler 5 times with the same backoff. The handler only writes the row and logs, so it fails only while the database does. If it fails every time, no alert fires and the row stays `queued`. The stale list below finds it.

## The ops list

Mail that did not go out. A mail whose invitation the Owner revoked before it was sent is closed with `last_error = 'InvitationRevoked'`, raises no alert and is left out:

```sql
select id, store_id, template, language, recipient, attempts, last_error, queued_at, failed_at
from notifications.sent_mail
where status = 'failed'
  and last_error is distinct from 'InvitationRevoked'
order by failed_at desc;
```

Mail that is waiting or retrying has `status = 'queued'`. The `mail` retries and then the `mail-failed` retries take about an hour at most, so a mail still `queued` after 2 hours is stuck. The worker is down, or the `mail-failed` handler failed every time. Check the worker's log, then look for its jobs in `pgboss.job` by the mail id.

```sql
select id, store_id, template, attempts, last_error, queued_at
from notifications.sent_mail
where status = 'queued' and queued_at < now() - interval '2 hours'
order by queued_at;
```

The Super Admin resends the Owner invitation (N20) with `POST /api/admin/stores/{id}/owner-invitation/resend` (E2.3, UX R13). It queues a new N20 for the same invitation, starts its 7 days again and clears the old link. The Owner of a store resends a Store Manager invitation (N18) with `POST /api/store/{storeId}/member-invitations/{invitationId}/resend` (E2.4), with the same effect. Other failed mail has no resend command yet.

## Last errors

| `last_error` | Meaning | What to do |
| :-- | :-- | :-- |
| `ESMTPUNSET` | The worker runs without `SMTP_*` | Set all six and restart the worker |
| `EAUTH` with a code such as 535 | The server refused the user or the password. A 5xx code fails at once | Check `SMTP_USER` and `SMTP_PASSWORD`. For Gmail, use an app password |
| `ETLS` | No TLS. The server offers no STARTTLS, or `SMTP_SECURE` does not match the port | Use 465 with `true`, or 587 with `false` |
| `ECONNECTION`, `ETIMEDOUT` | The server cannot be reached | Check `SMTP_HOST` and `SMTP_PORT`. Retries cover a short outage |
| `EENVELOPE` with a code | The server refused the sender or the recipient. A 5xx code fails at once | Check the address in the row and `SMTP_FROM` |
| `MailRenderError` | The job's data lacks a template value, or the invitation is no longer open, so there is no link. It fails at once | Check whether the invitation was accepted or expired (a revoked one is closed without an alert). For an expired Owner invitation, resend it (above), which opens it again and queues a new mail. Otherwise it is a bug in the command that queued the mail |

## Duplicates

Each attempt locks the mail's `sent_mail` row from before the send until it records the result, and sends only a `queued` mail.

- Two runs of the same job never both send. The second waits for the lock, then finds the mail `sent` and stops.
- A mail recorded as `sent` is never sent again, and a mail marked `failed` after its alert is never sent and never turns `sent`.
- Not preventable. SMTP has no idempotency key. When the server accepted a message but the attempt never committed, the retry sends the message again with the same `Message-ID`, which is `<mail id@domain of SMTP_FROM>`. This happens when the reply was lost, when the worker crashed, or when a shutdown cut the attempt after the 10 s limit in `main.ts`. For an invitation the retry mints a new token, so the two messages carry different links and only the second works. A mailbox that drops the second message because it has the same `Message-ID`, as Gmail does, leaves the person with the dead link. Resend the invitation then: it queues a new mail with a new `Message-ID`.

## The HTML part

N01, N18 and N20 carry a branded HTML body besides the plain text. The words come from `packages/i18n` once, and both parts are built from them. `api/src/modules/notifications/application/mail-layout.ts` adds the layout: one column, a rounded white card on the paper-coloured page, the wordmark in the serif face with a Georgia fallback, in the navy of the logo (ivory in dark mode), the code in large bold, letter-spaced digits in the sans face (N01), and a centred button with the plain link under it (N18, N20). The button is red, the only red in the mail, and a bar of its own width, full width on a phone. The one mail-wide brand name is `brandName` in `render-mail.ts`. N01 also says in its footer why the mail arrived.

- **Inline styles and tables.** Gmail drops what is not inline and Outlook ignores most modern CSS, so Outlook gets a fixed 600 pixel wrapper in a conditional comment. The one `<style>` block only adds dark mode and narrow-screen padding. Without it the mail still reads, in the light colours.
- **No remote content.** No image, no web font, no tracking pixel, no script. Nothing is fetched when the mail opens.
- **Escaping.** Every value and every word of copy is escaped for HTML text and attributes. The text part carries values as typed. A link goes into an `href` only when it is an http(s) URL without spaces, quotes or angle brackets. Anything else raises `MailRenderError` and the mail fails at once.
- **Hidden characters.** Control, bidi and zero-width characters are stripped from every value before both parts are built, so a name cannot reorder or hide text. The length of an inviter or store name is not capped on the server.
- **Retries.** The text and the HTML of one mail are the same bytes on every attempt. Only an invitation's token, and so its link, changes (see Duplicates).
- **Dark mode.** A `color-scheme` meta and a `prefers-color-scheme` block with warm dark colours, not inverted ones. Clients that ignore it show the light version.

To preview, run `MAIL_PREVIEW_DIR=/tmp/opencode/mail-preview pnpm exec vitest run api/test/application/notifications/mail-preview.test.ts` from the repository root. It writes each template in EN and DE, with a long-name variant of the invitations, as an `.html` file in that folder. Open them in a browser, or screenshot them at 600 and 375 pixels wide.

## The live check

`pnpm --filter @sk/api test:smtp-live` sends N01 (with the fake code 000000), N18 and N20 in English and German through the SMTP adapter, with `SMTP_*` from the shell or `api/.env.local`. It sends only to the owner's test inbox, `tuananhngyen218@gmail.com`, and prints each `Message-ID` and the server's reply. `pnpm test`, `pnpm test:integration` and CI never run it.
