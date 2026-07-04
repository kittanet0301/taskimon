import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { PetCanvas } from './pet/PetCanvas'
import { startDesktopActivityTracking } from './desktopActivity'
import './styles.css'

const params = new URLSearchParams(window.location.search)
const view = params.get('view')

if (window.electronAPI) {
  startDesktopActivityTracking()
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {view === 'pet' ? <PetCanvas /> : <App />}
  </React.StrictMode>
)
