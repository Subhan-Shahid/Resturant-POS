import { NavLink } from 'react-router-dom'
import { LayoutDashboard, UtensilsCrossed, ReceiptText, BookOpen, MoreHorizontal } from 'lucide-react'
import { getCurrentUser } from '../utils/storage.js'

export default function MobileTabBar({ onMore }) {
  let isCashier = false
  try { isCashier = String(getCurrentUser()?.role || '').toLowerCase() === 'cashier' } catch {}

  const tabs = isCashier
    ? [
        { to: '/pos', label: 'Menu', icon: UtensilsCrossed },
        { to: '/recent-sales', label: 'Sales', icon: ReceiptText },
      ]
    : [
        { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
        { to: '/pos', label: 'Menu', icon: UtensilsCrossed },
        { to: '/sales', label: 'Sales', icon: ReceiptText },
        { to: '/recipes', label: 'Recipes', icon: BookOpen },
      ]

  return (
    <nav className="mobile-tabbar" aria-label="Primary">
      {tabs.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => `tabbar-item ${isActive ? 'active' : ''}`}>
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
      <button type="button" className="tabbar-item" onClick={onMore}>
        <MoreHorizontal size={20} />
        <span>More</span>
      </button>
    </nav>
  )
}
