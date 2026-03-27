import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { modulesManageAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import {
  Grid3X3, Edit, X, Shield, Check, ToggleLeft, ToggleRight,
  Plus, Search, RefreshCw, Info, Trash2, Package
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const CATEGORIES = ['core','management','system','security','hr','finance','project','custom']
const CATEGORY_COLORS = {
  core: '#6366f1', management: '#22c55e', system: '#f59e0b',
  security: '#ef4444', hr: '#06b6d4', finance: '#f97316',
  project: '#8b5cf6', custom: '#64748b',
}
const ICONS = [
  'LayoutDashboard','Users','Shield','Building','Layers','Grid3X3',
  'Globe','FileText','Settings','Bell','BarChart2','CheckSquare',
  'Clock','Calendar','CreditCard','Briefcase','DollarSign','TrendingUp',
  'Package','Database','Code','Cpu','Monitor','Cloud','Lock',
]

/* ─── ADD / EDIT MODAL ───────────────────────────────────────────────── */
function ModuleModal({ module: mod, onClose, onSaved }) {
  const isEdit = !!mod
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: mod
      ? {
          name: mod.name, description: mod.description, icon: mod.icon || 'Package',
          slug: mod.slug, sortOrder: mod.sort_order, category: mod.category || 'custom',
          version: mod.version || '1.0.0', isActive: mod.is_active,
        }
      : {
          icon: 'Package', sortOrder: 99, category: 'custom',
          version: '1.0.0', isActive: true,
        }
  })

  const onSubmit = async (data) => {
    try {
      const payload = {
        name: data.name,
        description: data.description,
        icon: data.icon,
        sortOrder: parseInt(data.sortOrder) || 0,
        category: data.category,
        version: data.version,
        isActive: data.isActive !== 'false' && data.isActive !== false,
        config: {},
      }
      if (isEdit) {
        await modulesManageAPI.update(mod.id, payload)
        toast.success('Module updated')
      } else {
        // POST /api/modules/manage (add new module)
        await modulesManageAPI.create({ ...payload, slug: data.slug })
        toast.success('Module created')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 500 }}>
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(var(--accent), 0.12)', border: '1px solid rgba(var(--accent), 0.2)' }}>
              <Grid3X3 size={14} style={{ color: 'rgb(var(--accent-light))' }} />
            </div>
            <h2 className="section-title">{isEdit ? `Edit: ${mod.name}` : 'Add New Module'}</h2>
          </div>
          <button onClick={onClose} style={{ color: 'rgb(var(--text-muted))' }}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {/* Name + Icon */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Module Name *</label>
              <input className="input-field"
                placeholder="e.g. Payroll"
                {...register('name', { required: 'Name is required' })} />
              {errors.name && <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Icon</label>
              <select className="input-field" {...register('icon')}>
                {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
          </div>

          {/* Slug (create only) */}
          {!isEdit && (
            <div>
              <label className="label">URL Slug *</label>
              <input className="input-field font-mono"
                placeholder="e.g. payroll (lowercase, hyphens)"
                {...register('slug', {
                  required: 'Slug is required',
                  pattern: { value: /^[a-z0-9-]+$/, message: 'Only lowercase letters, numbers, hyphens' }
                })} />
              {errors.slug && <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{errors.slug.message}</p>}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="label">Description</label>
            <textarea className="input-field" rows={2}
              placeholder="Brief description of this module..."
              {...register('description')} />
          </div>

          {/* Category + Version + Sort */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Category</label>
              <select className="input-field" {...register('category')}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Version</label>
              <input className="input-field" placeholder="1.0.0" {...register('version')} />
            </div>
            <div>
              <label className="label">Sort Order</label>
              <input type="number" className="input-field" {...register('sortOrder')} />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="label">Status</label>
            <select className="input-field" {...register('isActive')}>
              <option value={true}>Active</option>
              <option value={false}>Disabled</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
              {isSubmitting
                ? <span className="flex items-center gap-2">
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="32"/>
                    </svg>
                    Saving...
                  </span>
                : isEdit ? 'Save Changes' : 'Add Module'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── PERMISSIONS DRAWER ─────────────────────────────────────────────── */
function PermissionsDrawer({ mod, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['module-perms', mod.id],
    queryFn: () => modulesManageAPI.getPermissions(mod.id).then(r => r.data.data),
  })
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 500 }}>
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div>
            <h2 className="section-title">{mod.name} — Permissions</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
              Roles with access to this module
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'rgb(var(--text-muted))' }}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          {isLoading
            ? <p className="text-sm text-center py-6" style={{ color: 'rgb(var(--text-muted))' }}>Loading...</p>
            : data?.length === 0
              ? <p className="text-sm text-center py-6" style={{ color: 'rgb(var(--text-muted))' }}>No permissions configured</p>
              : data?.map(role => (
                <div key={role.role_id} className="p-3 rounded-xl"
                  style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield size={13} style={{ color: 'rgb(var(--accent-light))' }} />
                      <span className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                        {role.role_name}
                      </span>
                    </div>
                    <span className="badge badge-accent text-xs">{role.role_slug}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(role.granted_permissions || []).length === 0
                      ? <span className="badge badge-neutral">No access</span>
                      : role.granted_permissions.map(p => (
                          <span key={p} className="badge badge-success">{p}</span>
                        ))
                    }
                  </div>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  )
}

/* ─── MAIN PAGE ──────────────────────────────────────────────────────── */
export default function ModulesPage() {
  const { hasPermission } = useAuthStore()
  const queryClient = useQueryClient()
  const [editMod, setEditMod]       = useState(null)
  const [permMod, setPermMod]       = useState(null)
  const [showAdd, setShowAdd]       = useState(false)
  const [filterCat, setFilterCat]   = useState('')
  const [search, setSearch]         = useState('')

  const { data: modules, isLoading } = useQuery({
    queryKey: ['modules-manage'],
    queryFn: () => modulesManageAPI.getAll().then(r => r.data.data),
  })

  const toggleMutation = useMutation({
    mutationFn: (id) => modulesManageAPI.toggle(id),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Module toggled')
      queryClient.invalidateQueries(['modules-manage'])
    },
    onError: () => toast.error('Failed to toggle module'),
  })

  const filtered = (modules || []).filter(m => {
    const matchCat  = !filterCat || m.category === filterCat
    const matchSrch = !search || m.name.toLowerCase().includes(search.toLowerCase()) ||
                                  m.slug.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSrch
  })

  const grouped = filtered.reduce((acc, m) => {
    const cat = m.category || 'core'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(m)
    return acc
  }, {})

  const allCategories = [...new Set((modules || []).map(m => m.category || 'core'))]

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'rgb(var(--text-muted))' }} />
          <input className="input-field pl-9" placeholder="Search modules..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button onClick={() => queryClient.invalidateQueries(['modules-manage'])}
          className="btn-secondary px-3">
          <RefreshCw size={14} />
        </button>
        {hasPermission('modules', 'manage') && (
          <button className="btn-primary whitespace-nowrap" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Module
          </button>
        )}
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCat('')}
          className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${!filterCat ? 'btn-primary' : 'btn-secondary'}`}>
          All ({modules?.length || 0})
        </button>
        {allCategories.map(c => {
          const count = (modules || []).filter(m => (m.category || 'core') === c).length
          return (
            <button key={c} onClick={() => setFilterCat(filterCat === c ? '' : c)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${filterCat === c ? 'btn-primary' : 'btn-secondary'}`}
              style={filterCat === c ? { background: CATEGORY_COLORS[c] || '#6366f1' } : {}}>
              {c} ({count})
            </button>
          )
        })}
      </div>

      {/* Stats */}
      {modules && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',      value: modules.length,                                  color: 'rgb(var(--accent-light))' },
            { label: 'Active',     value: modules.filter(m => m.is_active).length,         color: 'rgb(var(--success))' },
            { label: 'Disabled',   value: modules.filter(m => !m.is_active).length,        color: 'rgb(var(--danger))' },
            { label: 'Categories', value: allCategories.length,                            color: 'rgb(var(--warning))' },
          ].map(s => (
            <div key={s.label} className="stat-card text-center py-4">
              <p className="text-2xl font-display font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Grouped modules */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(9)].map((_, i) => <div key={i} className="card p-4 animate-pulse h-28" />)}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="card p-16 text-center">
          <Package size={40} className="mx-auto mb-3" style={{ color: 'rgb(var(--text-muted))' }} />
          <p className="font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>No modules found</p>
          <p className="text-sm mt-1" style={{ color: 'rgb(var(--text-muted))' }}>Try adjusting your search or filter</p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, mods]) => (
          <div key={category}>
            {/* Category header */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full"
                style={{ background: CATEGORY_COLORS[category] || '#6366f1' }} />
              <p className="text-xs font-bold uppercase tracking-widest"
                style={{ color: 'rgb(var(--text-muted))' }}>
                {category}
              </p>
              <div className="flex-1 h-px" style={{ background: 'rgba(var(--border))' }} />
              <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{mods.length}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-2">
              {mods.map(mod => {
                const catColor = CATEGORY_COLORS[mod.category || 'core'] || '#6366f1'
                return (
                  <div key={mod.id} className="card p-4 transition-all"
                    style={{ opacity: mod.is_active ? 1 : 0.55 }}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${catColor}15`, border: `1px solid ${catColor}30` }}>
                          <Grid3X3 size={15} style={{ color: catColor }} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                            {mod.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <code className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>/{mod.slug}</code>
                            {mod.version && (
                              <span className="badge badge-neutral" style={{ fontSize: 10 }}>v{mod.version}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => setPermMod(mod)} title="View Permissions"
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/5 transition-colors"
                          style={{ color: 'rgb(var(--text-muted))' }}>
                          <Shield size={11} />
                        </button>
                        {hasPermission('modules', 'manage') && (
                          <>
                            <button onClick={() => setEditMod(mod)} title="Edit"
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/5 transition-colors"
                              style={{ color: 'rgb(var(--text-muted))' }}>
                              <Edit size={11} />
                            </button>
                            <button
                              onClick={() => toggleMutation.mutate(mod.id)}
                              disabled={toggleMutation.isPending}
                              title={mod.is_active ? 'Disable module' : 'Enable module'}
                              className="w-6 h-6 rounded flex items-center justify-center transition-colors"
                              style={{ color: mod.is_active ? 'rgb(var(--success))' : 'rgb(var(--text-muted))' }}>
                              {mod.is_active
                                ? <ToggleRight size={15} />
                                : <ToggleLeft size={15} />
                              }
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {mod.description && (
                      <p className="text-xs mb-2 line-clamp-1" style={{ color: 'rgb(var(--text-muted))' }}>
                        {mod.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className={`badge ${mod.is_active ? 'badge-success' : 'badge-neutral'}`}>
                        {mod.is_active ? 'Active' : 'Disabled'}
                      </span>
                      <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                        {mod.role_count ?? 0} role{mod.role_count !== '1' ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* Modals */}
      {showAdd && (
        <ModuleModal
          onClose={() => setShowAdd(false)}
          onSaved={() => queryClient.invalidateQueries(['modules-manage'])}
        />
      )}
      {editMod && (
        <ModuleModal
          module={editMod}
          onClose={() => setEditMod(null)}
          onSaved={() => queryClient.invalidateQueries(['modules-manage'])}
        />
      )}
      {permMod && (
        <PermissionsDrawer mod={permMod} onClose={() => setPermMod(null)} />
      )}
    </div>
  )
}
