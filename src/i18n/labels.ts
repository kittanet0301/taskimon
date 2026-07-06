import type { Element, ItemType, Species, Stage } from '../shared/types'
import i18n from './index'

export function tElement(element: Element): string {
  return i18n.t(`elements.${element}`)
}

export function tSpecies(species: Species): string {
  return i18n.t(`species.${species}`)
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

export function tDefaultPetName(species: Species): string {
  return i18n.t(`defaultPetNames.${species}`)
}

export function tMonth(month: number): string {
  return i18n.t(`months.${month}`)
}

export function tTray(key: string, params?: Record<string, string | number>): string {
  return i18n.t(`tray.${key}`, params)
}
