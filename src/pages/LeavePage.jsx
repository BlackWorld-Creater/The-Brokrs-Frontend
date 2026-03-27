import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { leaveAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import { Calendar, Plus, Check, X, Clock, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const LEAVE_TYPES = ['casual','sick','earned','maternity','paternity','unpaid','comp_off']
const STATUS_CFG = {
  pending:   { badge: 'badge-warning', icon: Clock },
  approved:  { badge: 'badge-success', icon: Check },
  rejected:  { badge: 'badge-danger',  icon: X },
  cancelled: { badge: 'badge-neutral', icon: X },
}

function ApplyLeaveModal({ onClose, onSaved }) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm()
  const from = watch('fromDate'), to = watch('toDate')
  const days = from && to ? differenceInDays(new Date(to), new Date(from)) + 1 : 0
  const onSubmit = async (data) => {
    try { await leaveAPI.create(data); toast.success('Leave request submitted'); onSaved(); onClose() }
    catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 460 }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <h2 className="section-title">Apply for Leave</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="label">Leave Type *</label>
            <select className="input-field" {...register('leaveType', { required: true })}>
              <option value="">Select type</option>
              {LEAVE_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">From *</label>
              <input type="date" className="input-field" {...register('fromDate', { required: true })} />
            </div>
            <div>
              <label className="label">To *</label>
              <input type="date" className="input-field" {...register('toDate', { required: true })} />
            </div>
          </div>
          {days > 0 && <div className="p-2 rounded-xl text-center text-sm font-semibold" style={{ background: 'rgba(var(--accent),0.08)', color: 'rgb(var(--accent-light))' }}>{days} day{days !== 1 ? 's' : ''}</div>}
          <div>
            <label className="label">Reason</label>
            <textarea className="input-field" rows={3} {...register('reason')} placeholder="Briefly describe the reason..." />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">Submit Request</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LeavePage() {
  const { user, hasPermission } = useAuthStore()
  const queryClient = useQueryClient()
  const [showApply, setShowApply] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [myTeam, setMyTeam] = useState(false)
  const [page, setPage] = useState(1)

  const { data: statsData } = useQuery({ queryKey: ['leave-stats'], queryFn: () => leaveAPI.getStats().then(r => r.data.data) })
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['leaves', statusFilter, typeFilter, myTeam, page],
    queryFn: () => leaveAPI.getAll({ status: statusFilter, leaveType: typeFilter, myTeam: myTeam ? 'true' : undefined, page, limit: 20 }).then(r => r.data),
    keepPreviousData: true,
  })

  const approveMutation = useMutation({
    mutationFn: ({ id, status, reason }) => leaveAPI.updateStatus(id, { status, rejectionReason: reason }),
    onSuccess: (_, vars) => { toast.success(`Leave ${vars.status}`); queryClient.invalidateQueries(['leaves']); queryClient.invalidateQueries(['leave-stats']) },
    onError: () => toast.error('Failed'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => leaveAPI.delete(id),
    onSuccess: () => { toast.success('Leave request cancelled'); queryClient.invalidateQueries(['leaves']) },
    onError: err => toast.error(err.response?.data?.message || 'Failed'),
  })

  const stats = statsData
  const leaves = data?.data || []

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Requests', value: stats.overall?.total,    color: 'rgb(var(--text-secondary))' },
            { label: 'Pending',        value: stats.overall?.pending,  color: '#f59e0b' },
            { label: 'Approved',       value: stats.overall?.approved, color: '#22c55e' },
            { label: 'Rejected',       value: stats.overall?.rejected, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} className="stat-card text-center py-4">
              <p className="text-2xl font-display font-bold" style={{ color: s.color }}>{s.value ?? 0}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* My leave balance */}
      {stats?.myBalance?.length > 0 && (
        <div className="card p-4">
          <h3 className="section-title mb-3">My Leave Used (This Year)</h3>
          <div className="flex flex-wrap gap-3">
            {stats.myBalance.map(b => (
              <div key={b.leave_type} className="px-3 py-2 rounded-xl" style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                <p className="text-xs capitalize" style={{ color: 'rgb(var(--text-muted))' }}>{b.leave_type.replace('_',' ')}</p>
                <p className="text-lg font-bold" style={{ color: 'rgb(var(--accent-light))' }}>{b.used} <span className="text-xs font-normal">days</span></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <select className="input-field" style={{ width: 140 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          {Object.keys(STATUS_CFG).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input-field" style={{ width: 155 }} value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}>
          <option value="">All Types</option>
          {LEAVE_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
        </select>
        {hasPermission('leave', 'approve') && (
          <button onClick={() => setMyTeam(v => !v)}
            className="px-3 py-2 rounded-xl text-xs font-medium"
            style={{ background: myTeam ? 'rgba(var(--accent),0.15)' : 'rgba(var(--bg-hover))', color: myTeam ? 'rgb(var(--accent-light))' : 'rgb(var(--text-secondary))', border: `1px solid ${myTeam ? 'rgba(var(--accent),0.3)' : 'rgba(var(--border))'}` }}>
            My Team Only
          </button>
        )}
        <button onClick={() => queryClient.invalidateQueries(['leaves'])} className="btn-secondary px-3">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
        <button className="btn-primary" onClick={() => setShowApply(true)}><Plus size={14} /> Apply Leave</button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {isLoading ? ([...Array(8)].map((_, i) => <tr key={i}>{[...Array(7)].map((_, j) => <td key={j}><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(var(--bg-hover))' }} /></td>)}</tr>))
              : leaves.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12"><Calendar size={36} className="mx-auto mb-2" style={{ color: 'rgb(var(--text-muted))' }} /><p style={{ color: 'rgb(var(--text-muted))' }}>No leave requests</p></td></tr>
              ) : leaves.map(l => {
                const cfg = STATUS_CFG[l.status] || STATUS_CFG.pending
                const isOwn = l.user_id === user?.id
                return (
                  <tr key={l.id}>
                    <td>
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{l.first_name} {l.last_name}</p>
                        <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{l.department_name || l.employee_id}</p>
                      </div>
                    </td>
                    <td><span className="badge badge-neutral capitalize">{l.leave_type?.replace('_',' ')}</span></td>
                    <td><span className="text-xs font-mono">{format(new Date(l.from_date), 'MMM d, yyyy')}</span></td>
                    <td><span className="text-xs font-mono">{format(new Date(l.to_date), 'MMM d, yyyy')}</span></td>
                    <td><span className="text-sm font-bold" style={{ color: 'rgb(var(--accent-light))' }}>{l.days_count}</span></td>
                    <td><span className={`badge ${cfg.badge} capitalize`}>{l.status}</span></td>
                    <td>
                      <div className="flex gap-1">
                        {l.status === 'pending' && hasPermission('leave', 'approve') && !isOwn && (
                          <>
                            <button onClick={() => approveMutation.mutate({ id: l.id, status: 'approved' })}
                              className="w-7 h-7 rounded flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>
                              <Check size={12} />
                            </button>
                            <button onClick={() => { const r = prompt('Rejection reason (optional):'); approveMutation.mutate({ id: l.id, status: 'rejected', reason: r }) }}
                              className="w-7 h-7 rounded flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                              <X size={12} />
                            </button>
                          </>
                        )}
                        {isOwn && l.status === 'pending' && (
                          <button onClick={() => deleteMutation.mutate(l.id)} className="w-7 h-7 rounded flex items-center justify-center" style={{ color: 'rgb(var(--danger))' }}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showApply && <ApplyLeaveModal onClose={() => setShowApply(false)} onSaved={() => { queryClient.invalidateQueries(['leaves']); queryClient.invalidateQueries(['leave-stats']) }} />}
    </div>
  )
}
