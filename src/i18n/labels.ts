import type { MissionDefinition } from '../shared/missions'
import type { ItemType, PetSpecies, Stage } from '../shared/types'
import i18n from './index'

export function tCharacter(character: PetSpecies | string): string {
  return i18n.t(`characters.${character}`, { defaultValue: String(character) })
}

export function tItemLabel(type: ItemType): string {
  return i18n.t(`items.${type}.label`)
}

export function tItemDescription(type: ItemType): string {
  return i18n.t(`items.${type}.description`)
}

export function tMissionTitle(missionId: string): string {
  return i18n.t(`missions.${missionId}`)
}

export function tMissionReward(def: MissionDefinition): string {
  const reward = def.reward
  if ('type' in reward) {
    return i18n.t('missions.rewardItem', {
      item: tItemLabel(reward.type),
      count: reward.quantity
    })
  }
  if ('emotion' in reward) return i18n.t('missions.rewardEmotion', { emotion: reward.emotion })
  if ('evolution' in reward) return i18n.t('missions.rewardEvolution', { points: reward.evolution })
  if ('newEgg' in reward) return i18n.t('missions.rewardEgg')
  if ('slots' in reward) return i18n.t('missions.rewardSlots', { count: reward.slots })
  return ''
}

export function tStage(stage: Stage | 'teen'): string {
  return i18n.t(`stages.${stage}`)
}

export function tDefaultPetName(character: PetSpecies): string {
  return i18n.t(`defaultPetNames.${character}`)
}

export function tMonth(month: number): string {
  return i18n.t(`months.${month}`)
}

export function tTray(key: string, params?: Record<string, string | number>): string {
  return i18n.t(`tray.${key}`, params)
}

/** @deprecated Use tCharacter */
export const tSpecies = tCharacter
