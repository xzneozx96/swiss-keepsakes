import type { contentEn } from './messages'

import { musicDe } from '@/components/background-music-messages.de'

export const contentDe: Record<keyof typeof contentEn, string> = {
  ...musicDe,
  'stories.title': 'Geschichten aus Luzern',
  'stories.intro':
    'Spaziergänge, Geschichte und der See, zum Lesen vor dem Besuch.',
  'stories.count.one': '1 Geschichte',
  'stories.count.other': '{count} Geschichten',
  'stories.empty': 'Es gibt noch keine Geschichten auf Deutsch.',
  'stories.filter': 'Kategorien der Geschichten',
  'stories.all': 'Alle Geschichten',
  'stories.category.eat': 'Essen & Trinken',
  'stories.category.town': 'In der Stadt',
  'stories.category.lake': 'See & Berge',
  'stories.category.craft': 'Handwerk',
  'stories.emptyCategory':
    'Hier gibt es noch keine Geschichten. Die ersten folgen bald.',
  'article.meta': '{date} · {minutes} Min. Lesezeit',
  'article.contents': 'In dieser Geschichte',
  'article.onlyIn.en': 'Diese Geschichte gibt es nur auf Englisch.',
  'article.onlyIn.de': 'Diese Geschichte gibt es nur auf Deutsch.',
  'article.linked': 'Ein Stück davon mitnehmen',
  'article.more': 'Mehr entdecken',
  'article.comments': 'Kommentare',
  'article.showAll.one': '{count} Kommentar anzeigen',
  'article.showAll.other': 'Alle {count} Kommentare anzeigen',
  'article.noComments':
    'Noch keine Kommentare. Teilen Sie einen Tipp oder eine Erinnerung.',
  'article.signInToComment': 'Anmelden zum Kommentieren',
  'article.write': 'Kommentar schreiben',
  'article.reply': 'Antworten',
  'article.replyTo': 'Antwort an {name}',
  'article.shop': 'Laden',
  'article.composer.label': 'Ihr Kommentar',
  'article.composer.help':
    'Erscheint als {name}. Der Laden kann Kommentare ausblenden, die nicht zum Thema passen.',
  'article.composer.error': 'Schreiben Sie zuerst einen Kommentar.',
  'article.post': 'Kommentar veröffentlichen',
  'article.close': 'Schliessen',
  'article.posted': 'Ihr Kommentar ist veröffentlicht.',
  'article.notFound': 'Diese Geschichte ist nicht verfügbar.',
  'article.allStories': 'Alle Geschichten',
  'article.video.play': 'Video abspielen: {title}',
  'article.video.source': 'Wird von YouTube abgespielt',
  'article.audio.play': 'Abspielen: {title}',
  'article.audio.pause': 'Pausieren: {title}',
}
