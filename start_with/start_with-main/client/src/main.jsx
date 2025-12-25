import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SocketProvider } from './socket/SocketProvider.jsx'
import { BrowserRouter } from 'react-router-dom';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <SocketProvider> {/*I didnt pass the token here, because i will set it later when user logs in through login page */}
      <App />
    </SocketProvider>
  </BrowserRouter>
)
