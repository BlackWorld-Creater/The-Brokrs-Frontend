import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { verticalsAPI, usersAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import {
  Plus, Edit, Trash2, Users, Layers, X, Check,
  Eye, Search, RefreshCw, ToggleLeft, ToggleRight
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const ICON_OPTIONS = [
  'Layers','Code','Settings','DollarSign','TrendingUp','Users',
  'Globe','Briefcase','Star','Zap','Building','Shield','BarChart2',
  'Package','Monitor','Cpu','Database','Cloud','Truck','HeartPulse'
]
const COLOR_OPTIONS = [
  '#6366f1','#22c55e','#f59e0b','#ec4899','#06b6d4',
  '#ef4444','#8b5cf6','#f97316','#14b8a6','#64748b',
  '#0ea5e9','#a855f7','#10b981','#f43f5e','#84cc16'
]

/* ─── MODAL (Create / Edit) ─────────────────────────────────────────── */
function VerticalModal({ vertical, users, onClose, onSaved }) {
  const isEdit = !!vertical
  const [color, setColor]     = useState(vertical?.color || '#6366f1')
  const [members, setMembers] = useState(vertical?.members?.map(m => m.id) || [])
  const [memberSearch, setMemberSearch] = useState('')

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: vertical
      ? { name: vertical.name, description: vertical.description,
          icon: vertical.icon || 'Layers', sortOrder: vertical.sort_order, isActive: vertical.is_active }
      : { icon: 'Layers', sortOrder: 0, isActive: true }
  })

  const toggleMember = (uid) =>
    setMembers(p => p.includes(uid) ? p.filter(x => x !== uid) : [...p, uid])

  const filteredUsers = (users || []).filter(u =>
    `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(memberSearch.toLowerCase())
  )

  const onSubmit = async (data) => {
    try {
      const payload = {
        name: data.name,
        description: data.description,
        icon: data.icon,
        color,
        sortOrder: parseInt(data.sortOrder) || 0,
        isActive: data.isActive !== false,
        memberIds: members,
      }
      if (isEdit) await verticalsAPI.update(vertical.id, payload)
      else        await verticalsAPI.create(payload)
      toast.success(isEdit ? 'Vertical updated successfully' : 'Vertical created successfully')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 580 }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
              <Layers size={15} style={{ color }} />
            </div>
            <h2 className="section-title">{isEdit ? 'Edit Vertical' : 'New Vertical'}</h2>
          </div>
          <button onClick={onClose} style={{ color: 'rgb(var(--text-muted))' }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 overflow-y-auto"
          style={{ maxHeight: '75vh' }}>
          {/* Name + Icon */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input className="input-field" placeholder="e.g. Technology"
                {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Min 2 characters' } })} />
              {errors.name && <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Icon</label>
              <select className="input-field" {...register('icon')}>
                {ICON_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea className="input-field" rows={2} placeholder="Brief description of this vertical..."
              {...register('description')} />
          </div>

          {/* Color Picker */}
          <div>
            <label className="label">Accent Color</label>
            <div className="flex gap-2 flex-wrap mt-1.5">
              {COLOR_OPTIONS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                  style={{
                    background: c,
                    transform: color === c ? 'scale(1.25)' : 'scale(1)',
                    boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none',
                  }}>
                  {color === c && <Check size={11} color="white" strokeWidth={3} />}
                </button>
              ))}
            </div>
            {/* custom hex */}
            <div className="flex items-center gap-2 mt-2">
              <div className="w-6 h-6 rounded-md flex-shrink-0" style={{ background: color }} />
              <input
                type="text"
                className="input-field"
                style={{ width: 110, fontFamily: 'monospace' }}
                value={color}
                onChange={e => /^#[0-9A-Fa-f]{0,6}$/.test(e.target.value) && setColor(e.target.value)}
                placeholder="#6366f1"
              />
            </div>
          </div>

          {/* Sort Order + Active */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Sort Order</label>
              <input type="number" className="input-field" min={0} {...register('sortOrder')} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input-field" {...register('isActive')}>
                <option value={true}>Active</option>
                <option value={false}>Inactive</option>
              </select>
            </div>
          </div>

          {/* Members */}
          <div>
            <label className="label">
              Members
              <span className="ml-2 badge badge-accent">{members.length} selected</span>
            </label>
            <input className="input-field mb-2" placeholder="Search users..."
              value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(var(--border))' }}>
              <div className="max-h-44 overflow-y-auto">
                {filteredUsers.length === 0
                  ? <p className="text-xs text-center py-4" style={{ color: 'rgb(var(--text-muted))' }}>No users found</p>
                  : filteredUsers.slice(0, 50).map(u => {
                    const sel = members.includes(u.id)
                    return (
                      <div key={u.id} onClick={() => toggleMember(u.id)}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors"
                        style={{
                          background: sel ? 'rgba(var(--accent), 0.08)' : 'transparent',
                          borderBottom: '1px solid rgba(var(--border))',
                        }}>
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: sel ? 'rgba(var(--accent), 0.2)' : 'rgba(var(--bg-hover))' }}>
                          <span className="text-xs font-bold"
                            style={{ color: sel ? 'rgb(var(--accent-light))' : 'rgb(var(--text-muted))' }}>
                            {u.first_name?.[0]}{u.last_name?.[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'rgb(var(--text-primary))' }}>
                            {u.first_name} {u.last_name}
                          </p>
                          <p className="text-xs truncate" style={{ color: 'rgb(var(--text-muted))' }}>{u.email}</p>
                        </div>
                        {sel && <Check size={14} style={{ color: 'rgb(var(--accent-light))' }} />}
                      </div>
                    )
                  })
                }
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center"
              style={{ background: color }}>
              {isSubmitting
                ? <span className="flex items-center gap-2">
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="32"/>
                    </svg>
                    Saving...
                  </span>
                : isEdit ? 'Update Vertical' : 'Create Vertical'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── VIEW MEMBERS MODAL ─────────────────────────────────────────────── */
function ViewMembersModal({ vertical, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['vertical-detail', vertical.id],
    queryFn: () => verticalsAPI.getById(vertical.id).then(r => r.data.data),
  })

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 440 }}>
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div>
            <h2 className="section-title">{vertical.name}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>Members</p>
          </div>
          <button onClick={onClose} style={{ color: 'rgb(var(--text-muted))' }}><X size={18} /></button>
        </div>
        <div className="p-5">
          {isLoading
            ? <p className="text-sm text-center py-6" style={{ color: 'rgb(var(--text-muted))' }}>Loading...</p>
            : data?.members?.length === 0
              ? <p className="text-sm text-center py-6" style={{ color: 'rgb(var(--text-muted))' }}>No members assigned</p>
              : <div className="space-y-2">
                  {data.members.map(m => (
                    <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl"
                      style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${vertical.color}20` }}>
                        <span className="text-xs font-bold" style={{ color: vertical.color }}>
                          {m.first_name?.[0]}{m.last_name?.[0]}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                          {m.first_name} {m.last_name}
                        </p>
                        <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{m.email}</p>
                      </div>
                      {m.department && (
                        <span className="badge badge-neutral text-xs">{m.department}</span>
                      )}
                    </div>
                  ))}
                </div>
          }
        </div>
      </div>
    </div>
  )
}

/* ─── DELETE CONFIRM ────────────────────────────────────────────────── */
function DeleteConfirm({ vertical, onClose, onConfirm, loading }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 380 }}>
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: 'rgba(var(--danger), 0.1)', border: '1px solid rgba(var(--danger), 0.2)' }}>
            <Trash2 size={22} style={{ color: 'rgb(var(--danger))' }} />
          </div>
          <div>
            <h3 className="section-title">Delete Vertical</h3>
            <p className="text-sm mt-1.5" style={{ color: 'rgb(var(--text-muted))' }}>
              Are you sure you want to delete <strong style={{ color: 'rgb(var(--text-primary))' }}>"{vertical.name}"</strong>?
              This will remove all member associations.
            </p>
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

/* ─── MAIN PAGE ──────────────────────────────────────────────────────── */
export default function VerticalsPage() {
  const { hasPermission } = useAuthStore()
  const queryClient = useQueryClient()
  const [showModal, setShowModal]     = useState(false)
  const [editing, setEditing]         = useState(null)
  const [viewing, setViewing]         = useState(null)
  const [deleting, setDeleting]       = useState(null)
  const [search, setSearch]           = useState('')
  const [page, setPage]               = useState(1)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['verticals', search, page],
    queryFn: () => verticalsAPI.getAll({ search, page, limit: 12 }).then(r => r.data),
    keepPreviousData: true,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users-active'],
    queryFn: () => usersAPI.getAll({ limit: 200, status: 'active' }).then(r => r.data.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => verticalsAPI.delete(id),
    onSuccess: () => {
      toast.success('Vertical deleted')
      queryClient.invalidateQueries(['verticals'])
      setDeleting(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Delete failed'),
  })

  const openCreate = () => { setEditing(null); setShowModal(true) }
  const openEdit   = (v) => { setEditing(v);    setShowModal(true) }

  const verticals = data?.data || []
  const pagination = data?.pagination

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'rgb(var(--text-muted))' }} />
          <input className="input-field pl-9" placeholder="Search verticals..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <button onClick={() => queryClient.invalidateQueries(['verticals'])}
          className="btn-secondary px-3" title="Refresh">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
        {hasPermission('verticals', 'create') && (
          <button className="btn-primary whitespace-nowrap" onClick={openCreate}>
            <Plus size={14} /> New Vertical
          </button>
        )}
      </div>

      {/* Summary cards */}
      {pagination && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',    value: pagination.total,                                        color: 'rgb(var(--accent-light))' },
            { label: 'Active',   value: verticals.filter(v => v.is_active).length,              color: 'rgb(var(--success))' },
            { label: 'Members',  value: verticals.reduce((s, v) => s + parseInt(v.member_count || 0), 0), color: 'rgb(var(--warning))' },
            { label: 'Inactive', value: verticals.filter(v => !v.is_active).length,             color: 'rgb(var(--danger))' },
          ].map(s => (
            <div key={s.label} className="stat-card text-center py-4">
              <p className="text-2xl font-display font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse space-y-3">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl" style={{ background: 'rgba(var(--bg-hover))' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded w-32" style={{ background: 'rgba(var(--bg-hover))' }} />
                  <div className="h-3 rounded w-20" style={{ background: 'rgba(var(--bg-hover))' }} />
                </div>
              </div>
              <div className="h-3 rounded w-full" style={{ background: 'rgba(var(--bg-hover))' }} />
              <div className="h-3 rounded w-3/4"  style={{ background: 'rgba(var(--bg-hover))' }} />
            </div>
          ))}
        </div>
      ) : verticals.length === 0 ? (
        <div className="card p-16 text-center">
          <Layers size={40} className="mx-auto mb-3" style={{ color: 'rgb(var(--text-muted))' }} />
          <p className="font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>No verticals found</p>
          <p className="text-sm mt-1 mb-4" style={{ color: 'rgb(var(--text-muted))' }}>
            {search ? 'Try a different search term' : 'Create your first vertical to get started'}
          </p>
          {!search && hasPermission('verticals', 'create') && (
            <button className="btn-primary mx-auto" onClick={openCreate}>
              <Plus size={14} /> Create Vertical
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {verticals.map(v => (
            <div key={v.id} className="card-hover p-5 flex flex-col gap-3"
              style={{ opacity: v.is_active ? 1 : 0.65 }}>
              {/* Top row */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${v.color}18`, border: `1px solid ${v.color}35` }}>
                    <Layers size={17} style={{ color: v.color }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{v.name}</p>
                    <span className={`badge mt-0.5 ${v.is_active ? 'badge-success' : 'badge-neutral'}`}>
                      {v.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setViewing(v)} title="View Members"
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                    style={{ color: 'rgb(var(--text-muted))' }}>
                    <Eye size={13} />
                  </button>
                  {hasPermission('verticals', 'update') && (
                    <button onClick={() => openEdit(v)} title="Edit"
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                      style={{ color: 'rgb(var(--text-muted))' }}>
                      <Edit size={13} />
                    </button>
                  )}
                  {hasPermission('verticals', 'delete') && (
                    <button onClick={() => setDeleting(v)} title="Delete"
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{ color: 'rgb(var(--danger))' }}>
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'rgb(var(--text-muted))' }}>
                {v.description || 'No description provided'}
              </p>

              {/* Footer */}
              <div className="flex items-center gap-3 pt-2"
                style={{ borderTop: '1px solid rgba(var(--border))' }}>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: v.color }} />
                <span className="text-xs font-mono" style={{ color: 'rgb(var(--text-muted))' }}>{v.color}</span>
                <div className="flex items-center gap-1.5 ml-auto">
                  <Users size={12} style={{ color: 'rgb(var(--text-muted))' }} />
                  <span className="text-xs font-semibold" style={{ color: 'rgb(var(--text-secondary))' }}>
                    {v.member_count ?? 0} member{parseInt(v.member_count) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
          </p>
          <div className="flex gap-2">
            <button disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Previous</button>
            <button disabled={!pagination.hasNextPage} onClick={() => setPage(p => p + 1)}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <VerticalModal
          vertical={editing}
          users={usersData}
          onClose={() => setShowModal(false)}
          onSaved={() => queryClient.invalidateQueries(['verticals'])}
        />
      )}
      {viewing && (
        <ViewMembersModal vertical={viewing} onClose={() => setViewing(null)} />
      )}
      {deleting && (
        <DeleteConfirm
          vertical={deleting}
          loading={deleteMutation.isPending}
          onClose={() => setDeleting(null)}
          onConfirm={() => deleteMutation.mutate(deleting.id)}
        />
      )}
    </div>
  )
}
