import type { GameSave } from '../shared/types'
import { getMissionDefinition } from '../shared/missions'

interface Props {
  save: GameSave
  onUpdated: () => void
}

export function Missions({ save, onUpdated }: Props) {
  const claim = async (missionId: string) => {
    await window.electronAPI.patchGame('claimMission', [missionId])
    onUpdated()
  }

  return (
    <div className="card">
      <h2>ภารกิจรายวัน / รายสัปดาห์</h2>
      {save.missions.map((mission) => {
        const def = getMissionDefinition(mission.missionId)
        if (!def) return null
        return (
          <div key={mission.missionId} className="mission-item">
            <div>
              <strong>{def.title}</strong>
              <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                {def.kind === 'daily' ? 'รายวัน' : 'รายสัปดาห์'} · {mission.progress}/{def.target}
              </div>
            </div>
            <button
              className="primary"
              disabled={!mission.completed}
              onClick={() => claim(mission.missionId)}
            >
              {mission.completed ? 'รับรางวัล' : 'ยังไม่เสร็จ'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
