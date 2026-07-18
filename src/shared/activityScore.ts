import type { ActivityCounters, Stage } from './types'
import { DEV_POINTS_HATCH } from './constants'
import { tStage } from '../i18n/labels'

export function getActivityScore(activity: ActivityCounters): number {
  return activity.clicks + Math.floor(activity.keystrokes / 10)
}

export function getStageLabel(stage: Stage): string {
  if (stage === 'egg') return tStage('egg')
  if (stage === 'baby') return tStage('teen')
  return tStage('adult')
}

/** Faster curve: baby /80, adult /40 (was /200 and /100). */
export function getPetLevel(stage: Stage, evolution: number): number {
  if (stage === 'egg') return 1 + Math.floor(evolution / Math.max(1, DEV_POINTS_HATCH))
  if (stage === 'baby') return 2 + Math.floor(evolution / 80)
  return 5 + Math.floor(evolution / 40)
}

export const ONBOARDING_KEY = 'taskino-onboarded'
const LEGACY_ONBOARDING_KEY = 'taskimon-onboarded'

export function isOnboardingComplete(): boolean {
  if (typeof localStorage === 'undefined') return false
  if (localStorage.getItem(ONBOARDING_KEY)) return true
  if (localStorage.getItem(LEGACY_ONBOARDING_KEY)) {
    localStorage.setItem(ONBOARDING_KEY, '1')
    return true
  }
  return false
}
