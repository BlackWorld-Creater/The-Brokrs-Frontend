import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { rolesAPI, modulesAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import {
  Plus, Edit, Trash2, Shield, Users, Check, X,
  Lock, ChevronRight, AlertCircle, RefreshCw
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const PERM_TYPES = ['create','read','update','delete','export','import','approve','manage']
const PERM_COLOR = {
  create:'#22c55e', read:'#6366f1', update:'#f59e0b', delete:'#ef4444',
  export:'#06b6d4', import:'#8b5cf6', approve:'#f97316', manage:'#ec4899'
}

/* ── Permissions Matrix Modal ────────────────────────────────────── */
function PermissionsMatrix({ roleId, roleName, isSystem, modules, existingPermissions, onClose, onSaved }) {
  const [perms, setPerms] = useState(() => {
    const map = {}
    existingPermissions?.forEach(p => {
      if (!map[p.module_id]) map[p.module_id] = {}
      map[p.module_id][p.permission_type] = p.is_granted
    })
    return map
  })
  const [saving, setSaving] = useState(false)
  const { hasPermission } = useAuthStore()
  const canEdit = !isSystem || hasPermission('roles','manage')

  const toggle = (moduleId, perm) => {
    if (!canEdit) return
    setPerms(prev => ({
      ...prev,
      [moduleId]: { ...prev[moduleId], [perm]: !(prev[moduleId]?.[perm]) }
    }))
  }

  const toggleRow = (moduleId) => {
    if (!canEdit) return
    const allSet = PERM_TYPES.every(p => perms[moduleId]?.[p])
    setPerms(prev => ({
      ...prev,
      [moduleId]: Object.fromEntries(PERM_TYPES.map(p => [p, !allSet]))
    }))
  }

  const toggleCol = (perm) => {
    if (!canEdit) return
    const allSet = modules?.every(m => perms[m.id]?.[perm])
    setPerms(prev => {
      const next = { ...prev }
      modules?.forEach(m => {
        if (!next[m.id]) next[m.id] = {}
        next[m.id][perm] = !allSet
      })
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const permissions = []
      for (const [moduleId, mp] of Object.entries(perms)) {
        for (const [permType, isGranted] of Object.entries(mp)) {
          permissions.push({ moduleId, permissionType: permType, isGranted })
        }
      }
      await rolesAPI.updatePermissions(roleId, { permissions })
      toast.success('Permissions updated')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 960 }}>
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div>
            <h2 className="section-title">Permissions — {roleName}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
              {isSystem ? 'System role — edit with caution' : 'Configure module access for this role'}
            </p>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving
                  ? <span className="flex items-center gap-2">
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="32"/>
                      </svg>Saving...
                    </span>
                  : 'Save Permissions'
                }
              </button>
            )}
            <button onClick={onClose} style={{ color: 'rgb(var(--text-muted))' }}><X size={18} /></button>
          </div>
        </div>

        <div className="p-5 overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 750 }}>
            <thead>
              <tr>
                <th className="text-left pb-3 pr-4 sticky left-0"
                  style={{ color: 'rgb(var(--text-muted))', fontWeight: 600, width: 180,
                           background: 'rgb(var(--bg-card))', fontSize: 11, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                  Module
                </th>
                {PERM_TYPES.map(p => (
                  <th key={p} className="pb-3 text-center" style={{ minWidth: 55 }}>
                    <button onClick={() => toggleCol(p)} className="flex flex-col items-center gap-1 mx-auto"
                      style={{ color: PERM_COLOR[p], fontSize: 10, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                      {p}
                    </button>
                  </th>
                ))}
                <th className="pb-3 text-center" style={{ color: 'rgb(var(--text-muted))', fontSize: 10, minWidth: 42 }}>ALL</th>
              </tr>
            </thead>
            <tbody>
              {modules?.filter(m => m.is_active).map(mod => {
                const allSet = PERM_TYPES.every(p => perms[mod.id]?.[p])
                return (
                  <tr key={mod.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="py-2.5 pr-4 sticky left-0"
                      style={{ background: 'rgb(var(--bg-card))' }}>
                      <span className="font-medium text-sm" style={{ color: 'rgb(var(--text-primary))' }}>
                        {mod.name}
                      </span>
                    </td>
                    {PERM_TYPES.map(p => (
                      <td key={p} className="py-2.5 text-center">
                        <button onClick={() => toggle(mod.id, p)}
                          className="w-6 h-6 rounded flex items-center justify-center mx-auto transition-all"
                          style={{
                            background: perms[mod.id]?.[p] ? `${PERM_COLOR[p]}20` : 'rgba(var(--bg-hover))',
                            border: `1px solid ${perms[mod.id]?.[p] ? PERM_COLOR[p]+'50' : 'rgba(var(--border))'}`,
                            cursor: canEdit ? 'pointer' : 'not-allowed',
                            opacity: canEdit ? 1 : 0.7,
                          }}>
                          {perms[mod.id]?.[p] && <Check size={10} style={{ color: PERM_COLOR[p] }} strokeWidth={3} />}
                        </button>
                      </td>
                    ))}
                    <td className="py-2.5 text-center">
                      <button onClick={() => toggleRow(mod.id)}
                        className="w-6 h-6 rounded flex items-center justify-center mx-auto transition-all"
                        style={{
                          background: allSet ? 'rgba(var(--accent), 0.18)' : 'rgba(var(--bg-hover))',
                          border: `1px solid ${allSet ? 'rgba(var(--accent), 0.4)' : 'rgba(var(--border))'}`,
                          cursor: canEdit ? 'pointer' : 'not-allowed',
                        }}>
                        {allSet && <Check size={10} style={{ color: 'rgb(var(--accent-light))' }} strokeWidth={3} />}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="text-xs mt-3" style={{ color: 'rgb(var(--text-muted))' }}>
            Tip: Click column headers to toggle all modules for that permission type
          </p>
        </div>
      </div>
    </div>
  )
}

/* ── Role Form Modal ─────────────────────────────────────────────── */
function RoleModal({ role, onClose, onSaved }) {
  const isEdit = !!role
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: role
      ? { name: role.name, description: role.description, isActive: role.is_active }
      : { isActive: true }
  })
  const onSubmit = async (data) => {
    try {
      if (isEdit) await rolesAPI.update(role.id, data)
      else        await rolesAPI.create(data)
      toast.success(isEdit ? 'Role updated' : 'Role created')
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 440 }}>
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <h2 className="section-title">{isEdit ? 'Edit Role' : 'New Role'}</h2>
          <button onClick={onClose} style={{ color: 'rgb(var(--text-muted))' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="label">Role Name *</label>
            <input className="input-field"
              placeholder="e.g. Finance Manager"
              {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Min 2 chars' } })} />
            {errors.name && <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input-field" rows={3}
              placeholder="Brief description of this role's purpose..."
              {...register('description')} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input-field" {...register('isActive')}>
              <option value={true}>Active</option>
              <option value={false}>Inactive</option>
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Role' : 'Create Role'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Delete Confirm ──────────────────────────────────────────────── */
function DeleteConfirm({ role, onClose, onConfirm, loading }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 380 }}>
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: 'rgba(var(--danger), 0.1)', border: '1px solid rgba(var(--danger), 0.2)' }}>
            <Trash2 size={22} style={{ color: 'rgb(var(--danger))' }} />
          </div>
          <div>
            <h3 className="section-title">Delete Role</h3>
            <p className="text-sm mt-1.5" style={{ color: 'rgb(var(--text-muted))' }}>
              Delete <strong style={{ color: 'rgb(var(--text-primary))' }}>"{role.name}"</strong>?
              Users with this role will lose its permissions.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={onConfirm} disabled={loading} className="btn-danger flex-1 justify-center">
              {loading ? 'Deleting...' : 'Delete Role'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ────────────────────────────────────────────────────── */
export default function RolesPage() {
  const { hasPermission } = useAuthStore()
  const queryClient = useQueryClient()
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [editingRole, setEditingRole]     = useState(null)
  const [permRole, setPermRole]           = useState(null)
  const [permData, setPermData]           = useState(null)
  const [deletingRole, setDeletingRole]   = useState(null)

  const { data: roles, isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesAPI.getAll().then(r => r.data.data),
  })

  const { data: modules } = useQuery({
    queryKey: ['modules'],
    queryFn: () => modulesAPI.getAll().then(r => r.data.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => rolesAPI.delete(id),
    onSuccess: () => {
      toast.success('Role deleted')
      queryClient.invalidateQueries(['roles'])
      setDeletingRole(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Cannot delete role'),
  })

  const openPermissions = async (role) => {
    try {
      const { data } = await rolesAPI.getById(role.id)
      setPermData(data.data.permissions)
      setPermRole(role)
    } catch {
      toast.error('Failed to load permissions')
    }
  }

  /* Stats */
  const activeRoles   = roles?.filter(r => r.is_active).length  || 0
  const systemRoles   = roles?.filter(r => r.is_system).length  || 0
  const totalUsers    = roles?.reduce((s, r) => s + parseInt(r.user_count || 0), 0) || 0

  return (
    <div className="space-y-5">
      {/* Stats */}
      {roles && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Roles',    value: roles.length, color: 'rgb(var(--accent-light))' },
            { label: 'Active',         value: activeRoles,  color: 'rgb(var(--success))' },
            { label: 'System Roles',   value: systemRoles,  color: 'rgb(var(--warning))' },
            { label: 'Users Assigned', value: totalUsers,   color: 'rgb(var(--info))' },
          ].map(s => (
            <div key={s.label} className="stat-card text-center py-4">
              <p className="text-2xl font-display font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => queryClient.invalidateQueries(['roles'])} className="btn-ghost p-2">
            <RefreshCw size={14} />
          </button>
        </div>
        {hasPermission('roles','create') && (
          <button className="btn-primary" onClick={() => { setEditingRole(null); setShowRoleModal(true) }}>
            <Plus size={14} /> New Role
          </button>
        )}
      </div>

      {/* Roles Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse" style={{ height: 160 }}>
              <div className="flex gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl" style={{ background: 'rgba(var(--bg-hover))' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded w-28" style={{ background: 'rgba(var(--bg-hover))' }} />
                  <div className="h-3 rounded w-16" style={{ background: 'rgba(var(--bg-hover))' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {roles?.map(role => (
            <div key={role.id} className="card-hover p-5">
              {/* Top */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: role.is_system ? 'rgba(var(--accent), 0.12)' : 'rgba(var(--bg-hover))',
                      border: `1px solid ${role.is_system ? 'rgba(var(--accent), 0.25)' : 'rgba(var(--border))'}`,
                    }}>
                    <Shield size={17} style={{ color: role.is_system ? 'rgb(var(--accent-light))' : 'rgb(var(--text-muted))' }} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'rgb(var(--text-primary))' }}>
                      {role.name}
                    </p>
                    <div className="flex gap-1 mt-0.5">
                      {role.is_system && <span className="badge badge-accent" style={{ fontSize: 10 }}>System</span>}
                      <span className={`badge ${role.is_active ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: 10 }}>
                        {role.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1">
                  {hasPermission('roles','manage') && (
                    <button onClick={() => openPermissions(role)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{ color: 'rgb(var(--accent-light))', background: 'rgba(var(--accent), 0.08)' }}
                      title="Edit Permissions">
                      <Lock size={12} />
                    </button>
                  )}
                  {!role.is_system && hasPermission('roles','update') && (
                    <button onClick={() => { setEditingRole(role); setShowRoleModal(true) }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
                      style={{ color: 'rgb(var(--text-muted))' }}>
                      <Edit size={12} />
                    </button>
                  )}
                  {!role.is_system && hasPermission('roles','delete') && (
                    <button onClick={() => setDeletingRole(role)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                      style={{ color: 'rgb(var(--danger))' }}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs mb-3 line-clamp-2" style={{ color: 'rgb(var(--text-muted))' }}>
                {role.description || 'No description'}
              </p>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3"
                style={{ borderTop: '1px solid rgba(var(--border))' }}>
                <div className="flex items-center gap-1.5">
                  <Users size={12} style={{ color: 'rgb(var(--text-muted))' }} />
                  <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                    {role.user_count ?? 0} user{parseInt(role.user_count) !== 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={() => openPermissions(role)}
                  className="flex items-center gap-1 text-xs transition-colors"
                  style={{ color: 'rgb(var(--text-muted))' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'rgb(var(--accent-light))'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgb(var(--text-muted))'}>
                  View permissions <ChevronRight size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showRoleModal && (
        <RoleModal
          role={editingRole}
          onClose={() => setShowRoleModal(false)}
          onSaved={() => queryClient.invalidateQueries(['roles'])}
        />
      )}
      {permRole && (
        <PermissionsMatrix
          roleId={permRole.id}
          roleName={permRole.name}
          isSystem={permRole.is_system}
          modules={modules}
          existingPermissions={permData}
          onClose={() => { setPermRole(null); setPermData(null) }}
          onSaved={() => queryClient.invalidateQueries(['roles'])}
        />
      )}
      {deletingRole && (
        <DeleteConfirm
          role={deletingRole}
          loading={deleteMutation.isPending}
          onClose={() => setDeletingRole(null)}
          onConfirm={() => deleteMutation.mutate(deletingRole.id)}
        />
      )}
    </div>
  )
}
