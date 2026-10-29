import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { getRestaurantInfo } from '../utils/storage.js'
import { getCurrentUser } from '../utils/storage.js'
import ThemeToggle from './ThemeToggle.jsx'
import { LayoutDashboard, UtensilsCrossed, Sandwich, Martini, Salad, BookOpen, Users as UsersIcon, Settings as SettingsIcon, History as HistoryIcon, RotateCcw, ReceiptText } from 'lucide-react'

export default function Navbar({ closeMobileMenu }) {
  const [brand, setBrand] = useState(() => (getRestaurantInfo().name || 'Restaurant Manager'))
  const [isCashier, setIsCashier] = useState(() => {
    try { return String(getCurrentUser()?.role||'').toLowerCase() === 'cashier' } catch { return false }
  })
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 280 })
  const [dayMenuOpen, setDayMenuOpen] = useState(false)
  const [dayMenuPos, setDayMenuPos] = useState({ top: 0, left: 0, width: 200 })
  const [showPwd, setShowPwd] = useState(false)
  const menuRef = useRef(null)
  const profileBtnRef = useRef(null)
  const dayMenuRef = useRef(null)
  const dayBtnRef = useRef(null)
  const nav = useNavigate()

  const handleNavClick = () => {
    if (closeMobileMenu) closeMobileMenu()
  }

  useEffect(() => {
    const update = () => setBrand(getRestaurantInfo().name || 'Restaurant Manager')
    update()
    window.addEventListener('restaurantInfo:updated', update)
    return () => window.removeEventListener('restaurantInfo:updated', update)
  }, [])


  useEffect(() => {
    // Update role on mount and when storage changes (simple polling event)
    const updateRole = () => {
      try { setIsCashier(String(getCurrentUser()?.role||'').toLowerCase() === 'cashier') } catch { setIsCashier(false) }
    }
    updateRole()
    window.addEventListener('storage', updateRole)
    return () => window.removeEventListener('storage', updateRole)
  }, [])

  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target) && !profileBtnRef.current?.contains(e.target)) setOpen(false)
    }
    const onResize = () => {
      if (!open) return
      positionProfileMenu()
    }
    if (open) {
      document.addEventListener('mousedown', onDocClick)
      window.addEventListener('resize', onResize)
      window.addEventListener('scroll', onResize, true)
    }
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [open])

  function positionProfileMenu(){
    try {
      const btn = profileBtnRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      const desiredWidth = 300
      const margin = 8
      const viewportW = window.innerWidth || document.documentElement.clientWidth
      const viewportH = window.innerHeight || document.documentElement.clientHeight
      const width = Math.min(desiredWidth, Math.max(240, Math.floor(viewportW * 0.92)))
      let left = rect.right - width // align right edges
      left = Math.max(margin, Math.min(left, viewportW - width - margin))
      let top = rect.bottom + margin
      // If not enough space below, open above
      if (top + 200 > viewportH && rect.top > 260) {
        top = Math.max(margin, rect.top - 240) // approximate height
      }
      setMenuPos({ top, left, width })
    } catch {}
  }

  useEffect(() => {
    const onDocClick = (e) => {
      if (!dayMenuRef.current) return
      if (!dayMenuRef.current.contains(e.target) && !dayBtnRef.current?.contains(e.target)) setDayMenuOpen(false)
    }
    const onResize = () => { if (dayMenuOpen) positionDayMenu() }
    if (dayMenuOpen) {
      document.addEventListener('mousedown', onDocClick)
      window.addEventListener('resize', onResize)
      window.addEventListener('scroll', onResize, true)
    }
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }
  }, [dayMenuOpen])

  function positionDayMenu(){
    try {
      const btn = dayBtnRef.current
      if (!btn) return
      const rect = btn.getBoundingClientRect()
      const desiredWidth = 220
      const margin = 8
      const vw = window.innerWidth || document.documentElement.clientWidth
      const vh = window.innerHeight || document.documentElement.clientHeight
      const width = Math.min(desiredWidth, Math.max(160, Math.floor(vw * 0.9)))
      let left = rect.left // align left
      left = Math.max(margin, Math.min(left, vw - width - margin))
      let top = rect.bottom + margin
      if (top + 160 > vh && rect.top > 180) { // open upward if near bottom
        top = Math.max(margin, rect.top - 180)
      }
      setDayMenuPos({ top, left, width })
    } catch {}
  }

  const user = getCurrentUser() || { role: '-', username: '-', password: '' }

  return (
    <header className="navbar">
      <div className="brand">
        <div className="brand-circle">B</div>
        <div className="brand-text">
          <span>{brand}</span>
          <span className="brand-sub">Restaurant POS</span>
        </div>
      </div>

      <nav>
        {isCashier ? (
          // Cashier-only navigation
          <>
            <NavLink to="/pos" className={({isActive}) => (isActive ? 'active' : '')} onClick={handleNavClick}>
              <span className="flex items-center gap-2"><UtensilsCrossed size={16}/> <span>Menu</span></span>
            </NavLink>
            <NavLink to="/recent-sales" className={({isActive}) => (isActive ? 'active' : '')} onClick={handleNavClick}>
              <span className="flex items-center gap-2"><ReceiptText size={16}/> <span>Recent Sales</span></span>
            </NavLink>
          </>
        ) : (
          // Admin/Manager navigation
          <>
            <NavLink to="/" end className={({isActive}) => (isActive ? 'active' : '')} onClick={handleNavClick}>
              <span className="flex items-center gap-2"><LayoutDashboard size={16}/> <span>Dashboard</span></span>
            </NavLink>
            <NavLink to="/pos" className={({isActive}) => (isActive ? 'active' : '')} onClick={handleNavClick}>
              <span className="flex items-center gap-2"><UtensilsCrossed size={16}/> <span>Menu</span></span>
            </NavLink>
            <NavLink to="/add-items" className={({isActive}) => (isActive ? 'active' : '')} onClick={handleNavClick}>
              <span className="flex items-center gap-2"><Sandwich size={16}/> <span>Add Items</span></span>
            </NavLink>
            <NavLink to="/recipes" className={({isActive}) => (isActive ? 'active' : '')} onClick={handleNavClick}>
              <span className="flex items-center gap-2"><BookOpen size={16}/> <span>Recipes</span></span>
            </NavLink>
            <NavLink to="/users" className={({isActive}) => (isActive ? 'active' : '')} onClick={handleNavClick}>
              <span className="flex items-center gap-2"><UsersIcon size={16}/> <span>Users</span></span>
            </NavLink>
            <NavLink to="/settings" className={({isActive}) => (isActive ? 'active' : '')} onClick={handleNavClick}>
              <span className="flex items-center gap-2"><SettingsIcon size={16}/> <span>Settings</span></span>
            </NavLink>
            <NavLink to="/sales" className={({isActive}) => (isActive ? 'active' : '')} onClick={handleNavClick}>
              <span className="flex items-center gap-2"><ReceiptText size={16}/> <span>Sale History</span></span>
            </NavLink>
            <NavLink to="/returns" className={({isActive}) => (isActive ? 'active' : '')} onClick={handleNavClick}>
              <span className="flex items-center gap-2"><RotateCcw size={16}/> <span>Refund Order</span></span>
            </NavLink>
            <NavLink to="/return-history" className={({isActive}) => (isActive ? 'active' : '')} onClick={handleNavClick}>
              <span className="flex items-center gap-2"><HistoryIcon size={16}/> <span>Refund History</span></span>
            </NavLink>
            <NavLink to="/consumption" className={({isActive}) => (isActive ? 'active' : '')} onClick={handleNavClick}>
              <span className="flex items-center gap-2"><Salad size={16}/> <span>Consumption</span></span>
            </NavLink>
            <div style={{ marginTop: 4 }}>
              <button
                ref={dayBtnRef}
                type="button"
                className="btn"
                onClick={()=>{ setDayMenuOpen(v=>{ const next = !v; if (!v && next) positionDayMenu(); return next }) }}
                title="Day options"
                style={{ width: '100%', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.03)' }}
              >
                <span>Business Day</span>
                <span style={{ fontSize: 11, opacity: 0.7 }}>▾</span>
              </button>
              {dayMenuOpen && (
                <div ref={dayMenuRef} className="card" style={{position:'fixed', top:dayMenuPos.top, left:dayMenuPos.left, width:dayMenuPos.width, maxWidth:'92vw', padding:8, zIndex:1200, background: 'var(--panel-elevated)', boxShadow: 'var(--shadow-lg)'}}>
                  <button className="btn" style={{width:'100%', justifyContent:'flex-start', border: 'none', background: 'rgba(255,255,255,0.04)'}} onClick={()=>{ setDayMenuOpen(false); handleNavClick(); nav('/day-open') }}>☀️ Day Open</button>
                  <button className="btn" style={{width:'100%', justifyContent:'flex-start', marginTop:6, border: 'none', background: 'rgba(255,255,255,0.04)'}} onClick={()=>{ setDayMenuOpen(false); handleNavClick(); nav('/day-close') }}>🌙 Day Close</button>
                </div>
              )}
            </div>
          </>
        )}
      </nav>

      {/* Profile button */}
      <div className="profile-wrap" style={{ position: 'sticky', bottom: 0, left: 0, right: 0, padding: '12px 14px', background: 'var(--panel)' }}>
        <button
          ref={profileBtnRef}
          type="button"
          onClick={()=>{ setOpen(o=>{ const next = !o; if (!o && !next) return next; if (!o && next) positionProfileMenu(); return next }) }}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 10px',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'rgba(255, 255, 255, 0.04)',
            cursor: 'pointer',
            textAlign: 'left',
            color: 'var(--text)',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'var(--primary-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 13,
            color: '#fff',
            flexShrink: 0
          }}>
            {(user.username || 'U')[0].toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
            <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.username || 'User'}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'capitalize' }}>{user.role || 'Staff'}</span>
          </div>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>⚙️</span>
        </button>

        {open && (
          <div ref={menuRef} className="card" style={{position:'fixed', top:menuPos.top, left:menuPos.left, width:menuPos.width, maxWidth:'92vw', padding:16, zIndex:1200, background: 'var(--panel-elevated)', boxShadow: 'var(--shadow-lg)'}}>
            <div className="card-title" style={{display:'flex', alignItems:'center', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px solid var(--border)'}}>
              <span>User Profile</span>
              <span style={{ fontSize: 11, background: 'var(--badge-bg)', padding: '2px 8px', borderRadius: 999, textTransform: 'capitalize' }}>{user.role||'-'}</span>
            </div>
            <div className="row" style={{justifyContent:'space-between', marginTop: 10}}><div className="muted">Role</div><div style={{fontWeight:600}}>{user.role||'-'}</div></div>
            <div className="row" style={{justifyContent:'space-between', marginTop: 6}}><div className="muted">Username</div><div style={{fontWeight:600}}>{user.username||'-'}</div></div>
            <div className="row" style={{justifyContent:'space-between', alignItems:'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)'}}>
              <div className="muted">Theme</div>
              <ThemeToggle variant="segmented" />
            </div>
            <div className="form" style={{marginTop:12}}>
              <label className="muted" style={{display:'block', marginBottom:4, fontSize: 12}}>Password</label>
              <div className="input-wrap">
                <input
                  className="input"
                  type={showPwd ? 'text' : 'password'}
                  value={user.password || ''}
                  readOnly
                  placeholder="-"
                  style={{paddingRight:36, height: 38, minHeight: 38}}
                />
                <button
                  type="button"
                  className="input-icon-btn eye-toggle"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  title={showPwd ? 'Hide password' : 'Show password'}
                  onClick={()=>setShowPwd(v=>!v)}
                  style={{ borderRadius: 8 }}
                >
                  {showPwd ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.02-2.78 2.86-5.06 5.12-6.56"/>
                      <path d="M1 1l22 22"/>
                      <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24"/>
                      <path d="M10.73 5.08A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a11.28 11.28 0 0 1-2.16 3.19"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="actions" style={{justifyContent:'flex-end', marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)'}}>
              <button className="btn danger" style={{ width: '100%' }} onClick={()=>{ setOpen(false); nav('/logout') }}>Sign Out</button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
