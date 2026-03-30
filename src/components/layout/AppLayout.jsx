import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, Shield, Building, FileText,
  Settings, LogOut, Menu, X, ChevronRight, ChevronDown,
  User, Sun, Moon, Layers, Grid3X3, Globe, Zap,
  Building2, MapPin, Globe2, CheckSquare, Briefcase,
  UserCog, Clock, Calendar, BarChart2, Users2, Mail, LayoutGrid, MessageSquare
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import useThemeStore from '../../store/themeStore'
import NotificationBell from '../ui/NotificationBell'
import CompanyContextBar from '../ui/CompanyContextBar'
import { useSocket } from '../../hooks/useSocket'
import toast from 'react-hot-toast'
import { useQuery } from '@tanstack/react-query'
import { notificationsAPI } from '../../services/api'

/* ── Nav definition ──────────────────────────────────────────────── */
const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      // Main Dashboard — only visible to roles with 'dashboard' permission (Admin, Manager etc.)
      { path: '/dashboard',    icon: LayoutDashboard, label: 'Main Dashboard', module: 'dashboard' },
      // My Dashboard — visible to every logged-in user
      { path: '/my-dashboard', icon: LayoutGrid,      label: 'My Dashboard',   module: 'my-dashboard' },
    ]
  },
  {
    label: 'Organization',
    items: [
      { path: '/company',     icon: Building2, label: 'Company Master', module: 'company' },
      { path: '/sites',       icon: MapPin,    label: 'Site Master',    module: 'sites' },
      { path: '/departments', icon: Building,  label: 'Departments',    module: 'departments' },
      { path: '/verticals',   icon: Layers,    label: 'Verticals',      module: 'verticals' },
    ]
  },
  {
    label: 'People',
    items: [
      { path: '/users', icon: Users,  label: 'Users',        module: 'users' },
      { path: '/roles', icon: Shield, label: 'Roles & Perms', module: 'roles' },
    ]
  },
  {
    label: 'Human Resources',
    items: [
      { path: '/hr',         icon: UserCog,  label: 'Employees',  module: 'hr' },
      { path: '/attendance', icon: Clock,    label: 'Attendance', module: 'attendance' },
      { path: '/leave',      icon: Calendar, label: 'Leave',      module: 'leave' },
    ]
  },
  {
    label: 'Work',
    items: [
      { path: '/projects', icon: Briefcase,  label: 'Projects', module: 'projects' },
      { path: '/tasks',    icon: CheckSquare,    label: 'Tasks',    module: 'tasks' },
      { path: '/chat',     icon: MessageSquare,  label: 'Chat',     module: 'chat' },
      { path: '/support-management', icon: MessageSquare, label: 'Support', module: 'dashboard' },
    ]
  },
  {
    label: 'Analytics',
    items: [
      { path: '/reports', icon: BarChart2, label: 'Reports', module: 'reports' },
    ]
  },
  {
    label: 'System',
    items: [
      { path: '/web-services', icon: Globe2,    label: 'Web Services', module: 'web-services' },
      { path: '/modules',      icon: Grid3X3,   label: 'Modules',      module: 'modules' },
      { path: '/ip-tracking',  icon: Globe,     label: 'IP Tracking',  module: 'audit' },
      { path: '/audit-logs',   icon: FileText,  label: 'Audit Logs',   module: 'audit' },
      { path: '/settings',       icon: Settings,  label: 'Settings',        module: 'settings' },
      { path: '/email-settings', icon: Mail,      label: 'Email Settings',  module: 'settings' },
    ]
  },
]

/* ── Collapsible nav group ───────────────────────────────────────── */
function NavGroup({ group, onClose, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  const { canAccess } = useAuthStore()
  const location = useLocation()
  const { on } = useSocket()
  const [supportUnread, setSupportUnread] = useState(0)
  
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getAll({ limit: 10 }).then(r => r.data.data),
    staleTime: 30000,
  })
  const unreadCount = data?.unreadCount || 0

  // Real-time socket tracking for support notifications
  useEffect(() => {
    const cleanup = [
      on('support:ticket:new', () => {
        // Only increment if not currently on support page
        if (location.pathname !== '/support-management') {
          setSupportUnread(prev => prev + 1)
        }
      }),
      on('support:message:new', (msg) => {
        const senderType = msg.senderType || msg.type
        // Only notify for user messages (not agent or bot messages we sent)
        if (senderType === 'user' && location.pathname !== '/support-management') {
          setSupportUnread(prev => prev + 1)
        }
      }),
      on('support:ticket:assigned', () => {
        if (location.pathname !== '/support-management') {
          setSupportUnread(prev => prev + 1)
        }
      }),
    ]
    return () => cleanup.forEach(fn => fn && fn())
  }, [on, location.pathname])

  // Reset support unread when visiting support page
  useEffect(() => {
    if (location.pathname === '/support-management') {
      setSupportUnread(0)
    }
  }, [location.pathname])

  const visible = group.items.filter(i => canAccess(i.module))
  if (!visible.length) return null
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-1.5 mb-0.5"
        style={{ color: 'rgb(var(--text-muted))' }}>
        <span className="nav-group-label" style={{ margin: 0 }}>{group.label}</span>
        {open
          ? <ChevronDown size={11} />
          : <ChevronRight size={11} />
        }
      </button>
      {open && visible.map(({ path, icon: Icon, label }) => {
        const isSupport = path === '/support-management'
        const hasUnread = isSupport && (supportUnread > 0 || unreadCount > 0)
        
        return (
          <NavLink key={path} to={path} onClick={onClose}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <div className="relative">
              <Icon size={15} className="nav-icon flex-shrink-0" />
              {hasUnread && (
                <span className={`absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 ${supportUnread > 0 ? 'animate-pulse' : ''}`} />
              )}
            </div>
            <span className="flex-1 text-sm">{label}</span>
          </NavLink>
        )
      })}
    </div>
  )
}

/* ── Theme Toggle ────────────────────────────────────────────────── */
function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore()
  return (
    <button onClick={toggleTheme}
      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
      style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))', color: 'rgb(var(--text-secondary))' }}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
      {theme === 'dark' ? <Sun size={15} style={{ color: '#f59e0b' }} /> : <Moon size={15} style={{ color: '#6366f1' }} />}
    </button>
  )
}

/* ── Sidebar ─────────────────────────────────────────────────────── */
function Sidebar({ open, onClose }) {
  const { user, logout } = useAuthStore()
  const { theme } = useThemeStore()
  const navigate = useNavigate()
  const handleLogout = async () => {
    await logout()
    navigate('/login')
    toast.success('Logged out successfully')
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-30 lg:hidden" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />}
      <aside
        className={`fixed top-0 left-0 h-full z-40 flex flex-col lg:translate-x-0 lg:relative lg:z-auto transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: 248, background: theme === 'dark' ? 'rgb(18 18 28)' : 'rgb(255 255 255)', borderRight: '1px solid rgba(var(--border))' }}>

        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(var(--accent),0.15)', border: '1px solid rgba(var(--accent),0.3)' }}>
              <Zap size={15} style={{ color: 'rgb(var(--accent-light))' }} />
            </div>
            <span className="font-display font-bold text-sm">
              <span style={{ color: 'rgb(var(--text-primary))' }}>Admin</span>
              <span style={{ color: 'rgb(var(--accent-light))' }}> Panel</span>
            </span>
          </div>
          <button onClick={onClose} className="lg:hidden btn-ghost p-1.5"><X size={16} /></button>
        </div>

        {/* User chip */}
        <div className="mx-3 mt-3 p-3 rounded-xl" style={{ background: 'rgba(var(--accent),0.06)', border: '1px solid rgba(var(--accent),0.1)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(var(--accent),0.2)' }}>
              <span className="text-xs font-bold" style={{ color: 'rgb(var(--accent-light))' }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'rgb(var(--text-primary))' }}>{user?.firstName} {user?.lastName}</p>
              <p className="text-xs truncate" style={{ color: 'rgb(var(--text-muted))' }}>{user?.roles?.[0] || 'User'}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-0">
          {NAV_GROUPS.map((group, i) => (
            <NavGroup key={group.label} group={group} onClose={onClose} defaultOpen={i < 3} />
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 pt-3 space-y-0.5" style={{ borderTop: '1px solid rgba(var(--border))' }}>
          <NavLink to="/profile" onClick={onClose}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <User size={15} className="nav-icon" />
            <span className="text-sm">Profile</span>
          </NavLink>
          <button onClick={handleLogout} className="sidebar-link w-full" style={{ color: 'rgb(var(--danger))' }}>
            <LogOut size={15} />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>
    </>
  )
}

/* ── Topbar ──────────────────────────────────────────────────────── */
function Topbar({ onMenuClick }) {
  const { user } = useAuthStore()
  const [showProfile, setShowProfile] = useState(false)
  const navigate  = useNavigate()
  const location  = useLocation()

  const allItems = NAV_GROUPS.flatMap(g => g.items)
  const pageTitle = allItems.find(n => location.pathname.startsWith(n.path))?.label
    || (location.pathname === '/profile' ? 'Profile' : 'Admin Panel')

  return (
    <header className="flex items-center justify-between px-5 py-3 sticky top-0 z-20"
      style={{ background: 'rgba(var(--bg-primary), 0.88)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(var(--border))' }}>
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="lg:hidden btn-ghost p-2"><Menu size={18} /></button>
        <h1 className="font-display font-bold text-lg" style={{ color: 'rgb(var(--text-primary))' }}>{pageTitle}</h1>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <NotificationBell />
        <div className="relative">
          <button onClick={() => setShowProfile(v => !v)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all"
            style={{ background: showProfile ? 'rgba(var(--accent),0.1)' : 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(var(--accent),0.2)' }}>
              <span className="text-xs font-bold" style={{ color: 'rgb(var(--accent-light))' }}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <span className="text-sm font-medium hidden sm:block" style={{ color: 'rgb(var(--text-primary))' }}>{user?.firstName}</span>
          </button>
          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-44 card animate-slide-up z-50 p-1" style={{ boxShadow: 'var(--shadow-modal)' }}>
              <button onClick={() => { navigate('/profile'); setShowProfile(false) }} className="sidebar-link text-sm"><User size={13} /> Profile</button>
              <button onClick={() => { navigate('/settings'); setShowProfile(false) }} className="sidebar-link text-sm"><Settings size={13} /> Settings</button>
            </div>
          )}
        </div>
      </div>
      {showProfile && <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />}
    </header>
  )
}

/* ── Layout ──────────────────────────────────────────────────────── */
export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { initTheme } = useThemeStore()
  useEffect(() => { initTheme() }, [])
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'rgb(var(--bg-primary))' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <CompanyContextBar />
        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
