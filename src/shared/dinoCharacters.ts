import type { Gender, HatchResult } from './types'
import { tDefaultPetName } from '../i18n/labels'

/** Dino Family asset variants (https://demching.itch.io/dino-family) */
export const DINO_CHARACTERS = [
  'cole',
  'doux',
  'kira',
  'kuro',
  'loki',
  'mono',
  'mort',
  'nico',
  'olaf',
  'sena',
  'tard',
  'vita'
] as const

export type DinoCharacter = (typeof DINO_CHARACTERS)[number]

const LEGACY_SPECIES_MAP: Record<string, DinoCharacter> = {
  mamono: 'mono',
  avian: 'doux',
  aquatic: 'kira',
  mythic: 'loki'
}

/** Preview colors for hub card backgrounds (character tint). */
export const DINO_PREVIEW_COLORS: Record<DinoCharacter, string> = {
  cole: '#9b59b6',
  doux: '#2ecc71',
  kira: '#3498db',
  kuro: '#34495e',
  loki: '#e74c3c',
  mono: '#a0714f',
  mort: '#7f8c8d',
  nico: '#f39c12',
  olaf: '#5dade2',
  sena: '#e67e22',
  tard: '#1abc9c',
  vita: '#48c9b0'
}

export function isDinoCharacter(value: string): value is DinoCharacter {
  return (DINO_CHARACTERS as readonly string[]).includes(value)
}

export function normalizeDinoCharacter(value: string): DinoCharacter {
  if (isDinoCharacter(value)) return value
  return LEGACY_SPECIES_MAP[value] ?? 'cole'
}

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function rollGender(): Gender {
  return Math.random() < 0.5 ? 'male' : 'female'
}

export function rollDinoCharacter(): DinoCharacter {
  return pickRandom(DINO_CHARACTERS)
}

export function hatchEgg(): HatchResult {
  return {
    character: rollDinoCharacter(),
    gender: rollGender()
  }
}

export function defaultPetName(character: DinoCharacter): string {
  return tDefaultPetName(character)
}

export function dinoAssetBase(gender: Gender, character: DinoCharacter, folder: 'base' | 'egg' | 'ghost'): string {
  return `/dino/${gender}/${character}/${folder}`
}
