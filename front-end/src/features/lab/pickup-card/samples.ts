import type { PickupPlace } from '@sk/api-contract'

const base = {
  storeId: '00000000-0000-4000-8000-000000000001',
  mapsLink: 'https://www.google.com/maps/place/Luzern',
  latitude: 47.0502,
  longitude: 8.3093,
  position: 0,
  rowVersion: 1,
}

const weekdays = [1, 2, 3, 4, 5, 6].map(weekday => ({ weekday, opens: '10:00', closes: '18:00' }))

/** The sample points of the lab: complete ones, one with no German, one archived. */
export const samples: PickupPlace[] = [
  {
    ...base,
    id: '00000000-0000-4000-8000-0000000000a1',
    name: { en: 'Swiss Keepsakes shop, Old Town', de: 'Swiss Keepsakes Laden, Altstadt' },
    address: { en: 'Kapellgasse 12, 6004 Lucerne', de: 'Kapellgasse 12, 6004 Luzern' },
    instructions: { en: 'Ring the bell at the green door and give your order number.', de: 'Klingeln Sie an der grünen Tür und nennen Sie Ihre Bestellnummer.' },
    archived: false,
    hours: weekdays,
  },
  {
    ...base,
    id: '00000000-0000-4000-8000-0000000000a2',
    name: { en: 'Hotel Schweizerhof reception' },
    address: { en: 'Schweizerhofquai 3, 6002 Lucerne' },
    instructions: null,
    archived: false,
    hours: [1, 2, 3, 4, 5, 6, 7].map(weekday => ({ weekday, opens: '08:00', closes: '20:00' })),
    position: 1,
  },
  {
    ...base,
    id: '00000000-0000-4000-8000-0000000000a3',
    name: { en: 'Pop-up stand, Kapellbrücke', de: 'Pop-up-Stand, Kapellbrücke' },
    address: { en: 'Kapellbrücke, 6003 Lucerne', de: 'Kapellbrücke, 6003 Luzern' },
    instructions: { en: 'Summer only. Find the stand at the Water Tower end.', de: 'Nur im Sommer. Der Stand steht am Wasserturm-Ende.' },
    archived: true,
    hours: [],
    position: 2,
  },
  {
    ...base,
    id: '00000000-0000-4000-8000-0000000000a4',
    name: { en: 'Lucerne station, Travel Centre', de: 'Bahnhof Luzern, Reisezentrum' },
    address: { en: 'Zentralstrasse 1, 6003 Lucerne', de: 'Zentralstrasse 1, 6003 Luzern' },
    instructions: { en: 'Counter 4, ask for the Swiss Keepsakes shelf.', de: 'Schalter 4, fragen Sie nach dem Swiss-Keepsakes-Regal.' },
    archived: false,
    hours: [
      ...[1, 2, 3, 4, 5].map(weekday => ({ weekday, opens: '09:00', closes: '18:30' })),
      { weekday: 6, opens: '09:00', closes: '16:00' },
    ],
    position: 3,
  },
  {
    ...base,
    id: '00000000-0000-4000-8000-0000000000a5',
    name: { en: 'Hotel des Balances front desk', de: 'Hotel des Balances, Rezeption' },
    address: { en: 'Weinmarkt, 6004 Lucerne', de: 'Weinmarkt, 6004 Luzern' },
    instructions: null,
    archived: false,
    hours: [1, 2, 3, 4, 5, 6, 7].map(weekday => ({ weekday, opens: '07:00', closes: '22:00' })),
    position: 4,
  },
]
