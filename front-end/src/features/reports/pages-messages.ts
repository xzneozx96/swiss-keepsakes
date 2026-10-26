/**
 * The analytics sub-pages (owner review 15.10.2026): Reports › Money, Sales, Guests, Margin;
 * Partners, Content and Inquiries › Analytics; and the section pages in the side menu.
 */
export const reportPagesEn = {
  'sectionPages.label': '{section} pages',
  'sectionPages.analytics': 'Analytics',
  'sectionPages.partners': 'All partners',
  'sectionPages.articles': 'Articles',
  'sectionPages.inbox': 'Inbox',
  'sectionPages.money': 'Money',
  'sectionPages.sales': 'Conversion',
  'sectionPages.guests': 'Guests',
  'sectionPages.margin': 'Margin',

  'reportPages.question.money': 'Where the money came from and where it went',
  'reportPages.question.sales': 'What sold, and where guests dropped off',
  'reportPages.question.guests': 'Who buys, and how they found the shop',
  'reportPages.question.margin': 'What is left after costs',
  'reportPages.question.partners':
    'Which partners bring guests, and what they earn',
  'reportPages.question.content':
    'Which articles guests read, and what they click',
  'reportPages.question.inquiries':
    'What guests ask, and how fast it is answered',

  'reportPages.ofTotalSales': '{share} of total sales',
  'reportPages.ofKeepsakeSales': '{share} of keepsake sales',
  'reportPages.ofCollected': '{share} of collected',
  'reportPages.perDay': 'per day',

  'reportPages.methods.title': 'Payment methods',
  'reportPages.methods.description':
    'Money collected in the period, by how it was paid',
  'reportPages.methods.none': 'Nothing collected in this period.',

  'reportPages.funnel.title': 'From visit to completed sale',
  'reportPages.funnel.description':
    'Partner links and direct visits, then what guests did next',
  'reportPages.funnel.visits': 'Visits',
  'reportPages.funnel.viewed': 'Viewed',
  'reportPages.funnel.started': 'Started',
  'reportPages.funnel.sent': 'Sent',
  'reportPages.funnel.paid': 'Paid',
  'reportPages.funnel.completed': 'Completed',

  'reportPages.ended.title': 'How the sales ended',
  'reportPages.ended.description': 'Orders placed in the period',
  'reportPages.ended.total': 'Placed',
  'reportPages.ended.completed': 'Completed',
  'reportPages.ended.open': 'Still running',
  'reportPages.ended.lost': 'Declined or cancelled',
  'reportPages.ended.noShow': 'No-show',
  'reportPages.ended.share': '{share} of placed',

  'reportPages.groups.title': 'Total sales by product group',
  'reportPages.groups.description':
    'Keepsake sub-categories',

  'reportPages.sources.title': 'Sources',
  'reportPages.sources.description':
    'Each partner\'s QR and link, and direct visits. Payouts stay on the partner\'s page.',
  'reportPages.sources.source': 'Source',
  'reportPages.guestGroups.title': 'Guest groups',
  'reportPages.guestGroups.description':
    'Total sales by the trip answers on each order',
  'reportPages.guestGroups.unknown': 'Not determined (no trip answers)',
  'reportPages.places.title': 'Keepsake pickup places',
  'reportPages.places.description':
    'Keepsake sales in the period by where guests pick up',
  'reportPages.places.none': 'No keepsake sales in this period.',

  'reportPages.margin.noTours': 'No completed tour bookings in this period.',
  'reportPages.margin.missingTitle': 'Sales missing costs',
  'reportPages.margin.splitTitle': 'Where the revenue goes',
  'reportPages.margin.splitDescription':
    'Completed sales with every cost entered: costs, and the margin left',
  'reportPages.margin.costs': 'Costs',
  'reportPages.margin.margin': 'Margin',
  'reportPages.margin.revenue': '{amount} revenue',
  'reportPages.margin.loss': 'Loss {amount}',
  'reportPages.margin.rate': '{amount} · {rate} margin',
  'reportPages.margin.coverageTitle': 'Sales with complete costs',
  'reportPages.margin.coverageDescription':
    'Only these count towards the margin',
  'reportPages.margin.completed': 'Completed sales',
  'reportPages.margin.complete': 'Every cost entered',
  'reportPages.margin.missing': 'Costs missing',
  'reportPages.margin.share': '{share} of completed sales',

  'reportPages.reads.title': 'Reads per article',
  'reportPages.reads.description':
    'Reads in the period; clicks go to the keepsakes and tours an article links',
  'reportPages.reads.line': '{reads} reads · {clicks} clicks',
  'reportPages.content.article': 'Article',
  'reportPages.content.reads': 'Reads',
  'reportPages.content.clicks': 'Clicks',
  'reportPages.content.rate': 'Click rate',

  'reportPages.advice.title': 'Trip advice questionnaire',
  'reportPages.advice.description':
    'From opening the questionnaire to sending it',
  'reportPages.advice.opened': 'Opened',
  'reportPages.advice.started': 'Started',
  'reportPages.advice.sent': 'Sent',
  'reportPages.advice.requests': 'Advice requests',
  'reportPages.advice.requestsDescription':
    'Sent in the period, and whether the shop has opened them',
  'reportPages.advice.read': 'Opened by the shop',
  'reportPages.advice.unread': 'Not opened yet',
  'reportPages.advice.received': 'Received',
  'reportPages.advice.share': '{share} of received',
  'reportPages.privateTours.title': 'Private tour requests',
  'reportPages.privateTours.description':
    'Sent in the period, and whether the shop has replied',
  'reportPages.privateTours.answered': 'Replied',
  'reportPages.privateTours.waiting': 'Waiting for a reply',
  'reportPages.privateTours.guests.one': '{count} guest asked about in total',
  'reportPages.privateTours.guests.other':
    '{count} guests asked about in total',

  'reportPages.partners.commissionTitle': 'Commission by partner',
  'reportPages.partners.commissionDescription':
    'Recorded in the period, after refunds',
} as const
