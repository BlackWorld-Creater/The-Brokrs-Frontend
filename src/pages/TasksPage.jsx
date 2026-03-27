import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksAPI, usersAPI, notificationsAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import {
  Plus, Search, Filter, CheckSquare, Clock, AlertTriangle,
  User, Calendar, Flag, Tag, MessageSquare, Trash2, X,
  ChevronDown, Check, Circle, Play, Eye, MoreHorizontal,
  Edit, Send, RefreshCw, BarChart2, Zap, ArrowUp
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { format, formatDistanceToNow, isPast, isToday, isTomorrow } from 'date-fns'
import toast from 'react-hot-toast'

/* ── Constants ───────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  todo:        { label: 'To Do',       color: '#94a3b8', bg: 'rgba(148,163,184,0.1)',  icon: Circle },
  in_progress: { label: 'In Progress', color: '#6366f1', bg: 'rgba(99,102,241,0.1)',   icon: Play },
  in_review:   { label: 'In Review',   color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',   icon: Eye },
  done:        { label: 'Done',        color: '#22c55e', bg: 'rgba(34,197,94,0.1)',    icon: Check },
  blocked:     { label: 'Blocked',     color: '#ef4444', bg: 'rgba(239,68,68,0.1)',    icon: AlertTriangle },
  cancelled:   { label: 'Cancelled',   color: '#64748b', bg: 'rgba(100,116,139,0.05)', icon: X },
}
const PRIORITY_CONFIG = {
  urgent: { label: 'Urgent', color: '#ef4444', dot: '🔴' },
  high:   { label: 'High',   color: '#f97316', dot: '🟠' },
  medium: { label: 'Medium', color: '#f59e0b', dot: '🟡' },
  low:    { label: 'Low',    color: '#22c55e', dot: '🟢' },
}

/* ── Due date badge ──────────────────────────────────────────────── */
function DueBadge({ dueDate, status }) {
  if (!dueDate || status === 'done' || status === 'cancelled') return null
  const d = new Date(dueDate)
  const overdue  = isPast(d) && !isToday(d)
  const today    = isToday(d)
  const tomorrow = isTomorrow(d)
  const color = overdue ? '#ef4444' : today ? '#f97316' : tomorrow ? '#f59e0b' : 'rgb(var(--text-muted))'
  return (
    <span className="flex items-center gap-1 text-xs" style={{ color }}>
      <Clock size={10} />
      {overdue  ? `Overdue ${formatDistanceToNow(d, { addSuffix: true })}` :
       today    ? 'Due today' :
       tomorrow ? 'Due tomorrow' :
       format(d, 'MMM d')}
    </span>
  )
}

/* ── Task Card ───────────────────────────────────────────────────── */
function TaskCard({ task, onOpen, onStatusChange, onDelete, canManage }) {
  const [showMenu, setShowMenu] = useState(false)
  const { user } = useAuthStore()
  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo
  const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
  const StatusIcon = cfg.icon
  const isMyTask   = task.assigned_to === user?.id

  return (
    <div className="card-hover p-4 group cursor-pointer"
      onClick={() => onOpen(task)}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        {/* Status toggle */}
        <button
          onClick={e => { e.stopPropagation(); onStatusChange(task) }}
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-all hover:scale-110"
          style={{ background: cfg.bg, border: `1.5px solid ${cfg.color}` }}
          title={`Status: ${cfg.label}`}>
          <StatusIcon size={10} style={{ color: cfg.color }} strokeWidth={2.5} />
        </button>

        {/* Title */}
        <p className={`flex-1 text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through opacity-60' : ''}`}
          style={{ color: 'rgb(var(--text-primary))' }}>
          {task.title}
        </p>

        {/* Actions menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); setShowMenu(v => !v) }}
            className="w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/5"
            style={{ color: 'rgb(var(--text-muted))' }}>
            <MoreHorizontal size={13} />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={e => { e.stopPropagation(); setShowMenu(false) }} />
              <div className="absolute right-0 top-full mt-1 w-36 card py-1 z-20"
                style={{ boxShadow: 'var(--shadow-modal)' }}>
                <button onClick={e => { e.stopPropagation(); onOpen(task); setShowMenu(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 flex items-center gap-2"
                  style={{ color: 'rgb(var(--text-secondary))' }}>
                  <Edit size={11} /> View & Edit
                </button>
                {canManage && (
                  <button onClick={e => { e.stopPropagation(); onDelete(task); setShowMenu(false) }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-white/5 flex items-center gap-2"
                    style={{ color: 'rgb(var(--danger))' }}>
                    <Trash2 size={11} /> Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 flex-wrap pl-7">
        {/* Priority */}
        <span className="text-xs" style={{ color: pri.color }}>
          {pri.dot} {pri.label}
        </span>

        {/* Due date */}
        <DueBadge dueDate={task.due_date} status={task.status} />

        {/* Assignee avatar */}
        {task.assignee_first && (
          <div className="flex items-center gap-1 ml-auto">
            <div className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: isMyTask ? 'rgba(var(--accent),0.2)' : 'rgba(var(--bg-hover))' }}>
              <span className="text-xs font-bold" style={{ color: isMyTask ? 'rgb(var(--accent-light))' : 'rgb(var(--text-muted))', fontSize: 9 }}>
                {task.assignee_first[0]}{task.assignee_last?.[0]}
              </span>
            </div>
          </div>
        )}

        {/* Comment count */}
        {task.comment_count > 0 && (
          <span className="flex items-center gap-1 text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
            <MessageSquare size={10} /> {task.comment_count}
          </span>
        )}
      </div>

      {/* Status badge */}
      <div className="pl-7 mt-2">
        <span className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}25` }}>
          {cfg.label}
        </span>
        {task.project_name && (
          <span className="ml-2 text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
            #{task.project_name}
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Status Cycle Menu ───────────────────────────────────────────── */
function StatusCycleModal({ task, onClose, onSelect }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 280 }}>
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3"
            style={{ color: 'rgb(var(--text-muted))' }}>
            Change status for: {task.title.substring(0, 40)}{task.title.length > 40 ? '…' : ''}
          </p>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon
            return (
              <button key={key} onClick={() => { onSelect(task.id, key); onClose() }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all mb-1 text-left"
                style={{
                  background: task.status === key ? cfg.bg : 'transparent',
                  border: `1px solid ${task.status === key ? cfg.color + '40' : 'transparent'}`,
                }}>
                <div className="w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: cfg.bg, border: `1.5px solid ${cfg.color}` }}>
                  <Icon size={10} style={{ color: cfg.color }} />
                </div>
                <span className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                  {cfg.label}
                </span>
                {task.status === key && <Check size={13} className="ml-auto" style={{ color: cfg.color }} />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── Task Detail / Edit Modal ────────────────────────────────────── */
function TaskDetailModal({ taskId, users, onClose, onSaved }) {
  const { user: currentUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [editMode, setEditMode] = useState(false)
  const [newComment, setNewComment] = useState('')
  const commentRef = useRef(null)

  const { data: taskData, isLoading } = useQuery({
    queryKey: ['task-detail', taskId],
    queryFn: () => tasksAPI.getById(taskId).then(r => r.data.data),
    enabled: !!taskId,
  })
  const task = taskData

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: task ? {
      title: task.title, description: task.description,
      assignedTo: task.assigned_to, status: task.status,
      priority: task.priority, dueDate: task.due_date,
      estimatedHours: task.estimated_hours, actualHours: task.actual_hours,
    } : {}
  })
  useEffect(() => {
    if (task) reset({
      title: task.title, description: task.description || '',
      assignedTo: task.assigned_to || '', status: task.status,
      priority: task.priority, dueDate: task.due_date || '',
      estimatedHours: task.estimated_hours || '', actualHours: task.actual_hours || '',
    })
  }, [task])

  const updateMutation = useMutation({
    mutationFn: (data) => tasksAPI.update(taskId, data),
    onSuccess: () => {
      toast.success('Task updated')
      queryClient.invalidateQueries(['task-detail', taskId])
      queryClient.invalidateQueries(['tasks'])
      queryClient.invalidateQueries(['task-stats'])
      setEditMode(false)
      onSaved?.()
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  })

  const commentMutation = useMutation({
    mutationFn: (comment) => tasksAPI.addComment(taskId, comment),
    onSuccess: () => {
      setNewComment('')
      queryClient.invalidateQueries(['task-detail', taskId])
      toast.success('Comment added')
    },
    onError: () => toast.error('Failed to add comment'),
  })

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => tasksAPI.deleteComment(taskId, commentId),
    onSuccess: () => queryClient.invalidateQueries(['task-detail', taskId]),
  })

  const handleCommentSubmit = (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    commentMutation.mutate(newComment.trim())
  }

  if (isLoading) return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 680 }}>
        <div className="p-8 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 rounded-full"
            style={{ border: '2px solid rgba(var(--accent),0.2)', borderTopColor: 'rgb(var(--accent))' }} />
        </div>
      </div>
    </div>
  )
  if (!task) return null

  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.todo
  const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 720 }}>
        {/* Header */}
        <div className="flex items-start gap-3 p-5"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: cfg.bg, border: `1.5px solid ${cfg.color}` }}>
            {(() => { const Icon = cfg.icon; return <Icon size={14} style={{ color: cfg.color }} /> })()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: cfg.bg, color: cfg.color }}>
                {cfg.label}
              </span>
              <span className="text-xs" style={{ color: pri.color }}>
                {pri.dot} {pri.label}
              </span>
              {task.project_name && (
                <span className="badge badge-neutral text-xs">#{task.project_name}</span>
              )}
            </div>
            <h2 className="font-display font-bold text-lg mt-1 leading-snug"
              style={{ color: 'rgb(var(--text-primary))' }}>
              {task.title}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
              Created {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
              {task.assigner_first && ` by ${task.assigner_first} ${task.assigner_last}`}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => setEditMode(v => !v)}
              className={`btn-secondary text-xs px-3 py-1.5 ${editMode ? 'ring-1 ring-indigo-400' : ''}`}>
              <Edit size={11} /> {editMode ? 'Cancel Edit' : 'Edit'}
            </button>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
          </div>
        </div>

        <div className="flex flex-col gap-0 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0" style={{ minHeight: 0 }}>
            {/* Left — main content */}
            <div className="md:col-span-2 p-5 space-y-5"
              style={{ borderRight: '1px solid rgba(var(--border))' }}>

              {editMode ? (
                <form onSubmit={handleSubmit(data => updateMutation.mutate(data))} className="space-y-4">
                  <div>
                    <label className="label">Title *</label>
                    <input className="input-field" {...register('title', { required: true })} />
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <textarea className="input-field" rows={4} {...register('description')} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Status</label>
                      <select className="input-field" {...register('status')}>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Priority</label>
                      <select className="input-field" {...register('priority')}>
                        {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Assign To</label>
                      <select className="input-field" {...register('assignedTo')}>
                        <option value="">Unassigned</option>
                        {users?.filter(u => u.status === 'active').map(u => (
                          <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">Due Date</label>
                      <input type="date" className="input-field" {...register('dueDate')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label">Est. Hours</label>
                      <input type="number" step="0.5" className="input-field" {...register('estimatedHours')} />
                    </div>
                    <div>
                      <label className="label">Actual Hours</label>
                      <input type="number" step="0.5" className="input-field" {...register('actualHours')} />
                    </div>
                  </div>
                  <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center">
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </form>
              ) : (
                <>
                  {task.description && (
                    <div>
                      <p className="label">Description</p>
                      <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed"
                        style={{ color: 'rgb(var(--text-secondary))' }}>
                        {task.description}
                      </p>
                    </div>
                  )}
                  {!task.description && (
                    <p className="text-sm italic" style={{ color: 'rgb(var(--text-muted))' }}>
                      No description provided
                    </p>
                  )}
                </>
              )}

              {/* Comments */}
              <div style={{ borderTop: '1px solid rgba(var(--border))', paddingTop: 20 }}>
                <p className="label mb-3">
                  Comments ({task.comments?.length || 0})
                </p>

                {task.comments?.length === 0 && (
                  <p className="text-sm italic mb-4" style={{ color: 'rgb(var(--text-muted))' }}>
                    No comments yet — be the first to comment
                  </p>
                )}

                <div className="space-y-3 mb-4">
                  {task.comments?.map(c => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(var(--accent),0.12)' }}>
                        <span className="text-xs font-bold" style={{ color: 'rgb(var(--accent-light))' }}>
                          {c.first_name?.[0]}{c.last_name?.[0]}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                            {c.first_name} {c.last_name}
                          </span>
                          <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                            {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                          </span>
                          {c.user_id === currentUser?.id && (
                            <button onClick={() => deleteCommentMutation.mutate(c.id)}
                              className="ml-auto btn-ghost p-0.5" style={{ color: 'rgb(var(--danger))' }}>
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
                          {c.comment}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add comment */}
                <form onSubmit={handleCommentSubmit} className="flex gap-2">
                  <input
                    ref={commentRef}
                    className="input-field flex-1"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommentSubmit(e) } }}
                  />
                  <button type="submit" disabled={!newComment.trim() || commentMutation.isPending}
                    className="btn-primary px-3">
                    <Send size={13} />
                  </button>
                </form>
              </div>
            </div>

            {/* Right sidebar — meta */}
            <div className="p-5 space-y-4">
              <div>
                <p className="label mb-2">Assigned To</p>
                {task.assignee_first ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: 'rgba(var(--accent),0.12)' }}>
                      <span className="text-xs font-bold" style={{ color: 'rgb(var(--accent-light))' }}>
                        {task.assignee_first[0]}{task.assignee_last?.[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                        {task.assignee_first} {task.assignee_last}
                      </p>
                      <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{task.assignee_email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>Unassigned</p>
                )}
              </div>

              {task.assigner_first && (
                <div>
                  <p className="label mb-2">Assigned By</p>
                  <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-secondary))' }}>
                    {task.assigner_first} {task.assigner_last}
                  </p>
                </div>
              )}

              <div>
                <p className="label mb-2">Due Date</p>
                {task.due_date
                  ? <DueBadge dueDate={task.due_date} status={task.status} />
                  : <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>No due date</p>
                }
              </div>

              {(task.estimated_hours || task.actual_hours) && (
                <div>
                  <p className="label mb-2">Hours</p>
                  <div className="flex gap-3 text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                    {task.estimated_hours && <span>Est: {task.estimated_hours}h</span>}
                    {task.actual_hours    && <span>Actual: {task.actual_hours}h</span>}
                  </div>
                </div>
              )}

              {task.completed_at && (
                <div>
                  <p className="label mb-1">Completed</p>
                  <p className="text-xs" style={{ color: '#22c55e' }}>
                    {format(new Date(task.completed_at), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
              )}

              {task.tags?.length > 0 && (
                <div>
                  <p className="label mb-2">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map(tag => (
                      <span key={tag} className="badge badge-neutral text-xs">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Create Task Modal ───────────────────────────────────────────── */
function CreateTaskModal({ users, onClose, onSaved }) {
  const { user } = useAuthStore()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { status: 'todo', priority: 'medium' }
  })

  const onSubmit = async (data) => {
    try {
      await tasksAPI.create({
        ...data,
        assignedTo:  data.assignedTo || null,
        dueDate:     data.dueDate || null,
        estimatedHours: data.estimatedHours || null,
        tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      })
      toast.success('Task created' + (data.assignedTo && data.assignedTo !== user?.id
        ? ' · Assignee has been notified 🔔' : ''))
      onSaved()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 560 }}>
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(var(--accent),0.12)', border: '1px solid rgba(var(--accent),0.2)' }}>
              <CheckSquare size={15} style={{ color: 'rgb(var(--accent-light))' }} />
            </div>
            <h2 className="section-title">New Task</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="label">Task Title *</label>
            <input className="input-field" placeholder="What needs to be done?"
              {...register('title', { required: 'Title is required' })} autoFocus />
            {errors.title && <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{errors.title.message}</p>}
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input-field" rows={3}
              placeholder="Add details, links, context..."
              {...register('description')} />
          </div>

          {/* Assign + priority row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Assign To</label>
              <select className="input-field" {...register('assignedTo')}>
                <option value="">Unassigned</option>
                <option value={user?.id}>Me</option>
                {users?.filter(u => u.status === 'active' && u.id !== user?.id).map(u => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input-field" {...register('priority')}>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.dot} {v.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date + estimated hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Due Date</label>
              <input type="date" className="input-field" {...register('dueDate')}
                min={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="label">Estimated Hours</label>
              <input type="number" step="0.5" min="0" className="input-field"
                placeholder="e.g. 2" {...register('estimatedHours')} />
            </div>
          </div>

          <div>
            <label className="label">Tags (comma separated)</label>
            <input className="input-field" placeholder="design, frontend, bug" {...register('tags')} />
          </div>

          {/* Notification hint */}
          <div className="flex items-center gap-2 p-3 rounded-xl"
            style={{ background: 'rgba(var(--accent),0.06)', border: '1px solid rgba(var(--accent),0.12)' }}>
            <Zap size={13} style={{ color: 'rgb(var(--accent-light))' }} />
            <p className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
              If you assign this to someone, they'll receive an in-app notification immediately.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function TasksPage() {
  const { user, hasPermission } = useAuthStore()
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate]     = useState(false)
  const [openTaskId, setOpenTaskId]     = useState(null)
  const [statusTask, setStatusTask]     = useState(null)
  const [deletingTask, setDeletingTask] = useState(null)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [myTasks, setMyTasks]           = useState(false)
  const [page, setPage]                 = useState(1)

  // Check URL param ?id=... on mount
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('id')) setOpenTaskId(p.get('id'))
  }, [])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['tasks', search, statusFilter, priorityFilter, myTasks, page],
    queryFn: () => tasksAPI.getAll({
      search, status: statusFilter, priority: priorityFilter,
      myTasks: myTasks ? 'true' : undefined, page, limit: 20
    }).then(r => r.data),
    keepPreviousData: true,
  })

  const { data: statsData } = useQuery({
    queryKey: ['task-stats'],
    queryFn: () => tasksAPI.getStats().then(r => r.data.data),
    refetchInterval: 30000,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users-active'],
    queryFn: () => usersAPI.getAll({ limit: 200, status: 'active' }).then(r => r.data.data),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => tasksAPI.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks'])
      queryClient.invalidateQueries(['task-stats'])
      queryClient.invalidateQueries(['task-detail'])
    },
    onError: () => toast.error('Failed to update status'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => tasksAPI.delete(id),
    onSuccess: () => {
      toast.success('Task deleted')
      queryClient.invalidateQueries(['tasks'])
      queryClient.invalidateQueries(['task-stats'])
      setDeletingTask(null)
    },
    onError: () => toast.error('Failed to delete task'),
  })

  const tasks      = data?.data || []
  const pagination = data?.pagination
  const stats      = statsData

  return (
    <div className="space-y-5">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Total',       value: stats.overall?.total,       color: 'rgb(var(--text-secondary))' },
            { label: 'To Do',       value: stats.overall?.todo,        color: STATUS_CONFIG.todo.color },
            { label: 'In Progress', value: stats.overall?.in_progress, color: STATUS_CONFIG.in_progress.color },
            { label: 'In Review',   value: stats.overall?.in_review,   color: STATUS_CONFIG.in_review.color },
            { label: 'Done',        value: stats.overall?.done,        color: STATUS_CONFIG.done.color },
            { label: 'Blocked',     value: stats.overall?.blocked,     color: STATUS_CONFIG.blocked.color },
            { label: '🔥 Urgent',   value: stats.overall?.urgent,      color: '#ef4444' },
          ].map(s => (
            <div key={s.label} className="stat-card text-center py-3">
              <p className="text-xl font-display font-bold" style={{ color: s.color }}>{s.value ?? 0}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* My tasks summary */}
      {stats && (stats.overdue > 0 || stats.dueSoon > 0) && (
        <div className="flex items-center gap-3 flex-wrap">
          {stats.overdue > 0 && (
            <button onClick={() => { setMyTasks(true); setStatusFilter('') }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444' }}>
              <AlertTriangle size={12} /> {stats.overdue} overdue task{stats.overdue !== 1 ? 's' : ''}
            </button>
          )}
          {stats.dueSoon > 0 && (
            <button onClick={() => setMyTasks(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#f59e0b' }}>
              <Clock size={12} /> {stats.dueSoon} due tomorrow
            </button>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'rgb(var(--text-muted))' }} />
          <input className="input-field pl-9" placeholder="Search tasks..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>

        <select className="input-field" style={{ width: 145 }}
          value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select className="input-field" style={{ width: 130 }}
          value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); setPage(1) }}>
          <option value="">All Priorities</option>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.dot} {v.label}</option>
          ))}
        </select>

        <button
          onClick={() => setMyTasks(v => !v)}
          className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
          style={{
            background: myTasks ? 'rgba(var(--accent),0.15)' : 'rgba(var(--bg-hover))',
            color: myTasks ? 'rgb(var(--accent-light))' : 'rgb(var(--text-secondary))',
            border: `1px solid ${myTasks ? 'rgba(var(--accent),0.3)' : 'rgba(var(--border))'}`,
          }}>
          <User size={12} className="inline mr-1" /> My Tasks
        </button>

        <button onClick={() => queryClient.invalidateQueries(['tasks'])} className="btn-secondary px-3">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>

        {hasPermission('tasks', 'create') && (
          <button className="btn-primary whitespace-nowrap" onClick={() => setShowCreate(true)}>
            <Plus size={14} /> New Task
          </button>
        )}
      </div>

      {/* Task grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse h-28" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="card p-16 text-center">
          <CheckSquare size={44} className="mx-auto mb-3" style={{ color: 'rgb(var(--text-muted))' }} />
          <p className="font-semibold mb-2" style={{ color: 'rgb(var(--text-primary))' }}>
            {myTasks || statusFilter || priorityFilter || search ? 'No tasks match your filters' : 'No tasks yet'}
          </p>
          <p className="text-sm mb-5" style={{ color: 'rgb(var(--text-muted))' }}>
            {myTasks || statusFilter || search ? 'Try clearing filters' : 'Create your first task and assign it to a team member'}
          </p>
          {hasPermission('tasks', 'create') && (
            <button className="btn-primary mx-auto" onClick={() => setShowCreate(true)}>
              <Plus size={14} /> Create Task
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onOpen={t => setOpenTaskId(t.id)}
              onStatusChange={t => setStatusTask(t)}
              onDelete={t => setDeletingTask(t)}
              canManage={hasPermission('tasks', 'delete')}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
            {pagination.total} tasks · Page {pagination.page}/{pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p-1)}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">← Prev</button>
            <button disabled={!pagination.hasNextPage} onClick={() => setPage(p => p+1)}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreate && (
        <CreateTaskModal
          users={usersData}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            queryClient.invalidateQueries(['tasks'])
            queryClient.invalidateQueries(['task-stats'])
            queryClient.invalidateQueries(['notifications'])
          }}
        />
      )}

      {openTaskId && (
        <TaskDetailModal
          taskId={openTaskId}
          users={usersData}
          onClose={() => setOpenTaskId(null)}
          onSaved={() => {
            queryClient.invalidateQueries(['tasks'])
            queryClient.invalidateQueries(['task-stats'])
            queryClient.invalidateQueries(['notifications'])
          }}
        />
      )}

      {statusTask && (
        <StatusCycleModal
          task={statusTask}
          onClose={() => setStatusTask(null)}
          onSelect={(id, status) => {
            statusMutation.mutate({ id, status })
            setStatusTask(null)
          }}
        />
      )}

      {deletingTask && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeletingTask(null)}>
          <div className="modal-content" style={{ maxWidth: 360 }}>
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: 'rgba(var(--danger),0.1)', border: '1px solid rgba(var(--danger),0.2)' }}>
                <Trash2 size={20} style={{ color: 'rgb(var(--danger))' }} />
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>Delete task?</p>
                <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
                  "{deletingTask.title}" and all its comments will be permanently deleted.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeletingTask(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => deleteMutation.mutate(deletingTask.id)}
                  disabled={deleteMutation.isPending} className="btn-danger flex-1 justify-center">
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
