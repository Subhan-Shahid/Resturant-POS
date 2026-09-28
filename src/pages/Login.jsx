import { useEffect, useState } from 'react'
import { login, getCurrentUser, getRestaurantInfo } from '../utils/storage.js'
import { useNavigate } from 'react-router-dom'

export default function Login(){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const nav = useNavigate()
  const restInfo = getRestaurantInfo()

  useEffect(()=>{
    const u = getCurrentUser()
    if (u) nav('/')
  },[nav])

  const submit = (e) => {
    e.preventDefault()
    const u = login(username, password)
    if (u) nav('/')
    else setError('Invalid username or password')
  }

  return (
    <section className="login-page">
      <div className="login-card">
        <div className="login-illus" aria-hidden>
          {/* Playful 3D-ish illustration made with layered shapes */}
          <div className="illus-bg" />
          <div className="illus-brand">{restInfo.name || 'Resturant'}</div>
        </div>
        <div className="login-form">
          <div className="login-head">
            <div className="title">Login</div>
            <div className="subtitle">Welcome to {restInfo.name || 'our restaurant'}! Please sign in to continue.</div>
          </div>
          <form onSubmit={submit}>
          <div className="form">
            <label>Username</label>
            <input className="input" value={username} onChange={e=>setUsername(e.target.value)} />
          </div>
          <div className="form">
            <label>Password</label>
            <div className="input-wrap">
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e=>setPassword(e.target.value)}
              />
              <button
                type="button"
                className="input-icon-btn"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={()=>setShowPassword(v=>!v)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  // Eye-off icon
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.02-2.78 2.86-5.06 5.12-6.56"/>
                    <path d="M1 1l22 22"/>
                    <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24"/>
                    <path d="M10.73 5.08A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a11.28 11.28 0 0 1-2.16 3.19"/>
                  </svg>
                ) : (
                  // Eye icon
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
          {error && <div className="muted" style={{color:'var(--danger)'}}>{error}</div>}
          <div className="actions" style={{justifyContent:'flex-end'}}>
            <button className="btn primary" type="submit">Login</button>
          </div>
          </form>
        </div>
      </div>
    </section>
  )
}

