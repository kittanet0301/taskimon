import type { ActivityCounters, Stage } from './types'

export function getActivityScore(activity: ActivityCounters): number {
  return activity.clicks + Math.floor(activity.keystrokes / 10)
}

export function getStageLabel(stage: Stage): string {
  if (stage === 'egg') return 'Egg'
  if (stage === 'baby') return 'Teen'
  return 'Adult'
}

export function getPetLevel(stage: Stage, devPoints: number): number {
  if (stage === 'egg') return 1
  if (stage === 'baby') return 2 + Math.floor(devPoints / 200)
  return 5 + Math.floor(devPoints / 100)
}

export const ONBOARDING_KEY = 'taskimon-onboarded'
