import type { ElementId } from '../elements'

export type SkillKind = 'skill' | 'ultimate'

export interface SkillDef {
  pathId: string
  element: ElementId
  kind: SkillKind
  /** Base power before rank multiplier */
  power: number
  mpCost: number
  /** Ultimate uses TP instead (typically 100) */
  tpCost: number
  /** Role hint for generators */
  role: 'basic' | 'heavy' | 'pierce' | 'burst' | 'guard' | 'dodge' | 'support' | 'mark' | 'ultimate'
}

export const SKILL_RANK_MAX = 8

export function rankMult(rank: number): number {
  const r = Math.max(1, Math.min(SKILL_RANK_MAX, rank))
  return 0.85 + r * 0.15
}

export function skillPower(def: SkillDef, rank: number): number {
  return Math.round(def.power * rankMult(rank))
}

const ROLE_POWER: Record<SkillDef['role'], number> = {
  basic: 18,
  heavy: 26,
  pierce: 20,
  burst: 28,
  guard: 0,
  dodge: 0,
  support: 0,
  mark: 12,
  ultimate: 40
}

const ROLE_MP: Record<SkillDef['role'], number> = {
  basic: 8,
  heavy: 14,
  pierce: 12,
  burst: 16,
  guard: 10,
  dodge: 8,
  support: 12,
  mark: 10,
  ultimate: 0
}

type SlugRow = { slug: string; role: SkillDef['role'] }

const BASE_SLUGS: Record<ElementId, SlugRow[]> = {
  fire: [
    { slug: 'spark_bite', role: 'basic' },
    { slug: 'flame_rush', role: 'heavy' },
    { slug: 'magma_pierce', role: 'pierce' },
    { slug: 'inferno_burst', role: 'burst' },
    { slug: 'heat_guard', role: 'guard' },
    { slug: 'smoke_step', role: 'dodge' },
    { slug: 'kindling', role: 'support' },
    { slug: 'cinder_mark', role: 'mark' }
  ],
  grass: [
    { slug: 'leaf_slash', role: 'basic' },
    { slug: 'vine_lash', role: 'heavy' },
    { slug: 'thorn_pierce', role: 'pierce' },
    { slug: 'bloom_burst', role: 'burst' },
    { slug: 'bark_shield', role: 'guard' },
    { slug: 'pollen_dodge', role: 'dodge' },
    { slug: 'photosynth', role: 'support' },
    { slug: 'seed_mark', role: 'mark' }
  ],
  ground: [
    { slug: 'pebble_shot', role: 'basic' },
    { slug: 'quake_stomp', role: 'heavy' },
    { slug: 'drill_fang', role: 'pierce' },
    { slug: 'boulder_crash', role: 'burst' },
    { slug: 'stone_wall', role: 'guard' },
    { slug: 'sand_veil', role: 'dodge' },
    { slug: 'tectonic_pulse', role: 'support' },
    { slug: 'fault_line', role: 'mark' }
  ],
  electric: [
    { slug: 'static_nibble', role: 'basic' },
    { slug: 'volt_dash', role: 'heavy' },
    { slug: 'needle_bolt', role: 'pierce' },
    { slug: 'thunder_clap', role: 'burst' },
    { slug: 'shock_armor', role: 'guard' },
    { slug: 'afterimage', role: 'dodge' },
    { slug: 'charge_up', role: 'support' },
    { slug: 'spark_field', role: 'mark' }
  ],
  water: [
    { slug: 'bubble_jab', role: 'basic' },
    { slug: 'surge_rush', role: 'heavy' },
    { slug: 'jet_pierce', role: 'pierce' },
    { slug: 'tidal_burst', role: 'burst' },
    { slug: 'foam_guard', role: 'guard' },
    { slug: 'mist_step', role: 'dodge' },
    { slug: 'undertow', role: 'support' },
    { slug: 'ripple_mark', role: 'mark' }
  ],
  ice: [
    { slug: 'frost_nip', role: 'basic' },
    { slug: 'glacier_rush', role: 'heavy' },
    { slug: 'icicle_pierce', role: 'pierce' },
    { slug: 'blizzard_burst', role: 'burst' },
    { slug: 'crystal_guard', role: 'guard' },
    { slug: 'snow_fade', role: 'dodge' },
    { slug: 'deep_freeze', role: 'support' },
    { slug: 'rime_mark', role: 'mark' }
  ],
  dragon: [
    { slug: 'scale_bite', role: 'basic' },
    { slug: 'wyrm_rush', role: 'heavy' },
    { slug: 'horn_pierce', role: 'pierce' },
    { slug: 'roar_burst', role: 'burst' },
    { slug: 'scale_mail', role: 'guard' },
    { slug: 'wing_slip', role: 'dodge' },
    { slug: 'blood_surge', role: 'support' },
    { slug: 'omen_mark', role: 'mark' }
  ],
  dark: [
    { slug: 'shadow_bite', role: 'basic' },
    { slug: 'night_rush', role: 'heavy' },
    { slug: 'umbra_pierce', role: 'pierce' },
    { slug: 'void_burst', role: 'burst' },
    { slug: 'cloak_guard', role: 'guard' },
    { slug: 'fade_step', role: 'dodge' },
    { slug: 'hex_chant', role: 'support' },
    { slug: 'curse_mark', role: 'mark' }
  ],
  neutral: [
    { slug: 'plain_strike', role: 'basic' },
    { slug: 'power_rush', role: 'heavy' },
    { slug: 'focus_pierce', role: 'pierce' },
    { slug: 'impact_burst', role: 'burst' },
    { slug: 'guard_stance', role: 'guard' },
    { slug: 'sidestep', role: 'dodge' },
    { slug: 'rally', role: 'support' },
    { slug: 'brand_mark', role: 'mark' }
  ]
}

const ULT_SLUG: Record<ElementId, string> = {
  fire: 'solar_eruption',
  grass: 'overgrowth',
  ground: 'terra_break',
  electric: 'storm_crown',
  water: 'abyss_roar',
  ice: 'absolute_zero',
  dragon: 'elder_wrath',
  dark: 'eclipse_fang',
  neutral: 'finishing_blow'
}

function defFor(element: ElementId, slug: string, role: SkillDef['role'], kind: SkillKind): SkillDef {
  return {
    pathId: `${element}_${slug}`,
    element,
    kind,
    power: ROLE_POWER[role],
    mpCost: kind === 'ultimate' ? 0 : ROLE_MP[role],
    tpCost: kind === 'ultimate' ? 100 : 0,
    role
  }
}

function buildCatalog(): Record<string, SkillDef> {
  const out: Record<string, SkillDef> = {}
  for (const element of Object.keys(BASE_SLUGS) as ElementId[]) {
    for (const row of BASE_SLUGS[element]) {
      const d = defFor(element, row.slug, row.role, 'skill')
      out[d.pathId] = d
    }
    const ult = defFor(element, ULT_SLUG[element], 'ultimate', 'ultimate')
    out[ult.pathId] = ult
  }
  return out
}

export const SKILL_CATALOG: Record<string, SkillDef> = buildCatalog()

export function baseSkillsFor(element: ElementId): SkillDef[] {
  return BASE_SLUGS[element].map((row) => SKILL_CATALOG[`${element}_${row.slug}`]!)
}

export function ultimateFor(element: ElementId): SkillDef {
  return SKILL_CATALOG[`${element}_${ULT_SLUG[element]}`]!
}

export function getSkillDef(pathId: string): SkillDef | undefined {
  return SKILL_CATALOG[pathId]
}

export interface SkillSlot {
  pathId: string
  element: ElementId
  rank: number
  kind: SkillKind
}

export interface SkillLoadout {
  mode: 'pure' | 'dual'
  skillSplit?: [2, 1] | [1, 2]
  ultimateElement: ElementId
  slots: SkillSlot[]
}

function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  const copy = [...arr]
  const out: T[] = []
  while (out.length < n && copy.length > 0) {
    const i = Math.floor(rng() * copy.length)
    out.push(copy.splice(i, 1)[0]!)
  }
  return out
}

/** Roll 3 skill + 1 ultimate loadout at hatch. */
export function rollSkillLoadout(
  elementPrimary: ElementId,
  elementSecondary: ElementId | null,
  rng: () => number = Math.random
): SkillLoadout {
  if (!elementSecondary) {
    const bases = pickN(baseSkillsFor(elementPrimary), 3, rng)
    const ult = ultimateFor(elementPrimary)
    return {
      mode: 'pure',
      ultimateElement: elementPrimary,
      slots: [
        ...bases.map((s) => ({ pathId: s.pathId, element: s.element, rank: 1, kind: 'skill' as const })),
        { pathId: ult.pathId, element: ult.element, rank: 1, kind: 'ultimate' }
      ]
    }
  }

  const split: [2, 1] | [1, 2] = rng() < 0.5 ? [2, 1] : [1, 2]
  const fromPrimary = pickN(baseSkillsFor(elementPrimary), split[0], rng)
  const fromSecondary = pickN(baseSkillsFor(elementSecondary), split[1], rng)
  const ultElement = rng() < 0.5 ? elementPrimary : elementSecondary
  const ult = ultimateFor(ultElement)
  return {
    mode: 'dual',
    skillSplit: split,
    ultimateElement: ultElement,
    slots: [
      ...fromPrimary.map((s) => ({ pathId: s.pathId, element: s.element, rank: 1, kind: 'skill' as const })),
      ...fromSecondary.map((s) => ({ pathId: s.pathId, element: s.element, rank: 1, kind: 'skill' as const })),
      { pathId: ult.pathId, element: ult.element, rank: 1, kind: 'ultimate' }
    ]
  }
}

/** Bump a single slot's rank by 1 (if below the cap). Returns null when already maxed. */
export function upgradeSkillRank(
  loadout: SkillLoadout,
  slotIndex: number
): SkillLoadout | null {
  const target = loadout.slots[slotIndex]
  if (!target) return null
  if (target.rank >= SKILL_RANK_MAX) return null
  const slots = loadout.slots.map((s, i) =>
    i === slotIndex ? { ...s, rank: s.rank + 1 } : { ...s }
  )
  return { ...loadout, slots }
}

/** Reroll one loadout slot (skill_forget). Pure cannot reroll ultimate. */
export function forgetSkillSlot(
  loadout: SkillLoadout,
  slotIndex: number,
  elementPrimary: ElementId,
  elementSecondary: ElementId | null,
  rng: () => number = Math.random
): SkillLoadout {
  const slots = loadout.slots.map((s) => ({ ...s }))
  const target = slots[slotIndex]
  if (!target) return loadout

  if (target.kind === 'ultimate') {
    if (loadout.mode === 'pure') return loadout
    const pool = [elementPrimary, elementSecondary!].filter(Boolean) as ElementId[]
    const nextEl = pool[Math.floor(rng() * pool.length)]!
    const ult = ultimateFor(nextEl)
    slots[slotIndex] = { pathId: ult.pathId, element: ult.element, rank: 1, kind: 'ultimate' }
    return { ...loadout, ultimateElement: nextEl, slots }
  }

  const pool = baseSkillsFor(target.element)
  const next = pool[Math.floor(rng() * pool.length)]!
  slots[slotIndex] = { pathId: next.pathId, element: next.element, rank: 1, kind: 'skill' }
  return { ...loadout, slots }
}
