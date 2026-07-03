import type { MissionProgress, GameSave } from './types'
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

/** Reset daily missions at local midnight and clear today's activity counters. */
export function applyDailyResets(save: GameSave, now = new Date()): GameSave {
  const missions = resetExpiredMissions(save.missions, now)
  const nowMs = now.getTime()

  const dailyWasReset = save.missions.some((before) => {
    const def = MISSIONS.find((m) => m.id === before.missionId)
    if (def?.kind !== 'daily' || nowMs < new Date(before.resetAt).getTime()) return false
    const after = missions.find((m) => m.missionId === before.missionId)
    return Boolean(after && after.progress === 0 && !after.completed)
  })

  const missionsChanged = missions.some((after, index) => {
    const before = save.missions[index]
    return (
      before?.progress !== after.progress ||
      before?.completed !== after.completed ||
      before?.resetAt !== after.resetAt
    )
  })

  if (!missionsChanged && !dailyWasReset) return save

  return {
    ...save,
    missions,
    activity: dailyWasReset
      ? { ...save.activity, clicks: 0, keystrokes: 0 }
      : save.activity
  }
}

export function getNextDailyResetAt(now = new Date()): Date {
  const next = startOfDay(now)
  next.setDate(next.getDate() + 1)
  return next
}

export function formatDailyResetCountdown(now = new Date()): string {
  const ms = Math.max(0, getNextDailyResetAt(now).getTime() - now.getTime())
  const hours = Math.floor(ms / 3_600_000)
  const minutes = Math.floor((ms % 3_600_000) / 60_000)
  if (hours > 0) return `รีเซ็ตภารกิจรายวันใน ${hours} ชม. ${minutes} นาที`
  if (minutes > 0) return `รีเซ็ตภารกิจรายวันใน ${minutes} นาที`
  return 'กำลังรีเซ็ตภารกิจรายวัน...'
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
