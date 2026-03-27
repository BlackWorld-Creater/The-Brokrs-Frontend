import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { auditAPI } from '../services/api'
import { format, formatDistanceToNow } from 'date-fns'
import {
  FileText, RefreshCw, Globe, Eye, X,
  ArrowRight, Plus, Minus, Edit3, Clock,
  User, ChevronDown, ChevronRight, Shield,
  AlertTriangle, LogIn, LogOut, Upload, Download
} from 'lucide-react'

/* ─── Constants ─────────────────────────────────────────────────── */
const ACTION_CONFIG = {
  CREATE:        { badge: 'badge-success', icon: Plus,          color: '#22c55e', label: 'Created'      },
  UPDATE:        { badge: 'badge-info',    icon: Edit3,          color: '#6366f1', label: 'Updated'      },
  DELETE:        { badge: 'badge-danger',  icon: Minus,          color: '#ef4444', label: 'Deleted'      },
  LOGIN:         { badge: 'badge-accent',  icon: LogIn,          color: '#06b6d4', label: 'Login'        },
  LOGOUT:        { badge: 'badge-neutral', icon: LogOut,         color: '#94a3b8', label: 'Logout'       },
  EXPORT:        { badge: 'badge-warning', icon: Upload,         color: '#f59e0b', label: 'Exported'     },
  IMPORT:        { badge: 'badge-warning', icon: Download,       color: '#f59e0b', label: 'Imported'     },
  ACCESS_DENIED: { badge: 'badge-danger',  icon: Shield,         color: '#ef4444', label: 'Access Denied'},
}

/* ─── Helpers ────────────────────────────────────────────────────── */
const parseJSON = (val) => {
  if (!val) return null
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return null }
}

const formatFieldName = (key) =>
  key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

const formatValue = (val) => {
  if (val === null || val === undefined) return <em style={{ color: 'rgb(var(--text-muted))' }}>null</em>
  if (typeof val === 'boolean') return (
    <span style={{ color: val ? 'rgb(var(--success))' : 'rgb(var(--danger))' }}>
      {val ? 'true' : 'false'}
    </span>
  )
  if (typeof val === 'object') return (
    <code className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
      {JSON.stringify(val)}
    </code>
  )
  const str = String(val)
  // Detect timestamps
  if (/^\d{4}-\d{2}-\d{2}T/.test(str)) {
    try { return <span>{format(new Date(str), 'MMM d, yyyy HH:mm:ss')}</span> }
    catch { return str }
  }
  return str
}

const SENSITIVE_FIELDS = new Set(['password','password_hash','token','secret','refresh_token_hash','two_factor_secret'])

const isSensitive = (key) => SENSITIVE_FIELDS.has(key.toLowerCase())

/* ─── Diff Engine ────────────────────────────────────────────────── */
const computeDiff = (oldObj, newObj) => {
  const allKeys = new Set([
    ...Object.keys(oldObj || {}),
    ...Object.keys(newObj || {}),
  ])

  const changes = []
  for (const key of allKeys) {
    if (isSensitive(key)) {
      changes.push({ key, type: 'redacted', old: '***', new: '***' })
      continue
    }
    const oldVal = oldObj?.[key]
    const newVal = newObj?.[key]
    const oldStr = JSON.stringify(oldVal)
    const newStr = JSON.stringify(newVal)

    if (oldStr === newStr) {
      changes.push({ key, type: 'unchanged', old: oldVal, new: newVal })
    } else if (oldVal === undefined || oldVal === null) {
      changes.push({ key, type: 'added', old: null, new: newVal })
    } else if (newVal === undefined || newVal === null) {
      changes.push({ key, type: 'removed', old: oldVal, new: null })
    } else {
      changes.push({ key, type: 'changed', old: oldVal, new: newVal })
    }
  }
  return changes
}

/* ─── Diff Row ───────────────────────────────────────────────────── */
function DiffRow({ change }) {
  const [expanded, setExpanded] = useState(false)

  const colors = {
    added:     { bg: 'rgba(34,197,94,0.06)',  border: 'rgba(34,197,94,0.2)',   dot: '#22c55e' },
    removed:   { bg: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.2)',   dot: '#ef4444' },
    changed:   { bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.2)', dot: '#6366f1' },
    unchanged: { bg: 'transparent',           border: 'rgba(var(--border))',   dot: 'rgba(var(--text-muted))' },
    redacted:  { bg: 'rgba(234,179,8,0.04)',  border: 'rgba(234,179,8,0.15)',  dot: '#f59e0b' },
  }
  const c = colors[change.type] || colors.unchanged
  const isLong = String(change.old || '').length > 60 || String(change.new || '').length > 60
  const isComplex = typeof change.old === 'object' || typeof change.new === 'object'

  if (change.type === 'unchanged') return null

  return (
    <div className="rounded-xl overflow-hidden transition-all"
      style={{ background: c.bg, border: `1px solid ${c.border}`, marginBottom: 6 }}>
      <div className="flex items-start gap-3 px-3 py-2.5">
        {/* Dot */}
        <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: c.dot }} />

        {/* Field name */}
        <div className="w-36 flex-shrink-0">
          <span className="text-xs font-semibold font-mono" style={{ color: 'rgb(var(--text-secondary))' }}>
            {formatFieldName(change.key)}
          </span>
          {change.type === 'redacted' && (
            <span className="ml-1 badge badge-warning" style={{ fontSize: 9 }}>hidden</span>
          )}
        </div>

        {/* Values */}
        {change.type === 'redacted' ? (
          <span className="text-xs italic" style={{ color: 'rgb(var(--text-muted))' }}>
            Sensitive field — value hidden for security
          </span>
        ) : change.type === 'added' ? (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="badge badge-success" style={{ fontSize: 10 }}>+ added</span>
            </div>
            <div className="mt-1 text-xs font-mono break-all"
              style={{ color: '#22c55e' }}>
              {isComplex
                ? <pre className="whitespace-pre-wrap text-xs mt-1 p-2 rounded-lg"
                    style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', maxHeight: 120, overflow: 'auto' }}>
                    {JSON.stringify(change.new, null, 2)}
                  </pre>
                : formatValue(change.new)
              }
            </div>
          </div>
        ) : change.type === 'removed' ? (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="badge badge-danger" style={{ fontSize: 10 }}>− removed</span>
            </div>
            <div className="mt-1 text-xs font-mono break-all line-through"
              style={{ color: '#ef4444', opacity: 0.7 }}>
              {formatValue(change.old)}
            </div>
          </div>
        ) : (
          /* CHANGED — show old → new */
          <div className="flex-1 min-w-0">
            {isComplex || isLong ? (
              <>
                <button onClick={() => setExpanded(v => !v)}
                  className="flex items-center gap-1 text-xs mb-2"
                  style={{ color: 'rgb(var(--accent-light))' }}>
                  {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                  {expanded ? 'Collapse' : 'Show full diff'}
                </button>
                {expanded ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#ef4444' }}>Before</p>
                      <pre className="text-xs p-2 rounded-lg whitespace-pre-wrap break-all"
                        style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                                 maxHeight: 140, overflow: 'auto', border: '1px solid rgba(239,68,68,0.2)' }}>
                        {typeof change.old === 'object'
                          ? JSON.stringify(change.old, null, 2)
                          : String(change.old ?? '')
                        }
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-semibold mb-1" style={{ color: '#22c55e' }}>After</p>
                      <pre className="text-xs p-2 rounded-lg whitespace-pre-wrap break-all"
                        style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e',
                                 maxHeight: 140, overflow: 'auto', border: '1px solid rgba(34,197,94,0.2)' }}>
                        {typeof change.new === 'object'
                          ? JSON.stringify(change.new, null, 2)
                          : String(change.new ?? '')
                        }
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono truncate max-w-[180px]"
                      style={{ color: '#ef4444', textDecoration: 'line-through', opacity: 0.7 }}>
                      {String(change.old)}
                    </span>
                    <ArrowRight size={12} style={{ color: 'rgb(var(--text-muted))', flexShrink: 0 }} />
                    <span className="text-xs font-mono truncate max-w-[180px]"
                      style={{ color: '#22c55e' }}>
                      {String(change.new)}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono break-all"
                  style={{ color: '#ef4444', textDecoration: 'line-through', opacity: 0.75 }}>
                  {formatValue(change.old)}
                </span>
                <ArrowRight size={11} style={{ color: 'rgb(var(--text-muted))', flexShrink: 0 }} />
                <span className="text-xs font-mono break-all" style={{ color: '#22c55e' }}>
                  {formatValue(change.new)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Diff Section (old/new side‑by‑side for CREATE/DELETE) ──────── */
function CreateDeleteView({ action, data }) {
  if (!data) return null
  const obj = parseJSON(data)
  if (!obj) return null
  const isCreate = action === 'CREATE'

  return (
    <div className="rounded-xl overflow-hidden"
      style={{
        background: isCreate ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
        border: `1px solid ${isCreate ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
      }}>
      <div className="px-3 py-2 flex items-center gap-2"
        style={{ borderBottom: `1px solid ${isCreate ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}` }}>
        {isCreate
          ? <span className="text-xs font-semibold" style={{ color: '#22c55e' }}>✚ Fields Created</span>
          : <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>✕ Fields Deleted</span>
        }
      </div>
      <div className="p-3 space-y-1.5">
        {Object.entries(obj).map(([key, val]) => (
          isSensitive(key) ? (
            <div key={key} className="flex items-center gap-3 py-1">
              <span className="text-xs font-mono w-36 flex-shrink-0" style={{ color: 'rgb(var(--text-muted))' }}>
                {formatFieldName(key)}
              </span>
              <span className="badge badge-warning" style={{ fontSize: 9 }}>hidden</span>
            </div>
          ) : (
            <div key={key} className="flex items-start gap-3 py-1"
              style={{ borderBottom: '1px solid rgba(var(--border))' }}>
              <span className="text-xs font-mono w-36 flex-shrink-0 font-semibold"
                style={{ color: 'rgb(var(--text-secondary))' }}>
                {formatFieldName(key)}
              </span>
              <span className="text-xs break-all flex-1"
                style={{ color: isCreate ? '#22c55e' : '#ef4444' }}>
                {formatValue(val)}
              </span>
            </div>
          )
        ))}
      </div>
    </div>
  )
}

/* ─── Main Log Detail Modal ──────────────────────────────────────── */
function LogDetailModal({ log, onClose }) {
  const [activeTab, setActiveTab] = useState('diff')
  const { icon: ActionIcon, color: actionColor, label: actionLabel } =
    ACTION_CONFIG[log.action] || { icon: FileText, color: '#6366f1', label: log.action }

  const oldData  = parseJSON(log.old_values)
  const newData  = parseJSON(log.new_values)
  const metaData = parseJSON(log.metadata)

  const hasDiff     = oldData && newData
  const hasCreate   = log.action === 'CREATE' && newData
  const hasDelete   = log.action === 'DELETE' && oldData
  const hasMeta     = !!metaData
  const hasChanges  = hasDiff || hasCreate || hasDelete

  const diffChanges = hasDiff ? computeDiff(oldData, newData) : []
  const changedCount = diffChanges.filter(c => c.type !== 'unchanged').length
  const unchangedCount = diffChanges.filter(c => c.type === 'unchanged').length

  const tabs = [
    { id: 'diff',    label: hasCreate || hasDelete ? 'Data' : `Changes${changedCount > 0 ? ` (${changedCount})` : ''}` },
    { id: 'raw',     label: 'Raw JSON' },
    ...(hasMeta ? [{ id: 'meta', label: 'Metadata' }] : []),
  ]

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content animate-slide-up" style={{ maxWidth: 680 }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="p-5 flex items-start justify-between gap-4"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${actionColor}18`, border: `1px solid ${actionColor}30` }}>
              <ActionIcon size={17} style={{ color: actionColor }} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display font-bold text-base"
                  style={{ color: 'rgb(var(--text-primary))' }}>
                  {actionLabel}
                </span>
                {log.entity_type && (
                  <span className="badge badge-neutral capitalize">{log.entity_type}</span>
                )}
                {changedCount > 0 && (
                  <span className="badge badge-info" style={{ fontSize: 10 }}>
                    {changedCount} field{changedCount !== 1 ? 's' : ''} changed
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5 font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
                {format(new Date(log.created_at), 'EEEE, MMM d yyyy · HH:mm:ss')}
                <span className="ml-2">
                  ({formatDistanceToNow(new Date(log.created_at), { addSuffix: true })})
                </span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* ── Who + Where ────────────────────────────────────── */}
        <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-3 gap-3"
          style={{ borderBottom: '1px solid rgba(var(--border))', background: 'rgba(var(--bg-hover), 0.3)' }}>
          {/* Actor */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'rgb(var(--text-muted))' }}>Performed By</p>
            {log.first_name ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(var(--accent), 0.15)' }}>
                  <span className="text-xs font-bold" style={{ color: 'rgb(var(--accent-light))' }}>
                    {log.first_name[0]}{log.last_name?.[0]}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                    {log.first_name} {log.last_name}
                  </p>
                  <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{log.email}</p>
                </div>
              </div>
            ) : (
              <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>System</span>
            )}
          </div>

          {/* IP */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1"
              style={{ color: 'rgb(var(--text-muted))' }}>IP Address</p>
            {log.ip_address
              ? <span className="ip-chip"><Globe size={9} />{log.ip_address}</span>
              : <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>—</span>
            }
          </div>

          {/* Entity ID */}
          {log.entity_id && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: 'rgb(var(--text-muted))' }}>Entity ID</p>
              <span className="text-xs font-mono" style={{ color: 'rgb(var(--text-secondary))' }}>
                {String(log.entity_id).substring(0, 8)}...
              </span>
            </div>
          )}
        </div>

        {/* ── Tabs ───────────────────────────────────────────── */}
        {hasChanges && (
          <div className="flex gap-1 px-5 pt-4">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: activeTab === t.id ? 'rgba(var(--accent), 0.15)' : 'transparent',
                  color: activeTab === t.id ? 'rgb(var(--accent-light))' : 'rgb(var(--text-muted))',
                  border: activeTab === t.id ? '1px solid rgba(var(--accent), 0.25)' : '1px solid transparent',
                }}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Content ────────────────────────────────────────── */}
        <div className="p-5 overflow-y-auto" style={{ maxHeight: '52vh' }}>

          {/* DIFF TAB — the star of the show */}
          {(!hasChanges || activeTab === 'diff') && (
            <>
              {/* UPDATE: field-by-field diff */}
              {hasDiff && (
                <div>
                  {changedCount === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                        style={{ background: 'rgba(var(--success), 0.1)' }}>
                        <span style={{ fontSize: 22 }}>✓</span>
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                        No visible field changes
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
                        Values may be identical or contain only internal changes
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Legend */}
                      <div className="flex items-center gap-4 mb-4 flex-wrap">
                        {[
                          { type: 'changed', color: '#6366f1', label: 'Changed' },
                          { type: 'added',   color: '#22c55e', label: 'Added'   },
                          { type: 'removed', color: '#ef4444', label: 'Removed' },
                        ].map(l => (
                          <div key={l.type} className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                            <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{l.label}</span>
                          </div>
                        ))}
                        {unchangedCount > 0 && (
                          <span className="text-xs ml-auto" style={{ color: 'rgb(var(--text-muted))' }}>
                            {unchangedCount} unchanged field{unchangedCount !== 1 ? 's' : ''} hidden
                          </span>
                        )}
                      </div>

                      {/* Diff rows */}
                      {diffChanges.map(change => (
                        <DiffRow key={change.key} change={change} />
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* CREATE: show new data */}
              {hasCreate && <CreateDeleteView action="CREATE" data={log.new_values} />}

              {/* DELETE: show old data */}
              {hasDelete && <CreateDeleteView action="DELETE" data={log.old_values} />}

              {/* LOGIN / LOGOUT / other: show metadata */}
              {!hasChanges && (
                <div className="text-center py-10 space-y-2">
                  <ActionIcon size={36} className="mx-auto" style={{ color: 'rgb(var(--text-muted))' }} />
                  <p className="text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>
                    {actionLabel} event recorded
                  </p>
                  {metaData && (
                    <div className="mt-4 text-left">
                      <p className="label mb-2">Event Details</p>
                      <div className="space-y-2">
                        {Object.entries(metaData).map(([k, v]) => (
                          <div key={k} className="flex items-center justify-between py-1.5 px-3 rounded-lg"
                            style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                            <span className="text-xs font-semibold" style={{ color: 'rgb(var(--text-muted))' }}>
                              {formatFieldName(k)}
                            </span>
                            <span className="text-xs font-mono" style={{ color: 'rgb(var(--text-primary))' }}>
                              {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* RAW JSON TAB */}
          {activeTab === 'raw' && (
            <div className="space-y-4">
              {log.old_values && (
                <div>
                  <p className="label mb-2" style={{ color: '#ef4444' }}>Old Values (Before)</p>
                  <pre className="text-xs p-3 rounded-xl overflow-auto"
                    style={{
                      background: 'rgba(239,68,68,0.05)', color: 'rgb(var(--text-secondary))',
                      border: '1px solid rgba(239,68,68,0.15)', maxHeight: 200,
                      fontFamily: '"JetBrains Mono", monospace',
                    }}>
                    {JSON.stringify(parseJSON(log.old_values), null, 2)}
                  </pre>
                </div>
              )}
              {log.new_values && (
                <div>
                  <p className="label mb-2" style={{ color: '#22c55e' }}>New Values (After)</p>
                  <pre className="text-xs p-3 rounded-xl overflow-auto"
                    style={{
                      background: 'rgba(34,197,94,0.05)', color: 'rgb(var(--text-secondary))',
                      border: '1px solid rgba(34,197,94,0.15)', maxHeight: 200,
                      fontFamily: '"JetBrains Mono", monospace',
                    }}>
                    {JSON.stringify(parseJSON(log.new_values), null, 2)}
                  </pre>
                </div>
              )}
              {!log.old_values && !log.new_values && (
                <p className="text-sm text-center py-6" style={{ color: 'rgb(var(--text-muted))' }}>
                  No raw data stored for this event
                </p>
              )}
            </div>
          )}

          {/* METADATA TAB */}
          {activeTab === 'meta' && metaData && (
            <div>
              <p className="label mb-3">Event Metadata</p>
              <div className="space-y-2">
                {Object.entries(metaData).map(([k, v]) => (
                  <div key={k} className="flex items-start gap-4 p-3 rounded-xl"
                    style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                    <span className="text-xs font-semibold w-32 flex-shrink-0"
                      style={{ color: 'rgb(var(--text-muted))' }}>
                      {formatFieldName(k)}
                    </span>
                    <span className="text-xs font-mono break-all"
                      style={{ color: 'rgb(var(--text-primary))' }}>
                      {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        {log.user_agent && (
          <div className="px-5 py-2.5 flex items-center gap-2"
            style={{ borderTop: '1px solid rgba(var(--border))', background: 'rgba(var(--bg-hover), 0.3)' }}>
            <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>User Agent:</span>
            <span className="text-xs font-mono truncate" style={{ color: 'rgb(var(--text-muted))' }}>
              {log.user_agent}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function AuditLogsPage() {
  const queryClient = useQueryClient()
  const [page, setPage]               = useState(1)
  const [action, setAction]           = useState('')
  const [entityType, setEntityType]   = useState('')
  const [from, setFrom]               = useState('')
  const [to, setTo]                   = useState('')
  const [selectedLog, setSelectedLog] = useState(null)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-logs', page, action, entityType, from, to],
    queryFn: () => auditAPI.getLogs({
      page, limit: 20, action, entityType,
      from: from || undefined, to: to || undefined,
    }).then(r => r.data),
    keepPreviousData: true,
  })

  return (
    <div className="space-y-5">
      {/* ── Filters ──────────────────────────────────────────── */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="label">Action</label>
            <select className="input-field" style={{ width: 160 }}
              value={action} onChange={e => { setAction(e.target.value); setPage(1) }}>
              <option value="">All Actions</option>
              {['CREATE','UPDATE','DELETE','LOGIN','LOGOUT','EXPORT','IMPORT','ACCESS_DENIED'].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Entity</label>
            <select className="input-field" style={{ width: 160 }}
              value={entityType} onChange={e => { setEntityType(e.target.value); setPage(1) }}>
              <option value="">All Entities</option>
              {['user','role','department','module','vertical','blocked_ip','user_permissions'].map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">From</label>
            <input type="datetime-local" className="input-field" style={{ width: 190 }}
              value={from} onChange={e => { setFrom(e.target.value); setPage(1) }} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="datetime-local" className="input-field" style={{ width: 190 }}
              value={to} onChange={e => { setTo(e.target.value); setPage(1) }} />
          </div>
          <div className="flex gap-2 pb-0.5">
            {(action || entityType || from || to) && (
              <button onClick={() => { setAction(''); setEntityType(''); setFrom(''); setTo(''); setPage(1) }}
                className="btn-secondary text-xs px-3 py-2">
                Clear
              </button>
            )}
            <button onClick={() => queryClient.invalidateQueries(['audit-logs'])}
              className="btn-secondary px-3 py-2">
              <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Hint banner ──────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-1">
        <Eye size={13} style={{ color: 'rgb(var(--accent-light))' }} />
        <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
          Click any row to see a detailed diff of what changed — old values vs new values
        </p>
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div className="flex items-center gap-3">
            <FileText size={15} style={{ color: 'rgb(var(--accent-light))' }} />
            <h3 className="section-title">Activity Log</h3>
          </div>
          {data?.pagination && (
            <span className="badge badge-neutral">{data.pagination.total} entries</span>
          )}
        </div>

        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>IP Address</th>
                <th>Has Diff</th>
                <th>When</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>{[...Array(7)].map((_, j) => (
                    <td key={j}>
                      <div className="h-4 rounded animate-pulse"
                        style={{ background: 'rgba(var(--bg-hover))' }} />
                    </td>
                  ))}</tr>
                ))
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14">
                    <FileText size={36} className="mx-auto mb-2" style={{ color: 'rgb(var(--text-muted))' }} />
                    <p style={{ color: 'rgb(var(--text-muted))' }}>No audit logs found</p>
                  </td>
                </tr>
              ) : data?.data?.map(log => {
                const cfg = ACTION_CONFIG[log.action] || { badge: 'badge-neutral', color: '#6366f1', label: log.action }
                const hasDiffData = log.old_values || log.new_values || log.metadata
                return (
                  <tr key={log.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                    style={{ transition: 'background 0.1s' }}>

                    {/* User */}
                    <td>
                      {log.first_name ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: 'rgba(var(--accent), 0.12)' }}>
                            <span className="text-xs font-bold"
                              style={{ color: 'rgb(var(--accent-light))' }}>
                              {log.first_name[0]}{log.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-xs font-medium"
                              style={{ color: 'rgb(var(--text-primary))' }}>
                              {log.first_name} {log.last_name}
                            </p>
                            <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                              {log.email}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>System</span>
                      )}
                    </td>

                    {/* Action */}
                    <td>
                      <span className={`badge ${cfg.badge}`}
                        style={{ borderColor: `${cfg.color}30` }}>
                        {log.action}
                      </span>
                    </td>

                    {/* Entity */}
                    <td>
                      {log.entity_type && (
                        <span className="badge badge-neutral capitalize">
                          {log.entity_type}
                        </span>
                      )}
                    </td>

                    {/* IP */}
                    <td>
                      {log.ip_address
                        ? <span className="ip-chip"><Globe size={9} />{log.ip_address}</span>
                        : <span style={{ color: 'rgb(var(--text-muted))' }}>—</span>
                      }
                    </td>

                    {/* Has diff */}
                    <td>
                      {hasDiffData ? (
                        <span className="badge badge-accent" style={{ fontSize: 10 }}>
                          <Eye size={9} /> View diff
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>—</span>
                      )}
                    </td>

                    {/* When */}
                    <td>
                      <div>
                        <p className="font-mono text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                          {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                        </p>
                        <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </td>

                    {/* View button */}
                    <td onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="btn-ghost p-1.5">
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.pagination && (
          <div className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid rgba(var(--border))' }}>
            <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
              Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} entries
            </p>
            <div className="flex gap-1.5 items-center">
              <button disabled={!data.pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">
                ← Prev
              </button>
              {[...Array(Math.min(5, data.pagination.totalPages))].map((_, i) => {
                const p = Math.max(1, data.pagination.page - 2) + i
                if (p > data.pagination.totalPages) return null
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className="w-8 h-8 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: data.pagination.page === p ? 'rgba(var(--accent), 0.15)' : 'rgba(var(--bg-hover))',
                      color: data.pagination.page === p ? 'rgb(var(--accent-light))' : 'rgb(var(--text-secondary))',
                      border: `1px solid ${data.pagination.page === p ? 'rgba(var(--accent), 0.3)' : 'rgba(var(--border))'}`,
                    }}>
                    {p}
                  </button>
                )
              })}
              <button disabled={!data.pagination.hasNextPage} onClick={() => setPage(p => p + 1)}
                className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedLog && (
        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  )
}
