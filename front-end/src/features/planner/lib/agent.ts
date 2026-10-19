import type { UIMessage } from 'ai'

import type { Interest } from '../data/places'

import type { Plan, PlanInput } from './plan'
import {
  EVENTS,
  HOTELS,

  INTERESTS,
  PLACES,
  restaurantById,
  RESTAURANTS,
} from '../data/places'
import { closedPlaces, dayLabel, restaurantOpen } from './hours'
import { buildWithDiff, hotelName } from './plan'

export type Step
  = | { kind: 'reasoning', text: string }
    | { kind: 'tool', name: string, input: unknown, output: unknown, ms?: number }
    | { kind: 'ask', name: string, input: unknown }
    | { kind: 'text', text: string }

export type Turn = Step[]

export interface AgentHooks {
  createInquiry: (summary: {
    answers: { question: string, answer: string }[]
  }) => string
}

interface Answer {
  name: string
  output: Record<string, unknown>
}

const TWEAKS = ['less-walking', 'indoor', 'later', 'shopping']

/** Every answered client tool, in conversation order. */
function answered(messages: UIMessage[]): Answer[] {
  return messages
    .filter(m => m.role === 'assistant')
    .flatMap(m => m.parts)
    .flatMap((part) => {
      const p = part as {
        type: string
        state?: string
        output?: Record<string, unknown>
      }

      return p.type.startsWith('tool-ask_')
        && p.state === 'output-available'
        && p.output
        ? [{ name: p.type.slice(5), output: p.output }]
        : []
    })
}

function latest(a: Answer[], name: string) {
  return [...a].reverse().find(x => x.name === name)?.output
}

export function inputFrom(a: Answer[]): PlanInput | null {
  const stay = latest(a, 'ask_stay')
  const party = latest(a, 'ask_party')
  const date = latest(a, 'ask_date')
  const time = latest(a, 'ask_time')
  const interests = latest(a, 'ask_interests')

  if (!stay || !party || !date || !time || !interests)
    return null
  const diet = latest(a, 'ask_diet')

  return {
    stay: stay.id as string,
    adults: party.adults as number,
    children: party.children as number,
    date: date.date as string,
    start: time.start as string,
    length: time.length as 'half' | 'full',
    interests: interests.interests as Interest[],
    diet: (diet?.diet as 'any' | 'veg') ?? 'any',
    tweaks: a
      .filter(x => x.name === 'ask_next')
      .map(x => x.output.id as string)
      .filter(id => TWEAKS.includes(id) || id.startsWith('lunch:')),
  }
}

function interestLabels(ids: Interest[]) {
  return ids
    .map(i => INTERESTS.find(x => x.id === i)?.label.toLowerCase())
    .join(', ')
}

function planTurn(input: PlanInput, lead: string): Turn {
  const plan = buildWithDiff(input)
  const lunchOpen = RESTAURANTS.filter(r => restaurantOpen(r.id, input.date))
  const lunchClosed = RESTAURANTS.filter(
    r => !restaurantOpen(r.id, input.date),
  )
  const first = input.tweaks.length === 0
  const hotel = hotelName(input.stay)
  const lines = plan.items.filter(i => i.kind !== 'move')

  const reasoning = [
    lead,
    first
    && `Starting from ${hotel}. ${input.children > 0 ? 'There are children in the group, so I\'ll skip anything with steep stairs. ' : ''}They like ${interestLabels(input.interests)}.`,
    plan.skipped.length
    && `Left out for ${plan.dayLabel}: ${plan.skipped.map(s => `${s.name} (${s.reason})`).join('; ')}.`,
    lunchClosed.length
    && `${lunchClosed.map(r => r.name).join(' and ')} ${lunchClosed.length > 1 ? 'are' : 'is'} closed that day, so lunch comes from the places that are open.`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const changes
    = plan.added.length || plan.removed.length
      ? [
          plan.added.length && `Added: ${plan.added.join(', ')}.`,
          plan.removed.length && `Removed: ${plan.removed.join(', ')}.`,
        ]
          .filter(Boolean)
          .join(' ')
      : ''

  const used = new Set(input.tweaks)
  const options = [
    !used.has('less-walking') && {
      id: 'less-walking',
      label: 'Less walking',
      group: 'Adjust',
    },
    !used.has('indoor') && {
      id: 'indoor',
      label: 'Indoor places only',
      group: 'Adjust',
    },
    !used.has('later') && {
      id: 'later',
      label: 'Start 1 hour later',
      group: 'Adjust',
    },
    !used.has('shopping')
    && !input.interests.includes('shopping') && {
      id: 'shopping',
      label: 'Add shopping',
      group: 'Adjust',
    },
    !input.tweaks.some(t => t.startsWith('lunch:'))
    && plan.lunchAlternatives.slice(0, 2).map(r => ({
      id: `lunch:${r.id}`,
      label: `Lunch at ${r.name}`,
      group: 'Adjust',
    })),
    plan.items.some(i => i.kind === 'lunch') && {
      id: 'reserve',
      label: 'Reserve lunch',
      group: 'Next',
    },
    { id: 'tours', label: 'Browse our tours', group: 'Next' },
    { id: 'send', label: 'Send this plan to our team', group: 'Next' },
  ]
    .flat()
    .filter(Boolean)

  return [
    { kind: 'reasoning', text: reasoning },
    {
      kind: 'tool',
      name: 'find_lunch',
      input: { date: input.date, vegetarian: input.diet === 'veg' },
      output: {
        weekday: dayLabel(input.date).split(' ')[0],
        open: lunchOpen
          .filter(r => input.diet === 'any' || r.veg)
          .map(r => ({ name: r.name, price: r.price })),
        closed: lunchClosed.map(r => ({
          name: r.name,
          reason: 'closed that weekday',
        })),
      },
      ms: 800,
    },
    {
      kind: 'tool',
      name: 'build_itinerary',
      input: { ...input },
      output: plan satisfies Plan,
      ms: 1300,
    },
    {
      kind: 'text',
      text:
        `${first
          ? `Here is your ${input.length === 'full' ? 'full' : 'half'} day in Luzerne, ${lines.length} stops, every one checked against ${plan.dayLabel}'s opening hours.`
          : `Updated. ${changes || 'The plan is unchanged: nothing else fits.'}`
        } Want to adjust anything?`,
    },
    {
      kind: 'ask',
      name: 'ask_next',
      input: { prompt: 'Adjust the plan, or pick a next step.', options },
    },
  ]
}

const REASON_TWEAK: Record<string, string> = {
  'less-walking':
    'They want less walking. I\'ll drop the longest legs and the climb to the Zytturm, and cap every walk at 10 minutes.',
  'indoor':
    'Switching to indoor places only: museums, the Glacier Garden and shops. I don\'t need a forecast for this, it simply works in any weather.',
  'later':
    'Moving the start an hour later. Closing times matter more now, so I\'ll re-check each stop.',
  'shopping':
    'Adding a shopping stop. Swiss shops mostly close on Sundays, so I\'ll check the day first.',
}

/** The scripted agent: reads the conversation so far and returns the next turn. */
export function nextTurn(messages: UIMessage[], hooks: AgentHooks): Turn {
  const a = answered(messages)
  const last = a.at(-1)

  if (!last) {
    return [
      {
        kind: 'reasoning',
        text: 'To plan a day I need a starting point, because every walking time depends on it. Let me look up the central hotels first.',
      },
      {
        kind: 'tool',
        name: 'list_hotels',
        input: { area: 'Luzerne centre' },
        output: {
          count: HOTELS.length,
          hotels: HOTELS.map(h => ({
            name: h.name,
            area: h.area,
            address: h.address,
          })),
        },
        ms: 700,
      },
      {
        kind: 'text',
        text: 'Hi! I\'m your Luzerne trip planner. I plan from real opening hours, so you won\'t be sent anywhere that is closed. Where are you staying?',
      },
      {
        kind: 'ask',
        name: 'ask_stay',
        input: {
          options: [
            ...HOTELS.map(h => ({
              id: h.id,
              label: h.name,
              hint: `${h.area} · ${h.address}`,
            })),
            {
              id: 'none',
              label: 'I haven\'t booked yet',
              hint: 'I\'ll start from the station',
            },
            {
              id: 'zurich',
              label: 'Day trip from Zürich',
              hint: 'I arrive by train',
            },
          ],
        },
      },
    ]
  }

  switch (last.name) {
    case 'ask_stay':
      return [
        {
          kind: 'text',
          text: `Good, ${last.output.label}. Who is travelling?`,
        },
        { kind: 'ask', name: 'ask_party', input: {} },
      ]
    case 'ask_party':
      return [
        { kind: 'text', text: 'Which day would you like to plan?' },
        { kind: 'ask', name: 'ask_date', input: {} },
      ]
    case 'ask_date': {
      const iso = last.output.date as string
      const closed = closedPlaces(iso)
      const events = EVENTS.filter(e => iso >= e.from && iso <= e.to)
      const open = PLACES.filter(p => !closed.some(c => c.id === p.id))

      return [
        {
          kind: 'reasoning',
          text: `${dayLabel(iso)}. Before I suggest anything I should check what is actually open that day, because several Luzerne attractions close or change hours in winter.`,
        },
        {
          kind: 'tool',
          name: 'check_opening_status',
          input: { date: iso },
          output: {
            date: iso,
            weekday: dayLabel(iso).split(' ')[0],
            open: open.map(p => p.name),
            closed: closed.map(c => ({ name: c.name, reason: c.reason })),
            events: events.map(e => e.text),
          },
          ms: 1100,
        },
        {
          kind: 'text',
          text: closed.length
            ? `On ${dayLabel(iso)}, ${closed.length} places are closed: ${closed
              .slice(0, 3)
              .map(c => c.name)
              .join(
                ', ',
              )}${closed.length > 3 ? ' and more' : ''}. I'll plan around that. When do you want to set off, and for how long?`
            : 'Everything is open that day. When do you want to set off, and for how long?',
        },
        { kind: 'ask', name: 'ask_time', input: {} },
      ]
    }
    case 'ask_time':
      return [
        {
          kind: 'text',
          text: 'What do you enjoy most? Pick as many as you like.',
        },
        { kind: 'ask', name: 'ask_interests', input: {} },
      ]
    case 'ask_interests': {
      const interests = last.output.interests as Interest[]

      if (interests.includes('food')) {
        return [
          { kind: 'text', text: 'Any dietary needs for lunch?' },
          { kind: 'ask', name: 'ask_diet', input: {} },
        ]
      }
      const input = inputFrom(a)

      return input
        ? planTurn(input, 'Let me line up lunch and then build the route.')
        : []
    }
    case 'ask_diet': {
      const input = inputFrom(a)

      return input
        ? planTurn(
            input,
            'Vegetarian options are documented at some restaurants and not others, so I\'ll only use the ones that list them.',
          )
        : []
    }
    case 'ask_next': {
      const id = last.output.id as string
      const input = inputFrom(a)

      if (id === 'reserve' || id === 'send') {
        const plan = input && buildWithDiff(input)
        const lunch = plan?.items.find(i => i.kind === 'lunch')
        const r = lunch ? restaurantById(lunch.id) : undefined

        if (id === 'reserve' && r) {
          return [
            {
              kind: 'tool',
              name: 'get_booking_info',
              input: { restaurant: r.name },
              output: {
                name: r.name,
                phone: r.phone,
                bookUrl: r.bookUrl ?? null,
                price: r.price,
              },
              ms: 700,
            },
            {
              kind: 'text',
              text: r.bookUrl
                ? `${r.name} takes online bookings. A table is best reserved ahead.`
                : `${r.name} takes bookings by phone.`,
            },
            {
              kind: 'ask',
              name: 'ask_next',
              input: {
                prompt: 'Anything else?',
                options: [
                  {
                    id: 'send',
                    label: 'Send this plan to our team',
                    group: 'Next',
                  },
                  { id: 'tours', label: 'Browse our tours', group: 'Next' },
                ],
              },
            },
          ]
        }
        if (id === 'send' && input && plan) {
          const requestId = hooks.createInquiry({
            answers: [
              { question: 'Staying at', answer: hotelName(input.stay) },
              {
                question: 'Travelling',
                answer: `${input.adults} adults, ${input.children} children`,
              },
              { question: 'Date', answer: plan.dayLabel },
              {
                question: 'Start and length',
                answer: `${input.start}, ${input.length === 'full' ? 'full day' : 'half day'}`,
              },
              {
                question: 'Interests',
                answer: interestLabels(input.interests),
              },
              ...(input.diet === 'veg'
                ? [{ question: 'Dietary', answer: 'Vegetarian' }]
                : []),
              {
                question: 'Itinerary',
                answer: plan.items
                  .filter(i => i.kind !== 'move')
                  .map(i => `${i.start} ${i.name}`)
                  .join('\n'),
              },
            ],
          })

          return [
            {
              kind: 'reasoning',
              text: 'Packaging the answers and the plan into a brief that is easy to read at a glance, then filing it in our inbox.',
            },
            {
              kind: 'tool',
              name: 'create_inquiry',
              input: { stops: plan.summary.stops, date: input.date },
              output: { requestId, status: 'sent' },
              ms: 1000,
            },
            {
              kind: 'text',
              text: 'Done. We have your plan with everything you chose, and will reply by email.',
            },
          ]
        }
      }
      if (input) {
        return planTurn(
          input,
          REASON_TWEAK[id]
          ?? `Swapping lunch to ${restaurantById(id.slice(6))?.name ?? 'the new place'}. Checking that it is open that day.`,
        )
      }

      return []
    }
    default:
      return []
  }
}
