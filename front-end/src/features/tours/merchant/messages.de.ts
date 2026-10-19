import type { tourMerchantEn } from './messages'

import { calendarDe } from '@/features/merchant/calendar/calendar-messages.de'

export const tourMerchantDe: Record<keyof typeof tourMerchantEn, string> = {
  ...calendarDe,
  'tourMerchant.eventCreated': 'Buchung erstellt',
  'tourMerchant.eventExpired': 'Zahlungsreservierung abgelaufen',
  'tourMerchant.eventDelivered': 'Leistung erbracht',
  'tourMerchant.eventCompleted': 'Buchung abgeschlossen',
  'tourMerchant.eventNoShow': 'Gast nicht erschienen',
  'tourMerchant.eventPayment': 'Zahlung erhalten',
  'tourMerchant.eventProcessing': 'Zahlung wird bearbeitet',
  'tourMerchant.eventFailed': 'Zahlung fehlgeschlagen',
  'tourMerchant.eventCancelled': 'Buchung storniert',
  'tourMerchant.eventCancelledOverdue': 'Storniert: Restbetrag überfällig',
  'tourMerchant.eventDepartureCancelled': 'Termin vom Veranstalter abgesagt',
  'tourMerchant.eventUpdated': 'Buchung aktualisiert',
  'tourMerchant.actorGuest': 'Gast',
  'tourMerchant.actorOwner': 'Inhaber',
  'tourMerchant.actorManager': 'Manager',
  'tourMerchant.actorSystem': 'System',
  'tourMerchant.actorProvider': 'Zahlungsanbieter',
  'tourMerchant.departures': 'Tourtermine',
  'tourMerchant.departuresIntro':
    'Alle Termine mit Plätzen, offenen Beträgen und anstehenden Aufgaben.',
  'tourMerchant.upcoming': 'Bevorstehend',
  'tourMerchant.ended': 'Vergangen',
  'tourMerchant.noDepartures': 'Noch keine Tourtermine.',
  'tourMerchant.departure': 'Termin',
  'tourMerchant.booked': 'Gebucht',
  'tourMerchant.seatsOf': '{count} von {capacity}',
  'tourMerchant.seats': 'Plätze',
  'tourMerchant.onHold': '{held} reserviert',
  'tourMerchant.seatsBooked': '{count} von {capacity} gebucht',
  'tourMerchant.seatsDetail': 'Reserviert {held} · frei {free}',
  'tourMerchant.holds': 'Aktive Reservierungen',
  'tourMerchant.available': 'Freie Plätze',
  'tourMerchant.capacity': 'Kapazität',
  'tourMerchant.toCollect': 'Noch einzuziehen',
  'tourMerchant.needsAttention': 'Zu erledigen',
  'tourMerchant.none': 'Nichts zu tun',
  'tourMerchant.attention.toRecord': 'Ergebnisse zu erfassen: {count}',
  'tourMerchant.attention.overdue': 'Überfällige Restbeträge: {count}',
  'tourMerchant.attention.owing': 'Erbracht, noch offen: {count}',
  'tourMerchant.attention.reconcile': 'Abzuklären: {count}',
  'tourMerchant.phase.cancelled': 'Abgesagt',
  'tourMerchant.phase.ended': 'Beendet',
  'tourMerchant.phase.closed': 'Buchung geschlossen',
  'tourMerchant.phase.open': 'Offen',
  'tourMerchant.manifest': 'Gästeliste',
  'tourMerchant.seatSummary':
    'Gebucht {count} von {capacity} · aktive Reservierungen {held}',
  'tourMerchant.guest': 'Gast',
  'tourMerchant.group': 'Teilnehmende',
  'tourMerchant.money': 'Zahlung',
  'tourMerchant.actions': 'Ergebnis',
  'tourMerchant.empty': 'Für diesen Termin gibt es noch keine Buchungen.',
  'tourMerchant.notFound':
    'Diese Buchung oder dieser Termin wurde nicht gefunden.',
  'tourMerchant.back': 'Alle Tourtermine',
  'tourMerchant.cancelledDeparture':
    'Sie haben diesen Termin am {date} abgesagt',
  'tourMerchant.cancelledDepartureBody':
    'Die Buchungen erscheinen als storniert, nicht als nicht erschienen. Umbuchungen und Rückzahlungen folgen in einer späteren Phase.',
  'tourMerchant.recordHelp':
    'Die Tour ist beendet. Für jede Buchung erbrachte Leistung oder Nichterscheinen erfassen. Nichts wird automatisch abgeschlossen.',
  'tourMerchant.afterEnd':
    'Ergebnisse können nach dem Ende der Tour erfasst werden.',
  'tourMerchant.afterEndAt':
    'Ergebnisse können nach Tourende um {time} erfasst werden.',
  'tourMerchant.overdueSince': 'Überfällig seit {date}',
  'tourMerchant.delivered': 'Leistung erbracht',
  'tourMerchant.noShow': 'Nicht erschienen',
  'tourMerchant.complete': 'Buchung abschliessen',
  'tourMerchant.confirmDeliveredTitle':
    'Erbrachte Leistung für {name} erfassen?',
  'tourMerchant.confirmDeliveredBody':
    'Buchung {ref}: Der Gast hat an der Tour teilgenommen. Zahlungen bleiben unverändert; abschliessen erst nach vollständiger Zahlung.',
  'tourMerchant.confirmNoShowTitle': '{name} als nicht erschienen erfassen?',
  'tourMerchant.noShowBody':
    'Buchung {ref}: Der Gast hat nicht teilgenommen. Bezahltes Geld und Restbetrag bleiben unverändert: keine Rückzahlung, kein Erlass. Kein Abschluss, keine Provision, keine Bewertung.',
  'tourMerchant.confirmCompleteTitle': 'Buchung {ref} abschliessen?',
  'tourMerchant.confirmCompleteBody':
    'Leistung erbracht und vollständig bezahlt. Die Provision wird einmalig erfasst und der Gast kann die Tour bewerten.',
  'tourMerchant.lock.notDelivered': 'Zuerst erbrachte Leistung erfassen',
  'tourMerchant.lock.owed': '{balance} noch offen',
  'tourMerchant.done.completed': 'Abgeschlossen am {date}.',
  'tourMerchant.done.noShow':
    'Am {date} als nicht erschienen erfasst. Bezahltes Geld und Restbetrag bleiben unverändert.',
  'tourMerchant.done.cancelled': 'Storniert am {date}.',
  'tourMerchant.done.cancelledOverdue':
    'Am {date} storniert: Der Restbetrag war gemäss Tourregel überfällig. Plätze freigegeben.',
  'tourMerchant.done.departureCancelled':
    'Termin am {date} vom Veranstalter abgesagt; kein Nichterscheinen. Rückzahlungen folgen in einer späteren Phase.',
  'tourMerchant.done.expired':
    'Reservierung am {date} abgelaufen. Plätze wurden freigegeben.',
  'tourMerchant.done.pending':
    'Plätze sind reserviert, während der Gast bezahlt.',
  'tourMerchant.undated.completed': 'Abgeschlossen.',
  'tourMerchant.undated.noShow':
    'Als nicht erschienen erfasst. Bezahltes Geld und Restbetrag bleiben unverändert.',
  'tourMerchant.undated.cancelled': 'Storniert.',
  'tourMerchant.undated.expired':
    'Reservierung abgelaufen. Plätze wurden freigegeben.',
  'tourMerchant.staffOnly':
    'Nur Inhaber oder Manager können Buchungen bearbeiten.',
  'tourMerchant.failed':
    'Diese Aktion ist nicht mehr verfügbar. Buchungsstatus und Restbetrag prüfen.',
  'tourMerchant.success': 'Buchung aktualisiert.',
  'tourMerchant.total': 'Buchungsbetrag',
  'tourMerchant.paid': 'Erhalten',
  'tourMerchant.balance': 'Offener Betrag',
  'tourMerchant.stillOwed': '{amount} noch offen',
  'tourMerchant.receivedTitle': '{amount} erhalten',
  'tourMerchant.cancelledMoney':
    'Es ist nichts mehr offen. Bereits bezahltes Geld wird gemäss Stornierungsregel behandelt; Rückzahlungen folgen in einer späteren Phase.',
  'tourMerchant.paymentHistory': 'Zahlungsverlauf',
  'tourMerchant.noPayments': 'Noch keine Zahlungen erfasst.',
  'tourMerchant.noActivity':
    'Für diese Beispielbuchung ist kein Verlauf erfasst.',
  'tourMerchant.activity': 'Buchungsverlauf',
  'tourMerchant.contact': 'Gastkontakt',
  'tourMerchant.childName': 'Name des Kindes',
  'tourMerchant.meeting': 'Treffpunkt',
  'tourMerchant.ends': 'Tourende',
  'tourMerchant.bookedAt': 'Gebucht am',
  'tourMerchant.due': 'Restbetrag fällig',
  'tourMerchant.overdueGrace':
    'Überfällig seit {date}. Nachfrist bis {until}, danach entscheiden Sie.',
  'tourMerchant.overdueCancel':
    'Überfällig seit {date}. Die Tourregel storniert diese Buchung bei der nächsten Prüfung.',
  'tourMerchant.overdueMerchant':
    'Überfällig seit {date}. Sie entscheiden: Zahlung erfassen oder Gast kontaktieren. Stornieren folgt in einer späteren Phase.',
  'tourMerchant.reconcileHelp':
    'Nach Ablauf dieser Reservierung ist Geld eingegangen. Die Buchung bleibt abgelaufen. Zahlung prüfen und Rückzahlung veranlassen.',
  'tourMerchant.reminderProposal':
    'Erinnerungen 3 Tage und 1 Tag vor der Frist (Vorschlag, noch nicht bestätigt).',
  'tourMerchant.nextStep': 'Nächster Schritt',
  'tourMerchant.recordPayment': 'Zahlung erfassen',
  'tourMerchant.amountHelp':
    'Nur bereits ausserhalb der Plattform erhaltenes Geld erfassen, höchstens den offenen Betrag.',
  'tourMerchant.invalidAmount': 'Einen Betrag über null eingeben.',
  'tourMerchant.aboveBalance':
    'Höchstens den offenen Betrag von {balance} eingeben.',
  'tourMerchant.cash': 'Bar',
  'tourMerchant.bank-transfer': 'Banküberweisung',
  'tourMerchant.other': 'Andere',
  'tourMerchant.online': 'Online',
  'tourMerchant.recorded': 'Zahlung erfasst',
  'tourMerchant.snapshot': 'Preis und Regeln',
  'tourMerchant.snapshotHelp':
    'Wie bei der Buchung vereinbart. Spätere Änderungen an der Tour ändern diese Buchung nicht.',
  'tourMerchant.price.adults': 'Erwachsene · {count} × {price}',
  'tourMerchant.price.children': 'Kinder · {count} × {price}',
  'tourMerchant.price.infants': 'Kleinkinder · {count} × {price}',
  'tourMerchant.paymentPolicy': 'Zahlung',
  'tourMerchant.policy.full': 'Vollständig bei der Buchung ({amount})',
  'tourMerchant.policy.deposit':
    'Anzahlung {amount} bei der Buchung, Restbetrag bis {due}',
  'tourMerchant.policy.later': 'Später bezahlen, bis {due}',
  'tourMerchant.overduePolicy': 'Bei verspätetem Restbetrag',
  'tourMerchant.overdue.merchant':
    'Sie entscheiden; nichts geschieht automatisch',
  'tourMerchant.overdue.cancel': 'Automatisch storniert, Plätze freigegeben',
  'tourMerchant.overdue.grace':
    '{hours} Stunden Nachfrist, danach entscheiden Sie',
  'tourMerchant.cancellationPolicy': 'Stornierungsregel',
  'tourMerchant.commissionTitle': 'Partnerprovision',
  'tourMerchant.source': 'Quelle',
  'tourMerchant.sourceDirect': 'Direkt, kein Partner',
  'tourMerchant.commissionNoPartner':
    'Ohne Partnerquelle gebucht, daher fällt keine Provision an.',
  'tourMerchant.commissionAmount': 'Provision',
  'tourMerchant.commissionValue': '{amount} ({rate} von {basis})',
  'tourMerchant.commission.none': 'Keine Provision',
  'tourMerchant.commission.estimated': 'Geschätzt, nicht erfasst',
  'tourMerchant.commission.recorded': 'Erfasst',
  'tourMerchant.commission.notApplicable':
    'Keine Provision: nicht abgeschlossen',
  'tourMerchant.commission':
    'Die Provision wird beim Abschluss dieser Buchung einmalig erfasst.',
  'tourMerchant.commissionRecordedAt':
    'Einmalig am {date} beim Abschluss erfasst.',
  'tourMerchant.commissionNever':
    'Nicht erschienene und stornierte Buchungen erhalten nie Provision.',
  'tourMerchant.participants':
    'Erwachsene {adults} · Kinder {children} · Kleinkinder {infants}',
  'tourMerchant.infantsNote': 'Kleinkinder belegen keinen Sitzplatz.',
  'tourMerchant.today': 'Touren',
  'tourMerchant.reportGroup': 'Touren',
  'tourMerchant.todayIntro': 'Termine und Buchungen, die Sie erledigen sollten',
  'tourMerchant.todayCollect': 'Offene Tour-Restbeträge',
  'tourMerchant.collect.hint': 'Offen auf bestätigten und erbrachten Buchungen',
  'tourMerchant.collect.none': 'Auf Tour-Buchungen ist nichts offen.',
  'tourMerchant.collect.upcoming': 'Fällig vor der Tour',
  'tourMerchant.collect.overdue': 'Überfällig',
  'tourMerchant.collect.owing': 'Erbracht, noch offen',
  'tourMerchant.collect.bookings.one': '{count} Buchung',
  'tourMerchant.collect.bookings.other': '{count} Buchungen',
  'tourMerchant.collect.next': 'Nächster Restbetrag fällig am {date}: {amount}',
  'tourMerchant.todayEmpty': 'Keine bevorstehenden Termine.',
  'tourMerchant.nextDepartures': 'Nächste Termine',
  'tourMerchant.taskLabel': '{title}, {count}',
  'tourMerchant.task.toRecord': 'Ergebnisse erfassen',
  'tourMerchant.task.toRecordHint':
    'Touren beendet: Leistung oder Nichterscheinen erfassen',
  'tourMerchant.task.overdue': 'Überfällige Restbeträge',
  'tourMerchant.task.overdueHint': 'Die Zahlungsfrist ist abgelaufen',
  'tourMerchant.task.owing': 'Erbracht, noch offen',
  'tourMerchant.task.owingHint': 'Abschluss wartet auf vollständige Zahlung',
  'tourMerchant.task.reconcile': 'Zahlungen abklären',
  'tourMerchant.task.reconcileHint':
    'Geld nach Ablauf einer Reservierung erhalten',
}
