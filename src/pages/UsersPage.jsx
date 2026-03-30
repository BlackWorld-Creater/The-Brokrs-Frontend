import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI, rolesAPI, departmentsAPI, companiesAPI, sitesAPI } from '../services/api'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { Plus, Search, Edit, Trash2, Eye, Key, Globe, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import PasswordInput from '../components/ui/PasswordInput'
import { validatePassword } from '../utils/passwordValidator'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const STATUS_BADGE = {
  active: 'badge-success', inactive: 'badge-neutral',
  suspended: 'badge-danger', pending: 'badge-warning',
}

function UserModal({ user, roles, departments, companies, sites, onClose, onSaved }) {
  const isEdit = !!user
  const [loadingUser, setLoadingUser] = useState(isEdit)
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { status: 'active' }
  })

  // Fetch full user details on edit so all fields are populated
  useEffect(() => {
    if (!isEdit) return
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await usersAPI.getById(user.id)
        const u = data.data
        if (cancelled) return

        // Roles from getById may be objects {id, name} or strings — handle both
        const roleIds = (u.roles || []).map(r => typeof r === 'object' ? String(r.id) : String(r))

        reset({
          firstName: u.first_name || '',
          lastName: u.last_name || '',
          email: u.email || '',
          phone: u.phone || '',
          designation: u.designation || '',
          departmentId: u.department_id ? String(u.department_id) : '',
          companyId: u.company_id ? String(u.company_id) : '',
          siteId: u.site_id ? String(u.site_id) : '',
          status: u.status || 'active',
          roleIds,
        })
      } catch (err) {
        // Fallback to the list-level data if getById fails
        const roleIds = (user.roles || []).map(r => typeof r === 'object' ? String(r.id) : '')
          .filter(Boolean)
        reset({
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          email: user.email || '',
          phone: user.phone || '',
          designation: user.designation || '',
          departmentId: user.department_id ? String(user.department_id) : '',
          status: user.status || 'active',
          roleIds,
        })
      } finally {
        if (!cancelled) setLoadingUser(false)
      }
    })()
    return () => { cancelled = true }
  }, [user, isEdit, reset])

  const onSubmit = async (data) => {
    // Validate password on create
    if (!isEdit && data.password) {
      const { allPassed } = validatePassword(data.password)
      if (!allPassed) {
        toast.error('Password does not meet requirements')
        return
      }
    }
    try {
      if (isEdit) await usersAPI.update(user.id, data)
      else        await usersAPI.create(data)
      toast.success(isEdit ? 'User updated' : 'User created')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 620 }}>
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <h2 className="section-title">{isEdit ? 'Edit User' : 'Create New User'}</h2>
          <button onClick={onClose} style={{ color: 'rgb(var(--text-muted))' }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: '80vh' }}>
          {loadingUser ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin w-7 h-7" style={{ color: 'rgb(var(--accent-light))' }} viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="32" />
              </svg>
              <span className="ml-3 text-sm" style={{ color: 'rgb(var(--text-muted))' }}>Loading user details...</span>
            </div>
          ) : (
          <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input className="input-field" {...register('firstName', { required: 'Required' })} />
              {errors.firstName && <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{errors.firstName.message}</p>}
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input className="input-field" {...register('lastName', { required: 'Required' })} />
              {errors.lastName && <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{errors.lastName.message}</p>}
            </div>
          </div>

          <div>
            <label className="label">Email *</label>
            <input type="email" className="input-field" disabled={isEdit}
              {...register('email', { required: 'Required', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' } })} />
            {errors.email && <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{errors.email.message}</p>}
          </div>

          {!isEdit && (
            <PasswordInput
              register={register('password', {
                required: 'Password is required',
                validate: (v) => validatePassword(v).allPassed || 'Password does not meet all requirements'
              })}
              name="password"
              label="Password *"
              showStrength={true}
              error={errors.password}
              watch={watch}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input className="input-field" {...register('phone')} />
            </div>
            <div>
              <label className="label">Designation</label>
              <input className="input-field" {...register('designation')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Company</label>
              <select className="input-field" {...register('companyId')}>
                <option value="">Select company</option>
                {companies?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Site</label>
              <select className="input-field" {...register('siteId')}>
                <option value="">Select site</option>
                {sites?.map(s => <option key={s.id} value={s.id}>{s.name} ({s.company_code})</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Department</label>
              <select className="input-field" {...register('departmentId')}>
                <option value="">Select department</option>
                {departments?.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input-field" {...register('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Assign Roles</label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {roles?.map(r => (
                <label key={r.id} className="flex items-center gap-2 cursor-pointer py-2 px-3 rounded-lg transition-colors"
                  style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                  <input type="checkbox" value={r.id} {...register('roleIds')}
                    style={{ accentColor: 'rgb(var(--accent))' }} />
                  <span className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{r.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
              {isSubmitting ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
            </button>
          </div>
          </>
          )}
        </form>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const { hasPermission } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch]         = useState('')
  const [status, setStatus]         = useState('')
  const [page, setPage]             = useState(1)
  const [showModal, setShowModal]   = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users', page, search, status],
    queryFn: () => usersAPI.getAll({ page, limit: 10, search, status }).then(r => r.data),
    keepPreviousData: true,
  })
  const { data: roles }       = useQuery({ queryKey: ['roles'],          queryFn: () => rolesAPI.getAll().then(r => r.data.data) })
  const { data: departments } = useQuery({ queryKey: ['departments'],     queryFn: () => departmentsAPI.getAll().then(r => r.data.data) })
  const { data: stats }       = useQuery({ queryKey: ['user-stats'],      queryFn: () => usersAPI.getStats().then(r => r.data.data) })
  const { data: companies }   = useQuery({ queryKey: ['companies-list'],  queryFn: () => companiesAPI.getAll({ limit: 100 }).then(r => r.data.data) })
  const { data: allSites }    = useQuery({ queryKey: ['sites-list'],      queryFn: () => sitesAPI.getAll({ limit: 200 }).then(r => r.data.data) })

  const deleteMutation = useMutation({
    mutationFn: (id) => usersAPI.delete(id),
    onSuccess: () => {
      toast.success('User deactivated')
      queryClient.invalidateQueries(['users'])
      queryClient.invalidateQueries(['user-stats'])
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  })

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total',     value: stats.total,     color: 'rgb(var(--accent-light))' },
            { label: 'Active',    value: stats.active,    color: 'rgb(var(--success))' },
            { label: 'Pending',   value: stats.pending,   color: 'rgb(var(--warning))' },
            { label: 'Inactive',  value: stats.inactive,  color: 'rgb(var(--text-muted))' },
            { label: 'Suspended', value: stats.suspended, color: 'rgb(var(--danger))' },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <p className="text-2xl font-display font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'rgb(var(--text-muted))' }} />
          <input className="input-field pl-9" placeholder="Search by name, email, employee ID..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input-field sm:w-44" value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
        </select>
        {hasPermission('users', 'create') && (
          <button className="btn-primary whitespace-nowrap"
            onClick={() => { setEditingUser(null); setShowModal(true) }}>
            <Plus size={14} /> Add User
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Roles</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Last IP</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(8)].map((_, j) => (
                    <td key={j}><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(var(--bg-hover))' }} /></td>
                  ))}</tr>
                ))
              ) : data?.data?.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12" style={{ color: 'rgb(var(--text-muted))' }}>
                  No users found
                </td></tr>
              ) : data?.data?.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(var(--accent), 0.15)' }}>
                        <span className="text-xs font-bold" style={{ color: 'rgb(var(--accent-light))' }}>
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'rgb(var(--text-primary))' }}>
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                    {user.employee_id}
                  </td>
                  <td style={{ color: 'rgb(var(--text-secondary))' }}>{user.department_name || '—'}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {user.roles?.filter(Boolean).map((r, i) => (
                        <span key={i} className="badge badge-accent text-xs">{r}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[user.status] || 'badge-neutral'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="font-mono text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                    {user.last_login ? format(new Date(user.last_login), 'MMM d, HH:mm') : 'Never'}
                  </td>
                  <td>
                    {user.last_login_ip
                      ? <span className="ip-chip">
                          <Globe size={9} />{user.last_login_ip}
                        </span>
                      : <span style={{ color: 'rgb(var(--text-muted))' }}>—</span>
                    }
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/users/${user.id}`)}
                        className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/5 transition-colors"
                        style={{ color: 'rgb(var(--text-muted))' }}>
                        <Eye size={13} />
                      </button>
                      {hasPermission('users', 'update') && (
                        <button onClick={() => { setEditingUser(user); setShowModal(true) }}
                          className="w-7 h-7 rounded flex items-center justify-center hover:bg-white/5 transition-colors"
                          style={{ color: 'rgb(var(--text-muted))' }}>
                          <Edit size={13} />
                        </button>
                      )}
                      {hasPermission('users', 'delete') && (
                        <button
                          onClick={() => confirm(`Deactivate ${user.first_name} ${user.last_name}?`) && deleteMutation.mutate(user.id)}
                          className="w-7 h-7 rounded flex items-center justify-center hover:bg-red-500/10 transition-colors"
                          style={{ color: 'rgb(var(--danger))' }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data?.pagination && (
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid rgba(var(--border))' }}>
            <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
              Showing {((page-1)*10)+1}–{Math.min(page*10, data.pagination.total)} of {data.pagination.total}
            </p>
            <div className="flex gap-2">
              <button disabled={!data.pagination.hasPrevPage} onClick={() => setPage(p => p-1)}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Previous</button>
              <button disabled={!data.pagination.hasNextPage} onClick={() => setPage(p => p+1)}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <UserModal
          user={editingUser}
          roles={roles}
          departments={departments}
          companies={companies}
          sites={allSites}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            queryClient.invalidateQueries(['users'])
            queryClient.invalidateQueries(['user-stats'])
          }}
        />
      )}
    </div>
  )
}
