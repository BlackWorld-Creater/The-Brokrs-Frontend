import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsAPI, companiesAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import useSyncStore from '../store/syncStore'
import toast from 'react-hot-toast'
import {
  Save, Settings, Globe, Shield, Users, RefreshCw,
  Check, Building2, ArrowRight, Info, Zap
} from 'lucide-react'

const GROUP_ICONS  = { general: Globe, security: Shield, hr: Users }
const GROUP_COLORS = { general: '#6366f1', security: '#ef4444', hr: '#22c55e', finance: '#f59e0b' }

/* Fields that can be auto-populated from the default company */
const COMPANY_SYNC_MAP = {
  company_name:  'name',
  company_email: 'email',
  company_phone: 'phone',
}

function SettingField({ settingKey, meta, value, onChange, canEdit, companyValue }) {
  const label = settingKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const isSynced = companyValue !== undefined && companyValue !== null
  const isDifferent = isSynced && String(companyValue) !== String(value || '')

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="label" style={{ marginBottom: 0 }}>{label}</label>
        {isSynced && (
          <div className="flex items-center gap-1.5">
            {isDifferent && (
              <span className="badge badge-warning" style={{ fontSize: 9 }}>
                ⚠ Out of sync
              </span>
            )}
            {!isDifferent && (
              <span className="badge badge-success" style={{ fontSize: 9 }}>
                ✓ Synced
              </span>
            )}
          </div>
        )}
      </div>

      {meta.type === 'boolean' ? (
        <div className="flex items-center justify-between p-3 rounded-xl"
          style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
          <p className="text-sm" style={{ color: 'rgb(var(--text-secondary))' }}>{label}</p>
          <button
            onClick={() => canEdit && onChange(settingKey, value === 'true' ? 'false' : 'true')}
            disabled={!canEdit}
            className="relative w-10 h-5 rounded-full transition-all duration-200"
            style={{
              background: value === 'true' ? 'rgb(var(--accent))' : 'rgba(var(--bg-hover))',
              border: '1px solid rgba(var(--border))',
            }}>
            <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
              style={{ left: value === 'true' ? '22px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type={meta.type === 'number' ? 'number' : 'text'}
            className="input-field"
            value={value ?? meta.value ?? ''}
            onChange={e => onChange(settingKey, e.target.value)}
            disabled={!canEdit}
            style={isDifferent ? { borderColor: 'rgba(234,179,8,0.4)' } : {}}
          />
          {isDifferent && canEdit && (
            <button
              onClick={() => onChange(settingKey, String(companyValue))}
              title={`Sync from Company Master: "${companyValue}"`}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs px-2 py-0.5 rounded-md transition-all"
              style={{ background: 'rgba(234,179,8,0.12)', color: '#f59e0b', border: '1px solid rgba(234,179,8,0.2)' }}>
              <ArrowRight size={9} /> Sync
            </button>
          )}
        </div>
      )}
      {meta.description && (
        <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))' }}>{meta.description}</p>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const { hasPermission } = useAuthStore()
  const { activeCompanyId } = useSyncStore()
  const queryClient = useQueryClient()
  const [localSettings, setLocalSettings] = useState({})
  const [activeGroup, setActiveGroup] = useState(null)
  const [saved, setSaved] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.getAll().then(r => r.data.data),
    onSuccess: (d) => {
      const flat = {}
      for (const [, vals] of Object.entries(d)) {
        for (const [key, meta] of Object.entries(vals)) {
          flat[key] = meta.value
        }
      }
      setLocalSettings(flat)
    },
  })

  /* Load default company to show sync status */
  const { data: defaultCompany } = useQuery({
    queryKey: ['default-company-settings', activeCompanyId],
    queryFn: () => activeCompanyId
      ? companiesAPI.getById(activeCompanyId).then(r => r.data.data)
      : companiesAPI.getAll({ limit: 1 }).then(r => {
          const d = r.data.data
          return d?.find(c => c.is_default) || d?.[0]
        }),
    staleTime: 60000,
  })

  const saveMutation = useMutation({
    mutationFn: () => settingsAPI.update({ settings: localSettings }),
    onSuccess: () => {
      toast.success('Settings saved')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      queryClient.invalidateQueries(['settings'])
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const handleChange = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
  }

  /* Sync all company fields at once */
  const syncAllFromCompany = async () => {
    if (!defaultCompany) return
    setSyncing(true)
    const updates = {}
    for (const [settingKey, companyField] of Object.entries(COMPANY_SYNC_MAP)) {
      const val = defaultCompany[companyField]
      if (val) updates[settingKey] = String(val)
    }
    setLocalSettings(prev => ({ ...prev, ...updates }))
    try {
      await settingsAPI.update({ settings: updates })
      toast.success(`Settings synced from "${defaultCompany.name}"`)
      queryClient.invalidateQueries(['settings'])
    } catch {
      toast.error('Sync failed')
    }
    setSyncing(false)
  }

  const canEdit = hasPermission('settings', 'manage')
  const groups = Object.keys(data || {})

  useEffect(() => {
    if (groups.length > 0 && !activeGroup) setActiveGroup(groups[0])
  }, [groups])

  const currentGroup = activeGroup || groups[0]
  const currentSettings = data?.[currentGroup] || {}

  /* Check if any settings are out of sync with company */
  const outOfSyncCount = defaultCompany
    ? Object.entries(COMPANY_SYNC_MAP).filter(([settingKey, companyField]) => {
        const settingVal = localSettings[settingKey] || ''
        const companyVal = String(defaultCompany[companyField] || '')
        return companyVal && settingVal !== companyVal
      }).length
    : 0

  if (isLoading) return (
    <div className="space-y-4 max-w-5xl">
      {[...Array(3)].map((_, i) => <div key={i} className="card h-32 animate-pulse" />)}
    </div>
  )

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Sync alert */}
      {outOfSyncCount > 0 && defaultCompany && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl animate-slide-up"
          style={{ background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.2)' }}>
          <Info size={15} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>
              {outOfSyncCount} setting{outOfSyncCount > 1 ? 's' : ''} out of sync with Company Master
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
              Company "{defaultCompany.name}" has updated values. Sync to keep settings consistent.
            </p>
          </div>
          {canEdit && (
            <button onClick={syncAllFromCompany} disabled={syncing}
              className="btn-secondary text-xs px-3 py-1.5 flex-shrink-0"
              style={{ color: '#f59e0b', borderColor: 'rgba(234,179,8,0.3)' }}>
              <Zap size={11} /> {syncing ? 'Syncing...' : 'Sync All'}
            </button>
          )}
        </div>
      )}

      <div className="flex gap-5">
        {/* Sidebar nav */}
        <div className="w-44 flex-shrink-0">
          <div className="card p-2 space-y-0.5 sticky top-4">
            {groups.map(group => {
              const Icon  = GROUP_ICONS[group] || Settings
              const color = GROUP_COLORS[group] || '#6366f1'
              const isActive = currentGroup === group
              return (
                <button key={group} onClick={() => setActiveGroup(group)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: isActive ? `${color}15` : 'transparent',
                    color: isActive ? color : 'rgb(var(--text-secondary))',
                    border: `1px solid ${isActive ? color + '30' : 'transparent'}`,
                  }}>
                  <Icon size={14} />
                  <span className="capitalize">{group.replace(/_/g,' ')}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="card">
            <div className="flex items-center justify-between p-5"
              style={{ borderBottom: '1px solid rgba(var(--border))' }}>
              <div>
                <h3 className="section-title capitalize">
                  {currentGroup?.replace(/_/g,' ')} Settings
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                  {Object.keys(currentSettings).length} settings
                  {currentGroup === 'general' && defaultCompany && (
                    <span className="ml-2" style={{ color: 'rgb(var(--accent-light))' }}>
                      · Linked to {defaultCompany.name}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => queryClient.invalidateQueries(['settings'])}
                  className="btn-ghost p-1.5">
                  <RefreshCw size={13} />
                </button>
                {canEdit && (
                  <button onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="btn-primary">
                    {saved
                      ? <span className="flex items-center gap-1.5"><Check size={13}/> Saved!</span>
                      : saveMutation.isPending ? 'Saving...'
                      : <span className="flex items-center gap-1.5"><Save size={13}/> Save</span>
                    }
                  </button>
                )}
              </div>
            </div>

            <div className="p-5">
              {/* Non-boolean fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {Object.entries(currentSettings)
                  .filter(([, meta]) => meta.type !== 'boolean')
                  .map(([key, meta]) => (
                    <SettingField
                      key={key}
                      settingKey={key}
                      meta={meta}
                      value={localSettings[key] ?? meta.value}
                      onChange={handleChange}
                      canEdit={canEdit}
                      companyValue={COMPANY_SYNC_MAP[key] ? defaultCompany?.[COMPANY_SYNC_MAP[key]] : undefined}
                    />
                  ))
                }
              </div>

              {/* Boolean toggles */}
              {Object.entries(currentSettings).some(([, m]) => m.type === 'boolean') && (
                <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(var(--border))' }}>
                  <p className="section-title mb-3">Toggles</p>
                  <div className="space-y-2">
                    {Object.entries(currentSettings)
                      .filter(([, m]) => m.type === 'boolean')
                      .map(([key, meta]) => (
                        <SettingField
                          key={key}
                          settingKey={key}
                          meta={meta}
                          value={localSettings[key] ?? meta.value}
                          onChange={handleChange}
                          canEdit={canEdit}
                        />
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Company link info */}
              {currentGroup === 'general' && defaultCompany && (
                <div className="mt-5 p-3 rounded-xl"
                  style={{ background: 'rgba(var(--accent),0.05)', border: '1px solid rgba(var(--accent),0.12)' }}>
                  <div className="flex items-center gap-2">
                    <Building2 size={13} style={{ color: 'rgb(var(--accent-light))' }} />
                    <p className="text-xs font-semibold" style={{ color: 'rgb(var(--accent-light))' }}>
                      Auto-synced from Company Master
                    </p>
                  </div>
                  <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
                    Company Name, Email, and Phone are automatically updated here when you edit the default company
                    ({defaultCompany.name}).
                  </p>
                </div>
              )}

              {!canEdit && (
                <div className="mt-4 p-3 rounded-xl"
                  style={{ background: 'rgba(var(--warning),0.06)', border: '1px solid rgba(var(--warning),0.15)' }}>
                  <p className="text-xs" style={{ color: 'rgb(var(--warning))' }}>
                    Read-only access. Contact a Super Admin to modify settings.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
