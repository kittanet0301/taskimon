import { useTranslation } from 'react-i18next'

export type HubSidebarTarget =
  | 'profile'
  | 'home'
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
  onNavigate: (target: HubSidebarTarget) => void
}

const NAV_ICON_SRC: Record<Exclude<HubSidebarTarget, 'profile'>, string> = {
  home: '/ui/hud-icon-dino.png',
  collection: '/ui/hud-icon-collection.png',
  inventory: '/ui/hud-icon-inventory.png',
  community: '/ui/hud-icon-community.png',
  minigame: '/ui/hud-icon-minigame.png',
  battle: '/ui/hud-icon-battle.png',
  settings: '/ui/hud-icon-settings.png'
}

export function HubSidebar({ activeTarget, displayName, disabled, onNavigate }: Props) {
  const { t } = useTranslation()

  const items: Array<{ id: HubSidebarTarget; label: string }> = [
    { id: 'profile', label: t('tabs.profile') },
    { id: 'home', label: t('tabs.home') },
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
        <img className="hud-icon hud-icon--large" src={NAV_ICON_SRC.home} alt="" draggable={false} />
        <span>{displayName}</span>
      </div>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`dash-hud-nav-btn${activeTarget === item.id ? ' active' : ''}`}
          onClick={() => onNavigate(item.id)}
          disabled={disabled}
          title={item.label}
          aria-label={item.label}
        >
          {item.id === 'profile' ? (
            <span className="hud-icon hud-icon-emoji" aria-hidden>
              👤
            </span>
          ) : (
            <img className="hud-icon" src={NAV_ICON_SRC[item.id]} alt="" draggable={false} />
          )}
        </button>
      ))}
    </aside>
  )
}
