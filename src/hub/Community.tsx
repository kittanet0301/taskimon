import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Chat } from './Chat'
import { Friends } from './Friends'

interface Props {
  onViewProfile: (userId: string) => void
}

type CommunityTab = 'friends' | 'chat'

export function Community({ onViewProfile }: Props) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<CommunityTab>('friends')

  return (
    <div className="community-view">
      <div className="card community-tabs-card">
        <div className="battle-hub-tabs">
          <button
            type="button"
            className={`tab ${tab === 'friends' ? 'active' : ''}`}
            onClick={() => setTab('friends')}
          >
            {t('friends.title')}
          </button>
          <button
            type="button"
            className={`tab ${tab === 'chat' ? 'active' : ''}`}
            onClick={() => setTab('chat')}
          >
            {t('chat.title')}
          </button>
        </div>
      </div>
      {tab === 'friends' ? <Friends key="friends" onViewProfile={onViewProfile} /> : <Chat key="chat" />}
    </div>
  )
}
