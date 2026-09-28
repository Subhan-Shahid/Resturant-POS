import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App.jsx'
import './tailwind.css'
import './styles.css'
import { listUsers, addUser } from './utils/storage.js'
import { ensureTokenDay, openTokens } from './utils/storage.js'
import { logout } from './utils/storage.js'
import { ConfirmProvider } from './components/ConfirmProvider.jsx'

// One-time initialization: seed a default admin if no users exist
try {
  const users = listUsers()
  if (!Array.isArray(users) || users.length === 0) {
    addUser({
      name: 'Admin',
      role: 'Admin',
      username: 'admin',
      password: '123',
    })
    addUser({
      name: 'Cashier',
      role: 'Cashier',
      username: 'cashier',
      password: '123',
    })
    // Optionally, you could console.info here, but keep UI clean
  } else {
    // If users exist, ensure 'admin' has password '123' if it currently has 'admin'
    // or if the user specifically asked to set it.
    // To be safe and fulfill the request directly, we can ensure the admin password is 123
    const admin = users.find(u => u.username === 'admin')
    if (admin && admin.password === 'admin') {
      import('./utils/storage.js').then(m => {
        m.updateUser({ ...admin, password: '123' })
      })
    }
  }
  // Ensure tokens start from 1 each day and reopen tokens on fresh start
  ensureTokenDay()
  openTokens()
} catch {}

// Always require fresh login on app open
try { logout() } catch {}

// Ensure initial route shows the login page
try {
  const h = String(window.location.hash || '')
  if (!h || h === '#/' || h === '#') {
    window.location.hash = '#/login'
  }
} catch {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
    </HashRouter>
  </React.StrictMode>
)

