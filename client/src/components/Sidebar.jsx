import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, PlaySquare, Settings, CheckSquare, MessageSquare, 
  BarChart2, Shield, Flame, LogOut
} from 'lucide-react'
import { supabase } from '../lib/supabase'

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/analytics', icon: BarChart2, label: 'Analytics' },
  { path: '/uploads', icon: PlaySquare, label: 'Video Library' },
  { path: '/studio', icon: Flame, label: 'Studio & Planning' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks & Schedule' },
  { path: '/comments', icon: MessageSquare, label: 'Community' },
  { path: '/account', icon: Shield, label: 'API & Accounts' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="w-64 bg-[#0e0e0e] border-r border-surface-high flex flex-col h-full flex-shrink-0 relative z-20">
      {/* Brand */}
      <div className="p-6 pb-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-yt-red flex items-center justify-center shadow-[0_0_15px_rgba(255,0,0,0.4)]">
          <PlaySquare size={16} className="text-white fill-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-white">Shorts Factory</span>
      </div>

      <div className="px-6 pb-6">
        <div className="badge badge-red w-full justify-center">Multi-Tenant Mode</div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide flex flex-col gap-1 px-2">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={16} className="flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-surface-high mt-auto">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2 w-full text-caption text-on-surface/50 hover:text-white hover:bg-surface-card rounded-lg transition-colors"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )
}
