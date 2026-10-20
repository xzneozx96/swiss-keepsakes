import type { MailKey } from './en.ts'

/** German email copy as used in Switzerland: "ss", never "ß". */
export const mailDe: Record<MailKey, string> = {
  'mail.greeting': 'Grüezi',
  'mail.N19.subject': 'Ihr Code für den Provisionsbericht von {shop}: {code}',
  'mail.N19.greeting': 'Guten Tag {partner}',
  'mail.N19.code':
    'Ihr Code für den Provisionsbericht von {shop} lautet {code}.',
  'mail.N19.ignore':
    'Wenn Sie den Berichtslink nicht geöffnet haben, können Sie diese E-Mail ignorieren. Ohne diesen Code kann niemand Ihren Bericht öffnen.',
  'mail.N01.subject': 'Ihr Anmeldecode für {shop}: {code}',
  'mail.N01.code': 'Ihr Anmeldecode lautet {code}.',
  'mail.N01.expiry':
    'Geben Sie ihn im Anmeldefenster ein. Er ist 5 Minuten gültig.',
  'mail.N01.ignore':
    'Wenn Sie sich nicht anmelden wollten, können Sie diese E-Mail ignorieren.',
  'mail.pickup': 'Abholung: {pickupDate} in {place}.',
  'mail.N02.subject': 'Wir haben Ihre Anfrage {orderRef} erhalten',
  'mail.N02.request':
    'Ihre Anfrage {orderRef} liegt beim Laden. Gewünschte Abholung: {pickupDate} in {place}.',
  'mail.N02.noPayment': 'Es wurde nichts belastet.',
  'mail.N02.status':
    'Status: Wartet auf Bestätigung des Ladens. Wir schreiben Ihnen, sobald der Laden antwortet.',
  'mail.N03.subject': 'Neue Andenken-Anfrage {orderRef}',
  'mail.N03.new':
    'Ein Gast hat eine neue Andenken-Anfrage gesendet: {orderRef}.',
  'mail.N03.action':
    'Öffnen Sie sie unter Bestellungen, um sie anzunehmen, Datum oder Ort zu ändern oder abzulehnen.',
  'mail.N04.subject':
    '{orderRef} angenommen: Bitte bis {dueAt} {amount} bezahlen',
  'mail.N04.accepted':
    'Gute Nachricht: Der Laden hat Ihre Bestellung {orderRef} angenommen.',
  'mail.N04.pay': 'Bitte bezahlen Sie {amount} bis {dueAt}.',
  'mail.N04.warning':
    'Ist bis dahin nicht bezahlt, wird die Bestellung automatisch storniert.',
  'mail.N04.action': 'Jetzt bezahlen: Bestellung unter Konto öffnen.',
  'mail.N05.subject': '{orderRef} angenommen: Jetzt nichts zu bezahlen',
  'mail.N05.pay':
    'Jetzt nichts zu bezahlen. Bitte bezahlen Sie {amount} bis {dueDate}.',
  'mail.N06.subject': 'Der Laden konnte {orderRef} nicht annehmen',
  'mail.N06.declined':
    'Leider hat der Laden Ihre Bestellung {orderRef} abgelehnt.',
  'mail.N06.reason': 'Grund: {reason}',
  'mail.N06.others': 'Ihre anderen Bestellungen sind davon nicht betroffen.',
  'mail.N07.subject': 'Quittung für {orderRef}: {amount} bezahlt',
  'mail.N07.seller': 'Verkäufer: {seller}',
  'mail.N07.paid': 'Bezahlt: {amount}',
  'mail.N07.balance': 'Noch offen: {balance}',
  'mail.N08.subject': 'Ihre Zahlung für {orderRef} hat nicht geklappt',
  'mail.N08.failed':
    'Ihre Zahlung von {amount} für {orderRef} ist fehlgeschlagen. Es wurde nichts belastet.',
  'mail.N08.retry':
    'Versuchen Sie es in der Bestellung unter Konto erneut. Solange nicht bezahlt ist, bleiben die Artikel möglicherweise nicht für Sie reserviert.',
  'mail.N12.subject': '{orderRef} ist abholbereit',
  'mail.N12.ready':
    'Ihre Bestellung {orderRef} ist bereit. Abholung in {place}, {placeAddress}.',
  'mail.N12.hours': 'Öffnungszeiten: {placeHours}',
  'mail.N12.instructions': '{placeInstructions}',
  'mail.N15.subject': 'Wie gefällt Ihr Andenken? Bewerten Sie {orderRef}',
  'mail.N15.thanks': 'Ihre Bestellung {orderRef} ist abgeschlossen. Danke!',
  'mail.N15.review':
    'Erzählen Sie anderen Reisenden davon: Schreiben Sie eine Bewertung in der Bestellung unter Konto.',
  'mail.N21.subject': 'Gast hat {amount} für {orderRef} bezahlt',
  'mail.N21.paid':
    'Der Gast hat {amount} online für {orderRef} bezahlt. Noch einzuziehen: {balance}.',
  'mail.N21.preparing': 'Die Bestellung wird jetzt vorbereitet.',
  'mail.N23.subject': '{orderRef} storniert: Zahlungsfrist abgelaufen',
  'mail.N23.guest':
    'Ihre Bestellung {orderRef} wurde storniert, weil die erste Zahlung nicht bis {dueAt} eingegangen ist.',
  'mail.N23.again':
    'Möchten Sie die Artikel weiterhin, senden Sie eine neue Anfrage, damit der Laden das Abholdatum erneut bestätigen kann.',
  'mail.N23.staff':
    'Bestellung {orderRef} wurde automatisch storniert: Die erste Zahlung ist nicht bis {dueAt} eingegangen.',
  'mail.N23.stock': 'Die reservierten Artikel sind wieder an Lager.',
  'mail.invitation.expiry': 'Der Link ist 7 Tage gültig.',
  'mail.invitation.ignore':
    'Wenn Sie diese Einladung nicht erwartet haben, können Sie diese E-Mail ignorieren.',
  'mail.N18.subject': '{inviter} hat Sie zu {store} eingeladen',
  'mail.N18.invited':
    '{inviter} hat Sie eingeladen, bei {store} als Store Manager mitzuarbeiten.',
  'mail.N18.accept':
    'Öffnen Sie die Einladung, melden Sie sich an und nehmen Sie sie an: {link}',
  'mail.N20.subject': 'Einladung: Eröffnen Sie {store}',
  'mail.N20.invited': 'Sie sind eingeladen, {store} als Inhaber:in zu führen.',
  'mail.N20.setup':
    'Öffnen Sie die Einladung, melden Sie sich an und erledigen Sie die Schritte, die Ihr Laden vor dem Verkaufsstart braucht: {link}',

  'tourMail.greeting': 'Grüezi {guest}',
  'tourMail.seller': 'Verkäufer: {seller}',
  'tourMail.tourLine': 'Tour: {tour}, {startsAt}',
  'tourMail.when': 'Wann: {startsAt}',
  'tourMail.meeting': 'Treffpunkt: {meetingPoint}',
  'tourMail.group':
    'Gruppe: Erwachsene {adults} · Kinder {children} · Kleinkinder {infants}',
  'tourMail.paid': 'Bezahlt: {paid}',
  'tourMail.balanceDue': 'Noch zu bezahlen: {balance}, fällig bis {dueAt}',
  'tourMail.paidInFull': 'Vollständig bezahlt. Es ist nichts mehr offen.',
  'tourMail.N07.subject': 'Quittung für {ref}: {amount} bezahlt',
  'tourMail.N07.paid': 'Bezahlt: {amount}',
  'tourMail.N08.subject': 'Ihre Zahlung für {ref} ist fehlgeschlagen',
  'tourMail.N08.failed':
    'Ihre Zahlung von {amount} für {tour} ist fehlgeschlagen. Es wurde kein Geld abgebucht.',
  'tourMail.N08.retryHold':
    'Sie können es bis {holdUntil} erneut versuchen. Danach sind Ihre Plätze nicht mehr reserviert.',
  'tourMail.N08.retry':
    'Sie können es auf Ihrer Buchungsseite erneut versuchen.',
  'tourMail.N09.subject': 'Buchung bestätigt: {tour}, {startsAt}',
  'tourMail.N09.confirmed': 'Ihre Buchung {ref} ist bestätigt.',
  'tourMail.N10.subject': 'Erinnerung: {balance} für {ref} fällig bis {dueAt}',
  'tourMail.N10.due':
    'Der Restbetrag von {balance} für {tour} am {startsAt} ist bis {dueAt} fällig.',
  'tourMail.N10.cancel':
    'Ist er bis dahin nicht bezahlt, wird die Buchung gemäss Zahlungsregel der Tour storniert und Ihre Plätze werden freigegeben.',
  'tourMail.N10.grace':
    'Ist er dann noch offen, wartet der Veranstalter noch einige Tage und entscheidet danach über Ihre Buchung.',
  'tourMail.N10.merchant':
    'Ist er dann noch offen, entscheidet der Veranstalter über Ihre Buchung.',
  'tourMail.N10.pay':
    'Bezahlen Sie online auf Ihrer Buchungsseite oder wie mit dem Veranstalter vereinbart.',
  'tourMail.N11.subject': 'Buchung {ref} storniert: Restbetrag nicht bezahlt',
  'tourMail.N11.cancelled':
    'Der Restbetrag von {balance} für {tour} am {startsAt} wurde nicht bis {dueAt} bezahlt. Gemäss Zahlungsregel der Tour ist Ihre Buchung storniert und Ihre Plätze sind freigegeben.',
  'tourMail.N11.money':
    'Sie haben {paid} bezahlt. Der Veranstalter behandelt bereits bezahltes Geld gemäss Stornierungsregel.',
  'tourMail.N11.again':
    'Für einen anderen Termin erstellen Sie bitte eine neue Buchung.',
  'tourMail.N11.staffSubject':
    '{ref} automatisch storniert: Restbetrag überfällig',
  'tourMail.N11.staff':
    'Die Buchung von {guest} für {tour} am {startsAt} wurde nach der Zahlungsfrist {dueAt} storniert. {seats} Plätze sind wieder frei.',
  'tourMail.N11.staffMoney':
    'Vor der Stornierung bezahlt: {paid}. Nicht bezahlt: {balance}.',
  'tourMail.N13.subject': 'Morgen: {tour}',
  'tourMail.N13.tomorrow': 'Ihre Tour {ref} beginnt morgen, {startsAt}.',
  'tourMail.N13.contact': 'Fragen? Kontaktieren Sie {seller}: {sellerPhone}.',
  'tourMail.N15.subject': 'Wie war {tour}? {ref} bewerten',
  'tourMail.N15.thanks':
    'Ihre Buchung {ref} ist abgeschlossen. Danke, dass Sie dabei waren!',
  'tourMail.N15.review': 'Bewerten Sie die Tour auf Ihrer Buchungsseite.',
  'tourMail.N22.subject': 'Zahlung nach Ablauf von {ref} erhalten',
  'tourMail.N22.guest':
    'Wir haben {amount} erhalten, nachdem Ihre Reservierung für {tour} abgelaufen war. Die Buchung bleibt abgelaufen und ist nicht bestätigt.',
  'tourMail.N22.next':
    'Die Zahlung wird geprüft. Der Veranstalter informiert Sie, was mit dem Geld geschieht.',
  'tourMail.N22.staffSubject': 'Zahlung abzuklären: {ref}',
  'tourMail.N22.staff':
    '{amount} ist für {ref} nach Ablauf der Reservierung eingegangen. Die Buchung bleibt abgelaufen und ist nicht bestätigt. Zahlung prüfen und bei Bedarf eine Rückzahlung veranlassen.',

  'requestMail.link.advice': 'Anfrage öffnen',
  'requestMail.link.private': 'Anfragen für private Touren öffnen',
  'requestMail.guestEmail': 'E-Mail des Gastes: {email}',
  'requestMail.N16.subject': 'Neue Beratungsanfrage von {email}',
  'requestMail.N16.intro':
    'Ein Gast hat am {at} die Fragen des Reiseassistenten beantwortet.',
  'requestMail.guestLanguage': 'Sprache des Gastes: {language}',
  'requestMail.N16.answer': '{question} — {answer}',
  'requestMail.N16.skipped': 'Übersprungene Fragen fehlen.',
  'requestMail.N16.reply': 'Antworten Sie dem Gast per E-Mail.',
  'requestMail.N17.subject':
    'Neue Anfrage für eine private Tour: {group}, {dates}',
  'requestMail.N17.greeting': 'Grüezi {name}',
  'requestMail.N17.intro': 'Ein Gast hat am {at} eine private Tour angefragt.',
  'requestMail.N17.group': 'Gruppe: {group}',
  'requestMail.N17.dates': 'Gewünschte Daten: {dates}',
  'requestMail.N17.interests': 'Interessen: {interests}',
  'requestMail.N17.reply':
    'Antworten Sie per E-Mail mit einem Tourvorschlag und dem Preis und markieren Sie die Anfrage dann als beantwortet.',
}
