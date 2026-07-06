import { useTranslation } from 'react-i18next'
import { PixelCoverShell } from './PixelCoverShell'

interface Props {
  onStart: () => void
}

export function GetStarted({ onStart }: Props) {
  const { t } = useTranslation()

  return (
    <PixelCoverShell
      tagline={
        <>
          {t('home.getStartedTaglineLine1')}
          <br />
          {t('home.getStartedTaglineLine2')}
        </>
      }
      showLangSwitcher={false}
      centered
    >
      <ul className="cover-features">
        <li>{t('home.featureActivity')}</li>
        <li>{t('home.featureEvolution')}</li>
        <li>{t('home.featureMissions')}</li>
      </ul>
      <button className="primary cover-btn pixel-btn" onClick={onStart}>
        {t('home.startGame')}
      </button>
    </PixelCoverShell>
  )
}
