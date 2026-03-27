import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { userDashboardAPI, attendanceAPI, notificationsAPI } from '../services/api'
import { useNavigate } from 'react-router-dom'
import {
  CheckSquare, Clock, Calendar, Bell, User, Briefcase,
  TrendingUp, AlertTriangle, Play, Check, Circle, ArrowRight,
  LogIn, LogOut, Zap, Award, Target, Activity,
  FileText, Shield, Settings, ChevronRight, RefreshCw
} from 'lucide-react'
import { format, formatDistanceToNow, isToday, isTomorrow, isPast } from 'date-fns'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import useAuthStore from '../store/authStore'
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  AreaChart, Area, XAxis, Tooltip
} from 'recharts'

/* ── constants ───────────────────────────────────────────────────── */
const STATUS_COLOR = {
  todo:'#94a3b8', in_progress:'#6366f1', in_review:'#f59e0b',
  done:'#22c55e', blocked:'#ef4444'
}
const PRIORITY_DOT = { urgent:'🔴', high:'🟠', medium:'🟡', low:'🟢' }

/* ── small helpers ───────────────────────────────────────────────── */
function DueBadge({ date, status }) {
  if (!date || status === 'done' || status === 'cancelled') return null
  const d = new Date(date)
  const over = isPast(d) && !isToday(d)
  return (
    <span className="text-xs" style={{ color: over ? '#ef4444' : isToday(d) ? '#f97316' : isTomorrow(d) ? '#f59e0b' : 'rgb(var(--text-muted))' }}>
      <Clock size={9} className="inline mr-0.5" />
      {over ? 'Overdue' : isToday(d) ? 'Today' : isTomorrow(d) ? 'Tomorrow' : format(d, 'MMM d')}
    </span>
  )
}

/* ── Task ring ───────────────────────────────────────────────────── */
function TaskRing({ data }) {
  const total = parseInt(data?.total || 0)
  const done  = parseInt(data?.done  || 0)
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0
  const chartData = [{ name: 'done', value: pct, fill: '#22c55e' }]
  return (
    <div className="relative" style={{ width: 120, height: 120 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%"
          startAngle={90} endAngle={-270} data={chartData}>
          <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'rgba(var(--bg-hover))' }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-display font-bold" style={{ color: 'rgb(var(--text-primary))' }}>{pct}%</span>
        <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>done</span>
      </div>
    </div>
  )
}

/* ── Quick action button ─────────────────────────────────────────── */
function QuickAction({ icon: Icon, label, color, onClick, badge }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:scale-105 w-full"
      style={{ background: `${color}10`, border: `1px solid ${color}25` }}>
      <div className="relative">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}20` }}>
          <Icon size={18} style={{ color }} />
        </div>
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: '#ef4444', fontSize: 9 }}>{badge}</span>
        )}
      </div>
      <span className="text-xs font-medium" style={{ color: 'rgb(var(--text-secondary))' }}>{label}</span>
    </button>
  )
}

/* ── Greeting ────────────────────────────────────────────────────── */
function Greeting({ profile }) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const emoji    = hour < 12 ? '☀️' : hour < 17 ? '🌤' : '🌙'
  return (
    <div>
      <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
        {emoji} {greeting}
      </p>
      <h1 className="font-display font-bold text-2xl mt-0.5" style={{ color: 'rgb(var(--text-primary))' }}>
        {profile?.first_name} {profile?.last_name}
      </h1>
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        {profile?.designation && (
          <span className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>{profile.designation}</span>
        )}
        {profile?.department_name && (
          <>
            <span style={{ color: 'rgb(var(--text-muted))' }}>·</span>
            <span className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>{profile.department_name}</span>
          </>
        )}
        <span className="badge badge-success" style={{ fontSize: 10 }}>{profile?.status}</span>
      </div>
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function UserDashboardPage() {
  const { user } = useAuthStore()
  const navigate  = useNavigate()
  const queryClient = useQueryClient()

  const { data: dashData, isLoading, refetch } = useQuery({
    queryKey: ['user-dashboard'],
    queryFn: () => userDashboardAPI.get().then(r => r.data.data),
    refetchInterval: 60000,
  })

  const checkInMutation = useMutation({
    mutationFn: () => attendanceAPI.checkIn(),
    onSuccess: () => {
      toast.success('✅ Checked in successfully!')
      queryClient.invalidateQueries(['user-dashboard'])
    },
    onError: err => toast.error(err.response?.data?.message || 'Check-in failed'),
  })
  const checkOutMutation = useMutation({
    mutationFn: () => attendanceAPI.checkOut(),
    onSuccess: () => {
      toast.success('👋 Checked out!')
      queryClient.invalidateQueries(['user-dashboard'])
    },
    onError: err => toast.error(err.response?.data?.message || 'Check-out failed'),
  })

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllRead(),
    onSuccess: () => {
      toast.success('All notifications marked as read')
      queryClient.invalidateQueries(['user-dashboard'])
      queryClient.invalidateQueries(['notifications'])
    },
  })

  if (isLoading) return (
    <div className="space-y-5 animate-pulse">
      <div className="card h-28" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_,i)=><div key={i} className="card h-24"/>)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">{[...Array(3)].map((_,i)=><div key={i} className="card h-56"/>)}</div>
    </div>
  )

  const { profile, tasks, attendance, leaveBalance, notifications, upcomingTasks, recentActivity } = dashData || {}
  const today = attendance?.today
  const unreadCount = parseInt(notifications?.unread || 0)

  /* attendance ring data */
  const attTotal   = parseInt(attendance?.total_days || 0)
  const attPresent = parseInt(attendance?.present || 0)
  const attPct     = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0

  return (
    <div className="space-y-5">
      {/* ── Profile Header ─────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(var(--accent),0.15)', border: '1px solid rgba(var(--accent),0.3)' }}>
              <span className="text-2xl font-display font-bold" style={{ color: 'rgb(var(--accent-light))' }}>
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </span>
            </div>
            <Greeting profile={profile} />
          </div>

          {/* Check-in / out */}
          <div className="flex items-center gap-3 flex-wrap">
            {today?.check_in && (
              <div className="text-center px-3 py-1.5 rounded-xl"
                style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>In</p>
                <p className="text-sm font-mono font-bold" style={{ color: '#22c55e' }}>
                  {format(new Date(today.check_in), 'HH:mm')}
                </p>
              </div>
            )}
            {today?.check_out && (
              <div className="text-center px-3 py-1.5 rounded-xl"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Out</p>
                <p className="text-sm font-mono font-bold" style={{ color: '#6366f1' }}>
                  {format(new Date(today.check_out), 'HH:mm')}
                </p>
              </div>
            )}
            {today?.working_hours && (
              <div className="text-center px-3 py-1.5 rounded-xl"
                style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Hours</p>
                <p className="text-sm font-bold" style={{ color: 'rgb(var(--text-primary))' }}>
                  {parseFloat(today.working_hours).toFixed(1)}h
                </p>
              </div>
            )}
            {!today?.check_in ? (
              <button onClick={() => checkInMutation.mutate()} disabled={checkInMutation.isPending}
                className="btn-primary gap-2">
                <LogIn size={14} /> {checkInMutation.isPending ? 'Checking in...' : 'Check In'}
              </button>
            ) : !today?.check_out ? (
              <button onClick={() => checkOutMutation.mutate()} disabled={checkOutMutation.isPending}
                className="btn-secondary gap-2" style={{ color: '#6366f1' }}>
                <LogOut size={14} /> {checkOutMutation.isPending ? '...' : 'Check Out'}
              </button>
            ) : (
              <span className="badge badge-success">✓ Done for today</span>
            )}
            <button onClick={() => refetch()} className="btn-ghost p-2">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Quick info strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4"
          style={{ borderTop: '1px solid rgba(var(--border))' }}>
          {[
            { label: 'Employee ID', value: profile?.employee_id || '—' },
            { label: 'Joined',      value: profile?.created_at ? format(new Date(profile.created_at), 'MMM yyyy') : '—' },
            { label: 'Last Login',  value: profile?.last_login ? formatDistanceToNow(new Date(profile.last_login), { addSuffix: true }) : 'Never' },
            { label: 'Roles',       value: profile?.roles?.filter(Boolean).join(', ') || '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{label}</p>
              <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--text-primary))' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick Actions ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        <QuickAction icon={CheckSquare} label="My Tasks"      color="#6366f1" onClick={() => navigate('/tasks?myTasks=true')} badge={parseInt(tasks?.overdue||0)} />
        <QuickAction icon={Calendar}    label="Apply Leave"   color="#f59e0b" onClick={() => navigate('/leave')} badge={parseInt(notifications?.unread||0)} />
        <QuickAction icon={Briefcase}   label="Projects"      color="#22c55e" onClick={() => navigate('/projects')} />
        <QuickAction icon={FileText}    label="Audit Log"     color="#06b6d4" onClick={() => navigate('/audit-logs')} />
        <QuickAction icon={User}        label="My Profile"    color="#8b5cf6" onClick={() => navigate('/profile')} />
        <QuickAction icon={Bell}        label="Notifications" color="#f97316" onClick={() => navigate('/notifications')} badge={unreadCount} />
      </div>

      {/* ── Main 3-column grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Col 1 — Tasks ─────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Task ring */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">My Tasks</h3>
              <button onClick={() => navigate('/tasks?myTasks=true')}
                className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: 'rgb(var(--accent-light))' }}>
                View all <ChevronRight size={11} />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <TaskRing data={tasks} />
              <div className="flex-1 space-y-1.5">
                {[
                  { label: 'To Do',       key: 'todo',        color: STATUS_COLOR.todo },
                  { label: 'In Progress', key: 'in_progress', color: STATUS_COLOR.in_progress },
                  { label: 'In Review',   key: 'in_review',   color: STATUS_COLOR.in_review },
                  { label: 'Done',        key: 'done',        color: STATUS_COLOR.done },
                ].map(s => (
                  <div key={s.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                      <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{s.label}</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: 'rgb(var(--text-primary))' }}>
                      {tasks?.[s.key] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Alerts */}
            {parseInt(tasks?.overdue||0) > 0 && (
              <div className="mt-3 p-2.5 rounded-xl flex items-center gap-2"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <AlertTriangle size={13} style={{ color: '#ef4444' }} />
                <p className="text-xs" style={{ color: '#ef4444' }}>
                  {tasks.overdue} overdue task{tasks.overdue !== '1' ? 's' : ''}
                </p>
                <button onClick={() => navigate('/tasks?myTasks=true&overdue=true')}
                  className="ml-auto text-xs" style={{ color: '#ef4444' }}>Fix →</button>
              </div>
            )}
            {parseInt(tasks?.due_today||0) > 0 && (
              <div className="mt-2 p-2.5 rounded-xl flex items-center gap-2"
                style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <Clock size={13} style={{ color: '#f59e0b' }} />
                <p className="text-xs" style={{ color: '#f59e0b' }}>
                  {tasks.due_today} task{tasks.due_today !== '1' ? 's' : ''} due today
                </p>
              </div>
            )}
          </div>

          {/* Upcoming tasks */}
          {upcomingTasks?.length > 0 && (
            <div className="card p-5">
              <h3 className="section-title mb-3">Due This Week</h3>
              <div className="space-y-2">
                {upcomingTasks.map(t => (
                  <button key={t.id} onClick={() => navigate(`/tasks?id=${t.id}`)}
                    className="w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all"
                    style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(var(--accent),0.3)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(var(--border))'}>
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: STATUS_COLOR[t.status] || '#94a3b8' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'rgb(var(--text-primary))' }}>{t.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <DueBadge date={t.due_date} status={t.status} />
                        {t.project_name && <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>#{t.project_name}</span>}
                      </div>
                    </div>
                    <span className="text-xs flex-shrink-0">{PRIORITY_DOT[t.priority]}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Col 2 — Attendance + Leave ────────────────────────────── */}
        <div className="space-y-4">
          {/* Attendance card */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="section-title">This Month</h3>
              <button onClick={() => navigate('/attendance')}
                className="text-xs flex items-center gap-1" style={{ color: 'rgb(var(--accent-light))' }}>
                View <ChevronRight size={11} />
              </button>
            </div>

            {/* Attendance donut */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-shrink-0" style={{ width: 90, height: 90 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="90%"
                    startAngle={90} endAngle={-270}
                    data={[{ value: attPct, fill: attPct >= 90 ? '#22c55e' : attPct >= 70 ? '#f59e0b' : '#ef4444' }]}>
                    <RadialBar dataKey="value" cornerRadius={6} background={{ fill: 'rgba(var(--bg-hover))' }} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold" style={{ color: 'rgb(var(--text-primary))' }}>{attPct}%</span>
                </div>
              </div>
              <div className="flex-1 space-y-1.5">
                {[
                  { label: 'Present', value: attendance?.present, color: '#22c55e' },
                  { label: 'Absent',  value: attendance?.absent,  color: '#ef4444' },
                  { label: 'Late',    value: attendance?.late,     color: '#f97316' },
                  { label: 'Avg Hrs', value: attendance?.avg_hours ? `${attendance.avg_hours}h` : '—', color: '#6366f1' },
                ].map(s => (
                  <div key={s.label} className="flex justify-between items-center">
                    <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{s.label}</span>
                    <span className="text-xs font-bold" style={{ color: s.color }}>{s.value ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Leave balance */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="section-title">Leave Balance</h3>
              <button onClick={() => navigate('/leave')}
                className="text-xs flex items-center gap-1" style={{ color: 'rgb(var(--accent-light))' }}>
                Apply <ChevronRight size={11} />
              </button>
            </div>
            {leaveBalance?.length > 0 ? (
              <div className="space-y-2">
                {leaveBalance.map(l => (
                  <div key={l.leave_type} className="flex items-center justify-between p-2.5 rounded-xl"
                    style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                    <div>
                      <p className="text-xs font-semibold capitalize" style={{ color: 'rgb(var(--text-primary))' }}>
                        {l.leave_type.replace('_', ' ')}
                      </p>
                      {parseInt(l.pending_count) > 0 && (
                        <p className="text-xs" style={{ color: '#f59e0b' }}>{l.pending_count} pending</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold" style={{ color: 'rgb(var(--accent-light))' }}>{l.used ?? 0}</p>
                      <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>days used</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar size={28} className="mx-auto mb-2" style={{ color: 'rgb(var(--text-muted))' }} />
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>No leave taken this year</p>
                <button onClick={() => navigate('/leave')} className="btn-primary mt-3 mx-auto text-xs px-3 py-1.5">Apply Leave</button>
              </div>
            )}
          </div>
        </div>

        {/* ── Col 3 — Notifications + Activity ──────────────────────── */}
        <div className="space-y-4">
          {/* Notifications */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="section-title">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="badge badge-accent" style={{ fontSize: 10 }}>{unreadCount} new</span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={() => markAllReadMutation.mutate()}
                  className="text-xs" style={{ color: 'rgb(var(--accent-light))' }}>
                  Mark all read
                </button>
              )}
            </div>

            {notifications?.recent?.length > 0 ? (
              <div className="space-y-2">
                {notifications.recent.map(n => (
                  <div key={n.id}
                    className="flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all"
                    style={{ background: n.is_read ? 'transparent' : 'rgba(var(--accent),0.05)', border: `1px solid ${n.is_read ? 'rgba(var(--border))' : 'rgba(var(--accent),0.15)'}` }}
                    onClick={() => n.link && (window.location.href = n.link)}>
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: n.is_read ? 'rgba(var(--text-muted))' : 'rgb(var(--accent))' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>{n.title}</p>
                      {n.message && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'rgb(var(--text-muted))' }}>{n.message}</p>}
                      <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))', opacity: 0.7 }}>
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Bell size={28} className="mx-auto mb-2" style={{ color: 'rgb(var(--text-muted))' }} />
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>You're all caught up!</p>
              </div>
            )}
          </div>

          {/* Recent Activity */}
          {recentActivity?.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="section-title">My Activity</h3>
                <button onClick={() => navigate('/audit-logs')}
                  className="text-xs flex items-center gap-1" style={{ color: 'rgb(var(--accent-light))' }}>
                  Full log <ChevronRight size={11} />
                </button>
              </div>
              <div className="relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-px"
                  style={{ background: 'rgba(var(--border))' }} />
                <div className="space-y-3">
                  {recentActivity.map((a, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 z-10"
                        style={{ background: a.action === 'CREATE' ? 'rgba(34,197,94,0.15)' : a.action === 'DELETE' ? 'rgba(239,68,68,0.15)' : 'rgba(var(--accent),0.15)' }}>
                        <div className="w-1.5 h-1.5 rounded-full"
                          style={{ background: a.action === 'CREATE' ? '#22c55e' : a.action === 'DELETE' ? '#ef4444' : 'rgb(var(--accent))' }} />
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <p className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                          <span className="font-semibold capitalize">{a.action.toLowerCase()}</span>
                          {a.entity_type && <span style={{ color: 'rgb(var(--text-muted))' }}> · {a.entity_type}</span>}
                        </p>
                        <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                          {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
