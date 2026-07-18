import type { PetData } from '../../shared/types'
import { normalizePetData } from '../../shared/petNormalize'

export function mapCloudPetToPetData(pet: Record<string, unknown>): PetData {
  return normalizePetData({
    id: String(pet.id),
    name: String(pet.name),
    character: String(pet.species),
    gender: pet.gender,
    stage: pet.stage,
    stats: {
      health: Number(pet.health ?? pet.hp ?? 100),
      emotion: Number(pet.emotion ?? pet.mood ?? 80),
      evolution: Number(pet.evolution ?? pet.dev_points ?? 0)
    },
    hatchedAt: pet.hatched_at ? String(pet.hatched_at) : null,
    createdAt: String(pet.created_at),
    animationState: 'idle',
    feedCount: 0
  } as PetData & Record<string, unknown>)
}
