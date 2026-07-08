import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/i18n'
import App from '../../src/App'
import '../../src/styles.css'
import { createWebApi } from './webApi'
import { hydrateFromSession } from './gameStore'
import { startActivityTracking } from './activity'

const PASSWORD_RECOVERY_FLAG = 'taskino-password-recovery'

async function bootstrap() {
  if (window.location.href.includes('type=recovery')) {
    window.sessionStorage.setItem(PASSWORD_RECOVERY_FLAG, '1')
  }
  window.electronAPI = createWebApi()
  await hydrateFromSession()
  startActivityTracking()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App variant="web" />
    </StrictMode>
  )
}

bootstrap().catch((err) => {
  console.error(err)
  document.body.innerHTML = `<pre style="padding:24px;color:#b91c1c">Failed to bootstrap app: ${String(err)}</pre>`
})
