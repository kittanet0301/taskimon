import type { BattleActionType } from './types'
import type { Element } from '../types'
import { ELEMENT_NAMES } from '../constants'

const ULTIMATE_NAMES: Partial<Record<Element, string>> = {
  fire: 'เปลวเพลิง',
  water: 'คลื่นยักษ์',
  earth: 'แผ่นดินไหว',
  wind: 'พายุ',
  neutral: 'พลังกลาง'
}

export function formatActionMessage(
  actorName: string,
  targetName: string,
  action: BattleActionType,
  damage: number,
  actorElement?: Element
): string {
  if (action === 'ultimate' && actorElement) {
    return formatUltimateMessage(actorName, targetName, actorElement, damage)
  }
  return `${actorName} โจมตี ${targetName} -${damage} HP`
}

export function formatUltimateMessage(
  actorName: string,
  targetName: string,
  element: Element,
  damage: number
): string {
  const move = ULTIMATE_NAMES[element] ?? 'ท่าไม้ตาย'
  return `${actorName} ใช้ "${move}" ${targetName} -${damage} HP`
}

export function formatUltimateFallbackMessage(
  actorName: string,
  targetName: string,
  damage: number
): string {
  return `${actorName} ใช้ท่าไม้ตายไม่ได้แล้ว — โจมตี ${targetName} -${damage} HP`
}

export function formatDefendMessage(actorName: string): string {
  return `${actorName} ตั้งท่าป้องกัน`
}

export function formatFleeMessage(actorName: string): string {
  return `${actorName} หลบหนีจากการต่อสู้`
}

export function formatWinnerMessage(winnerName: string): string {
  return `ผู้ชนะ: ${winnerName}`
}

export function formatElementAdvantage(attacker: Element, defender: Element, multiplier: number): string {
  if (multiplier === 1.0) return ''
  const relation = multiplier > 1 ? 'ได้เปรียบ' : 'เสียเปรียบ'
  return `${ELEMENT_NAMES[attacker]} ${relation} ${ELEMENT_NAMES[defender]}`
}
