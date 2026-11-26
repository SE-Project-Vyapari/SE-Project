import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ensureDemoData } from './seed/generateDemoData'

ensureDemoData()
  .catch(err => console.error('Demo data generation failed', err))
  .finally(() => {
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    )
  })
