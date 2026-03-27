/**
 * ChangeHistoryDrawer — shows the change log for a company/site/web-service.
 * Shows who changed what field from old → new value.
 */
import { useQuery } from '@tanstack/react-query'
import { X, Clock, ArrowRight, User } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'

export default function ChangeHistoryDrawer({ entityType, entityId, entityName, fetchFn, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['change-history', entityType, entityId],
    queryFn: fetchFn,
    enabled: !!entityId,
  })

  const history = data?.data?.data || data?.data || []

  const formatValue = (val) => {
    if (val === null || val === undefined) return <em style={{ color: 'rgb(var(--text-muted))' }}>empty</em>
    if (typeof val === 'boolean') return val ? 'true' : 'false'
    const s = String(val)
    if (s.length > 40) return s.substring(0, 40) + '…'
    return s
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 620 }}>
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div>
            <h2 className="section-title">Change History</h2>
            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
              {entityName} · All recorded modifications
            </p>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>

        <div className="p-5 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl animate-pulse"
                  style={{ background: 'rgba(var(--bg-hover))' }} />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={36} className="mx-auto mb-2" style={{ color: 'rgb(var(--text-muted))' }} />
              <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>No changes recorded yet</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-3 bottom-3 w-px"
                style={{ background: 'rgba(var(--border))' }} />

              <div className="space-y-4">
                {history.map((event, i) => {
                  const changedFields = event.changed_fields || {}
                  const fieldCount = Object.keys(changedFields).length

                  return (
                    <div key={event.id || i} className="flex gap-4">
                      {/* Timeline dot */}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                        style={{ background: 'rgba(var(--accent),0.15)', border: '2px solid rgb(var(--bg-card))' }}>
                        <div className="w-2.5 h-2.5 rounded-full"
                          style={{ background: 'rgb(var(--accent))' }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            {/* Who */}
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded flex items-center justify-center"
                                style={{ background: 'rgba(var(--accent),0.1)' }}>
                                <span className="text-xs font-bold"
                                  style={{ color: 'rgb(var(--accent-light))', fontSize: 9 }}>
                                  {event.first_name?.[0]}{event.last_name?.[0]}
                                </span>
                              </div>
                              <span className="text-xs font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>
                                {event.first_name ? `${event.first_name} ${event.last_name}` : 'System'}
                              </span>
                              <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                                changed {fieldCount} field{fieldCount !== 1 ? 's' : ''}
                              </span>
                            </div>
                            {/* When */}
                            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })} ·{' '}
                              {format(new Date(event.created_at), 'MMM d, yyyy HH:mm')}
                            </p>
                          </div>
                        </div>

                        {/* Field diffs */}
                        {fieldCount > 0 && (
                          <div className="space-y-1.5">
                            {Object.entries(changedFields).map(([field, change]) => (
                              <div key={field} className="flex items-center gap-2 p-2 rounded-lg flex-wrap"
                                style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                                <span className="text-xs font-semibold w-28 flex-shrink-0 truncate"
                                  style={{ color: 'rgb(var(--text-muted))' }}>
                                  {field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                </span>
                                <span className="text-xs font-mono line-through"
                                  style={{ color: '#ef4444', opacity: 0.75, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {formatValue(change.from)}
                                </span>
                                <ArrowRight size={10} style={{ color: 'rgb(var(--text-muted))', flexShrink: 0 }} />
                                <span className="text-xs font-mono"
                                  style={{ color: '#22c55e', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {formatValue(change.to)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
