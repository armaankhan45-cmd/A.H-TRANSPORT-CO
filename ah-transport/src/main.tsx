import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import TrackShare from './TrackShare.tsx'
import DriverSetup from './DriverSetup.tsx'
import { initKeyboard } from './keyboard'
import { initTheme } from './theme'
import { isNative, savedToken, saveToken } from './native'

const urlToken = new URLSearchParams(location.search).get('track')
const trackToken = urlToken || (isNative() ? savedToken() : null)
if (isNative() && urlToken) saveToken(urlToken)
initKeyboard()
if (!trackToken) initTheme()
const root = createRoot(document.getElementById('root')!)
const setup = (t: string) => { saveToken(t); location.href = '/?track=' + t }

root.render(
  <StrictMode>
    {trackToken ? <TrackShare token={trackToken} /> : isNative() ? <DriverSetup onToken={setup} /> : <App />}
  </StrictMode>,
)
