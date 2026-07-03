import type { Element, Gender, HatchResult, Species } from './types'

const MYTHIC_CHANCE = 0.1

const SPECIES_ELEMENTS: Record<Species, Element[]> = {
  mamono: ['earth', 'nature'],
  avian: ['wind', 'nature'],
  aquatic: ['water', 'nature'],
  mythic: ['fire', 'wind']
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function rollSpecies(): Species {
  if (Math.random() < MYTHIC_CHANCE) return 'mythic'
  const common: Species[] = ['mamono', 'avian', 'aquatic']
  return pickRandom(common)
}

export function rollElement(species: Species): Element {
  return pickRandom(SPECIES_ELEMENTS[species])
}

export function rollGender(): Gender {
  return Math.random() < 0.5 ? 'male' : 'female'
}

export function hatchEgg(): HatchResult {
  const species = rollSpecies()
  return {
    species,
    element: rollElement(species),
    gender: rollGender()
  }
}

export function defaultPetName(species: Species): string {
  const names: Record<Species, string> = {
    mamono: 'โมโน',
    avian: 'ปีกน้อย',
    aquatic: 'บับเบิ้ล',
    mythic: 'มิธิ'
  }
  return names[species]
}
