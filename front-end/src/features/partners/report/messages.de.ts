import type { partnerDashboardEn } from './messages'

export const partnerDashboardDe: Record<
  keyof typeof partnerDashboardEn,
  string
> = {
  'partnerDash.balance.title': 'Ihre Provision',
  'partnerDash.balance.earned': 'Insgesamt verdient',
  'partnerDash.balance.paid': 'Ausbezahlt',
  'partnerDash.balance.toPay': 'Noch auszuzahlen',
  'partnerDash.balance.estimated': 'Geschätzt aus offenen Bestellungen',
  'partnerDash.balance.parts': 'Stand Ihrer Provision',
  'partnerDash.months.description': 'Monat wählen, um ihn zu öffnen',
  'partnerDash.months.open': '{month} öffnen: {value}',
  'partnerDash.compared': 'Verglichen mit {range}',
  'partnerDash.kpi.vsPrevious': '{delta} verglichen mit {range}',
  'partnerDash.kpi.noPrevious': 'Kein Vergleich mit {range} möglich',
  'partnerDash.kpi.toPayShare': '{share} der Provision',
  'partnerDash.chart.hint': 'Spalte wählen, um ihre Bestellungen zu sehen',
  'partnerDash.chart.previous': 'Vorheriger Zeitraum',
  'partnerDash.chart.previousValue': 'Vorheriger Zeitraum: {amount}',
  'partnerDash.mix.title': 'Andenken',
  'partnerDash.mix.description':
    'Provision im Zeitraum, verbucht und geschätzt',
  'partnerDash.mix.keepsakes': 'Andenken',
  'partnerDash.mix.tours': 'Touren',
  'partnerDash.mix.total': 'Gesamt',
  'partnerDash.mix.empty': 'Noch keine Provision in diesem Zeitraum',
  'partnerDash.tabs.label': 'Details',
  'partnerDash.tabs.transactions': 'Transaktionen',
  'partnerDash.tabs.payments': 'Zahlungen',
  'partnerDash.filter.label': 'Provision',
  'partnerDash.filter.recorded': 'Verbucht',
  'partnerDash.filter.estimated': 'Geschätzt',
  'partnerDash.filter.none': 'Keine Provision',
  'partnerDash.bucket.only': 'Nur {label}',
  'partnerDash.bucket.clear': 'Ganzen Zeitraum zeigen',
  'partnerDash.guests.empty': 'Keine Transaktionen für diese Auswahl.',
  'partnerDash.guests.value': 'Bestellwert',
  'partnerDash.payments.empty':
    'Keine Zahlungen oder Anpassungen in diesem Zeitraum.',
  'partnerDash.heading': 'So laufen Ihre Empfehlungen',
  'partnerDash.fig.commission.hint':
    'Provision, die bei Abschluss einer Bestellung verbucht wird, abzüglich der durch Rückerstattungen zurückgenommenen Provision, am Tag der Verbuchung.',
  'partnerDash.fig.paid.hint':
    'An Sie ausbezahltes Geld, am Tag der Auszahlung.',
  'partnerDash.fig.toPay.hint':
    'Was Ihnen am Ende jedes Balkens noch geschuldet wurde: verbuchte Provision abzüglich Auszahlungen.',
  'partnerDash.fig.orders.hint':
    'Von Ihnen vermittelte Bestellungen, ohne abgelehnte oder stornierte.',
  'partnerDash.fig.amount': 'Betrag',
  'partnerDash.fig.balance': 'Noch offen',
  'partnerDash.transactions.title': 'Transaktionen',
  'partnerDash.transactions.description':
    'Von Ihnen vermittelte Bestellungen in diesem Zeitraum',
  'partnerDash.balance.share': '{share} vom Gesamtbetrag',
  'partnerDash.fig.orders.hintExcluded':
    'Von Ihnen vermittelte Bestellungen. {count} abgelehnte oder stornierte stehen in der Tabelle, werden hier aber nicht gezählt.',
}
