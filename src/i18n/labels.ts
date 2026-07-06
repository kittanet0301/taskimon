import type { DinoCharacter, ItemType, Stage } from '../shared/types'
import i18n from './index'

export function tCharacter(character: DinoCharacter | string): string {
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

export function tStage(stage: Stage | 'teen'): string {
  return i18n.t(`stages.${stage}`)
}

export function tDefaultPetName(character: DinoCharacter): string {
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
