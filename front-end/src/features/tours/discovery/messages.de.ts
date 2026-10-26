import type { tourDiscoveryEn } from './messages'

export const tourDiscoveryDe: Record<keyof typeof tourDiscoveryEn, string> = {
  'tourDiscovery.title': 'Touren rund um Luzern',
  'tourDiscovery.intro': 'Ein wenig Zeit hier. Eine Geschichte für zu Hause.',
  'tourDiscovery.from': 'Ab',
  'tourDiscovery.duration': '{hours} Stunden',
  'tourDiscovery.next': 'Nächster Termin · {date}',
  'tourDiscovery.comingSoon': 'Demnächst',
  'tourDiscovery.noDates': 'Keine Termine verfügbar',
  'tourDiscovery.soldOutBody':
    'Alle kommenden Termine dieser Tour sind ausgebucht. Entdecken Sie unsere anderen Touren oder fragen Sie den Veranstalter nach neuen Terminen.',
  'tourDiscovery.noDatesBody':
    'Für diese Tour gibt es noch keine kommenden Termine. Entdecken Sie unsere anderen Touren oder fragen Sie den Veranstalter nach neuen Terminen.',
  'tourDiscovery.empty':
    'Neue Touren folgen bald. Entdecken Sie Luzern bald wieder mit uns.',
  'tourDiscovery.notFound':
    'Diese Tour ist nicht verfügbar. Wählen Sie eine andere Tour, um fortzufahren.',
  'tourDiscovery.browse': 'Weitere Touren entdecken',
  'tourDiscovery.back': 'Zurück',
  'tourDiscovery.gallery': 'Fotos von {name}',
  'tourDiscovery.photo': 'Foto {n} von {count}',
  'tourDiscovery.previous': 'Vorheriges Foto',
  'tourDiscovery.nextPhoto': 'Nächstes Foto',
  'tourDiscovery.close': 'Schliessen',
  'tourDiscovery.smallGroup': 'Kleine Gruppe',
  'tourDiscovery.durationLabel': 'Dauer',
  'tourDiscovery.startingPrice': 'Preis Erwachsene',
  'tourDiscovery.about': 'Über dieses Erlebnis',
  'tourDiscovery.itinerary': 'Ihr Weg durch Luzern',
  'tourDiscovery.included': 'Das ist inklusive',
  'tourDiscovery.excluded': 'Nicht inklusive',
  'tourDiscovery.meeting': 'Hier treffen wir uns',
  'tourDiscovery.conditions': 'Gut zu wissen',
  'tourDiscovery.prices': 'Preise für Ihre Gruppe',
  'tourDiscovery.payment': 'Zahlung',
  'tourDiscovery.cancellation': 'Stornierung',
  'tourDiscovery.reviews': 'Bewertungen der Gäste',
  'tourDiscovery.noReviews':
    'Noch keine Bewertungen. Gäste können nach einer abgeschlossenen Tour bewerten.',
  'tourDiscovery.choose': 'Termin wählen',
  'tourDiscovery.chooseHint': 'Datum und Gruppe wählen',
  'tourDiscovery.departures': 'Termin',
  'tourDiscovery.available.one': '1 Platz verfügbar',
  'tourDiscovery.available.other': '{count} Plätze verfügbar',
  'tourDiscovery.soldOut': 'Ausgebucht',
  'tourDiscovery.group': 'Ihre Gruppe',
  'tourDiscovery.adults': 'Erwachsene',
  'tourDiscovery.children': 'Kinder',
  'tourDiscovery.infants': 'Kleinkinder',
  'tourDiscovery.ages.from': 'Ab {from} Jahren',
  'tourDiscovery.ages.range': '{from}–{to} Jahre',
  'tourDiscovery.each': 'je {price}',
  'tourDiscovery.free': 'gratis',
  'tourDiscovery.noSeat': 'kein Platz nötig',
  'tourDiscovery.seatNote':
    'Erwachsene und Kinder brauchen einen Platz. Kleinkinder nicht. Mindestens eine erwachsene Person muss mitkommen.',
  'tourDiscovery.seatSummary.one': 'Ihre Gruppe braucht 1 Platz',
  'tourDiscovery.seatSummary.other': 'Ihre Gruppe braucht {count} Plätze',
  'tourDiscovery.capacityError':
    'Für Ihre Gruppe sind zu wenige Plätze frei. Verkleinern Sie Ihre Gruppe oder wählen Sie einen anderen Termin.',
  'tourDiscovery.noHold':
    'Die Terminauswahl reserviert noch keine Plätze. Die Verfügbarkeit wird bei der Buchung erneut geprüft.',
  'tourDiscovery.total': 'Gesamtpreis',
  'tourDiscovery.dueToday': 'Heute fällig',
  'tourDiscovery.balance': 'Restbetrag',
  'tourDiscovery.balanceDue': 'Fällig bis {date}',
  'tourDiscovery.review': 'Buchung prüfen · {total}',
  'tourDiscovery.policy.full':
    'Bezahlen Sie den Gesamtpreis, um Ihre Buchung zu bestätigen.',
  'tourDiscovery.policy.deposit':
    'Bestätigen Sie mit 30% Anzahlung. Der Restbetrag ist vor dem Termin fällig.',
  'tourDiscovery.policy.later':
    'Jetzt buchen, später bezahlen. Heute ist keine Karte nötig.',
  'tourDiscovery.policy.varies': 'Die Zahlung hängt vom gewählten Termin ab:',
  'tourDiscovery.policy.variesShort':
    'Je nach Termin · vor der Buchung angezeigt',
  'tourDiscovery.policyShort.full': 'Vollständige Zahlung bei Buchung',
  'tourDiscovery.policyShort.deposit': '30% Anzahlung bei Buchung',
  'tourDiscovery.policyShort.later': 'Später bezahlen · keine Karte nötig',
  'tourDiscovery.onlyInEnglish':
    'Die Angaben zu dieser Tour gibt es nur auf Englisch.',
  'tourDiscovery.onlyInGerman':
    'Die Angaben zu dieser Tour gibt es nur auf Deutsch.',
  'tourDiscovery.sample': 'Beispielregeln · Zustimmung des Händlers ausstehend',
  'tourDiscovery.picker.date': 'Datum',
  'tourDiscovery.picker.time': 'Uhrzeit',
  'tourDiscovery.picker.left': '{n} frei',
  'tourDiscovery.picker.morning': 'Vormittag',
  'tourDiscovery.picker.afternoon': 'Nachmittag',
  'tourDiscovery.picker.halfFull': 'voll',
  'tourDiscovery.picker.slotLabel': '{from} bis {to}, {seats}',
  'tourDiscovery.picker.noFit':
    'Keine Zeit passt für {n} Gäste an diesem Tag · nächste: {next}',
  'tourDiscovery.picker.noFitNone':
    'Keine Zeit passt für {n} Gäste an diesem Tag.',
  'tourDiscovery.picker.noTime': 'Noch keine Zeit gewählt',
  'tourDiscovery.picker.announce': '{date}, {time}. {seats}.',
  'tourDiscovery.picker.noDay': 'Noch kein Datum gewählt',
  'tourDiscovery.picker.noDates': 'Diesen Monat keine Termine',
  'tourDiscovery.picker.legendOpen': 'Frei',
  'tourDiscovery.picker.legendLow': 'Wenige frei',
  'tourDiscovery.picker.legendFull': 'Ausgebucht',
  'tourDiscovery.picker.policyVaries':
    'Zahlung je nach Datum · bei Ihrer Wahl angezeigt',
  'tourDiscovery.sections.optional': 'Optional',
  'tourDiscovery.sections.website': 'Website',
  'tourDiscovery.sections.checkedOn': 'Praktische Angaben geprüft am {date}.',
  'tourDiscovery.maintenance.label': 'Vorübergehend nicht verfügbar',
  'tourDiscovery.maintenance.title':
    'Buchungen sind wegen Wartungsarbeiten pausiert',
  'tourDiscovery.maintenance.noReason':
    'Diese Tour kann im Moment nicht gebucht werden.',
  'tourDiscovery.maintenance.until':
    'Voraussichtlich wieder verfügbar ab {date}',
  'tourDiscovery.maintenance.link': 'Weitere Informationen',
  'tourDiscovery.maintenance.existing':
    'Bereits gemachte Buchungen sind nicht betroffen.',
  'tourDiscovery.keepsakes.title': 'Die Geschichte mitnehmen',
  'tourDiscovery.keepsakes.intro':
    'Andenken, die diese Tour fortsetzen. Sie werden separat bestellt, und die Tour hat keinen Einkaufsstopp.',
  'tourDiscovery.keepsakes.confirmedTitle': 'Ein Andenken zu dieser Tour',
  'tourDiscovery.keepsakes.confirmedIntro':
    'Optional. Separat bestellbar, jederzeit vor Ihrer Tour.',
}
