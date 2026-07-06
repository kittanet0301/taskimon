import type { BattleActionType } from './types'
import i18n from '../../i18n'
import { tCharacter } from '../../i18n/labels'

export function formatActionMessage(
  actorName: string,
  targetName: string,
  action: BattleActionType,
  damage: number,
  actorCharacter?: string
): string {
  if (action === 'ultimate' && actorCharacter) {
    return formatUltimateMessage(actorName, targetName, actorCharacter, damage)
  }
  return `${actorName} ${i18n.t('battle.attack')} ${targetName} -${damage} HP`
}

export function formatUltimateMessage(
  actorName: string,
  targetName: string,
  character: string,
  damage: number
): string {
  const move = `${tCharacter(character)} ${i18n.t('battle.ultimate')}`
  return `${actorName} ${i18n.t('battle.ultimate')} "${move}" ${targetName} -${damage} HP`
}

export function formatUltimateFallbackMessage(
  actorName: string,
  targetName: string,
  damage: number
): string {
  return `${actorName} ${i18n.t('battle.attack')} ${targetName} -${damage} HP`
}

export function formatDefendMessage(actorName: string): string {
  return `${actorName} ${i18n.t('battle.defend')}`
}

export function formatFleeMessage(actorName: string): string {
  return `${actorName} ${i18n.t('battle.flee')}`
}

export function formatWinnerMessage(winnerName: string): string {
  return i18n.t('battle.modal.subtitleWinnerNamed', { winnerName })
}
