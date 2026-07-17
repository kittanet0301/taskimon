import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { GameSave } from '../shared/types'
import { petPreviewColor } from '../shared/constants'
import { tCharacter, tStage } from '../i18n/labels'
import { mapPetRowToPetData } from '../shared/battle/mappers'
import { DinoSprite } from '../components/DinoSprite'
import { GenderTag } from '../components/GenderTag'
import { displaySizeForPet } from '../shared/petSprites'
import { SendGiftModal } from './SendGiftModal'

const FRIEND_PET_PREVIEW = 96

interface Props {
  userId: string
  save?: GameSave | null
  onUpdated?: () => void | Promise<void>
  onClose: () => void
}

export function UserProfile({ userId, save, onUpdated, onClose }: Props) {
  const { t } = useTranslation()
  const [profile, setProfile] = useState<{ username: string; friend_code: string } | null>(null)
  const [petRow, setPetRow] = useState<Record<string, unknown> | null>(null)
  const [showGift, setShowGift] = useState(false)

  useEffect(() => {
    ;(async () => {
      setProfile((await window.electronAPI.getProfile(userId)) as { username: string; friend_code: string })
      setPetRow((await window.electronAPI.getFriendPet(userId)) as Record<string, unknown> | null)
    })()
  }, [userId])

  if (!profile) {
    return (
      <div className="hub-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
        <div className="hub-modal profile-modal card" onClick={(e) => e.stopPropagation()}>
          <div className="hub-modal-head">
            <h2>{t('profile.title')}</h2>
            <button type="button" className="hub-modal-close" onClick={onClose} aria-label={t('common.cancel')}>
              ×
            </button>
          </div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  const pet = petRow ? mapPetRowToPetData(petRow) : null

  return (
    <div className="hub-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="hub-modal profile-modal card" onClick={(e) => e.stopPropagation()}>
        <div className="hub-modal-head">
          <h2>{t('profile.titleWithName', { username: profile.username })}</h2>
          <button type="button" className="hub-modal-close" onClick={onClose} aria-label={t('common.cancel')}>
            ×
          </button>
        </div>
        <p>
          {t('profile.friendCode')}: <strong>{profile.friend_code}</strong>
        </p>
        <div className="profile-friend-actions">
          <p style={{ color: '#6b7280', margin: 0 }}>{t('profile.viewingFriendReadonly')}</p>
          {save && (
            <button type="button" className="dash-hud-action dash-hud-action--inline" onClick={() => setShowGift(true)}>
              {t('gift.sendGift')}
            </button>
          )}
        </div>

        {pet ? (
          <div className="profile-active-pet">
            <div className="profile-active-pet-head">
              <h3>{t('profile.petTitle')}</h3>
              <span className="profile-playing-badge">{t('profile.playingNow')}</span>
            </div>
            <div className="profile-active-pet-body">
              <div
                className="profile-active-pet-preview"
                style={{ background: petPreviewColor(pet.character) }}
              >
                <DinoSprite pet={pet} size={Math.min(displaySizeForPet(pet), FRIEND_PET_PREVIEW)} />
              </div>
              <div className="profile-active-pet-meta">
                <strong>{pet.name}</strong>
                <span>
                  {tCharacter(pet.character)} · <GenderTag gender={pet.gender} /> · {tStage(pet.stage)}
                </span>
                <span>
                  {t('profile.statsLine', {
                    hp: String(pet.stats.hp),
                    mood: String(pet.stats.mood),
                    devPoints: String(pet.stats.devPoints)
                  })}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p>{t('profile.noCloudPet')}</p>
        )}

        {showGift && save && (
          <SendGiftModal
            save={save}
            recipientId={userId}
            recipientName={profile.username}
            onClose={() => setShowGift(false)}
            onSent={async () => {
              await onUpdated?.()
            }}
          />
        )}
      </div>
    </div>
  )
}
