import type { itineraryEn } from "./itinerary-messages";

export const itineraryDe: Record<keyof typeof itineraryEn, string> = {
  "products.itinerary.hint":
    "Gäste sehen diese Stationen in dieser Reihenfolge und mit denselben Nummern auf der Tourkarte. Suchen Sie einen Ort oder setzen Sie eine Markierung, um eine Station hinzuzufügen.",
  "products.itinerary.empty":
    "Noch keine Stationen. Suchen Sie oben einen Ort oder setzen Sie eine Markierung auf der Karte.",
  "products.itinerary.list": "Stationen in der Reihenfolge der Tour",
  "products.itinerary.search.label": "Station hinzufügen",
  "products.itinerary.search.placeholder": "Ort suchen",
  "products.itinerary.search.loading": "Suche läuft…",
  "products.itinerary.search.empty":
    "Keine Orte für «{query}» gefunden. Prüfen Sie die Schreibweise, auch ä, ö und ü.",
  "products.itinerary.search.error":
    "Die Ortssuche ist gerade nicht verfügbar. Prüfen Sie Ihre Verbindung oder setzen Sie eine Markierung auf der Karte.",
  "products.itinerary.search.retry": "Erneut versuchen",
  "products.itinerary.search.clear": "Suche löschen",
  "products.itinerary.search.results": "Gefundene Orte",
  "products.itinerary.drop.start": "Markierung setzen",
  "products.itinerary.drop.cancel": "Abbrechen",
  "products.itinerary.drop.hint":
    "Tippen Sie auf die Karte, wo die Station liegt.",
  "products.itinerary.map.label":
    "Karte der Stationen. Wählen Sie eine Markierung, um eine Station auszuwählen, oder ziehen Sie sie, um sie zu verschieben.",
  "products.itinerary.map.loading": "Karte wird geöffnet…",
  "products.itinerary.map.unavailable":
    "Die Karte konnte nicht geladen werden. Sie können weiterhin Orte suchen und jede Station in der Liste bearbeiten.",
  "products.itinerary.map.retry": "Karte neu laden",
  "products.itinerary.map.zoomIn": "Vergrössern",
  "products.itinerary.map.zoomOut": "Verkleinern",
  "products.itinerary.map.compass": "Norden ausrichten",
  "products.itinerary.map.touch": "Mit zwei Fingern die Karte bewegen",
  "products.itinerary.map.wheel": "Mit Strg + Scrollen die Karte zoomen",
  "products.itinerary.map.wheelMac": "Mit ⌘ + Scrollen die Karte zoomen",
  "products.itinerary.stop.number": "Station {n}",
  "products.itinerary.stop.unnamed": "Station ohne Namen",
  "products.itinerary.stop.numbered": "Station {n}",
  "products.itinerary.stop.noText": "Noch keine Beschreibung",
  "products.itinerary.stop.name": "Name",
  "products.itinerary.stop.text": "Was passiert",
  "products.itinerary.stop.minutes": "Minuten ab Start",
  "products.itinerary.stop.start": "Start",
  "products.itinerary.stop.minuteShort": "{minutes} Min.",
  "products.itinerary.stop.note": "Praktischer Tipp (optional)",
  "products.itinerary.stop.photo": "Foto der Station",
  "products.itinerary.stop.photoHelp":
    "Wird auf der Stationskarte in der Gästekarte gezeigt.",
  "products.itinerary.stop.details": "Zeit, Tipp, Foto",
  "products.itinerary.stop.moveUp": "{name} nach oben",
  "products.itinerary.stop.moveDown": "{name} nach unten",
  "products.itinerary.stop.remove": "{name} entfernen",
  "products.itinerary.stop.grip":
    "{name} verschieben: ziehen oder Pfeiltasten nach oben und unten nutzen",
  "products.itinerary.stop.toggle": "Station {n} bearbeiten: {name}",
  "products.itinerary.confirm.title": "«{name}» entfernen?",
  "products.itinerary.confirm.body":
    "Die Station verschwindet von der Tourkarte und die folgenden Stationen rücken um eine Nummer auf. Für Gäste ändert sich erst etwas, wenn Sie speichern.",
  "products.itinerary.confirm.action": "Station entfernen",
  "products.itinerary.live.added": "Station {n} hinzugefügt: {name}",
  "products.itinerary.live.moved": "Station auf Nummer {n} verschoben",
  "products.itinerary.live.removed": "Station entfernt",
  "products.itinerary.live.pin": "Markierung von Station {n} verschoben",
};
