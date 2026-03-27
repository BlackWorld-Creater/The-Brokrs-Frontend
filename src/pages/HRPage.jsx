import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hrAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import { Users, UserCheck, UserX, TrendingUp, Search, RefreshCw, Eye, Edit, X, Building, Phone, Mail, Calendar, CreditCard, Shield, Download } from 'lucide-react'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

function EmployeeDetailModal({ empId, onClose }) {
  const { hasPermission } = useAuthStore()
  const queryClient = useQueryClient()
  const [editProfile, setEditProfile] = useState(false)
  const { data, isLoading } = useQuery({
    queryKey: ['employee', empId],
    queryFn: () => hrAPI.getById(empId).then(r => r.data.data),
    enabled: !!empId,
  })
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({ values: data ? {
    emergencyContactName: data.emergency_contact_name, emergencyContactPhone: data.emergency_contact_phone,
    bloodGroup: data.blood_group, maritalStatus: data.marital_status, nationality: data.nationality,
    panNumber: data.pan_number, aadharNumber: data.aadhar_number,
    bankAccount: data.bank_account, bankName: data.bank_name, bankIfsc: data.bank_ifsc,
    salaryCTC: data.salary_ctc,
  } : {} })

  const updateMutation = useMutation({
    mutationFn: (d) => hrAPI.updateProfile(empId, d),
    onSuccess: () => { toast.success('Profile updated'); queryClient.invalidateQueries(['employee', empId]); setEditProfile(false) },
    onError: () => toast.error('Failed'),
  })

  if (isLoading) return <div className="modal-overlay"><div className="modal-content p-8 text-center"><div className="animate-spin w-8 h-8 rounded-full mx-auto" style={{ border: '2px solid rgba(var(--accent),0.2)', borderTopColor: 'rgb(var(--accent))' }} /></div></div>
  if (!data) return null
  const e = data

  return (
    <div className="modal-overlay" onClick={ev => ev.target === ev.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 700 }}>
        <div className="flex items-start gap-4 p-5" style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(var(--accent),0.15)' }}>
            <span className="text-xl font-bold" style={{ color: 'rgb(var(--accent-light))' }}>{e.first_name?.[0]}{e.last_name?.[0]}</span>
          </div>
          <div className="flex-1">
            <h2 className="font-display font-bold text-xl" style={{ color: 'rgb(var(--text-primary))' }}>{e.first_name} {e.last_name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="badge badge-neutral font-mono">{e.employee_id}</span>
              <span className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>{e.designation || 'No designation'}</span>
              <span className={`badge ${e.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{e.status}</span>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>

        <div className="p-5 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Basic info */}
            <div className="space-y-3">
              <h3 className="section-title">Contact</h3>
              {[
                { icon: Mail,     label: 'Email',      value: e.email },
                { icon: Phone,    label: 'Phone',      value: e.phone || '—' },
                { icon: Building, label: 'Department', value: e.department_name || '—' },
                { icon: Calendar, label: 'Joined',     value: e.date_of_joining ? format(new Date(e.date_of_joining), 'MMM d, yyyy') : '—' },
                { icon: Calendar, label: 'DOB',        value: e.date_of_birth ? format(new Date(e.date_of_birth), 'MMM d, yyyy') : '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon size={13} style={{ color: 'rgb(var(--text-muted))' }} />
                  <div><p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{label}</p><p className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{value}</p></div>
                </div>
              ))}
            </div>

            {/* HR Profile */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="section-title">HR Profile</h3>
                {hasPermission('hr', 'update') && (
                  <button onClick={() => setEditProfile(v => !v)} className="btn-secondary text-xs px-2 py-1">
                    {editProfile ? 'Cancel' : <><Edit size={11} /> Edit</>}
                  </button>
                )}
              </div>
              {editProfile ? (
                <form onSubmit={handleSubmit(d => updateMutation.mutate(d))} className="space-y-3">
                  {[
                    { label: 'Emergency Contact', name: 'emergencyContactName' },
                    { label: 'Emergency Phone', name: 'emergencyContactPhone' },
                    { label: 'Blood Group', name: 'bloodGroup' },
                    { label: 'Marital Status', name: 'maritalStatus' },
                    { label: 'PAN Number', name: 'panNumber' },
                    { label: 'Bank Name', name: 'bankName' },
                    { label: 'Bank Account', name: 'bankAccount' },
                    { label: 'IFSC', name: 'bankIfsc' },
                    { label: 'Salary CTC', name: 'salaryCTC', type: 'number' },
                  ].map(f => (
                    <div key={f.name}><label className="label">{f.label}</label>
                      <input type={f.type || 'text'} className="input-field" {...register(f.name)} /></div>
                  ))}
                  <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center">
                    {isSubmitting ? 'Saving...' : 'Save Profile'}
                  </button>
                </form>
              ) : (
                <div className="space-y-2">
                  {[
                    { label: 'Blood Group',  value: e.blood_group || '—' },
                    { label: 'Marital Status', value: e.marital_status || '—' },
                    { label: 'Bank',         value: e.bank_name ? `${e.bank_name} / ${e.bank_account || '—'}` : '—' },
                    { label: 'Salary CTC',   value: e.salary_ctc ? `₹${Number(e.salary_ctc).toLocaleString('en-IN')}` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid rgba(var(--border))' }}>
                      <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{label}</span>
                      <span className="text-xs font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HRPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [viewing, setViewing] = useState(null)
  const [page, setPage] = useState(1)

  const { data: statsData } = useQuery({ queryKey: ['hr-stats'], queryFn: () => hrAPI.getStats().then(r => r.data.data) })
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['hr-employees', search, deptFilter, statusFilter, page],
    queryFn: () => hrAPI.getAll({ search, departmentId: deptFilter, status: statusFilter, page, limit: 15 }).then(r => r.data),
    keepPreviousData: true,
  })

  const employees = data?.data || []
  const pagination = data?.pagination
  const stats = statsData

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Employees', value: stats.employees?.total,     icon: Users,      color: 'rgb(var(--accent-light))' },
            { label: 'Active',          value: stats.employees?.active,    icon: UserCheck,  color: 'rgb(var(--success))' },
            { label: 'New (30 days)',   value: stats.newHires30d,          icon: TrendingUp, color: 'rgb(var(--info))' },
            { label: 'Inactive',        value: stats.employees?.inactive,  icon: UserX,      color: 'rgb(var(--text-muted))' },
          ].map(s => (
            <div key={s.label} className="stat-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${s.color}18` }}>
                  <s.icon size={18} style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold" style={{ color: s.color }}>{s.value ?? 0}</p>
                  <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dept breakdown */}
      {stats?.byDepartment?.length > 0 && (
        <div className="card p-4">
          <h3 className="section-title mb-3">By Department</h3>
          <div className="flex flex-wrap gap-2">
            {stats.byDepartment.map(d => (
              <button key={d.department} onClick={() => { setDeptFilter(''); setSearch(d.department) }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs"
                style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                <span className="font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>{d.department}</span>
                <span className="badge badge-neutral" style={{ fontSize: 10 }}>{d.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(var(--text-muted))' }} />
          <input className="input-field pl-9" placeholder="Search employees..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input-field" style={{ width: 140 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
        <button onClick={() => queryClient.invalidateQueries(['hr-employees'])} className="btn-secondary px-3">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead><tr><th>Employee</th><th>Department</th><th>Designation</th><th>Joining Date</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {isLoading ? ([...Array(8)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j}><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(var(--bg-hover))' }} /></td>)}</tr>))
              : employees.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12"><Users size={36} className="mx-auto mb-2" style={{ color: 'rgb(var(--text-muted))' }} /><p style={{ color: 'rgb(var(--text-muted))' }}>No employees found</p></td></tr>
              ) : employees.map(e => (
                <tr key={e.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(var(--accent),0.12)' }}>
                        <span className="text-xs font-bold" style={{ color: 'rgb(var(--accent-light))' }}>{e.first_name?.[0]}{e.last_name?.[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{e.first_name} {e.last_name}</p>
                        <p className="text-xs font-mono" style={{ color: 'rgb(var(--text-muted))' }}>{e.employee_id} · {e.email}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>{e.department_name || '—'}</span></td>
                  <td><span className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>{e.designation || '—'}</span></td>
                  <td><span className="text-xs font-mono" style={{ color: 'rgb(var(--text-muted))' }}>{e.date_of_joining ? format(new Date(e.date_of_joining), 'MMM d, yyyy') : '—'}</span></td>
                  <td><span className={`badge ${e.status === 'active' ? 'badge-success' : 'badge-neutral'}`}>{e.status}</span></td>
                  <td><button onClick={() => setViewing(e.id)} className="btn-ghost p-1.5"><Eye size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(var(--border))' }}>
            <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{pagination.total} employees · Page {pagination.page}/{pagination.totalPages}</p>
            <div className="flex gap-2">
              <button disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p-1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Prev</button>
              <button disabled={!pagination.hasNextPage} onClick={() => setPage(p => p+1)} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {viewing && <EmployeeDetailModal empId={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
