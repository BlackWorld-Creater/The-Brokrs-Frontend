import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { departmentsAPI, usersAPI, companiesAPI, sitesAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import useSyncStore from '../store/syncStore'
import { Plus, Building, Users, Edit, Trash2, X, Search, RefreshCw, MapPin, Building2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

function DeptModal({ dept, users, companies, sites, onClose, onSaved }) {
  const isEdit = !!dept
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: dept
      ? {
          name: dept.name, code: dept.code, description: dept.description,
          managerId: dept.manager_id, isActive: dept.is_active,
          companyId: dept.company_id, siteId: dept.site_id,
        }
      : { isActive: true }
  })

  const selectedCompany = watch('companyId')
  const filteredSites = sites?.filter(s => !selectedCompany || s.company_id === selectedCompany) || []

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, isActive: data.isActive !== 'false' && data.isActive !== false }
      if (isEdit) await departmentsAPI.update(dept.id, payload)
      else        await departmentsAPI.create(payload)
      toast.success(isEdit ? 'Department updated' : 'Department created')
      onSaved(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 500 }}>
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <h2 className="section-title">{isEdit ? 'Edit Department' : 'New Department'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input className="input-field" placeholder="Engineering"
                {...register('name', { required: 'Name is required' })} />
              {errors.name && <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Code</label>
              <input className="input-field font-mono" placeholder="ENG" {...register('code')} />
            </div>
          </div>

          {/* Company + Site assignment */}
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
                <option value="">All sites / None</option>
                {filteredSites.map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.is_hq ? '(HQ)' : ''}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input-field" rows={2} {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Manager</label>
              <select className="input-field" {...register('managerId')}>
                <option value="">No manager</option>
                {users?.filter(u => u.status === 'active').map(u => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input-field" {...register('isActive')}>
                <option value={true}>Active</option>
                <option value={false}>Inactive</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
              {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteConfirm({ dept, onClose, onConfirm, loading }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 360 }}>
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: 'rgba(var(--danger),0.1)', border: '1px solid rgba(var(--danger),0.2)' }}>
            <Trash2 size={20} style={{ color: 'rgb(var(--danger))' }} />
          </div>
          <div>
            <p className="font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
              Delete "{dept.name}"?
            </p>
            {parseInt(dept.employee_count) > 0 && (
              <p className="text-xs mt-1" style={{ color: 'rgb(var(--warning))' }}>
                {dept.employee_count} employee(s) will be unassigned.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={onConfirm} disabled={loading} className="btn-danger flex-1 justify-center">
              {loading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DepartmentsPage() {
  const { hasPermission } = useAuthStore()
  const { activeCompanyId } = useSyncStore()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [deleting, setDeleting]   = useState(null)
  const [search, setSearch]       = useState('')

  const { data: depts, isLoading } = useQuery({
    queryKey: ['departments', activeCompanyId],
    queryFn: () => departmentsAPI.getAll().then(r => r.data.data),
  })
  const { data: usersData } = useQuery({
    queryKey: ['users-active'],
    queryFn: () => usersAPI.getAll({ limit: 200, status: 'active' }).then(r => r.data.data),
  })
  const { data: companies } = useQuery({
    queryKey: ['companies-list'],
    queryFn: () => companiesAPI.getAll({ limit: 100 }).then(r => r.data.data),
  })
  const { data: allSites } = useQuery({
    queryKey: ['sites-all'],
    queryFn: () => sitesAPI.getAll({ limit: 200 }).then(r => r.data.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => departmentsAPI.delete
      ? departmentsAPI.delete(id)
      : departmentsAPI.update(id, { isActive: false }),
    onSuccess: () => {
      toast.success('Department removed')
      queryClient.invalidateQueries(['departments'])
      setDeleting(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  })

  const filtered = (depts || []).filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.code?.toLowerCase().includes(search.toLowerCase())
  )

  const totalEmployees = (depts || []).reduce((s, d) => s + parseInt(d.employee_count || 0), 0)

  return (
    <div className="space-y-5">
      {/* Stats */}
      {depts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',        value: depts.length,                                color: 'rgb(var(--accent-light))' },
            { label: 'Active',       value: depts.filter(d => d.is_active).length,       color: 'rgb(var(--success))' },
            { label: 'Employees',    value: totalEmployees,                               color: 'rgb(var(--warning))' },
            { label: 'With Manager', value: depts.filter(d => d.manager_first).length,   color: 'rgb(var(--info))' },
          ].map(s => (
            <div key={s.label} className="stat-card text-center py-4">
              <p className="text-2xl font-display font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'rgb(var(--text-muted))' }} />
          <input className="input-field pl-9" placeholder="Search departments..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => queryClient.invalidateQueries(['departments'])} className="btn-secondary px-3">
          <RefreshCw size={14} />
        </button>
        {hasPermission('departments', 'create') && (
          <button className="btn-primary whitespace-nowrap"
            onClick={() => { setEditing(null); setShowModal(true) }}>
            <Plus size={14} /> New Department
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card p-5 animate-pulse h-36" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <Building size={40} className="mx-auto mb-3" style={{ color: 'rgb(var(--text-muted))' }} />
          <p className="font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
            {search ? 'No departments match your search' : 'No departments yet'}
          </p>
          {!search && hasPermission('departments', 'create') && (
            <button className="btn-primary mx-auto mt-4"
              onClick={() => { setEditing(null); setShowModal(true) }}>
              <Plus size={14} /> Create First Department
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(d => (
            <div key={d.id} className="card-hover p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(var(--accent),0.1)', border: '1px solid rgba(var(--accent),0.2)' }}>
                    <Building size={17} style={{ color: 'rgb(var(--accent-light))' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{d.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {d.code && <span className="badge badge-neutral font-mono" style={{ fontSize: 10 }}>{d.code}</span>}
                      <span className={`badge ${d.is_active ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: 10 }}>
                        {d.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  {hasPermission('departments', 'update') && (
                    <button onClick={() => { setEditing(d); setShowModal(true) }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"
                      style={{ color: 'rgb(var(--text-muted))' }}>
                      <Edit size={13} />
                    </button>
                  )}
                  {hasPermission('departments', 'delete') && (
                    <button onClick={() => setDeleting(d)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ color: 'rgb(var(--danger))' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs mb-3 line-clamp-2" style={{ color: 'rgb(var(--text-muted))' }}>
                {d.description || 'No description'}
              </p>

              {/* Company + Site tags */}
              {(d.company_id || d.site_id) && (
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {d.company_name && (
                    <div className="flex items-center gap-1">
                      <Building2 size={10} style={{ color: 'rgb(var(--accent-light))' }} />
                      <span className="text-xs" style={{ color: 'rgb(var(--accent-light))' }}>{d.company_name}</span>
                    </div>
                  )}
                  {d.site_name && (
                    <div className="flex items-center gap-1">
                      <MapPin size={10} style={{ color: '#22c55e' }} />
                      <span className="text-xs" style={{ color: '#22c55e' }}>{d.site_name}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-3"
                style={{ borderTop: '1px solid rgba(var(--border))' }}>
                <div className="flex items-center gap-1.5">
                  <Users size={12} style={{ color: 'rgb(var(--text-muted))' }} />
                  <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                    {d.employee_count ?? 0} employee{parseInt(d.employee_count) !== 1 ? 's' : ''}
                  </span>
                </div>
                {d.manager_first && (
                  <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                    👤 {d.manager_first} {d.manager_last}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <DeptModal
          dept={editing}
          users={usersData}
          companies={companies}
          sites={allSites}
          onClose={() => setShowModal(false)}
          onSaved={() => queryClient.invalidateQueries(['departments'])}
        />
      )}
      {deleting && (
        <DeleteConfirm
          dept={deleting}
          loading={deleteMutation.isPending}
          onClose={() => setDeleting(null)}
          onConfirm={() => deleteMutation.mutate(deleting.id)}
        />
      )}
    </div>
  )
}
