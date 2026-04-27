import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { Providers } from './app/providers'
import { Router } from './app/Router'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Providers>
      <Router />
    </Providers>
  </React.StrictMode>,
)
