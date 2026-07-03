import { useEffect, useState } from 'react'
import type { GameSave, PetData } from '../shared/types'
import { ELEMENT_NAMES, SPECIES_NAMES } from '../shared/constants'

interface Props {
  save: GameSave
}

interface FriendRow {
  friend_id: string
  profiles?: { username: string }
}

export function Battle({ save }: Props) {
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [selectedFriend, setSelectedFriend] = useState<string>('')
  const [enemyPet, setEnemyPet] = useState<PetData | null>(null)
  const [log, setLog] = useState<string[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    ;(async () => {
      const session = (await window.electronAPI.getSession()) as { user: { id: string } } | null
      if (!session?.user?.id) return
      setFriends((await window.electronAPI.listFriends(session.user.id)) as FriendRow[])
    })()
  }, [])

  const loadEnemy = async () => {
    if (!selectedFriend) return
    const pet = (await window.electronAPI.getFriendPet(selectedFriend)) as Record<string, unknown> | null
    if (!pet) {
      setMessage('เพื่อนยังไม่มีสัตว์เลี้ยงใน cloud')
      return
    }
    setEnemyPet({
      id: String(pet.id),
      name: String(pet.name),
      species: pet.species as PetData['species'],
      element: pet.element as PetData['element'],
      gender: pet.gender as PetData['gender'],
      stage: pet.stage as PetData['stage'],
      stats: {
        hp: Number(pet.hp ?? 100),
        mood: Number(pet.mood ?? 80),
        devPoints: Number(pet.dev_points ?? 0)
      },
      hatchedAt: pet.hatched_at ? String(pet.hatched_at) : null,
      createdAt: String(pet.created_at),
      animationState: 'idle',
      feedCount: 0
    })
  }

  const fight = async () => {
    if (!save.pet || !enemyPet) return
    const result = (await window.electronAPI.simulateBattle(save.pet, enemyPet)) as {
      log: string[]
      winnerPetId: string
    }
    setLog(result.log)
    setMessage(result.winnerPetId === save.pet.id ? 'คุณชนะ!' : 'คุณแพ้!')
  }

  return (
    <div className="card">
      <h2>ต่อสู้</h2>
      {message && <p><strong>{message}</strong></p>}
      {!save.pet || save.pet.stage === 'egg' ? (
        <p>ฟักไข่และเลี้ยงสัตว์ก่อนต่อสู้</p>
      ) : (
        <>
          <p>สัตว์ของคุณ: {save.pet.name} ({ELEMENT_NAMES[save.pet.element]})</p>
          <div className="form-row">
            <label>เลือกเพื่อน (ต้อง login + sync cloud)</label>
            <select value={selectedFriend} onChange={(e) => setSelectedFriend(e.target.value)}>
              <option value="">-- เลือก --</option>
              {friends.map((f) => (
                <option key={f.friend_id} value={f.friend_id}>
                  {f.profiles?.username ?? f.friend_id}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="secondary" onClick={loadEnemy}>โหลดสัตว์เพื่อน</button>
            <button className="primary" onClick={fight} disabled={!enemyPet}>เริ่มต่อสู้</button>
          </div>
          {enemyPet && (
            <p>
              คู่ต่อสู้: {enemyPet.name} · {SPECIES_NAMES[enemyPet.species]} · {ELEMENT_NAMES[enemyPet.element]}
            </p>
          )}
          {log.length > 0 && (
            <div className="battle-log">
              {log.map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
