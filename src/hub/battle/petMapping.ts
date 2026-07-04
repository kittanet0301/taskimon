import type { PetData } from '../../shared/types'

export function mapCloudPetToPetData(pet: Record<string, unknown>): PetData {
  return {
    id: String(pet.id),
    name: String(pet.name),
    species: pet.species as PetData['species'],
    element: pet.element as PetData['element'],
    gender: pet.gender as PetData['gender'],
    stage: pet.stage as PetData['stage'],
    stats: {
      hp: Number(pet.hp ?? 100),
      mood: Number(pet.mood ?? 80),
      devPoints: Number(pet.dev_points ?? 0)
    },
    hatchedAt: pet.hatched_at ? String(pet.hatched_at) : null,
    createdAt: String(pet.created_at),
    animationState: 'idle',
    feedCount: 0
  }
}
