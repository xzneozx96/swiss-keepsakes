# Mail

Mail goes over SMTP (architecture D12). A business command queues a `mail` job and a `notifications.sent_mail` row in its own transaction. Each mail goes to one plain address: a list, a display name or a header line in `to` is refused, and the command rolls back. An invitation mail's job holds the invitation id, never the link or its token. The worker builds the link when it sends (architecture section 8). The worker renders the template in the language stored with the job and sends it to the SMTP server that `SMTP_*` names. The code is in `api/src/modules/notifications/` and `api/src/platform/mail.ts`.

## Settings

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` and `SMTP_FROM`, described in `api/.env.example`. Set all six or none. A partial setting stops startup and names the missing variables.
- With none set, the service still starts. The worker logs a warning with `"event":"mail.smtp-unset"`, and every mail fails with `ESMTPUNSET`, retries, and then raises the alert below. The service has no setting that tells production from development, so it cannot refuse to start without SMTP in production only.
- `SMTP_SECURE=true` uses TLS from the first byte (port 465). `SMTP_SECURE=false` upgrades with STARTTLS (port 587), and the service refuses a server that does not offer it, so the password never travels in clear.
- Local and staging use the owner's test SMTP account (Gmail). Gmail sends only from the signed-in account and limits daily sending, so it suits tests only. Production uses the store's own mail host, which is still open (Q15).

## Retries and the alert

- The `mail` queue retries a failed attempt 5 times with exponential backoff from 30 s. The last attempt runs about 15 to 30 minutes after the first.
- A failure that a retry cannot fix skips the retries and goes to the alert at once. These are an SMTP 5xx reply (RFC 5321), such as `EAUTH 535` or `EENVELOPE 550`, and `MailRenderError`. A 4xx reply, a lost connection and `ESMTPUNSET` retry.
- Each failed attempt adds 1 to `attempts` and sets `last_error` to the error code and the SMTP reply code, for example `EAUTH 535`. The job throws a `MailAttemptError` that holds only the same two values, so pg-boss's `output` and the dead-letter copy's `source_output` hold them too. The server's reply text is never stored, because it can quote the address.
- After the last attempt, or after a failure that skips the retries, pg-boss moves the job to the `mail-failed` queue. Its handler sets the row to `failed` and logs one error line with `"event":"mail.failed"`, the mail id, the template, the number of attempts and the last error. Until Sentry arrives (E2.9), that line is the alert. It never holds the address or the link.

## The ops list

Mail that did not go out:

```sql
select id, store_id, template, language, recipient, attempts, last_error, queued_at, failed_at
from notifications.sent_mail
where status = 'failed'
order by failed_at desc;
```

Mail that is waiting or retrying has `status = 'queued'`.

There is no resend command yet. UX R13 lets the Owner send an invitation again, and E2.3 and E2.4 build the invitations (N20, N18).

## Last errors

| `last_error` | Meaning | What to do |
| :-- | :-- | :-- |
| `ESMTPUNSET` | The worker runs without `SMTP_*` | Set all six and restart the worker |
| `EAUTH` with a code such as 535 | The server refused the user or the password. A 5xx code fails at once | Check `SMTP_USER` and `SMTP_PASSWORD`. For Gmail, use an app password |
| `ETLS` | No TLS. The server offers no STARTTLS, or `SMTP_SECURE` does not match the port | Use 465 with `true`, or 587 with `false` |
| `ECONNECTION`, `ETIMEDOUT` | The server cannot be reached | Check `SMTP_HOST` and `SMTP_PORT`. Retries cover a short outage |
| `EENVELOPE` with a code | The server refused the sender or the recipient. A 5xx code fails at once | Check the address in the row and `SMTP_FROM` |
| `MailRenderError` | The job's data lacks a template value, or the invitation is no longer open, so there is no link. It fails at once | Check whether the invitation was accepted, revoked or expired. Otherwise it is a bug in the command that queued the mail |

## Duplicates

Each attempt locks the mail's `sent_mail` row from before the send until it records the result, and sends only a `queued` mail.

- Two runs of the same job never both send. The second waits for the lock, then finds the mail `sent` and stops.
- A mail recorded as `sent` is never sent again, and a mail marked `failed` after its alert is never sent and never turns `sent`.
- Not preventable. SMTP has no idempotency key. When the server accepted a message but the attempt never committed, the retry sends the message again with the same `Message-ID`, which is `<mail id@domain of SMTP_FROM>`. This happens when the reply was lost, when the worker crashed, or when a shutdown cut the attempt after the 10 s limit in `main.ts`.

## The live check

`pnpm --filter @sk/api test:smtp-live` sends N18 and N20 in English and German through the SMTP adapter, with `SMTP_*` from the shell or `api/.env.local`. It sends only to the owner's test inbox, `tuananhngyen218@gmail.com`, and prints each `Message-ID` and the server's reply. `pnpm test`, `pnpm test:integration` and CI never run it.
