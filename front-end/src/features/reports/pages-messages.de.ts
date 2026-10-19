import type { reportPagesEn } from './pages-messages'

export const reportPagesDe: Record<keyof typeof reportPagesEn, string> = {
  'sectionPages.label': 'Seiten von {section}',
  'sectionPages.analytics': 'Auswertung',
  'sectionPages.partners': 'Alle Partner',
  'sectionPages.articles': 'Artikel',
  'sectionPages.inbox': 'Posteingang',
  'sectionPages.money': 'Geld',
  'sectionPages.sales': 'Konversion',
  'sectionPages.guests': 'Gäste',
  'sectionPages.margin': 'Marge',

  'reportPages.question.money': 'Woher das Geld kam und wohin es ging',
  'reportPages.question.sales': 'Was sich verkauft hat und wo Gäste abspringen',
  'reportPages.question.guests':
    'Wer kauft und wie die Gäste das Geschäft finden',
  'reportPages.question.margin': 'Was nach den Kosten bleibt',
  'reportPages.question.partners':
    'Welche Partner Gäste bringen und was sie verdienen',
  'reportPages.question.content':
    'Welche Artikel Gäste lesen und worauf sie klicken',
  'reportPages.question.inquiries':
    'Was Gäste fragen und wie schnell es beantwortet wird',

  'reportPages.ofTotalSales': '{share} des Gesamtumsatzes',
  'reportPages.ofKeepsakeSales': '{share} des Andenken-Umsatzes',
  'reportPages.ofCollected': '{share} der Einnahmen',
  'reportPages.perDay': 'pro Tag',

  'reportPages.methods.title': 'Zahlungsarten',
  'reportPages.methods.description':
    'Im Zeitraum eingenommenes Geld, nach Zahlungsart',
  'reportPages.methods.none': 'In diesem Zeitraum wurde nichts eingenommen.',

  'reportPages.funnel.title': 'Vom Besuch zum abgeschlossenen Verkauf',
  'reportPages.funnel.description':
    'Partnerlinks und direkte Besuche, dann was die Gäste weiter taten',
  'reportPages.funnel.visits': 'Besuche',
  'reportPages.funnel.viewed': 'Angesehen',
  'reportPages.funnel.started': 'Begonnen',
  'reportPages.funnel.sent': 'Gesendet',
  'reportPages.funnel.paid': 'Bezahlt',
  'reportPages.funnel.completed': 'Abgeschlossen',

  'reportPages.ended.title': 'Wie die Verkäufe endeten',
  'reportPages.ended.description':
    'Im Zeitraum erfasste Bestellungen und Buchungen',
  'reportPages.ended.total': 'Erfasst',
  'reportPages.ended.completed': 'Abgeschlossen',
  'reportPages.ended.open': 'Noch offen',
  'reportPages.ended.lost': 'Abgelehnt oder storniert',
  'reportPages.ended.noShow': 'Nicht erschienen',
  'reportPages.ended.share': '{share} der erfassten',

  'reportPages.groups.title': 'Gesamtumsatz nach Produktgruppe',
  'reportPages.groups.description':
    'Andenken-Unterkategorien und Touren als eine Gruppe',

  'reportPages.sources.title': 'Herkunft',
  'reportPages.sources.description':
    'QR-Code und Link jedes Partners sowie direkte Besuche. Auszahlungen bleiben auf der Partnerseite.',
  'reportPages.sources.source': 'Herkunft',
  'reportPages.guestGroups.title': 'Gästegruppen',
  'reportPages.guestGroups.description':
    'Gesamtumsatz nach den Reiseangaben jeder Bestellung oder Buchung',
  'reportPages.guestGroups.unknown': 'Nicht bestimmt (keine Reiseangaben)',
  'reportPages.places.title': 'Abholorte für Andenken',
  'reportPages.places.description': 'Andenken-Umsatz im Zeitraum nach Abholort',
  'reportPages.places.none': 'In diesem Zeitraum keine Andenken-Verkäufe.',

  'reportPages.margin.noTours':
    'In diesem Zeitraum keine abgeschlossenen Tourbuchungen.',
  'reportPages.margin.missingTitle': 'Verkäufe mit fehlenden Kosten',
  'reportPages.margin.splitTitle': 'Wohin der Umsatz geht',
  'reportPages.margin.splitDescription':
    'Abgeschlossene Verkäufe mit allen Kosten: Kosten und verbleibende Marge',
  'reportPages.margin.costs': 'Kosten',
  'reportPages.margin.margin': 'Marge',
  'reportPages.margin.revenue': '{amount} Umsatz',
  'reportPages.margin.loss': 'Verlust {amount}',
  'reportPages.margin.rate': '{amount} · {rate} Marge',
  'reportPages.margin.coverageTitle': 'Verkäufe mit vollständigen Kosten',
  'reportPages.margin.coverageDescription': 'Nur diese zählen für die Marge',
  'reportPages.margin.completed': 'Abgeschlossene Verkäufe',
  'reportPages.margin.complete': 'Alle Kosten erfasst',
  'reportPages.margin.missing': 'Kosten fehlen',
  'reportPages.margin.share': '{share} der abgeschlossenen Verkäufe',

  'reportPages.reads.title': 'Aufrufe pro Artikel',
  'reportPages.reads.description':
    'Aufrufe im Zeitraum; Klicks führen zu den verlinkten Andenken und Touren',
  'reportPages.reads.line': '{reads} Aufrufe · {clicks} Klicks',
  'reportPages.content.article': 'Artikel',
  'reportPages.content.reads': 'Aufrufe',
  'reportPages.content.clicks': 'Klicks',
  'reportPages.content.rate': 'Klickrate',

  'reportPages.advice.title': 'Fragebogen Reiseberatung',
  'reportPages.advice.description': 'Vom Öffnen des Fragebogens bis zum Senden',
  'reportPages.advice.opened': 'Geöffnet',
  'reportPages.advice.started': 'Begonnen',
  'reportPages.advice.sent': 'Gesendet',
  'reportPages.advice.requests': 'Beratungsanfragen',
  'reportPages.advice.requestsDescription':
    'Im Zeitraum gesendet, und ob das Geschäft sie geöffnet hat',
  'reportPages.advice.read': 'Vom Geschäft geöffnet',
  'reportPages.advice.unread': 'Noch nicht geöffnet',
  'reportPages.advice.received': 'Erhalten',
  'reportPages.advice.share': '{share} der erhaltenen',
  'reportPages.privateTours.title': 'Anfragen für private Touren',
  'reportPages.privateTours.description':
    'Im Zeitraum gesendet, und ob das Geschäft geantwortet hat',
  'reportPages.privateTours.answered': 'Beantwortet',
  'reportPages.privateTours.waiting': 'Wartet auf Antwort',
  'reportPages.privateTours.guests.one': 'Insgesamt {count} Gast angefragt',
  'reportPages.privateTours.guests.other': 'Insgesamt {count} Gäste angefragt',

  'reportPages.partners.commissionTitle': 'Provision nach Partner',
  'reportPages.partners.commissionDescription':
    'Im Zeitraum erfasst, nach Rückerstattungen',
}
