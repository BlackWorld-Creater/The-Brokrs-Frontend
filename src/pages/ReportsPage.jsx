import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsAPI } from '../services/api'
import { BarChart2, Users, Clock, Calendar, CheckSquare, Briefcase, RefreshCw, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts'

const COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#f97316']
const REPORT_TABS = [
  { id: 'headcount',  label: 'Headcount',  icon: Users },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'leave',      label: 'Leave',      icon: Calendar },
  { id: 'tasks',      label: 'Tasks',      icon: CheckSquare },
  { id: 'projects',   label: 'Projects',   icon: Briefcase },
]

function StatBox({ label, value, color }) {
  return (
    <div className="stat-card p-4 text-center">
      <p className="text-2xl font-display font-bold" style={{ color: color || 'rgb(var(--accent-light))' }}>{value ?? 0}</p>
      <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{label}</p>
    </div>
  )
}

function HeadcountReport() {
  const { data: d, isLoading } = useQuery({ queryKey: ['report-headcount'], queryFn: () => reportsAPI.headcount().then(r => r.data.data) })
  if (isLoading) return <div className="animate-pulse h-64 card" />
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Total" value={d?.total?.total} />
        <StatBox label="Active" value={d?.total?.active} color="#22c55e" />
        <StatBox label="Inactive" value={parseInt(d?.total?.total) - parseInt(d?.total?.active)} color="#94a3b8" />
        <StatBox label="New (30d)" value={d?.newHires30d} color="#06b6d4" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="section-title mb-4">By Department</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d?.byDepartment || []} layout="vertical">
              <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis type="category" dataKey="department" width={100} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: 'rgb(26,26,38)', border: '1px solid #2a2a3c', borderRadius: 10 }} />
              <Bar dataKey="count" fill="#6366f1" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="section-title mb-4">Monthly Hires (12 months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={d?.monthlyHires || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'rgb(26,26,38)', border: '1px solid #2a2a3c', borderRadius: 10 }} />
              <Line type="monotone" dataKey="hires" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function AttendanceReport() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7))
  const { data: d, isLoading } = useQuery({ queryKey: ['report-attendance', month], queryFn: () => reportsAPI.attendance(month).then(r => r.data.data) })
  if (isLoading) return <div className="animate-pulse h-64 card" />
  const s = d?.summary
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <input type="month" className="input-field" value={month} onChange={e => setMonth(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Present" value={s?.present} color="#22c55e" />
        <StatBox label="Absent"  value={s?.absent}  color="#ef4444" />
        <StatBox label="Late"    value={s?.late}     color="#f97316" />
        <StatBox label="Avg Hours" value={s?.avg_hours ? parseFloat(s.avg_hours).toFixed(1)+'h' : '—'} color="#6366f1" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="section-title mb-4">Daily Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={d?.daily || []}>
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 9 }} tickFormatter={v => v?.slice(8)} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'rgb(26,26,38)', border: '1px solid #2a2a3c', borderRadius: 10 }} />
              <Bar dataKey="present" fill="#22c55e" stackId="a" radius={[4,4,0,0]} />
              <Bar dataKey="absent"  fill="#ef4444" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="section-title mb-4">Top Employees by Attendance</h3>
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 200 }}>
            {(d?.byEmployee || []).slice(0, 8).map(e => (
              <div key={e.employee_id} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(var(--border))' }}>
                <span className="text-xs" style={{ color: 'rgb(var(--text-primary))' }}>{e.first_name} {e.last_name}</span>
                <div className="flex gap-2 text-xs">
                  <span style={{ color: '#22c55e' }}>{e.present}P</span>
                  <span style={{ color: '#ef4444' }}>{e.absent}A</span>
                  {e.avg_hours && <span style={{ color: 'rgb(var(--text-muted))' }}>{e.avg_hours}h</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function LeaveReport() {
  const [year, setYear] = useState(new Date().getFullYear())
  const { data: d, isLoading } = useQuery({ queryKey: ['report-leave', year], queryFn: () => reportsAPI.leave(year).then(r => r.data.data) })
  if (isLoading) return <div className="animate-pulse h-64 card" />
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <select className="input-field" style={{ width: 120 }} value={year} onChange={e => setYear(e.target.value)}>
          {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="section-title mb-4">By Leave Type</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d?.byType || []}>
              <XAxis dataKey="leave_type" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'rgb(26,26,38)', border: '1px solid #2a2a3c', borderRadius: 10 }} />
              <Bar dataKey="total_days" fill="#6366f1" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="section-title mb-4">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={d?.monthly || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'rgb(26,26,38)', border: '1px solid #2a2a3c', borderRadius: 10 }} />
              <Line type="monotone" dataKey="days" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function TasksReport() {
  const { data: d, isLoading } = useQuery({ queryKey: ['report-tasks'], queryFn: () => reportsAPI.tasks().then(r => r.data.data) })
  if (isLoading) return <div className="animate-pulse h-64 card" />
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="section-title mb-4">Tasks by Status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={d?.byStatus || []} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} label={({ status, count }) => `${status}: ${count}`}>
                {(d?.byStatus || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: 'rgb(26,26,38)', border: '1px solid #2a2a3c', borderRadius: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="section-title mb-4">Top Assignees</h3>
          <div className="space-y-2">
            {(d?.byUser || []).map(u => (
              <div key={u.first_name} className="flex items-center gap-3 py-1.5" style={{ borderBottom: '1px solid rgba(var(--border))' }}>
                <span className="text-xs flex-1" style={{ color: 'rgb(var(--text-primary))' }}>{u.first_name} {u.last_name}</span>
                <div className="flex gap-2 text-xs">
                  <span style={{ color: 'rgb(var(--text-muted))' }}>{u.total} total</span>
                  <span style={{ color: '#22c55e' }}>{u.done} done</span>
                  <span style={{ color: '#6366f1' }}>{u.in_progress} active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectsReport() {
  const { data: d, isLoading } = useQuery({ queryKey: ['report-projects'], queryFn: () => reportsAPI.projects().then(r => r.data.data) })
  if (isLoading) return <div className="animate-pulse h-64 card" />
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="section-title mb-4">Projects by Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={(d?.byStatus || []).map(s => ({ ...s, status: s.status?.replace('_',' ') }))}>
              <XAxis dataKey="status" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'rgb(26,26,38)', border: '1px solid #2a2a3c', borderRadius: 10 }} />
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {(d?.byStatus || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="section-title mb-4">Budget Usage (Top 10)</h3>
          <div className="space-y-2.5 overflow-y-auto" style={{ maxHeight: 200 }}>
            {(d?.budgetUsage || []).map(p => (
              <div key={p.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: 'rgb(var(--text-primary))' }}>{p.name}</span>
                  <span style={{ color: p.spent_pct > 90 ? '#ef4444' : '#22c55e' }}>{p.spent_pct}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(var(--bg-hover))' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(p.spent_pct, 100)}%`, background: p.spent_pct > 90 ? '#ef4444' : '#22c55e' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('headcount')
  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: 'rgba(var(--bg-hover))', width: 'fit-content' }}>
        {REPORT_TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
            style={{
              background: activeTab === t.id ? 'rgba(var(--accent),0.15)' : 'transparent',
              color: activeTab === t.id ? 'rgb(var(--accent-light))' : 'rgb(var(--text-muted))',
              border: activeTab === t.id ? '1px solid rgba(var(--accent),0.25)' : '1px solid transparent',
            }}>
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Report content */}
      {activeTab === 'headcount'  && <HeadcountReport />}
      {activeTab === 'attendance' && <AttendanceReport />}
      {activeTab === 'leave'      && <LeaveReport />}
      {activeTab === 'tasks'      && <TasksReport />}
      {activeTab === 'projects'   && <ProjectsReport />}
    </div>
  )
}
