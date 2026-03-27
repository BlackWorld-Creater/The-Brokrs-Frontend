import { useQuery } from '@tanstack/react-query'
import { dashboardAPI, ipTrackingAPI, companiesAPI } from '../services/api'
import {
  Users, Building, Briefcase, CheckSquare,
  Clock, AlertCircle, UserCheck, Activity, Globe, Shield, Building2
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { format } from 'date-fns'
import useAuthStore from '../store/authStore'
import { useNavigate } from 'react-router-dom'

const StatCard = ({ icon: Icon, label, value, sub, color, trend }) => (
  <div className="stat-card animate-slide-up">
    <div className="flex items-start justify-between mb-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
        <Icon size={18} style={{ color }} />
      </div>
      {trend !== undefined && (
        <span className={`badge ${trend >= 0 ? 'badge-success' : 'badge-danger'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <p className="text-3xl font-display font-bold mb-1" style={{ color: 'rgb(var(--text-primary))' }}>
      {value ?? '—'}
    </p>
    <p className="text-sm font-medium mb-0.5" style={{ color: 'rgb(var(--text-secondary))' }}>{label}</p>
    {sub && <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{sub}</p>}
  </div>
)

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444']

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardAPI.getStats().then(r => r.data.data),
    refetchInterval: 30000,
  })

  const { data: ipStats } = useQuery({
    queryKey: ['ip-stats-dash'],
    queryFn: () => ipTrackingAPI.getStats().then(r => r.data.data),
    refetchInterval: 60000,
  })

  const { data: defaultCompany } = useQuery({
    queryKey: ['default-company'],
    queryFn: () => companiesAPI.getAll({ limit: 1 }).then(r => r.data.data?.find(c => c.is_default) || r.data.data?.[0]),
    staleTime: 5 * 60 * 1000,
  })

  const monthlyData = data?.monthlyGrowth?.map(d => ({
    month: format(new Date(d.month), 'MMM'),
    users: parseInt(d.count),
  })) || []

  const taskData = data?.tasks ? [
    { name: 'Todo',        value: parseInt(data.tasks.todo) || 0 },
    { name: 'In Progress', value: parseInt(data.tasks.in_progress) || 0 },
    { name: 'Done',        value: parseInt(data.tasks.done) || 0 },
    { name: 'Overdue',     value: parseInt(data.tasks.overdue) || 0 },
  ] : []

  if (isLoading) return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="stat-card animate-pulse" style={{ height: 130 }}>
            <div className="w-10 h-10 rounded-xl mb-4" style={{ background: 'rgba(var(--bg-hover))' }} />
            <div className="h-8 rounded w-16 mb-2" style={{ background: 'rgba(var(--bg-hover))' }} />
            <div className="h-3 rounded w-24" style={{ background: 'rgba(var(--bg-hover))' }} />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      {/* Welcome banner */}
      <div className="card p-5 flex items-center gap-4"
        style={{ background: 'linear-gradient(135deg, rgba(var(--accent), 0.12), rgba(var(--accent), 0.04))' }}>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(var(--accent), 0.2)' }}>
          <span className="font-display text-lg font-bold" style={{ color: 'rgb(var(--accent-light))' }}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </span>
        </div>
        <div>
          <h2 className="font-display font-bold text-xl" style={{ color: 'rgb(var(--text-primary))' }}>
            Welcome back, {user?.firstName}!
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
            {format(new Date(), 'EEEE, MMMM d yyyy')} · {user?.designation || user?.roles?.[0] || 'Admin'}
          </p>
          {defaultCompany && (
            <div className="flex items-center gap-2 mt-1.5">
              <Building2 size={12} style={{ color: 'rgb(var(--accent-light))' }} />
              <span className="text-xs font-medium" style={{ color: 'rgb(var(--accent-light))' }}>
                {defaultCompany.name}
              </span>
              {defaultCompany.city && (
                <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>· {defaultCompany.city}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Users}      label="Total Users"   value={data?.users?.total}
          sub={`${data?.users?.new_week || 0} new this week`}   color="#6366f1" trend={12} />
        <StatCard icon={UserCheck}  label="Active Users"  value={data?.users?.active}
          sub={`${data?.users?.pending || 0} pending approval`} color="#22c55e" />
        <StatCard icon={Briefcase}  label="Projects"      value={data?.projects?.total}
          sub={`${data?.projects?.active || 0} in progress`}   color="#f59e0b" trend={5} />
        <StatCard icon={CheckSquare} label="Tasks"        value={data?.tasks?.total}
          sub={`${data?.tasks?.overdue || 0} overdue`}         color="#ef4444" />
      </div>

      {/* Stats Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Building}   label="Departments"   value={data?.departments?.total}  color="#8b5cf6" />
        <StatCard icon={Activity}   label="Present Today" value={data?.attendance?.present}
          sub={`${data?.attendance?.absent || 0} absent`}      color="#06b6d4" />
        <StatCard icon={Globe}      label="Requests (24h)" value={ipStats?.total24h ?? '—'}
          sub={`${ipStats?.uniqueIPs || 0} unique IPs`}         color="#f97316" />
        <StatCard icon={Shield}     label="Blocked IPs"   value={ipStats?.blockedIPs ?? '—'}
          sub="Blocked from access"                             color="#dc2626" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User Growth */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-title">User Growth</h3>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>Monthly registrations (last 6 months)</p>
            </div>
            <span className="badge badge-accent">6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2} fill="url(#userGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Task Pie */}
        <div className="card p-5">
          <div className="mb-4">
            <h3 className="section-title">Task Status</h3>
            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>Current distribution</p>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={taskData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                paddingAngle={3} dataKey="value">
                {taskData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1.5 mt-3">
            {taskData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                <span className="text-xs truncate" style={{ color: 'rgb(var(--text-muted))' }}>{d.name}</span>
                <span className="text-xs font-bold ml-auto" style={{ color: 'rgb(var(--text-primary))' }}>{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Logins */}
      <div className="card">
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div>
            <h3 className="section-title">Recent Logins</h3>
            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>Last 5 active users</p>
          </div>
          <Clock size={15} style={{ color: 'rgb(var(--text-muted))' }} />
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Department</th>
                <th>Status</th>
                <th>Last Login</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentLogins?.map((u, i) => (
                <tr key={i}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(var(--accent), 0.15)' }}>
                        <span className="text-xs font-bold" style={{ color: 'rgb(var(--accent-light))' }}>
                          {u.first_name?.[0]}{u.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{u.first_name} {u.last_name}</p>
                        <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'rgb(var(--text-secondary))' }}>{u.department || '—'}</td>
                  <td>
                    <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="font-mono text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                    {u.last_login ? format(new Date(u.last_login), 'MMM d, HH:mm') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
