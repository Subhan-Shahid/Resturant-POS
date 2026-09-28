import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { getCurrentUser, isTokenClosed, getDayOpenAt, openDay, getActiveBusinessDateId, getBusinessDateId } from './utils/storage.js'
import Navbar from './components/Navbar.jsx'
import Dashboard from './pages/Dashboard.jsx'
import UnifiedPos from './pages/UnifiedPos.jsx'
import Recipes from './pages/Recipes.jsx'
import SaleHistory from './pages/SaleHistory.jsx'
import ReturnOrder from './pages/ReturnOrder.jsx'
import ReturnHistory from './pages/ReturnHistory.jsx'
import AddItems from './pages/AddItems.jsx'
import UserManagement from './pages/UserManagement.jsx'
import Login from './pages/Login.jsx'
import Logout from './pages/Logout.jsx'
import Consumption from './pages/Consumption.jsx'
import Settings from './pages/Settings.jsx'
import DayClose from './pages/DayClose.jsx'
import DayOpen from './pages/DayOpen.jsx'
import BusinessDateBadge from './components/BusinessDateBadge.jsx'
import RecentSales from './pages/RecentSales.jsx'

export default function App() {
  useEffect(()=>{
    try {
      const nowBiz = getBusinessDateId(Date.now())
      const opened = getDayOpenAt() || 0
      const closed = isTokenClosed()
      const active = getActiveBusinessDateId()
      const needsOpen = !opened || closed || active !== nowBiz
      if (needsOpen) openDay()
    } catch {}
  },[])
  const RequireAuth = ({ children }) => {
    const user = getCurrentUser()
    if (!user) return <Navigate to="/login" />
    return children
  }

  const RequireNotCashier = ({ children }) => {
    const user = getCurrentUser()
    if (user && String(user.role || '').toLowerCase() === 'cashier') {
      return <Navigate to="/pos" />
    }
    return children
  }

  const CashierDashboard = () => {
    const user = getCurrentUser()
    if (user && String(user.role || '').toLowerCase() === 'cashier') {
      return <Navigate to="/pos" />
    }
    return <Dashboard />
  }

  const location = useLocation()
  const showShell = location.pathname !== '/login'
  const fullWidthPaths = ['/', '/pos']
  const isFullPage = fullWidthPaths.includes(location.pathname)

  const routes = (
    <Routes>
      <Route path="/" element={<RequireAuth><CashierDashboard /></RequireAuth>} />
      <Route path="/add-items" element={<RequireAuth><RequireNotCashier><AddItems /></RequireNotCashier></RequireAuth>} />
      <Route path="/pos" element={<RequireAuth><UnifiedPos /></RequireAuth>} />
      <Route path="/recipes" element={<RequireAuth><RequireNotCashier><Recipes /></RequireNotCashier></RequireAuth>} />
      <Route path="/login" element={<Login />} />
      <Route path="/logout" element={<Logout />} />
      <Route path="/users" element={<RequireAuth><RequireNotCashier><UserManagement /></RequireNotCashier></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth><RequireNotCashier><Settings /></RequireNotCashier></RequireAuth>} />
      <Route path="/day-open" element={<RequireAuth><RequireNotCashier><DayOpen /></RequireNotCashier></RequireAuth>} />
      <Route path="/day-close" element={<RequireAuth><RequireNotCashier><DayClose /></RequireNotCashier></RequireAuth>} />
      <Route path="/consumption" element={<RequireAuth><RequireNotCashier><Consumption /></RequireNotCashier></RequireAuth>} />
      <Route path="/sales" element={<RequireAuth><RequireNotCashier><SaleHistory /></RequireNotCashier></RequireAuth>} />
      <Route path="/returns" element={<RequireAuth><RequireNotCashier><ReturnOrder /></RequireNotCashier></RequireAuth>} />
      <Route path="/return-history" element={<RequireAuth><RequireNotCashier><ReturnHistory /></RequireNotCashier></RequireAuth>} />
      <Route path="/recent-sales" element={<RequireAuth><RecentSales /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  )

  if (!showShell) {
    return (
      <div className="app">
        <main className="container full">
          {routes}
        </main>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className="shell-sidebar">
        <Navbar />
      </aside>
      <div className="shell-main">
        <header className="shell-header">
          <div className="shell-header-right" style={{display:'flex', justifyContent:'flex-end', width:'100%'}}>
            <BusinessDateBadge />
          </div>
        </header>
        <main className={`shell-content container ${isFullPage ? 'full' : ''}`}>
          {routes}
        </main>
      </div>
    </div>
  )
}

