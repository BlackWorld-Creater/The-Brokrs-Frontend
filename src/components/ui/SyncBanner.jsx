/**
 * SyncBanner — shows a dismissable banner when cascading changes are propagated.
 * Place this inside any page that does updates to company/site/webservice.
 */
import { useState, useEffect } from 'react'
import { CheckCircle2, X, ArrowRight, Info } from 'lucide-react'
import useSyncStore from '../../store/syncStore'

export default function SyncBanner() {
  const { syncNotifications, clearSyncNotifications } = useSyncStore()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (syncNotifications.length > 0) {
      setVisible(true)
      const t = setTimeout(() => setVisible(false), 8000)
      return () => clearTimeout(t)
    }
  }, [syncNotifications])

  if (!visible || syncNotifications.length === 0) return null

  const latest = syncNotifications[0]

  return (
    <div className="animate-slide-up flex items-start gap-3 p-3.5 rounded-xl mb-4"
      style={{
        background: 'rgba(34,197,94,0.08)',
        border: '1px solid rgba(34,197,94,0.2)',
      }}>
      <CheckCircle2 size={16} style={{ color: '#22c55e', flexShrink: 0, marginTop: 1 }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: '#22c55e' }}>
          Changes propagated successfully
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-secondary))' }}>
          <span className="font-medium">{latest.entityName}</span>
          <ArrowRight size={10} className="inline mx-1" />
          {latest.message}
        </p>
      </div>
      <button onClick={() => { setVisible(false); clearSyncNotifications() }}
        className="btn-ghost p-1 flex-shrink-0">
        <X size={13} />
      </button>
    </div>
  )
}
