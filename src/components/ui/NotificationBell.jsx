/**
 * NotificationBell
 * Replaces the simple bell in AppLayout.
 * - Polls every 30s for new notifications
 * - Groups by type (tasks, system, etc.)
 * - Click to mark as read, link navigates
 * - Shows actor avatar + message
 */
import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationsAPI } from '../../services/api'
import { useNavigate } from 'react-router-dom'
import {
  Bell, Check, Trash2, CheckSquare, Building2,
  Globe2, MapPin, X, Settings, Info, AlertTriangle,
  CheckCircle2, MessageSquare, Zap
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useSocket } from '../../hooks/useSocket'

const TYPE_CONFIG = {
  task:    { icon: CheckSquare,  color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
  success: { icon: CheckCircle2, color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
  warning: { icon: AlertTriangle,color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  info:    { icon: Info,         color: '#06b6d4', bg: 'rgba(6,182,212,0.1)'   },
  company: { icon: Building2,    color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
  site:    { icon: MapPin,       color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
  service: { icon: Globe2,       color: '#06b6d4', bg: 'rgba(6,182,212,0.1)'   },
}

function NotifIcon({ type }) {
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.info
  const Icon = cfg.icon
  return (
    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: cfg.bg }}>
      <Icon size={14} style={{ color: cfg.color }} />
    </div>
  )
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [tab, setTab]   = useState('all')
  const panelRef        = useRef(null)
  const queryClient     = useQueryClient()
  const navigate        = useNavigate()
  const [virtualNotifications, setVirtualNotifications] = useState([]);

  /* Poll every 30s — fast enough to feel real-time */
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getAll({ limit: 40 }).then(r => r.data.data),
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  })

  const notifications = data?.notifications || []
  const unreadCount   = data?.unreadCount || 0

  // Combine virtual and real notifications
  const allNotifications = [...virtualNotifications, ...notifications].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
  const totalUnread = unreadCount + virtualNotifications.filter(n => !n.is_read).length;

  const { on } = useSocket();

  useEffect(() => {
    const cleanup = [
      on('support:message:new', (msg) => {
        queryClient.invalidateQueries(['notifications']);
        setVirtualNotifications(prev => [
          {
            id: `v-msg-${msg.id || Date.now()}`,
            type: 'info',
            title: 'New Support Message',
            message: msg.content || msg.text,
            created_at: new Date().toISOString(),
            is_read: false,
            link: '/support-management'
          },
          ...prev
        ]);
      }),
      on('support:ticket:new', (ticket) => {
        queryClient.invalidateQueries(['notifications']);
        setVirtualNotifications(prev => [
          {
            id: `v-tkt-${ticket.id || Date.now()}`,
            type: 'success',
            title: 'New Support Ticket',
            message: `${ticket.category}: ${ticket.title}`,
            created_at: new Date().toISOString(),
            is_read: false,
            link: '/support-management'
          },
          ...prev
        ]);
      }),
      on('support:ticket:updated', (ticket) => {
        queryClient.invalidateQueries(['notifications']);
        setVirtualNotifications(prev => [
          {
            id: `v-upd-${ticket.id || Date.now()}-${Date.now()}`,
            type: 'warning',
            title: 'Support Ticket Updated',
            message: `Ticket "${ticket.title}" status: ${ticket.status}`,
            created_at: new Date().toISOString(),
            is_read: false,
            link: '/support-management'
          },
          ...prev
        ]);
      })
    ];
    return () => cleanup.forEach(fn => fn && fn());
  }, [on, queryClient]);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return
    const handle = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const markReadMutation = useMutation({
    mutationFn: (id) => notificationsAPI.markRead(id),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  })

  const markAllMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications'])
      setTab('all')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => notificationsAPI.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  })

  const clearReadMutation = useMutation({
    mutationFn: () => notificationsAPI.clearRead(),
    onSuccess: () => queryClient.invalidateQueries(['notifications']),
  })

  const handleNotifClick = async (notif) => {
    if (notif.id.toString().startsWith('v-')) {
      setVirtualNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    } else if (!notif.is_read) {
      markReadMutation.mutate(notif.id)
    }
    if (notif.link) {
      setOpen(false)
      navigate(notif.link)
    }
  }

  const displayed = tab === 'unread'
    ? allNotifications.filter(n => !n.is_read)
    : allNotifications

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all"
        style={{
          background: open ? 'rgba(var(--accent),0.12)' : 'rgba(var(--bg-hover))',
          border: `1px solid ${open ? 'rgba(var(--accent),0.25)' : 'rgba(var(--border))'}`,
          color: 'rgb(var(--text-secondary))',
        }}>
        <Bell size={15} />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: 'rgb(var(--accent))', fontSize: 9, padding: '0 4px' }}>
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 card z-50 animate-slide-up overflow-hidden"
          style={{ boxShadow: 'var(--shadow-modal)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(var(--border))' }}>
            <div className="flex items-center gap-2">
              <Bell size={14} style={{ color: 'rgb(var(--accent-light))' }} />
              <span className="font-semibold text-sm" style={{ color: 'rgb(var(--text-primary))' }}>
                Notifications
              </span>
              {totalUnread > 0 && (
                <span className="badge badge-accent" style={{ fontSize: 10 }}>{totalUnread} new</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={() => markAllMutation.mutate()}
                  disabled={markAllMutation.isPending}
                  className="btn-ghost p-1.5 text-xs"
                  title="Mark all as read"
                  style={{ color: 'rgb(var(--accent-light))' }}>
                  <Check size={13} />
                </button>
              )}
              <button onClick={() => clearReadMutation.mutate()}
                disabled={clearReadMutation.isPending}
                className="btn-ghost p-1.5 text-xs"
                title="Clear read notifications"
                style={{ color: 'rgb(var(--text-muted))' }}>
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5 px-3 pt-2">
            {[
              { id: 'all',    label: `All (${allNotifications.length})` },
              { id: 'unread', label: `Unread (${totalUnread})` },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: tab === t.id ? 'rgba(var(--accent),0.12)' : 'transparent',
                  color: tab === t.id ? 'rgb(var(--accent-light))' : 'rgb(var(--text-muted))',
                }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: 380 }}>
            {displayed.length === 0 ? (
              <div className="py-12 text-center">
                <Bell size={30} className="mx-auto mb-2" style={{ color: 'rgb(var(--text-muted))' }} />
                <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
                  {tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
              </div>
            ) : (
              displayed.map(notif => (
                <div
                  key={notif.id}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-all group relative"
                  style={{
                    background: notif.is_read ? 'transparent' : 'rgba(var(--accent),0.04)',
                    borderBottom: '1px solid rgba(var(--border))',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(var(--bg-hover))'}
                  onMouseLeave={e => e.currentTarget.style.background = notif.is_read ? 'transparent' : 'rgba(var(--accent),0.04)'}
                  onClick={() => handleNotifClick(notif)}>

                  {/* Actor avatar or type icon */}
                  {notif.actor_first ? (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(var(--accent),0.15)' }}>
                      <span className="text-xs font-bold" style={{ color: 'rgb(var(--accent-light))', fontSize: 10 }}>
                        {notif.actor_first[0]}{notif.actor_last?.[0]}
                      </span>
                    </div>
                  ) : (
                    <NotifIcon type={notif.type} />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold leading-snug ${notif.is_read ? 'opacity-70' : ''}`}
                      style={{ color: 'rgb(var(--text-primary))' }}>
                      {notif.title}
                    </p>
                    {notif.message && (
                      <p className="text-xs mt-0.5 leading-relaxed line-clamp-2"
                        style={{ color: 'rgb(var(--text-muted))' }}>
                        {notif.message}
                      </p>
                    )}
                    <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))', opacity: 0.7 }}>
                      {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    {/* Unread dot */}
                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full"
                        style={{ background: 'rgb(var(--accent))' }} />
                    )}
                    {/* Delete btn — visible on hover */}
                    <button
                      onClick={e => { e.stopPropagation(); deleteMutation.mutate(notif.id) }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity btn-ghost p-0.5"
                      style={{ color: 'rgb(var(--text-muted))' }}>
                      <X size={11} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5"
            style={{ borderTop: '1px solid rgba(var(--border))' }}>
            <p className="text-xs text-center" style={{ color: 'rgb(var(--text-muted))' }}>
              Refreshes every 30 seconds · {allNotifications.length} total
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
