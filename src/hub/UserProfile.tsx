import { useEffect, useState } from 'react'
import { ELEMENT_NAMES, SPECIES_NAMES } from '../shared/constants'

interface Props {
  userId: string | null
}

export function UserProfile({ userId }: Props) {
  const [profile, setProfile] = useState<{ username: string; friend_code: string } | null>(null)
  const [pet, setPet] = useState<Record<string, unknown> | null>(null)
  const [selfId, setSelfId] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const session = (await window.electronAPI.getSession()) as { user: { id: string } } | null
      const target = userId ?? session?.user?.id ?? null
      setSelfId(session?.user?.id ?? null)
      if (!target) return
      setProfile((await window.electronAPI.getProfile(target)) as { username: string; friend_code: string })
      setPet((await window.electronAPI.getFriendPet(target)) as Record<string, unknown> | null)
    })()
  }, [userId])

  if (!profile) {
    return (
      <div className="card">
        <h2>โปรไฟล์</h2>
        <p>เข้าสู่ระบบเพื่อดูโปรไฟล์ หรือเลือกเพื่อนจากแท็บเพื่อน</p>
      </div>
    )
  }

  return (
    <div className="card">
      <h2>โปรไฟล์: {profile.username}</h2>
      <p>รหัสเพื่อน: <strong>{profile.friend_code}</strong></p>
      {userId && userId !== selfId && <p style={{ color: '#6b7280' }}>กำลังดูโปรไฟล์ของเพื่อน (อ่านอย่างเดียว)</p>}
      {pet ? (
        <div style={{ marginTop: 16 }}>
          <h3>สัตว์เลี้ยง</h3>
          <p>
            {String(pet.name)} · {SPECIES_NAMES[String(pet.species) as keyof typeof SPECIES_NAMES]} ·{' '}
            {ELEMENT_NAMES[String(pet.element) as keyof typeof ELEMENT_NAMES]} · {String(pet.stage)}
          </p>
          <p>HP {String(pet.hp)} · อารมณ์ {String(pet.mood)} · พัฒนาร่าง {String(pet.dev_points)}</p>
        </div>
      ) : (
        <p>ยังไม่มีสัตว์เลี้ยงใน cloud</p>
      )}
    </div>
  )
}
