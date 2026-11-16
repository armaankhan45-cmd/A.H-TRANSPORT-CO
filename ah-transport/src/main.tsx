import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import TrackShare from './TrackShare.tsx'

const trackToken = new URLSearchParams(location.search).get('track')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {trackToken ? <TrackShare token={trackToken} /> : <App />}
  </StrictMode>,
)
