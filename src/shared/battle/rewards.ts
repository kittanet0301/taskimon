import { REWARD_FLEE_MOOD, REWARD_LOSE_HP, REWARD_WIN_MOOD, STAT_MAX, STAT_MIN } from './constants'

function clampStat(value: number): number {
  return Math.max(STAT_MIN, Math.min(STAT_MAX, value))
}

export interface PostBattleInput {
  won: boolean
  fled: boolean
  currentHp: number
  currentMood: number
}

export interface PostBattleStats {
  hp: number
  mood: number
}

/** Apply post-battle rewards/penalties (mirrors SQL finalize). */
export function computePostBattlePetStats(input: PostBattleInput): PostBattleStats {
  const { won, fled, currentHp, currentMood } = input
  if (won) {
    return { hp: clampStat(currentHp), mood: clampStat(currentMood + REWARD_WIN_MOOD) }
  }
  if (fled) {
    return { hp: clampStat(currentHp), mood: clampStat(currentMood - REWARD_FLEE_MOOD) }
  }
  return {
    hp: clampStat(currentHp - REWARD_LOSE_HP),
    mood: clampStat(currentMood)
  }
}
