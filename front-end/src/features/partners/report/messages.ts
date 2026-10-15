/** P02 partner dashboard (redesign 15.10.2026): the widgets around the period report. */
export const partnerDashboardEn = {
  "partnerDash.balance.title": "Your commission",
  "partnerDash.balance.earned": "Earned in total",
  "partnerDash.balance.paid": "Paid out",
  "partnerDash.balance.toPay": "Still to pay",
  "partnerDash.balance.estimated": "Estimated on open orders",
  "partnerDash.balance.parts": "Where your commission stands",
  "partnerDash.months.description": "Select a month to open it",
  "partnerDash.months.open": "Open {month}: {value}",
  "partnerDash.compared": "Compared with {range}",
  "partnerDash.kpi.vsPrevious": "{delta} compared with {range}",
  "partnerDash.kpi.noPrevious": "Nothing to compare with in {range}",
  "partnerDash.kpi.toPayShare": "{share} of the commission",
  "partnerDash.chart.hint": "Select a column to see its orders",
  "partnerDash.chart.previous": "Previous period",
  "partnerDash.chart.previousValue": "Previous period: {amount}",
  "partnerDash.mix.title": "Keepsakes and tours",
  "partnerDash.mix.description":
    "Commission in the period, recorded and estimated",
  "partnerDash.mix.keepsakes": "Keepsakes",
  "partnerDash.mix.tours": "Tours",
  "partnerDash.mix.total": "Total",
  "partnerDash.mix.share": "{share} of the commission",
  "partnerDash.mix.empty": "No commission in this period yet",
  "partnerDash.tabs.label": "Details",
  "partnerDash.tabs.transactions": "Transactions",
  "partnerDash.tabs.payments": "Payments",
  "partnerDash.filter.label": "Commission",
  "partnerDash.filter.recorded": "Recorded",
  "partnerDash.filter.estimated": "Estimated",
  "partnerDash.filter.none": "No commission",
  "partnerDash.bucket.only": "Only {label}",
  "partnerDash.bucket.clear": "Show the whole period",
  "partnerDash.guests.empty": "No transactions match this selection.",
  "partnerDash.guests.value": "Order value",
  "partnerDash.payments.empty": "No payments or adjustments in this period.",
  "partnerDash.heading": "How your referrals are going",
  "partnerDash.fig.commission.hint":
    "Commission recorded when an order is completed, minus the commission taken back by refunds, on the day it was recorded.",
  "partnerDash.fig.paid.hint": "Money paid out to you, on the day it was paid.",
  "partnerDash.fig.toPay.hint":
    "What was still owed to you at the end of each bar: recorded commission minus what was paid out.",
  "partnerDash.fig.orders.hint":
    "Orders and bookings you referred, without declined or cancelled ones.",
  "partnerDash.fig.amount": "Amount",
  "partnerDash.fig.balance": "Still owed",
  "partnerDash.transactions.title": "Transactions",
  "partnerDash.transactions.description":
    "Orders and bookings you referred in this period",
  "partnerDash.balance.share": "{share} of the total",
  "partnerDash.fig.orders.hintExcluded":
    "Orders and bookings you referred. {count} declined or cancelled are in the table but not counted here.",
} as const;

export const partnerDashboardDe: Record<
  keyof typeof partnerDashboardEn,
  string
> = {
  "partnerDash.balance.title": "Ihre Provision",
  "partnerDash.balance.earned": "Insgesamt verdient",
  "partnerDash.balance.paid": "Ausbezahlt",
  "partnerDash.balance.toPay": "Noch auszuzahlen",
  "partnerDash.balance.estimated": "Geschätzt aus offenen Bestellungen",
  "partnerDash.balance.parts": "Stand Ihrer Provision",
  "partnerDash.months.description": "Monat wählen, um ihn zu öffnen",
  "partnerDash.months.open": "{month} öffnen: {value}",
  "partnerDash.compared": "Verglichen mit {range}",
  "partnerDash.kpi.vsPrevious": "{delta} verglichen mit {range}",
  "partnerDash.kpi.noPrevious": "Kein Vergleich mit {range} möglich",
  "partnerDash.kpi.toPayShare": "{share} der Provision",
  "partnerDash.chart.hint": "Spalte wählen, um ihre Bestellungen zu sehen",
  "partnerDash.chart.previous": "Vorheriger Zeitraum",
  "partnerDash.chart.previousValue": "Vorheriger Zeitraum: {amount}",
  "partnerDash.mix.title": "Andenken und Touren",
  "partnerDash.mix.description":
    "Provision im Zeitraum, verbucht und geschätzt",
  "partnerDash.mix.keepsakes": "Andenken",
  "partnerDash.mix.tours": "Touren",
  "partnerDash.mix.total": "Gesamt",
  "partnerDash.mix.share": "{share} der Provision",
  "partnerDash.mix.empty": "Noch keine Provision in diesem Zeitraum",
  "partnerDash.tabs.label": "Details",
  "partnerDash.tabs.transactions": "Transaktionen",
  "partnerDash.tabs.payments": "Zahlungen",
  "partnerDash.filter.label": "Provision",
  "partnerDash.filter.recorded": "Verbucht",
  "partnerDash.filter.estimated": "Geschätzt",
  "partnerDash.filter.none": "Keine Provision",
  "partnerDash.bucket.only": "Nur {label}",
  "partnerDash.bucket.clear": "Ganzen Zeitraum zeigen",
  "partnerDash.guests.empty": "Keine Transaktionen für diese Auswahl.",
  "partnerDash.guests.value": "Bestellwert",
  "partnerDash.payments.empty":
    "Keine Zahlungen oder Anpassungen in diesem Zeitraum.",
  "partnerDash.heading": "So laufen Ihre Empfehlungen",
  "partnerDash.fig.commission.hint":
    "Provision, die bei Abschluss einer Bestellung verbucht wird, abzüglich der durch Rückerstattungen zurückgenommenen Provision, am Tag der Verbuchung.",
  "partnerDash.fig.paid.hint":
    "An Sie ausbezahltes Geld, am Tag der Auszahlung.",
  "partnerDash.fig.toPay.hint":
    "Was Ihnen am Ende jedes Balkens noch geschuldet wurde: verbuchte Provision abzüglich Auszahlungen.",
  "partnerDash.fig.orders.hint":
    "Von Ihnen vermittelte Bestellungen und Buchungen, ohne abgelehnte oder stornierte.",
  "partnerDash.fig.amount": "Betrag",
  "partnerDash.fig.balance": "Noch offen",
  "partnerDash.transactions.title": "Transaktionen",
  "partnerDash.transactions.description":
    "Von Ihnen vermittelte Bestellungen und Buchungen in diesem Zeitraum",
  "partnerDash.balance.share": "{share} vom Gesamtbetrag",
  "partnerDash.fig.orders.hintExcluded":
    "Von Ihnen vermittelte Bestellungen und Buchungen. {count} abgelehnte oder stornierte stehen in der Tabelle, werden hier aber nicht gezählt.",
};
