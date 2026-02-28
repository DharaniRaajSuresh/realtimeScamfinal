import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ScamProvider } from './context/ScamContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ScamProvider>
      <App />
    </ScamProvider>
  </StrictMode>,
)
