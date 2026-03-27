import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { attendanceAPI, usersAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import { Clock, CheckCircle2, LogIn, LogOut, Users, AlertTriangle, RefreshCw, Calendar, Search, Plus, X } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const STATUS_CFG = {
  present:  { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',  badge: 'badge-success' },
  absent:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  badge: 'badge-danger' },
  late:     { color: '#f97316', bg: 'rgba(249,115,22,0.1)', badge: 'badge-warning' },
  half_day: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', badge: 'badge-warning' },
  wfh:      { color: '#6366f1', bg: 'rgba(99,102,241,0.1)', badge: 'badge-info' },
}

function MarkAttendanceModal({ users, onClose, onSaved }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { date: new Date().toISOString().split('T')[0], status: 'present' }
  })
  const onSubmit = async (data) => {
    try {
      await attendanceAPI.mark(data)
      toast.success('Attendance marked')
      onSaved(); onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 460 }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <h2 className="section-title">Mark Attendance</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Employee *</label>
              <select className="input-field" {...register('userId', { required: true })}>
                <option value="">Select employee</option>
                {users?.filter(u => u.status === 'active').map(u => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input-field" {...register('date', { required: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Check In</label>
              <input type="time" className="input-field" {...register('checkIn')} />
            </div>
            <div>
              <label className="label">Check Out</label>
              <input type="time" className="input-field" {...register('checkOut')} />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input-field" {...register('status')}>
              {Object.keys(STATUS_CFG).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input-field" {...register('notes')} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">Mark Attendance</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AttendancePage() {
  const { user, hasPermission } = useAuthStore()
  const queryClient = useQueryClient()
  const [month, setMonth] = useState(new Date().toISOString().slice(0,7))
  const [userFilter, setUserFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showMark, setShowMark] = useState(false)
  const [page, setPage] = useState(1)

  const { data: statsData } = useQuery({
    queryKey: ['attendance-stats', month],
    queryFn: () => attendanceAPI.getStats(month).then(r => r.data.data),
  })
  const { data: myData } = useQuery({
    queryKey: ['my-attendance'],
    queryFn: () => attendanceAPI.getMy().then(r => r.data.data),
  })
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['attendance', month, userFilter, statusFilter, page],
    queryFn: () => attendanceAPI.getAll({ from: `${month}-01`, to: `${month}-31`, userId: userFilter, status: statusFilter, page, limit: 20 }).then(r => r.data),
    keepPreviousData: true,
  })
  const { data: usersData } = useQuery({
    queryKey: ['users-active'],
    queryFn: () => usersAPI.getAll({ limit: 200, status: 'active' }).then(r => r.data.data),
  })

  const checkInMutation = useMutation({
    mutationFn: () => attendanceAPI.checkIn(),
    onSuccess: () => { toast.success('✅ Checked in!'); queryClient.invalidateQueries(['my-attendance']); queryClient.invalidateQueries(['attendance']) },
    onError: err => toast.error(err.response?.data?.message || 'Check-in failed'),
  })
  const checkOutMutation = useMutation({
    mutationFn: () => attendanceAPI.checkOut(),
    onSuccess: () => { toast.success('👋 Checked out!'); queryClient.invalidateQueries(['my-attendance']); queryClient.invalidateQueries(['attendance']) },
    onError: err => toast.error(err.response?.data?.message || 'Check-out failed'),
  })

  const today = myData?.today
  const stats = statsData?.summary

  return (
    <div className="space-y-5">
      {/* My Check-in Widget */}
      <div className="card p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="section-title">Today's Attendance</h3>
            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{format(new Date(), 'EEEE, MMMM d yyyy')}</p>
          </div>
          <div className="flex items-center gap-3">
            {today?.check_in && (
              <div className="text-center">
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Checked In</p>
                <p className="text-sm font-mono font-bold" style={{ color: '#22c55e' }}>{format(new Date(today.check_in), 'HH:mm')}</p>
              </div>
            )}
            {today?.check_out && (
              <div className="text-center">
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Checked Out</p>
                <p className="text-sm font-mono font-bold" style={{ color: '#6366f1' }}>{format(new Date(today.check_out), 'HH:mm')}</p>
              </div>
            )}
            {today?.working_hours && (
              <div className="text-center">
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Hours</p>
                <p className="text-sm font-bold" style={{ color: 'rgb(var(--text-primary))' }}>{parseFloat(today.working_hours).toFixed(1)}h</p>
              </div>
            )}
            <div className="flex gap-2">
              {!today?.check_in && (
                <button onClick={() => checkInMutation.mutate()} disabled={checkInMutation.isPending} className="btn-primary gap-2">
                  <LogIn size={14} /> {checkInMutation.isPending ? 'Checking in...' : 'Check In'}
                </button>
              )}
              {today?.check_in && !today?.check_out && (
                <button onClick={() => checkOutMutation.mutate()} disabled={checkOutMutation.isPending} className="btn-secondary gap-2" style={{ color: '#6366f1' }}>
                  <LogOut size={14} /> {checkOutMutation.isPending ? 'Checking out...' : 'Check Out'}
                </button>
              )}
              {today?.check_out && (
                <span className="badge badge-success">✓ Done for today</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total Records', value: stats.total,     color: 'rgb(var(--text-secondary))' },
            { label: 'Present',       value: stats.present,   color: '#22c55e' },
            { label: 'Absent',        value: stats.absent,    color: '#ef4444' },
            { label: 'Late',          value: stats.late,      color: '#f97316' },
            { label: 'Avg Hours',     value: stats.avg_hours ? `${parseFloat(stats.avg_hours).toFixed(1)}h` : '—', color: '#6366f1' },
          ].map(s => (
            <div key={s.label} className="stat-card text-center py-4">
              <p className="text-xl font-display font-bold" style={{ color: s.color }}>{s.value ?? 0}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <input type="month" className="input-field" value={month} onChange={e => { setMonth(e.target.value); setPage(1) }} />
        <select className="input-field" style={{ width: 180 }} value={userFilter} onChange={e => { setUserFilter(e.target.value); setPage(1) }}>
          <option value="">All Employees</option>
          {usersData?.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
        </select>
        <select className="input-field" style={{ width: 140 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          {Object.keys(STATUS_CFG).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <button onClick={() => queryClient.invalidateQueries(['attendance'])} className="btn-secondary px-3">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
        {hasPermission('attendance', 'create') && (
          <button className="btn-primary" onClick={() => setShowMark(true)}><Plus size={14} /> Mark Attendance</button>
        )}
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Employee</th><th>Date</th><th>Check In</th><th>Check Out</th><th>Hours</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>
              {isLoading ? ([...Array(8)].map((_, i) => <tr key={i}>{[...Array(7)].map((_, j) => <td key={j}><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(var(--bg-hover))' }} /></td>)}</tr>))
              : (data?.data || []).length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12"><Clock size={36} className="mx-auto mb-2" style={{ color: 'rgb(var(--text-muted))' }} /><p style={{ color: 'rgb(var(--text-muted))' }}>No attendance records</p></td></tr>
              ) : (data?.data || []).map(a => {
                const cfg = STATUS_CFG[a.status] || STATUS_CFG.present
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(var(--accent),0.12)' }}>
                          <span className="text-xs font-bold" style={{ color: 'rgb(var(--accent-light))' }}>{a.first_name?.[0]}{a.last_name?.[0]}</span>
                        </div>
                        <div><p className="text-xs font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{a.first_name} {a.last_name}</p><p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{a.employee_id}</p></div>
                      </div>
                    </td>
                    <td><span className="text-xs font-mono">{format(new Date(a.date), 'MMM d, yyyy')}</span></td>
                    <td><span className="text-xs font-mono" style={{ color: '#22c55e' }}>{a.check_in ? format(new Date(a.check_in), 'HH:mm') : '—'}</span></td>
                    <td><span className="text-xs font-mono" style={{ color: '#6366f1' }}>{a.check_out ? format(new Date(a.check_out), 'HH:mm') : '—'}</span></td>
                    <td><span className="text-xs font-mono">{a.working_hours ? `${parseFloat(a.working_hours).toFixed(1)}h` : '—'}</span></td>
                    <td><span className={`badge ${cfg.badge} capitalize`}>{a.status?.replace('_',' ')}</span></td>
                    <td><span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{a.notes || '—'}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(var(--border))' }}>
            <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Page {data.pagination.page}/{data.pagination.totalPages}</p>
            <div className="flex gap-2">
              <button disabled={!data.pagination.hasPrevPage} onClick={() => setPage(p => p-1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Prev</button>
              <button disabled={!data.pagination.hasNextPage} onClick={() => setPage(p => p+1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {showMark && <MarkAttendanceModal users={usersData} onClose={() => setShowMark(false)} onSaved={() => queryClient.invalidateQueries(['attendance'])} />}
    </div>
  )
}
