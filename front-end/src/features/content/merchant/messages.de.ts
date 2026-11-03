import type { contentMerchantEn } from './messages'

export const contentMerchantDe: Record<keyof typeof contentMerchantEn, string>
  = {
    'merchantContent.title': 'Inhalte',
    'merchantContent.intro':
      'Geschichten für Ihre Gäste, ihre Kommentare und Bewertungen.',
    'merchantContent.tabsLabel': 'Inhaltsbereiche',
    'merchantContent.tab.stories': 'Geschichten',
    'merchantContent.tab.comments': 'Kommentare',
    'merchantContent.tab.reviews': 'Bewertungen',
    'merchantContent.filter.language': 'Sprache',
    'merchantContent.filter.status': 'Status',
    'merchantContent.lang.en': 'Englisch',
    'merchantContent.lang.de': 'Deutsch',
    'merchantContent.shop': 'Laden',
    'merchantContent.column.actions': 'Aktionen',
    'merchantContent.back': 'Zurück',

    'merchantArticles.moveUp': '{name} nach oben verschieben',
    'merchantArticles.moveDown': '{name} nach unten verschieben',
    'merchantArticles.remove': '{name} entfernen',

    'merchantArticles.photoSheet.title': 'Foto wählen',
    'merchantArticles.photoSheet.note':
      'Prototyp: Die Fotos stammen aus der Fotobibliothek des Ladens statt aus einem Upload.',
    'merchantArticles.photoSheet.use': 'Dieses Foto verwenden',
    'merchantArticles.audioSheet.title': 'Aufnahme wählen',
    'merchantArticles.audioSheet.note':
      'Prototyp: Die Aufnahmen stammen aus der Audiobibliothek des Ladens statt aus einem Upload.',
    'merchantArticles.audioSheet.use': 'Diese Aufnahme verwenden',

    'merchantArticles.kind.gift': 'Andenken',
    'merchantArticles.kind.tour': 'Tour',

    'merchantComments.filter.all': 'Alle',
    'merchantComments.filter.notReplied': 'Ohne Antwort',
    'merchantComments.filter.hidden': 'Ausgeblendet',
    'merchantComments.hidden': 'Ausgeblendet',
    'merchantComments.hiddenWithThread': 'Mit dem Kommentar ausgeblendet',
    'merchantComments.replyTo': 'Antwort an {name}',
    'merchantComments.article': 'Artikel',
    'merchantComments.column.comment': 'Kommentar',
    'merchantComments.column.article': 'Artikel',
    'merchantComments.column.status': 'Status',
    'merchantComments.replies.one': '1 Antwort',
    'merchantComments.replies.other': '{count} Antworten',
    'merchantComments.shopReplied': 'Laden hat geantwortet',
    'merchantComments.noReply': 'Noch keine Antwort',
    'merchantComments.action.reply': 'Antworten',
    'merchantComments.action.hide': 'Ausblenden',
    'merchantComments.action.show': 'Wieder anzeigen',
    'merchantComments.action.delete': 'Löschen',
    'merchantComments.action.more':
      'Weitere Aktionen für den Kommentar von {name}',
    'merchantComments.hiddenToast':
      'Kommentar ausgeblendet. Gäste sehen ihn nicht mehr.',
    'merchantComments.shownToast': 'Kommentar wird wieder angezeigt.',
    'merchantComments.delete.title': 'Kommentar von {name} löschen?',
    'merchantComments.delete.body':
      'Er wird endgültig aus der Geschichte entfernt.',
    'merchantComments.delete.bodyReplies.one':
      'Er wird mit seiner 1 Antwort endgültig aus der Geschichte entfernt.',
    'merchantComments.delete.bodyReplies.other':
      'Er wird mit seinen {count} Antworten endgültig aus der Geschichte entfernt.',
    'merchantComments.delete.confirm': 'Kommentar löschen',
    'merchantComments.deletedToast': 'Kommentar gelöscht.',
    'merchantComments.empty.all':
      'Noch keine Kommentare. Sie erscheinen hier, sobald Gäste sie schreiben.',
    'merchantComments.empty.notReplied': 'Jeder Kommentar hat eine Antwort.',
    'merchantComments.empty.hidden': 'Keine ausgeblendeten Kommentare.',
    'merchantComments.sheet.label': 'Ihre Antwort',
    'merchantComments.sheet.help':
      'Erscheint unter dem Kommentar in der Geschichte, als {name} mit dem Hinweis «Laden».',
    'merchantComments.sheet.error': 'Schreiben Sie zuerst eine Antwort.',
    'merchantComments.sheet.post': 'Antwort veröffentlichen',
    'merchantComments.postedToast':
      'Antwort veröffentlicht. Sie erscheint unter dem Kommentar in der Geschichte.',

    'merchantReviews.filter.all': 'Alle',
    'merchantReviews.filter.notReplied': 'Ohne Antwort',
    'merchantReviews.filter.replied': 'Beantwortet',
    'merchantReviews.status.replied': 'Beantwortet',
    'merchantReviews.status.notReplied': 'Ohne Antwort',
    'merchantReviews.rule':
      'Bewertungen lassen sich nicht löschen. Antworten Sie, um die Sicht des Ladens zu ergänzen.',
    'merchantReviews.replyFrom': 'Antwort von {name} · {date}',
    'merchantReviews.action.reply': 'Antworten',
    'merchantReviews.action.edit': 'Antwort bearbeiten',
    'merchantReviews.action.replyTo': '{name} antworten',
    'merchantReviews.action.editFor': 'Antwort an {name} bearbeiten',
    'merchantReviews.column.review': 'Bewertung',
    'merchantReviews.column.item': 'Andenken oder Tour',
    'merchantReviews.column.reply': 'Antwort',
    'merchantReviews.empty.all':
      'Noch keine Bewertungen. Gäste können ein Andenken oder eine Tour nach Abschluss bewerten.',
    'merchantReviews.empty.notReplied': 'Jede Bewertung hat eine Antwort.',
    'merchantReviews.empty.replied': 'Noch keine Antworten.',
    'merchantReviews.sheet.titleNew': 'Antwort an {name}',
    'merchantReviews.sheet.titleEdit': 'Antwort an {name} bearbeiten',
    'merchantReviews.sheet.language': 'Sprache Ihrer Antwort',
    'merchantReviews.sheet.languageHelp':
      'Gäste, die in der anderen Sprache lesen, sehen einen Sprachhinweis.',
    'merchantReviews.sheet.help':
      'Erscheint öffentlich unter der Bewertung, als {name}.',
    'merchantReviews.sheet.post': 'Antwort veröffentlichen',
    'merchantReviews.sheet.save': 'Antwort speichern',
    'merchantReviews.postedToast':
      'Antwort veröffentlicht. Sie erscheint unter der Bewertung.',
    'merchantReviews.savedToast': 'Antwort aktualisiert.',

    'reviewReply.from': 'Antwort von {name}',
  }
