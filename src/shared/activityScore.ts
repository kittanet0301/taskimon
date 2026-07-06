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

export function getPetLevel(stage: Stage, devPoints: number): number {
  if (stage === 'egg') return 1 + Math.floor(devPoints / Math.max(1, DEV_POINTS_HATCH))
  if (stage === 'baby') return 2 + Math.floor(devPoints / 200)
  return 5 + Math.floor(devPoints / 100)
}

export const ONBOARDING_KEY = 'taskimon-onboarded'
