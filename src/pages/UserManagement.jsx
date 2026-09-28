import { useEffect, useMemo, useState } from 'react'
import { useConfirm, useDialog } from '../components/ConfirmProvider.jsx'
import {
  listUsers,
  addUser,
  updateUser,
  deleteUser,
} from '../utils/storage.js'

export default function UserManagement(){
  // Users
  const [users, setUsers] = useState([])
  const [editing, setEditing] = useState(null) // user id or null
  const [filter, setFilter] = useState('')
  const confirm = useConfirm()
  const dialog = useDialog()

  useEffect(()=>{
    setUsers(listUsers())
  },[])

  const filteredUsers = useMemo(()=>{
    const q = filter.toLowerCase()
    return users.filter(u =>
      (u.name||'').toLowerCase().includes(q) ||
      (u.username||'').toLowerCase().includes(q) ||
      (u.role||'').toLowerCase().includes(q)
    )
  },[users, filter])

  // Users CRUD
  const roleOptions = ['Admin', 'Manager', 'Cashier', 'Waiter']
  const [form, setForm] = useState({ name:'', role:roleOptions[0], username:'', password:'' })
  const resetForm = () => setForm({ name:'', role:'', username:'', password:'' })
  const [showPassword, setShowPassword] = useState(false)

  const submitUser = async () => {
    if (!form.name.trim() || !form.username.trim()) {
      await dialog.alert({ title: 'Missing fields', description: 'Name and Username are required.' })
      return
    }
    if (editing) {
      const updated = { id: editing, ...form }
      updateUser(updated)
      setUsers(prev => prev.map(u => u.id === editing ? { ...u, ...updated } : u))
      setEditing(null)
      resetForm()
    } else {
      const created = addUser(form)
      setUsers(prev => [...prev, created])
      resetForm()
    }
  }
  const onEdit = (user) => {
    setEditing(user.id)
    setForm({ name:user.name||'', role:user.role||'', username:user.username||'', password:user.password||'' })
  }
  const onDelete = async (id) => {
    const ok = await confirm({ title: 'Delete User', description: 'Are you sure you want to delete this?' })
    if (!ok) return
    deleteUser(id)
    setUsers(prev => prev.filter(u => u.id !== id))
    if (editing === id) { setEditing(null); resetForm() }
  }

  return (
    <section className="page">
      <h1>Users</h1>

      <div className="grid2">
        <div className="card">
          <div className="card-title">Add / Edit User</div>
          <div className="grid2">
            <div className="form">
              <label>Name</label>
              <input className="input" value={form.name} onChange={e=>setForm(f=>({ ...f, name:e.target.value }))} placeholder="Full Name" />
            </div>
            <div className="form">
              <label>Role</label>
              <select className="input" value={form.role} onChange={e=>setForm(f=>({ ...f, role:e.target.value }))}>
                {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form">
              <label>Username</label>
              <input className="input" value={form.username} onChange={e=>setForm(f=>({ ...f, username:e.target.value }))} placeholder="Username" />
            </div>
            <div className="form">
              <label>Password</label>
              <div className="input-wrap">
                <input
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e=>setForm(f=>({ ...f, password:e.target.value }))}
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="input-icon-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  onClick={()=>setShowPassword(v=>!v)}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1.02-2.78 2.86-5.06 5.12-6.56"/>
                      <path d="M1 1l22 22"/>
                      <path d="M9.88 9.88a3 3 0 0 0 4.24 4.24"/>
                      <path d="M10.73 5.08A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a11.28 11.28 0 0 1-2.16 3.19"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="actions">
            <button className="btn primary" onClick={submitUser}>{editing ? 'Update User' : 'Add User'}</button>
            {editing && <button className="btn" onClick={()=>{ setEditing(null); resetForm() }}>Cancel</button>}
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop:12}}>
        <div className="row header-row" style={{alignItems:'center'}}>
          <div className="big">Users</div>
          <div className="row" style={{gap:8}}>
            <input className="input" placeholder="Search users..." value={filter} onChange={e=>setFilter(e.target.value)} />
          </div>
        </div>
        <div className="bill-head" style={{gridTemplateColumns:'1fr 160px 160px 160px 160px'}}>
          <div>Name</div>
          <div>Role</div>
          <div>Username</div>
          <div>Password</div>
          <div>Actions</div>
        </div>
        {filteredUsers.length===0 && <div className="muted">No users.</div>}
        {filteredUsers.map(u => (
          <div key={u.id} className="bill-row" style={{gridTemplateColumns:'1fr 160px 160px 160px 160px'}}>
            <div className="grow">{u.name}</div>
            <div>{u.role||'-'}</div>
            <div>{u.username}</div>
            <div>{u.password ? '••••••' : '-'}</div>
            <div className="row" style={{justifyContent:'flex-start'}}>
              <button className="btn" onClick={()=>onEdit(u)}>Edit</button>
              <button className="btn danger" onClick={()=>onDelete(u.id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
