import type { tourBookingEn } from "./messages";

export const tourBookingDe: Record<keyof typeof tourBookingEn, string> = {
  "tourBooking.review": "Buchung prüfen",
  "tourBooking.intro":
    "Ihre Plätze werden erst beim Fortfahren reserviert. Prüfen Sie Termin und Gruppe vor der Buchung.",
  "tourBooking.contact": "Wen sollen wir kontaktieren?",
  "tourBooking.name": "Kontaktname",
  "tourBooking.phone": "Mobilnummer",
  "tourBooking.childName": "Name des Kindes (optional)",
  "tourBooking.childNameShort": "Name des Kindes",
  "tourBooking.group":
    "{adults} Erwachsene · {children} Kinder · {infants} Kleinkinder",
  "tourBooking.count.adults.one": "{count} Erwachsener",
  "tourBooking.count.adults.other": "{count} Erwachsene",
  "tourBooking.count.children.one": "{count} Kind",
  "tourBooking.count.children.other": "{count} Kinder",
  "tourBooking.count.infants.one": "{count} Kleinkind",
  "tourBooking.count.infants.other": "{count} Kleinkinder",
  "tourBooking.adults": "Erwachsene · {count} × {price}",
  "tourBooking.children": "Kinder · {count} × {price}",
  "tourBooking.infants": "Kleinkinder · {count} × {price}",
  "tourBooking.total": "Buchungssumme",
  "tourBooking.dueNow": "Jetzt bezahlen",
  "tourBooking.balance": "Restbetrag",
  "tourBooking.paid": "Bezahlt",
  "tourBooking.deadline": "Restbetrag fällig am {date}",
  "tourBooking.deposit":
    "Bezahlen Sie jetzt 30 % Anzahlung. Der Restbetrag ist vor der Abfahrt fällig.",
  "tourBooking.full":
    "Bezahlen Sie den Gesamtbetrag, um Ihre Plätze zu bestätigen.",
  "tourBooking.later":
    "Buchen Sie ohne sofortige Zahlung. Ihre Plätze sind bestätigt. Der Restbetrag ist vor der Abfahrt fällig.",
  "tourBooking.holdRule":
    "Sie haben 15 Minuten für die erste Zahlung. Danach werden die Plätze freigegeben.",
  "tourBooking.continue": "Zur Zahlung · {amount}",
  "tourBooking.book": "Buchung bestätigen · später bezahlen",
  "tourBooking.edit": "Termin oder Gruppe ändern",
  "tourBooking.chooseAnother": "Anderen Termin wählen",
  "tourBooking.openHeld": "Zu Ihren reservierten Plätzen",
  "tourBooking.signIn.title": "Zum Buchen anmelden",
  "tourBooking.signIn.body":
    "Ihre Buchung wird in Ihrem Konto gespeichert und Ihre Angaben bleiben ausgefüllt.",
  "tourBooking.error.contact":
    "Ergänzen Sie Ihren Namen und eine gültige Mobilnummer mit Ländervorwahl.",
  "tourBooking.error.capacity":
    "Für Ihre Gruppe sind nicht genug Plätze frei. Wählen Sie einen anderen Termin oder passen Sie die Gruppe an.",
  "tourBooking.error.departure":
    "Dieser Termin ist nicht mehr verfügbar. Wählen Sie ein neues Datum.",
  "tourBooking.error.participants":
    "Mindestens eine erwachsene Person muss dabei sein. Prüfen Sie die Teilnehmerzahlen.",
  "tourBooking.error.sign-in":
    "Melden Sie sich an, bevor Sie die Buchung bestätigen.",
  "tourBooking.error.participantInfo":
    "Beantworten Sie die Pflichtfragen des Veranstalters zu Ihrer Gruppe.",
  "tourBooking.optionalField": "{label} (optional)",
  "tourBooking.onlyInGerman":
    "Einige Angaben zur Tour gibt es nur auf Deutsch.",
  "tourBooking.onlyInEnglish":
    "Einige Angaben zur Tour gibt es nur auf Englisch.",
  "tourBooking.error.held":
    "Für diesen Termin haben Sie bereits Plätze reserviert. Schliessen Sie diese Zahlung ab oder warten Sie, bis die Reservierung endet.",
  "tourBooking.error.other":
    "Die Buchung konnte nicht erstellt werden. Prüfen Sie die Angaben und versuchen Sie es erneut.",
  "tourBooking.missing": "Diese Buchung wurde in Ihrem Konto nicht gefunden.",
  "tourBooking.empty":
    "Ihr nächstes Abenteuer beginnt hier. Ihre Tourbuchungen erscheinen hier.",
  "tourBooking.explore": "Touren entdecken",
  "tourBooking.past": "Vergangene Buchungen",
  "tourBooking.detail": "Ihre Tourbuchung",
  "tourBooking.tabs.label": "Buchungsdetails",
  "tourBooking.noActivity": "Noch keine Aktivität erfasst.",
  "tourBooking.confirmed": "Ihre Plätze sind bestätigt",
  "tourBooking.confirmedBody":
    "Halten Sie Ihre Buchungsnummer bereit und seien Sie vor Beginn am Treffpunkt.",
  "tourBooking.laterDue":
    "Es wurde nichts belastet. Bezahlen Sie {amount} bis {date}.",
  "tourBooking.overdueRule.cancel":
    "Ist der Betrag dann noch offen, wird die Buchung storniert und die Plätze werden freigegeben.",
  "tourBooking.overdueRule.grace":
    "Ist der Betrag dann noch offen, wartet der Veranstalter {hours} Stunden, bevor er über das weitere Vorgehen entscheidet.",
  "tourBooking.overdueRule.merchant":
    "Ist der Betrag dann noch offen, entscheidet der Veranstalter über das weitere Vorgehen.",
  "tourBooking.addToCalendar": "Zum Kalender hinzufügen",
  "tourBooking.calendarNote": "Buchungsnummer {ref}",
  "tourBooking.meeting": "Treffpunkt",
  "tourBooking.reference": "Buchungsnummer",
  "tourBooking.view": "Buchung ansehen",
  "tourBooking.payBalance": "Restbetrag bezahlen · {amount}",
  "tourBooking.finishPayment": "Zahlung abschliessen · {amount}",
  "tourBooking.expired": "Ihre Reservierung ist abgelaufen",
  "tourBooking.expiredBody":
    "Die erste Zahlung wurde nicht rechtzeitig abgeschlossen. Die Plätze sind wieder frei. Prüfen Sie die Verfügbarkeit für eine neue Buchung.",
  "tourBooking.sessionClosed":
    "Die Zahlungssitzung wurde mit dem Ende der Reservierung geschlossen. Meldet der Zahlungsanbieter diese Zahlung trotzdem, erscheint sie hier zur Prüfung durch den Veranstalter.",
  "tourBooking.blockedExpired":
    "Diese Reservierung endete um {time}. Die Zahlungssitzung ist geschlossen, diese Zahlung ist nicht mehr möglich.",
  "tourBooking.rebook": "Verfügbarkeit erneut prüfen",
  "tourBooking.hold": "Plätze noch {time} reserviert",
  "tourBooking.holdBody":
    "Schliessen Sie die erste Zahlung vor Ablauf ab. Eine fehlgeschlagene Zahlung startet die Frist nicht neu.",
  "tourBooking.reconcile.title":
    "Zahlung nach Ablauf Ihrer Reservierung erhalten",
  "tourBooking.reconcile.body":
    "{amount} ist nach dem Ende der Reservierung eingegangen. Die Buchung bleibt abgelaufen und die Plätze werden nicht wiederhergestellt. Der Veranstalter prüft diese Zahlung mit dem Zahlungsanbieter und meldet sich bei Ihnen.",
  "tourBooking.paymentHistory": "Zahlungsverlauf",
  "tourBooking.noPayments": "Noch keine Zahlungen erfasst.",
  "tourBooking.payment.paidAt": "Bezahlt {date}",
  "tourBooking.payment.receivedAt": "Ergebnis erhalten {date}",
  "tourBooking.payment.afterExpiry": "Nach Ablauf",
  "tourBooking.timeline": "Buchungsverlauf",
  "tourBooking.policy": "Stornierungsregel",
  "tourBooking.paymentPolicy": "Zahlungsregel",
  "tourBooking.policyAt.full": "Vollständige Zahlung bei der Buchung.",
  "tourBooking.policyAt.deposit":
    "30 % Anzahlung bei der Buchung, der Rest bis {date}.",
  "tourBooking.policyAt.later":
    "Keine Zahlung bei der Buchung, der volle Betrag bis {date}.",
  "tourBooking.noShow":
    "Als nicht erschienen erfasst. Zahlungen und Restbetrag bleiben sichtbar. Diese Buchung kann nicht abgeschlossen oder bewertet werden.",
  "tourBooking.reviewEligible":
    "Ihre Tour ist abgeschlossen. Eine Tourbewertung wird verfügbar, sobald die Bewertungsfunktion verbunden ist.",
  "tourBooking.contactOrganiser": "Veranstalter kontaktieren",
  "tourBooking.contactBody":
    "Bei Änderungen oder Fragen kontaktieren Sie den Veranstalter und nennen Ihre Buchungsnummer {ref}.",
  "tourBooking.blocked":
    "Für diese Buchung ist keine Zahlung möglich. Kehren Sie zur Buchung zurück, um den aktuellen Status zu sehen.",
  "tourBooking.overdue":
    "Die Zahlungsfrist ist abgelaufen. Bitte klären Sie das weitere Vorgehen mit dem Veranstalter.",
  "tourBooking.event.created": "Buchung erstellt",
  "tourBooking.event.expired": "Reservierung abgelaufen",
  "tourBooking.event.session-closed": "Zahlungssitzung geschlossen",
  "tourBooking.event.payment-succeeded": "Zahlung erhalten",
  "tourBooking.event.payment-failed": "Zahlung fehlgeschlagen",
  "tourBooking.event.payment-processing": "Zahlung wird verarbeitet",
  "tourBooking.event.payment-late-succeeded": "Zahlung nach Ablauf erhalten",
  "tourBooking.event.payment-late-failed":
    "Anbieter bestätigt: keine Belastung",
  "tourBooking.event.delivered": "An der Tour teilgenommen",
  "tourBooking.event.no_show": "Nicht erschienen erfasst",
  "tourBooking.event.completed": "Buchung abgeschlossen",
  "tourBooking.event.other": "Buchung aktualisiert",
};
