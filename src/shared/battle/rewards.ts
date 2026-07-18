import { REWARD_FLEE_MOOD, REWARD_LOSE_HP, REWARD_WIN_MOOD, STAT_MAX, STAT_MIN } from './constants'

function clampStat(value: number): number {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, value))
}

export interface PostBattleInput {
  won: boolean
  fled: boolean
  currentHealth: number
  currentEmotion: number
}

export interface PostBattleStats {
  health: number
  emotion: number
}

/** Apply post-battle rewards/penalties (mirrors SQL finalize). */
export function computePostBattlePetStats(input: PostBattleInput): PostBattleStats {
  const { won, fled, currentHealth, currentEmotion } = input
  if (won) {
    return { health: clampStat(currentHealth), emotion: clampStat(currentEmotion + REWARD_WIN_MOOD) }
  }
  if (fled) {
    return { health: clampStat(currentHealth), emotion: clampStat(currentEmotion - REWARD_FLEE_MOOD) }
  }
  return {
    health: clampStat(currentHealth - REWARD_LOSE_HP),
    emotion: clampStat(currentEmotion)
  }
}
