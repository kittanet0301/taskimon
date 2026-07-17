import { useTranslation } from 'react-i18next'

export type HubSidebarTarget =
  | 'collection'
  | 'inventory'
  | 'community'
  | 'minigame'
  | 'battle'
  | 'settings'

interface Props {
  activeTarget: HubSidebarTarget | null
  displayName: string
  disabled?: boolean
  badges?: Partial<Record<HubSidebarTarget, number>>
  onNavigate: (target: HubSidebarTarget) => void
}

const AVATAR_ICON_SRC = '/ui/hud-icon-dino.png'

const NAV_ICON_SRC: Record<HubSidebarTarget, string> = {
  collection: '/ui/hud-icon-collection.png',
  inventory: '/ui/hud-icon-inventory.png',
  community: '/ui/hud-icon-community.png',
  minigame: '/ui/hud-icon-minigame.png',
  battle: '/ui/hud-icon-battle.png',
  settings: '/ui/hud-icon-settings.png'
}

export function HubSidebar({ activeTarget, displayName, disabled, badges, onNavigate }: Props) {
  const { t } = useTranslation()

  const items: Array<{ id: HubSidebarTarget; label: string }> = [
    { id: 'collection', label: t('tabs.collection') },
    { id: 'inventory', label: t('inventory.title') },
    { id: 'community', label: t('tabs.friends') },
    { id: 'minigame', label: t('tabs.minigame') },
    { id: 'battle', label: t('tabs.battle') },
    { id: 'settings', label: t('tabs.settings') }
  ]

  return (
    <aside className="hub-sidebar" aria-label="Main navigation">
      <div className="dash-hud-avatar">
        <img className="hud-icon hud-icon--large" src={AVATAR_ICON_SRC} alt="" draggable={false} />
        <span>{displayName}</span>
      </div>
      {items.map((item) => {
        const badgeCount = badges?.[item.id] ?? 0
        const label =
          item.id === 'inventory' && badgeCount > 0
            ? t('gift.sidebarPending', { count: badgeCount })
            : item.label
        return (
          <button
            key={item.id}
            type="button"
            className={`dash-hud-nav-btn${activeTarget === item.id ? ' active' : ''}${
              badgeCount > 0 ? ' dash-hud-nav-btn--badge' : ''
            }`}
            onClick={() => onNavigate(item.id)}
            disabled={disabled}
            title={label}
            aria-label={label}
          >
            <img className="hud-icon" src={NAV_ICON_SRC[item.id]} alt="" draggable={false} />
            {badgeCount > 0 && (
              <span className="dash-hud-nav-badge" aria-hidden>
                {badgeCount > 9 ? '9+' : badgeCount}
              </span>
            )}
          </button>
        )
      })}
    </aside>
  )
}
