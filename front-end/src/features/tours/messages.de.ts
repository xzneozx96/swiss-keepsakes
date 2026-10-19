import type { toursCommonEn } from "./messages";

export const toursCommonDe: Record<keyof typeof toursCommonEn, string> = {
  "tours.reviews.attended": "Teilgenommen am {date}",
  "tours.status.pending_payment": "Plätze für Zahlung reserviert",
  "tours.status.confirmed": "Bestätigt",
  "tours.status.expired": "Reservierung abgelaufen",
  "tours.status.delivered": "Tourleistung erbracht",
  "tours.status.completed": "Abgeschlossen",
  "tours.status.no_show": "Nicht erschienen",
  "tours.status.cancelled": "Storniert",
  "tours.payment.processing": "Zahlung wird verarbeitet",
  "tours.payment.overdue": "Restbetrag überfällig",
  "tours.payment.paid": "Vollständig bezahlt",
  "tours.payment.deposit": "Anzahlung bezahlt · Restbetrag offen",
  "tours.payment.unpaid": "Zahlung fällig",
  "tours.payment.exception":
    "Zahlung nach Ablauf erhalten · Abklärung erforderlich",
  "tours.payment.sessionClosed":
    "Zahlungssitzung geschlossen · Antwort des Anbieters ausstehend",
  "tours.payment.none": "Keine Zahlung erfolgt",
  "tours.payment.closed": "Bezahlt · nichts mehr offen",
};
