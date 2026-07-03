import type { MissionProgress } from './types'
import type { ItemType } from './types'

export type MissionKind = 'daily' | 'weekly'

export interface MissionDefinition {
  id: string
  kind: MissionKind
  title: string
  target: number
  reward: { type: ItemType; quantity: number } | { mood: number } | { devPoints: number }
}

export const MISSIONS: MissionDefinition[] = [
  {
    id: 'daily_type_500',
    kind: 'daily',
    title: 'พิมพ์ 500 ตัวอักษร',
    target: 500,
    reward: { type: 'food_basic', quantity: 1 }
  },
  {
    id: 'daily_click_200',
    kind: 'daily',
    title: 'คลิก 200 ครั้ง',
    target: 200,
    reward: { type: 'toy', quantity: 1 }
  },
  {
    id: 'daily_feed_3',
    kind: 'daily',
    title: 'ให้อาหารสัตว์ 3 ครั้ง',
    target: 3,
    reward: { mood: 10 }
  },
  {
    id: 'daily_play_1h',
    kind: 'daily',
    title: 'สัตว์เดินบนจอครบ 1 ชม.',
    target: 3600,
    reward: { devPoints: 5 }
  },
  {
    id: 'weekly_dev_100',
    kind: 'weekly',
    title: 'สะสมพัฒนาร่าง +100',
    target: 100,
    reward: { type: 'food_premium', quantity: 2 }
  },
  {
    id: 'weekly_daily_5',
    kind: 'weekly',
    title: 'ทำภารกิจรายวันครบ 5 วัน',
    target: 5,
    reward: { type: 'medicine', quantity: 1 }
  },
  {
    id: 'weekly_hatch_1',
    kind: 'weekly',
    title: 'ฟักไข่ใหม่ 1 ครั้ง',
    target: 1,
    reward: { type: 'dev_vitamin', quantity: 1 }
  }
]

function startOfDay(date = new Date()): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function startOfWeek(date = new Date()): Date {
  const d = startOfDay(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export function getMissionResetAt(kind: MissionKind, now = new Date()): string {
  if (kind === 'daily') {
    const next = startOfDay(now)
    next.setDate(next.getDate() + 1)
    return next.toISOString()
  }
  const next = startOfWeek(now)
  next.setDate(next.getDate() + 7)
  return next.toISOString()
}

export function createDefaultMissions(now = new Date()): MissionProgress[] {
  return MISSIONS.map((mission) => ({
    missionId: mission.id,
    progress: 0,
    completed: false,
    resetAt: getMissionResetAt(mission.kind, now)
  }))
}

export function resetExpiredMissions(missions: MissionProgress[], now = new Date()): MissionProgress[] {
  const nowMs = now.getTime()
  return missions.map((mission) => {
    if (nowMs >= new Date(mission.resetAt).getTime()) {
      const def = MISSIONS.find((m) => m.id === mission.missionId)!
      return {
        missionId: mission.missionId,
        progress: 0,
        completed: false,
        resetAt: getMissionResetAt(def.kind, now)
      }
    }
    return mission
  })
}

export function updateMissionProgress(
  missions: MissionProgress[],
  missionId: string,
  delta: number
): MissionProgress[] {
  return missions.map((mission) => {
    if (mission.missionId !== missionId || mission.completed) return mission
    const def = MISSIONS.find((m) => m.id === missionId)
    if (!def) return mission
    const progress = Math.min(def.target, mission.progress + delta)
    return {
      ...mission,
      progress,
      completed: progress >= def.target
    }
  })
}

export function getMissionDefinition(missionId: string): MissionDefinition | undefined {
  return MISSIONS.find((m) => m.id === missionId)
}
