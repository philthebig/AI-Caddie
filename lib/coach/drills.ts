import type { CoachDrill, SgCategory } from './types'

export type DrillEntry = CoachDrill & { categories: SgCategory[] }

/** Vetted drills the model must choose from — reduces hallucinated practice plans. */
export const DRILL_CATALOG: DrillEntry[] = [
  {
    id: 'gate-drill',
    name: 'Gate drill',
    description:
      'Place two alignment sticks just wider than your driver head 10 ft ahead. Hit 10 drives focusing on starting the ball through the gate.',
    duration: '15 min',
    categories: ['OTT'],
  },
  {
    id: 'fairway-find',
    name: 'Fairway finder',
    description:
      'On the range, pick a 20-yd fairway at 220–250 yd. Hit 15 balls — score how many would land in that corridor.',
    duration: '20 min',
    categories: ['OTT'],
  },
  {
    id: 'club-down-ott',
    name: 'Club-down challenge',
    description:
      'Play 9 holes (or sim on range) hitting 3-wood or hybrid off every par 4/5 tee. Track fairways and penalty strokes.',
    duration: 'On-course or 30 min range',
    categories: ['OTT'],
  },
  {
    id: 'clock-wedge',
    name: 'Clock wedge',
    description:
      'Hit 5 balls each to 40, 50, and 60 yd targets. Goal: finish inside a 3-ft circle around the pin.',
    duration: '20 min',
    categories: ['APP'],
  },
  {
    id: 'nine-window',
    name: '9-window drill',
    description:
      'Pick one yardage (e.g. 130 yd). Hit 3 balls each to left, center, and right targets — track proximity.',
    duration: '25 min',
    categories: ['APP'],
  },
  {
    id: 'short-sided-escape',
    name: 'Short-sided escape',
    description:
      'From tight lies 10–20 ft off the green, practice low runners and flop shots to a back-pin location.',
    duration: '20 min',
    categories: ['APP', 'ARG'],
  },
  {
    id: 'up-and-down-ladder',
    name: 'Up-and-down ladder',
    description:
      'From 5, 15, and 25 ft off the green, chip then putt. Goal: 7 of 9 up-and-downs.',
    duration: '20 min',
    categories: ['ARG'],
  },
  {
    id: 'proximity-chipping',
    name: 'Proximity chipping',
    description:
      'Hit 10 chips from 10–30 ft off the green. Measure average leave distance — aim under 6 ft.',
    duration: '15 min',
    categories: ['ARG'],
  },
  {
    id: 'lag-ladder',
    name: 'Lag putting ladder',
    description:
      'Putt from 30, 40, and 50 ft to a 3-ft circle around the hole. No three-putts allowed in 9 putts.',
    duration: '15 min',
    categories: ['PUTT'],
  },
  {
    id: 'make-speed',
    name: 'Make-speed drill',
    description:
      '6–10 ft putts around the hole. Focus on dying speed at the cup — track makes out of 20.',
    duration: '15 min',
    categories: ['PUTT'],
  },
  {
    id: 'three-putt-avoid',
    name: 'Three-putt avoidance',
    description:
      'From 20+ ft, two-putt every ball. If you three-putt, restart the set of 10.',
    duration: '15 min',
    categories: ['PUTT'],
  },
]

export function getDrillsForCategories(categories: SgCategory[]): DrillEntry[] {
  const seen = new Set<string>()
  const result: DrillEntry[] = []

  for (const category of categories) {
    for (const drill of DRILL_CATALOG) {
      if (drill.categories.includes(category) && !seen.has(drill.id)) {
        seen.add(drill.id)
        result.push(drill)
      }
    }
  }

  return result
}

export function formatDrillsForPrompt(drills: DrillEntry[]): string {
  if (drills.length === 0) return '(No drills available)'

  return drills
    .map(
      (d) =>
        `- id: "${d.id}" | name: "${d.name}" | categories: ${d.categories.join('/')} | ${d.description}${d.duration ? ` (${d.duration})` : ''}`
    )
    .join('\n')
}

export function findDrillById(id: string): DrillEntry | undefined {
  return DRILL_CATALOG.find((d) => d.id === id)
}
