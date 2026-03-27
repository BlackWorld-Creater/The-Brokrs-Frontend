import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projectsAPI, usersAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import { Briefcase, Plus, Edit, Trash2, X, Search, RefreshCw, Eye, Users, CheckSquare, TrendingUp, Calendar, DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'

const STATUS_CFG = {
  planning:   { badge: 'badge-info',    color: '#06b6d4' },
  active:     { badge: 'badge-success', color: '#22c55e' },
  on_hold:    { badge: 'badge-warning', color: '#f59e0b' },
  completed:  { badge: 'badge-neutral', color: '#94a3b8' },
  cancelled:  { badge: 'badge-danger',  color: '#ef4444' },
}
const PRIORITY_CFG = { urgent: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e' }

function ProjectModal({ project, users, onClose, onSaved }) {
  const isEdit = !!project
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: project ? {
      name: project.name, code: project.code, description: project.description,
      clientName: project.client_name, status: project.status, priority: project.priority,
      startDate: project.start_date, endDate: project.end_date,
      budget: project.budget, managerId: project.manager_id, progress: project.progress,
    } : { status: 'planning', priority: 'medium', progress: 0 }
  })
  const onSubmit = async (d) => {
    try {
      if (isEdit) await projectsAPI.update(project.id, d)
      else await projectsAPI.create(d)
      toast.success(isEdit ? 'Project updated' : 'Project created')
      onSaved(); onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 580 }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <h2 className="section-title">{isEdit ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Name *</label><input className="input-field" {...register('name', { required: true })} /></div>
            <div><label className="label">Code</label><input className="input-field font-mono" {...register('code')} /></div>
          </div>
          <div><label className="label">Description</label><textarea className="input-field" rows={2} {...register('description')} /></div>
          <div><label className="label">Client Name</label><input className="input-field" {...register('clientName')} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Status</label><select className="input-field" {...register('status')}>{Object.keys(STATUS_CFG).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></div>
            <div><label className="label">Priority</label><select className="input-field" {...register('priority')}>{Object.keys(PRIORITY_CFG).map(p => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label className="label">Progress %</label><input type="number" min={0} max={100} className="input-field" {...register('progress')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Start Date</label><input type="date" className="input-field" {...register('startDate')} /></div>
            <div><label className="label">End Date</label><input type="date" className="input-field" {...register('endDate')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Budget</label><input type="number" className="input-field" {...register('budget')} /></div>
            <div><label className="label">Project Manager</label>
              <select className="input-field" {...register('managerId')}>
                <option value="">No manager</option>
                {users?.filter(u => u.status === 'active').map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">{isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create Project'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProjectDetailModal({ projectId, onClose, onEdit }) {
  const { data, isLoading } = useQuery({
    queryKey: ['project-detail', projectId],
    queryFn: () => projectsAPI.getById(projectId).then(r => r.data.data),
    enabled: !!projectId,
  })
  if (isLoading || !data) return null
  const p = data
  const cfg = STATUS_CFG[p.status] || STATUS_CFG.planning
  const donePercent = p.task_count > 0 ? Math.round((p.done_tasks / p.task_count) * 100) : p.progress || 0

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 700 }}>
        <div className="flex items-start justify-between p-5" style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`badge ${cfg.badge} capitalize`}>{p.status?.replace('_',' ')}</span>
              {p.code && <span className="badge badge-neutral font-mono">{p.code}</span>}
            </div>
            <h2 className="font-display font-bold text-xl" style={{ color: 'rgb(var(--text-primary))' }}>{p.name}</h2>
            {p.client_name && <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>Client: {p.client_name}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => { onClose(); onEdit() }} className="btn-secondary text-xs px-3 py-1.5"><Edit size={11} /> Edit</button>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
          </div>
        </div>
        <div className="p-5 overflow-y-auto space-y-5" style={{ maxHeight: '70vh' }}>
          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: 'rgb(var(--text-muted))' }}>Progress</span>
              <span className="font-bold" style={{ color: 'rgb(var(--accent-light))' }}>{donePercent}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(var(--bg-hover))' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${donePercent}%`, background: donePercent >= 100 ? '#22c55e' : 'rgb(var(--accent))' }} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Members',   value: p.member_count ?? 0, icon: Users },
              { label: 'Tasks',     value: p.task_count ?? 0,   icon: CheckSquare },
              { label: 'Done',      value: p.done_tasks ?? 0,   icon: TrendingUp },
              { label: 'Budget',    value: p.budget ? `₹${Number(p.budget).toLocaleString('en-IN')}` : '—', icon: DollarSign },
            ].map(s => (
              <div key={s.label} className="text-center p-2 rounded-xl" style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                <p className="text-lg font-bold" style={{ color: 'rgb(var(--accent-light))' }}>{s.value}</p>
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          {p.description && <div><p className="label">Description</p><p className="text-sm mt-1" style={{ color: 'rgb(var(--text-secondary))' }}>{p.description}</p></div>}

          {/* Members */}
          {p.members?.length > 0 && (
            <div><p className="label mb-2">Team Members</p>
              <div className="flex flex-wrap gap-2">
                {p.members.map(m => (
                  <div key={m.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl" style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'rgba(var(--accent),0.12)' }}>
                      <span className="text-xs font-bold" style={{ color: 'rgb(var(--accent-light))' }}>{m.first_name?.[0]}{m.last_name?.[0]}</span>
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{m.first_name} {m.last_name}</span>
                    <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{m.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent tasks */}
          {p.tasks?.length > 0 && (
            <div><p className="label mb-2">Tasks ({p.task_count})</p>
              <div className="space-y-1.5">
                {p.tasks.slice(0,8).map(t => (
                  <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.status === 'done' ? '#22c55e' : t.status === 'in_progress' ? '#6366f1' : '#94a3b8' }} />
                    <span className={`text-xs flex-1 ${t.status === 'done' ? 'line-through opacity-60' : ''}`} style={{ color: 'rgb(var(--text-primary))' }}>{t.title}</span>
                    {t.assignee_first && <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{t.assignee_first} {t.assignee_last}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const { hasPermission } = useAuthStore()
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [viewing, setViewing]     = useState(null)
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage]           = useState(1)

  const { data: statsData } = useQuery({ queryKey: ['project-stats'], queryFn: () => projectsAPI.getStats().then(r => r.data.data) })
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['projects', search, statusFilter, page],
    queryFn: () => projectsAPI.getAll({ search, status: statusFilter, page, limit: 12 }).then(r => r.data),
    keepPreviousData: true,
  })
  const { data: usersData } = useQuery({ queryKey: ['users-active'], queryFn: () => usersAPI.getAll({ limit: 200, status: 'active' }).then(r => r.data.data) })

  const deleteMutation = useMutation({
    mutationFn: (id) => projectsAPI.delete(id),
    onSuccess: () => { toast.success('Project deleted'); queryClient.invalidateQueries(['projects']); queryClient.invalidateQueries(['project-stats']) },
    onError: () => toast.error('Failed'),
  })

  const projects = data?.data || []
  const stats = statsData

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total',       value: stats.total,       color: 'rgb(var(--accent-light))' },
            { label: 'Active',      value: stats.active,      color: '#22c55e' },
            { label: 'Planning',    value: stats.planning,    color: '#06b6d4' },
            { label: 'Completed',   value: stats.completed,   color: '#94a3b8' },
          ].map(s => (
            <div key={s.label} className="stat-card text-center py-4">
              <p className="text-2xl font-display font-bold" style={{ color: s.color }}>{s.value ?? 0}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(var(--text-muted))' }} />
          <input className="input-field pl-9" placeholder="Search projects..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input-field" style={{ width: 145 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">All Status</option>
          {Object.keys(STATUS_CFG).map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <button onClick={() => queryClient.invalidateQueries(['projects'])} className="btn-secondary px-3"><RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} /></button>
        {hasPermission('projects', 'create') && (
          <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true) }}><Plus size={14} /> New Project</button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="card p-5 animate-pulse h-44" />)}</div>
      ) : projects.length === 0 ? (
        <div className="card p-16 text-center"><Briefcase size={42} className="mx-auto mb-3" style={{ color: 'rgb(var(--text-muted))' }} /><p className="font-semibold mb-4" style={{ color: 'rgb(var(--text-primary))' }}>No projects found</p></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(p => {
            const cfg = STATUS_CFG[p.status] || STATUS_CFG.planning
            const donePct = p.task_count > 0 ? Math.round((p.done_tasks / p.task_count) * 100) : p.progress || 0
            return (
              <div key={p.id} className="card-hover p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${cfg.badge} capitalize`}>{p.status?.replace('_',' ')}</span>
                      {p.priority && <span className="text-xs" style={{ color: PRIORITY_CFG[p.priority] }}>● {p.priority}</span>}
                    </div>
                    <p className="font-semibold text-sm leading-snug" style={{ color: 'rgb(var(--text-primary))' }}>{p.name}</p>
                    {p.client_name && <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{p.client_name}</p>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setViewing(p.id)} className="w-7 h-7 rounded hover:bg-white/5" style={{ color: 'rgb(var(--text-muted))' }}><Eye size={12} /></button>
                    {hasPermission('projects', 'update') && <button onClick={() => { setEditing(p); setShowModal(true) }} className="w-7 h-7 rounded hover:bg-white/5" style={{ color: 'rgb(var(--text-muted))' }}><Edit size={12} /></button>}
                    {hasPermission('projects', 'delete') && <button onClick={() => confirm('Delete project?') && deleteMutation.mutate(p.id)} className="w-7 h-7 rounded" style={{ color: 'rgb(var(--danger))' }}><Trash2 size={12} /></button>}
                  </div>
                </div>

                {/* Progress */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'rgb(var(--text-muted))' }}>{p.done_tasks ?? 0}/{p.task_count ?? 0} tasks</span>
                    <span style={{ color: 'rgb(var(--accent-light))' }}>{donePct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(var(--bg-hover))' }}>
                    <div className="h-full rounded-full" style={{ width: `${donePct}%`, background: donePct >= 100 ? '#22c55e' : 'rgb(var(--accent))' }} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(var(--border))' }}>
                  <div className="flex items-center gap-1.5">
                    <Users size={12} style={{ color: 'rgb(var(--text-muted))' }} />
                    <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{p.member_count ?? 0} members</span>
                  </div>
                  {p.end_date && <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Due {format(new Date(p.end_date), 'MMM d, yyyy')}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && <ProjectModal project={editing} users={usersData} onClose={() => setShowModal(false)} onSaved={() => { queryClient.invalidateQueries(['projects']); queryClient.invalidateQueries(['project-stats']) }} />}
      {viewing && <ProjectDetailModal projectId={viewing} onClose={() => setViewing(null)} onEdit={() => { const p = projects.find(x => x.id === viewing); setEditing(p); setViewing(null); setShowModal(true) }} />}
    </div>
  )
}
