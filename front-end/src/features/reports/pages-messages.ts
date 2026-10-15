/**
 * The analytics sub-pages (owner review 15.10.2026): Reports › Money, Sales, Guests, Margin;
 * Partners, Content and Inquiries › Analytics; and the section pages in the side menu.
 */
export const reportPagesEn = {
  "sectionPages.label": "{section} pages",
  "sectionPages.analytics": "Analytics",
  "sectionPages.partners": "All partners",
  "sectionPages.articles": "Articles",
  "sectionPages.inbox": "Inbox",
  "sectionPages.money": "Money",
  "sectionPages.sales": "Conversion",
  "sectionPages.guests": "Guests",
  "sectionPages.margin": "Margin",

  "reportPages.question.money": "Where the money came from and where it went",
  "reportPages.question.sales": "What sold, and where guests dropped off",
  "reportPages.question.guests": "Who buys, and how they found the shop",
  "reportPages.question.margin": "What is left after costs",
  "reportPages.question.partners":
    "Which partners bring guests, and what they earn",
  "reportPages.question.content":
    "Which articles guests read, and what they click",
  "reportPages.question.inquiries":
    "What guests ask, and how fast it is answered",

  "reportPages.ofTotalSales": "{share} of total sales",
  "reportPages.ofKeepsakeSales": "{share} of keepsake sales",
  "reportPages.ofCollected": "{share} of collected",
  "reportPages.perDay": "per day",

  "reportPages.methods.title": "Payment methods",
  "reportPages.methods.description":
    "Money collected in the period, by how it was paid",
  "reportPages.methods.none": "Nothing collected in this period.",

  "reportPages.funnel.title": "From visit to completed sale",
  "reportPages.funnel.description":
    "Partner links and direct visits, then what guests did next",
  "reportPages.funnel.visits": "Visits",
  "reportPages.funnel.viewed": "Viewed",
  "reportPages.funnel.started": "Started",
  "reportPages.funnel.sent": "Sent",
  "reportPages.funnel.paid": "Paid",
  "reportPages.funnel.completed": "Completed",

  "reportPages.ended.title": "How the sales ended",
  "reportPages.ended.description": "Orders and bookings placed in the period",
  "reportPages.ended.total": "Placed",
  "reportPages.ended.completed": "Completed",
  "reportPages.ended.open": "Still running",
  "reportPages.ended.lost": "Declined or cancelled",
  "reportPages.ended.noShow": "No-show",
  "reportPages.ended.share": "{share} of placed",

  "reportPages.groups.title": "Total sales by product group",
  "reportPages.groups.description":
    "Keepsake sub-categories, and tours as one group",

  "reportPages.sources.title": "Sources",
  "reportPages.sources.description":
    "Each partner's QR and link, and direct visits. Payouts stay on the partner's page.",
  "reportPages.sources.source": "Source",
  "reportPages.guestGroups.title": "Guest groups",
  "reportPages.guestGroups.description":
    "Total sales by the trip answers on each order or booking",
  "reportPages.guestGroups.unknown": "Not determined (no trip answers)",
  "reportPages.places.title": "Keepsake pickup places",
  "reportPages.places.description":
    "Keepsake sales in the period by where guests pick up",
  "reportPages.places.none": "No keepsake sales in this period.",

  "reportPages.margin.noTours": "No completed tour bookings in this period.",
  "reportPages.margin.missingTitle": "Sales missing costs",
  "reportPages.margin.splitTitle": "Where the revenue goes",
  "reportPages.margin.splitDescription":
    "Completed sales with every cost entered: costs, and the margin left",
  "reportPages.margin.costs": "Costs",
  "reportPages.margin.margin": "Margin",
  "reportPages.margin.revenue": "{amount} revenue",
  "reportPages.margin.loss": "Loss {amount}",
  "reportPages.margin.rate": "{amount} · {rate} margin",
  "reportPages.margin.coverageTitle": "Sales with complete costs",
  "reportPages.margin.coverageDescription":
    "Only these count towards the margin",
  "reportPages.margin.completed": "Completed sales",
  "reportPages.margin.complete": "Every cost entered",
  "reportPages.margin.missing": "Costs missing",
  "reportPages.margin.share": "{share} of completed sales",

  "reportPages.reads.title": "Reads per article",
  "reportPages.reads.description":
    "Reads in the period; clicks go to the keepsakes and tours an article links",
  "reportPages.reads.line": "{reads} reads · {clicks} clicks",
  "reportPages.content.article": "Article",
  "reportPages.content.reads": "Reads",
  "reportPages.content.clicks": "Clicks",
  "reportPages.content.rate": "Click rate",

  "reportPages.advice.title": "Trip advice questionnaire",
  "reportPages.advice.description":
    "From opening the questionnaire to sending it",
  "reportPages.advice.opened": "Opened",
  "reportPages.advice.started": "Started",
  "reportPages.advice.sent": "Sent",
  "reportPages.advice.requests": "Advice requests",
  "reportPages.advice.requestsDescription":
    "Sent in the period, and whether the shop has opened them",
  "reportPages.advice.read": "Opened by the shop",
  "reportPages.advice.unread": "Not opened yet",
  "reportPages.advice.received": "Received",
  "reportPages.advice.share": "{share} of received",
  "reportPages.privateTours.title": "Private tour requests",
  "reportPages.privateTours.description":
    "Sent in the period, and whether the shop has replied",
  "reportPages.privateTours.answered": "Replied",
  "reportPages.privateTours.waiting": "Waiting for a reply",
  "reportPages.privateTours.guests.one": "{count} guest asked about in total",
  "reportPages.privateTours.guests.other":
    "{count} guests asked about in total",

  "reportPages.partners.commissionTitle": "Commission by partner",
  "reportPages.partners.commissionDescription":
    "Recorded in the period, after refunds",
} as const;

export const reportPagesDe: Record<keyof typeof reportPagesEn, string> = {
  "sectionPages.label": "Seiten von {section}",
  "sectionPages.analytics": "Auswertung",
  "sectionPages.partners": "Alle Partner",
  "sectionPages.articles": "Artikel",
  "sectionPages.inbox": "Posteingang",
  "sectionPages.money": "Geld",
  "sectionPages.sales": "Konversion",
  "sectionPages.guests": "Gäste",
  "sectionPages.margin": "Marge",

  "reportPages.question.money": "Woher das Geld kam und wohin es ging",
  "reportPages.question.sales": "Was sich verkauft hat und wo Gäste abspringen",
  "reportPages.question.guests":
    "Wer kauft und wie die Gäste das Geschäft finden",
  "reportPages.question.margin": "Was nach den Kosten bleibt",
  "reportPages.question.partners":
    "Welche Partner Gäste bringen und was sie verdienen",
  "reportPages.question.content":
    "Welche Artikel Gäste lesen und worauf sie klicken",
  "reportPages.question.inquiries":
    "Was Gäste fragen und wie schnell es beantwortet wird",

  "reportPages.ofTotalSales": "{share} des Gesamtumsatzes",
  "reportPages.ofKeepsakeSales": "{share} des Andenken-Umsatzes",
  "reportPages.ofCollected": "{share} der Einnahmen",
  "reportPages.perDay": "pro Tag",

  "reportPages.methods.title": "Zahlungsarten",
  "reportPages.methods.description":
    "Im Zeitraum eingenommenes Geld, nach Zahlungsart",
  "reportPages.methods.none": "In diesem Zeitraum wurde nichts eingenommen.",

  "reportPages.funnel.title": "Vom Besuch zum abgeschlossenen Verkauf",
  "reportPages.funnel.description":
    "Partnerlinks und direkte Besuche, dann was die Gäste weiter taten",
  "reportPages.funnel.visits": "Besuche",
  "reportPages.funnel.viewed": "Angesehen",
  "reportPages.funnel.started": "Begonnen",
  "reportPages.funnel.sent": "Gesendet",
  "reportPages.funnel.paid": "Bezahlt",
  "reportPages.funnel.completed": "Abgeschlossen",

  "reportPages.ended.title": "Wie die Verkäufe endeten",
  "reportPages.ended.description":
    "Im Zeitraum erfasste Bestellungen und Buchungen",
  "reportPages.ended.total": "Erfasst",
  "reportPages.ended.completed": "Abgeschlossen",
  "reportPages.ended.open": "Noch offen",
  "reportPages.ended.lost": "Abgelehnt oder storniert",
  "reportPages.ended.noShow": "Nicht erschienen",
  "reportPages.ended.share": "{share} der erfassten",

  "reportPages.groups.title": "Gesamtumsatz nach Produktgruppe",
  "reportPages.groups.description":
    "Andenken-Unterkategorien und Touren als eine Gruppe",

  "reportPages.sources.title": "Herkunft",
  "reportPages.sources.description":
    "QR-Code und Link jedes Partners sowie direkte Besuche. Auszahlungen bleiben auf der Partnerseite.",
  "reportPages.sources.source": "Herkunft",
  "reportPages.guestGroups.title": "Gästegruppen",
  "reportPages.guestGroups.description":
    "Gesamtumsatz nach den Reiseangaben jeder Bestellung oder Buchung",
  "reportPages.guestGroups.unknown": "Nicht bestimmt (keine Reiseangaben)",
  "reportPages.places.title": "Abholorte für Andenken",
  "reportPages.places.description": "Andenken-Umsatz im Zeitraum nach Abholort",
  "reportPages.places.none": "In diesem Zeitraum keine Andenken-Verkäufe.",

  "reportPages.margin.noTours":
    "In diesem Zeitraum keine abgeschlossenen Tourbuchungen.",
  "reportPages.margin.missingTitle": "Verkäufe mit fehlenden Kosten",
  "reportPages.margin.splitTitle": "Wohin der Umsatz geht",
  "reportPages.margin.splitDescription":
    "Abgeschlossene Verkäufe mit allen Kosten: Kosten und verbleibende Marge",
  "reportPages.margin.costs": "Kosten",
  "reportPages.margin.margin": "Marge",
  "reportPages.margin.revenue": "{amount} Umsatz",
  "reportPages.margin.loss": "Verlust {amount}",
  "reportPages.margin.rate": "{amount} · {rate} Marge",
  "reportPages.margin.coverageTitle": "Verkäufe mit vollständigen Kosten",
  "reportPages.margin.coverageDescription": "Nur diese zählen für die Marge",
  "reportPages.margin.completed": "Abgeschlossene Verkäufe",
  "reportPages.margin.complete": "Alle Kosten erfasst",
  "reportPages.margin.missing": "Kosten fehlen",
  "reportPages.margin.share": "{share} der abgeschlossenen Verkäufe",

  "reportPages.reads.title": "Aufrufe pro Artikel",
  "reportPages.reads.description":
    "Aufrufe im Zeitraum; Klicks führen zu den verlinkten Andenken und Touren",
  "reportPages.reads.line": "{reads} Aufrufe · {clicks} Klicks",
  "reportPages.content.article": "Artikel",
  "reportPages.content.reads": "Aufrufe",
  "reportPages.content.clicks": "Klicks",
  "reportPages.content.rate": "Klickrate",

  "reportPages.advice.title": "Fragebogen Reiseberatung",
  "reportPages.advice.description": "Vom Öffnen des Fragebogens bis zum Senden",
  "reportPages.advice.opened": "Geöffnet",
  "reportPages.advice.started": "Begonnen",
  "reportPages.advice.sent": "Gesendet",
  "reportPages.advice.requests": "Beratungsanfragen",
  "reportPages.advice.requestsDescription":
    "Im Zeitraum gesendet, und ob das Geschäft sie geöffnet hat",
  "reportPages.advice.read": "Vom Geschäft geöffnet",
  "reportPages.advice.unread": "Noch nicht geöffnet",
  "reportPages.advice.received": "Erhalten",
  "reportPages.advice.share": "{share} der erhaltenen",
  "reportPages.privateTours.title": "Anfragen für private Touren",
  "reportPages.privateTours.description":
    "Im Zeitraum gesendet, und ob das Geschäft geantwortet hat",
  "reportPages.privateTours.answered": "Beantwortet",
  "reportPages.privateTours.waiting": "Wartet auf Antwort",
  "reportPages.privateTours.guests.one": "Insgesamt {count} Gast angefragt",
  "reportPages.privateTours.guests.other": "Insgesamt {count} Gäste angefragt",

  "reportPages.partners.commissionTitle": "Provision nach Partner",
  "reportPages.partners.commissionDescription":
    "Im Zeitraum erfasst, nach Rückerstattungen",
};
