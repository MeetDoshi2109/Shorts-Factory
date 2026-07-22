import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a1a1a',
            color: '#e5e2e1',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          },
          success: {
            iconTheme: { primary: '#4edea3', secondary: '#0e0e0e' },
            style: { borderColor: 'rgba(78,222,163,0.2)' },
          },
          error: {
            iconTheme: { primary: '#FF0000', secondary: '#0e0e0e' },
            style: { borderColor: 'rgba(255,0,0,0.2)' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
)
