/** The strings of the location card lab that the product does not have yet, English only. The product's own strings come from the places messages. */
export const copy = {
  back: 'Lab',
  title: 'Location card (place editor, step 1: Location on the map)',
  intro: 'Option C was chosen on 30.10.2026 and built into the place editor (step 1); this page keeps it as the reference. The owner called the card in commit d24d43d6 ugly: a link input in a grey frame stuck on top of the map, “Remove the position” as a pink pill bottom-left, the credits bottom-right. Three layouts were tried; C is kept as a working card: the real map picker, the real Google Maps link reader (a short link is answered with a canned result here instead of the server), and the same sample state, a pin on the Chapel Bridge.',
  practiceTitle: 'Common practice this draws on',
  practice: [
    'Google Maps: the search is a white pill floating over the map, and the map controls (locate, zoom) are a round-cornered stack at the edge.',
    'Airbnb host, “Where’s your place located?”: the address field floats over the map and a confirm-the-pin card sits on it.',
    'Apple Maps and Uber pickup: the search sheet is above the map, and recenter and clear are map controls, not form buttons.',
    'Shopify and Booking extranet location: the field is above, the map is below with a gap, and the coordinates are read out.',
  ],
  samplesTitle: 'Links to paste',
  samples: [
    { label: 'Long link', text: 'https://www.google.com/maps/place/Kapellbr%C3%BCcke/@47.0516,8.3073,17z/data=!3d47.05168!4d8.3074' },
    { label: 'Short link (answered with a canned result)', text: 'https://maps.app.goo.gl/kapellbruecke' },
    { label: 'Not a Google Maps link', text: 'https://example.com/lucerne' },
  ],
  reset: 'Reset the card',
  heightAt: (px: number) => `Height: ${px} px at this width`,
  recenter: 'Recenter on the pin',
  linkHelp: 'Paste a link from Google Maps, or tap the map.',
  mapFailed: 'The map could not be loaded.',
  options: {
    c: {
      id: 'C',
      title: 'Clean field, then map',
      why: 'The link is a normal field like every other field, with its help line, then a 12 px gap and the map in its own rounded frame; recenter and remove are a small white control group on the map, and the answer is the field’s own description. Follows Uber’s pickup (search above, controls on the map) and Google Maps’ control stack.',
    },
  },
}
