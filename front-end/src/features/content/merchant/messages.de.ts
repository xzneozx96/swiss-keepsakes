import type { contentMerchantEn } from "./messages";

export const contentMerchantDe: Record<keyof typeof contentMerchantEn, string> =
  {
    "merchantContent.title": "Inhalte",
    "merchantContent.intro":
      "Geschichten für Ihre Gäste, ihre Kommentare und Bewertungen.",
    "merchantContent.tabsLabel": "Inhaltsbereiche",
    "merchantContent.tab.articles": "Artikel",
    "merchantContent.tab.comments": "Kommentare",
    "merchantContent.tab.reviews": "Bewertungen",
    "merchantContent.filtersLabel": "Filter",
    "merchantContent.lang.en": "Englisch",
    "merchantContent.lang.de": "Deutsch",
    "merchantContent.shop": "Laden",
    "merchantContent.column.actions": "Aktionen",
    "merchantContent.back": "Zurück",

    "merchantArticles.new": "Neuer Artikel",
    "merchantArticles.filter.all": "Alle",
    "merchantArticles.status.published": "Veröffentlicht",
    "merchantArticles.status.draft": "Entwurf",
    "merchantArticles.missing.en": "Keine englische Version",
    "merchantArticles.missing.de": "Keine deutsche Version",
    "merchantArticles.unpublishedLinks.one":
      "1 verknüpfter Eintrag ist nicht veröffentlicht",
    "merchantArticles.unpublishedLinks.other":
      "{count} verknüpfte Einträge sind nicht veröffentlicht",
    "merchantArticles.publishedOn": "Veröffentlicht am {date}",
    "merchantArticles.editedOn": "Bearbeitet am {date}",
    "merchantArticles.readTime": "{minutes} Min. Lesezeit",
    "merchantArticles.untitled": "Ohne Titel",
    "merchantArticles.links": "Andenken und Touren",
    "merchantArticles.comments": "Kommentare",
    "merchantArticles.column.article": "Artikel",
    "merchantArticles.column.status": "Status",
    "merchantArticles.column.links": "Verknüpfungen",
    "merchantArticles.column.updated": "Letzte Änderung",
    "merchantArticles.empty.all":
      "Noch keine Artikel. Schreiben Sie die erste Geschichte für Ihre Gäste.",
    "merchantArticles.empty.en": "Noch keine Artikel auf Englisch.",
    "merchantArticles.empty.de": "Noch keine Artikel auf Deutsch.",

    "merchantArticles.back": "Alle Artikel",
    "merchantArticles.newTitle": "Neuer Artikel",
    "merchantArticles.notFound": "Diesen Artikel gibt es nicht mehr.",
    "merchantArticles.publication.eyebrow": "Veröffentlichung",
    "merchantArticles.publication.new": "Neuer Entwurf",
    "merchantArticles.publication.draft": "Entwurf: für Gäste unsichtbar",
    "merchantArticles.publication.published": "Veröffentlicht auf {language}",
    "merchantArticles.publication.draftBody":
      "Nach dem Veröffentlichen erscheint er unter Geschichten für Gäste, die auf {language} lesen.",
    "merchantArticles.publication.publishedBody":
      "Seit {date} unter Geschichten für Gäste, die auf {language} lesen.",
    "merchantArticles.unsaved": "Ungespeicherte Änderungen",
    "merchantArticles.action.saveDraft": "Entwurf speichern",
    "merchantArticles.action.publish": "Veröffentlichen",
    "merchantArticles.action.save": "Änderungen speichern",
    "merchantArticles.action.unpublish": "Offline nehmen",
    "merchantArticles.toast.saved": "Entwurf gespeichert.",
    "merchantArticles.toast.savedPublished":
      "Änderungen gespeichert. Gäste sehen sie jetzt.",
    "merchantArticles.toast.published":
      "Veröffentlicht. Er erscheint jetzt unter Geschichten auf {language}.",
    "merchantArticles.toast.unpublished":
      "Offline genommen. Gäste sehen ihn nicht mehr.",
    "merchantArticles.unpublish.title": "«{title}» offline nehmen?",
    "merchantArticles.unpublish.body":
      "Gäste sehen ihn nicht mehr unter Geschichten und in anderen Geschichten. Die Kommentare bleiben erhalten.",
    "merchantArticles.errors.publish.one":
      "Füllen Sie 1 markiertes Feld aus, um zu veröffentlichen.",
    "merchantArticles.errors.publish.other":
      "Füllen Sie die {count} markierten Felder aus, um zu veröffentlichen.",
    "merchantArticles.errors.save":
      "Korrigieren Sie die markierten Felder, um zu speichern.",

    "merchantArticles.details": "Angaben",
    "merchantArticles.language": "Sprache",
    "merchantArticles.languageHelp":
      "Jede Sprachversion ist ein eigener Artikel. Die Sprache lässt sich später nicht ändern.",
    "merchantArticles.field.title": "Titel",
    "merchantArticles.field.excerpt": "Kurzbeschreibung",
    "merchantArticles.field.excerptHelp":
      "Erscheint unter dem Titel auf dem Titelbild und in Listen.",
    "merchantArticles.field.intro": "Einleitung",
    "merchantArticles.field.introHelp": "Der erste Absatz vor den Abschnitten.",
    "merchantArticles.author": "Autor:in",
    "merchantArticles.author.help":
      "Jemand aus unserem Team, mit Foto angezeigt.",
    "merchantArticles.field.authorName": "Name",
    "merchantArticles.field.authorRole": "Funktion",
    "merchantArticles.cover": "Titelbild",
    "merchantArticles.photo.choose": "Foto wählen",
    "merchantArticles.photo.change": "Foto ändern",
    "merchantArticles.photo.none": "Kein Foto gewählt",

    "merchantArticles.error.title": "Geben Sie einen Titel ein.",
    "merchantArticles.error.excerpt": "Geben Sie eine Kurzbeschreibung ein.",
    "merchantArticles.error.intro": "Geben Sie eine Einleitung ein.",
    "merchantArticles.error.authorName": "Geben Sie den Namen ein.",
    "merchantArticles.error.authorRole": "Geben Sie die Funktion ein.",
    "merchantArticles.error.cover": "Wählen Sie ein Titelbild.",
    "merchantArticles.error.place": "Geben Sie an, wo die Geschichte spielt.",
    "merchantArticles.category": "Kategorie",
    "merchantArticles.categoryHelp":
      "Gäste filtern die Geschichten danach und sehen sie auf den Karten der Startseite.",
    "merchantArticles.field.place": "Ort",
    "merchantArticles.field.placeHelp":
      "Wo die Geschichte spielt, z. B. Altstadt oder Bürgenstock. Mit Stecknadel auf den Karten der Startseite.",
    "merchantArticles.error.sections":
      "Fügen Sie mindestens einen Abschnitt hinzu.",
    "merchantArticles.error.heading": "Geben Sie eine Überschrift ein.",
    "merchantArticles.error.blocks":
      "Fügen Sie diesem Abschnitt mindestens einen Block hinzu.",
    "merchantArticles.error.paragraph":
      "Schreiben Sie den Absatz oder entfernen Sie ihn.",
    "merchantArticles.error.photo": "Wählen Sie ein Foto.",
    "merchantArticles.error.caption":
      "Beschreiben Sie das Foto. Screenreader lesen den Text vor.",
    "merchantArticles.error.youtube":
      "Geben Sie einen YouTube-Link oder eine Video-ID ein.",
    "merchantArticles.error.videoTitle": "Geben Sie den Titel des Videos ein.",
    "merchantArticles.error.audio": "Wählen Sie eine Aufnahme.",
    "merchantArticles.error.audioTitle":
      "Geben Sie einen Titel für die Aufnahme ein.",

    "merchantArticles.sections": "Abschnitte",
    "merchantArticles.sectionsHelp":
      "Jede Überschrift wird ein Eintrag in der Inhaltsleiste der Geschichte.",
    "merchantArticles.section": "Abschnitt {n}",
    "merchantArticles.field.heading": "Überschrift",
    "merchantArticles.addSection": "Abschnitt hinzufügen",
    "merchantArticles.addBlock": "Block hinzufügen",
    "merchantArticles.addBlockTo": "Block zu Abschnitt {n} hinzufügen",
    "merchantArticles.block.paragraph": "Absatz",
    "merchantArticles.block.image": "Foto",
    "merchantArticles.block.video": "YouTube-Video",
    "merchantArticles.block.audio": "Audio",
    "merchantArticles.field.text": "Text",
    "merchantArticles.field.caption": "Bildunterschrift",
    "merchantArticles.field.youtube": "YouTube-Link oder Video-ID",
    "merchantArticles.field.youtubeHelp":
      "Der Player lädt erst, wenn ein Gast auf Abspielen tippt.",
    "merchantArticles.field.videoTitle": "Titel des Videos",
    "merchantArticles.field.mediaCaption": "Beschriftung (optional)",
    "merchantArticles.field.audioTitle": "Titel",
    "merchantArticles.audio.choose": "Aufnahme wählen",
    "merchantArticles.audio.change": "Aufnahme ändern",
    "merchantArticles.audio.none": "Keine Aufnahme gewählt",
    "merchantArticles.moveUp": "{name} nach oben verschieben",
    "merchantArticles.moveDown": "{name} nach unten verschieben",
    "merchantArticles.remove": "{name} entfernen",
    "merchantArticles.blockName": "{block} in Abschnitt {n}",
    "merchantArticles.removeSection.title": "Abschnitt {n} entfernen?",
    "merchantArticles.removeSection.body":
      "Die Überschrift und der ganze Inhalt verlassen den Artikel, sobald Sie speichern.",
    "merchantArticles.removeSection.confirm": "Abschnitt entfernen",
    "merchantArticles.removeBlock.title": "Block entfernen: {block}?",
    "merchantArticles.removeBlock.body":
      "Der Inhalt verlässt den Artikel, sobald Sie speichern.",
    "merchantArticles.removeBlock.confirm": "Block entfernen",

    "merchantArticles.photoSheet.title": "Foto wählen",
    "merchantArticles.photoSheet.note":
      "Prototyp: Die Fotos stammen aus der Fotobibliothek des Ladens statt aus einem Upload.",
    "merchantArticles.photoSheet.use": "Dieses Foto verwenden",
    "merchantArticles.audioSheet.title": "Aufnahme wählen",
    "merchantArticles.audioSheet.note":
      "Prototyp: Die Aufnahmen stammen aus der Audiobibliothek des Ladens statt aus einem Upload.",
    "merchantArticles.audioSheet.use": "Diese Aufnahme verwenden",

    "merchantArticles.links.help":
      "Erscheinen unter der Geschichte in dieser Reihenfolge. Bis zu 6, nur veröffentlichte.",
    "merchantArticles.links.count": "{count} von 6",
    "merchantArticles.links.add": "Andenken oder Tour hinzufügen",
    "merchantArticles.links.empty":
      "Keine Andenken oder Touren verknüpft. Die Geschichte blendet diesen Teil aus.",
    "merchantArticles.links.limit":
      "6 verknüpft, mehr zeigt eine Geschichte nicht. Entfernen Sie einen Eintrag, um einen anderen hinzuzufügen.",
    "merchantArticles.links.unpublished":
      "Nicht veröffentlicht: in der Geschichte ausgeblendet",
    "merchantArticles.links.soldOut": "Ausverkauft",
    "merchantArticles.kind.gift": "Andenken",
    "merchantArticles.kind.tour": "Tour",
    "merchantArticles.linkSheet.title": "Andenken oder Tour hinzufügen",
    "merchantArticles.linkSheet.gifts": "Andenken",
    "merchantArticles.linkSheet.tours": "Touren",
    "merchantArticles.linkSheet.note":
      "Nur veröffentlichte Andenken und Touren lassen sich verknüpfen.",
    "merchantArticles.linkSheet.add": "Hinzufügen",
    "merchantArticles.linkSheet.added": "Hinzugefügt",
    "merchantArticles.linkSheet.addItem": "{name} hinzufügen",
    "merchantArticles.linkSheet.done": "Fertig",

    "merchantArticles.related.title": "Mehr entdecken",
    "merchantArticles.related.help":
      "Bis zu 3 andere veröffentlichte Geschichten auf {language}, am Ende angezeigt.",
    "merchantArticles.related.count": "{count} von 3",
    "merchantArticles.related.empty":
      "Keine gewählt: Es erscheinen die neuesten anderen Geschichten auf {language}.",
    "merchantArticles.related.add": "Geschichte hinzufügen",
    "merchantArticles.related.limit":
      "3 gewählt, mehr zeigt dieser Teil nicht. Entfernen Sie eine, um eine andere hinzuzufügen.",
    "merchantArticles.relatedSheet.title": "Geschichte hinzufügen",
    "merchantArticles.relatedSheet.none":
      "Keine weiteren veröffentlichten Geschichten auf {language}.",

    "merchantArticles.version.title": "Andere Sprache",
    "merchantArticles.version.open.en": "Englische Version öffnen",
    "merchantArticles.version.open.de": "Deutsche Version öffnen",
    "merchantArticles.version.missing.en":
      "Noch keine englische Version. Gäste, die auf Englisch lesen, finden diese Geschichte nicht unter Geschichten.",
    "merchantArticles.version.missing.de":
      "Noch keine deutsche Version. Gäste, die auf Deutsch lesen, finden diese Geschichte nicht unter Geschichten.",
    "merchantArticles.version.add.en": "Englische Version hinzufügen",
    "merchantArticles.version.add.de": "Deutsche Version hinzufügen",
    "merchantArticles.version.addHelp":
      "Sie beginnt als Entwurf mit dem Inhalt dieser Version, bereit zum Übersetzen.",
    "merchantArticles.toast.versionAdded.en":
      "Englischer Entwurf erstellt. Übersetzen und dann veröffentlichen.",
    "merchantArticles.toast.versionAdded.de":
      "Deutscher Entwurf erstellt. Übersetzen und dann veröffentlichen.",

    "merchantComments.filter.all": "Alle",
    "merchantComments.filter.notReplied": "Ohne Antwort",
    "merchantComments.filter.hidden": "Ausgeblendet",
    "merchantComments.hidden": "Ausgeblendet",
    "merchantComments.hiddenWithThread": "Mit dem Kommentar ausgeblendet",
    "merchantComments.replyTo": "Antwort an {name}",
    "merchantComments.article": "Artikel",
    "merchantComments.column.comment": "Kommentar",
    "merchantComments.column.article": "Artikel",
    "merchantComments.column.status": "Status",
    "merchantComments.replies.one": "1 Antwort",
    "merchantComments.replies.other": "{count} Antworten",
    "merchantComments.shopReplied": "Laden hat geantwortet",
    "merchantComments.noReply": "Noch keine Antwort",
    "merchantComments.action.reply": "Antworten",
    "merchantComments.action.hide": "Ausblenden",
    "merchantComments.action.show": "Wieder anzeigen",
    "merchantComments.action.delete": "Löschen",
    "merchantComments.action.more":
      "Weitere Aktionen für den Kommentar von {name}",
    "merchantComments.hiddenToast":
      "Kommentar ausgeblendet. Gäste sehen ihn nicht mehr.",
    "merchantComments.shownToast": "Kommentar wird wieder angezeigt.",
    "merchantComments.delete.title": "Kommentar von {name} löschen?",
    "merchantComments.delete.body":
      "Er wird endgültig aus der Geschichte entfernt.",
    "merchantComments.delete.bodyReplies.one":
      "Er wird mit seiner 1 Antwort endgültig aus der Geschichte entfernt.",
    "merchantComments.delete.bodyReplies.other":
      "Er wird mit seinen {count} Antworten endgültig aus der Geschichte entfernt.",
    "merchantComments.delete.confirm": "Kommentar löschen",
    "merchantComments.deletedToast": "Kommentar gelöscht.",
    "merchantComments.empty.all":
      "Noch keine Kommentare. Sie erscheinen hier, sobald Gäste sie schreiben.",
    "merchantComments.empty.notReplied": "Jeder Kommentar hat eine Antwort.",
    "merchantComments.empty.hidden": "Keine ausgeblendeten Kommentare.",
    "merchantComments.sheet.label": "Ihre Antwort",
    "merchantComments.sheet.help":
      "Erscheint unter dem Kommentar in der Geschichte, als {name} mit dem Hinweis «Laden».",
    "merchantComments.sheet.error": "Schreiben Sie zuerst eine Antwort.",
    "merchantComments.sheet.post": "Antwort veröffentlichen",
    "merchantComments.postedToast":
      "Antwort veröffentlicht. Sie erscheint unter dem Kommentar in der Geschichte.",

    "merchantReviews.filter.all": "Alle",
    "merchantReviews.filter.notReplied": "Ohne Antwort",
    "merchantReviews.filter.replied": "Beantwortet",
    "merchantReviews.status.replied": "Beantwortet",
    "merchantReviews.status.notReplied": "Ohne Antwort",
    "merchantReviews.rule":
      "Bewertungen lassen sich nicht löschen. Antworten Sie, um die Sicht des Ladens zu ergänzen.",
    "merchantReviews.replyFrom": "Antwort von {name} · {date}",
    "merchantReviews.action.reply": "Antworten",
    "merchantReviews.action.edit": "Antwort bearbeiten",
    "merchantReviews.action.replyTo": "{name} antworten",
    "merchantReviews.action.editFor": "Antwort an {name} bearbeiten",
    "merchantReviews.column.review": "Bewertung",
    "merchantReviews.column.item": "Andenken oder Tour",
    "merchantReviews.column.reply": "Antwort",
    "merchantReviews.empty.all":
      "Noch keine Bewertungen. Gäste können ein Andenken oder eine Tour nach Abschluss bewerten.",
    "merchantReviews.empty.notReplied": "Jede Bewertung hat eine Antwort.",
    "merchantReviews.empty.replied": "Noch keine Antworten.",
    "merchantReviews.sheet.titleNew": "Antwort an {name}",
    "merchantReviews.sheet.titleEdit": "Antwort an {name} bearbeiten",
    "merchantReviews.sheet.language": "Sprache Ihrer Antwort",
    "merchantReviews.sheet.languageHelp":
      "Gäste, die in der anderen Sprache lesen, sehen einen Sprachhinweis.",
    "merchantReviews.sheet.help":
      "Erscheint öffentlich unter der Bewertung, als {name}.",
    "merchantReviews.sheet.post": "Antwort veröffentlichen",
    "merchantReviews.sheet.save": "Antwort speichern",
    "merchantReviews.postedToast":
      "Antwort veröffentlicht. Sie erscheint unter der Bewertung.",
    "merchantReviews.savedToast": "Antwort aktualisiert.",

    "reviewReply.from": "Antwort von {name}",
  };
