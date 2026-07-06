import { useTranslation } from 'react-i18next'

interface Props {
  onStart: () => void
}

export function GetStarted({ onStart }: Props) {
  const { t } = useTranslation()

  return (
    <div className="cover-screen">
      <div className="cover-card">
        <div className="cover-logo">🥚</div>
        <h1 className="cover-title">{t('app.title')}</h1>
        <p className="cover-tagline">
          {t('home.getStartedTaglineLine1')}
          <br />
          {t('home.getStartedTaglineLine2')}
        </p>
        <ul className="cover-features">
          <li>{t('home.featureActivity')}</li>
          <li>{t('home.featureEvolution')}</li>
          <li>{t('home.featureMissions')}</li>
        </ul>
        <button className="primary cover-btn" onClick={onStart}>
          {t('home.startGame')}
        </button>
      </div>
    </div>
  )
}
