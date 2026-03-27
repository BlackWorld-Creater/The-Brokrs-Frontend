import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import SyncBanner from '../components/ui/SyncBanner'
import ChangeHistoryDrawer from '../components/ui/ChangeHistoryDrawer'
import useSyncStore from '../store/syncStore'
import { changeHistoryAPI } from '../services/api'
import { webServicesAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import {
  Globe2, Plus, Edit, Trash2, X, Key, Activity, Eye,
  Search, RefreshCw, Check, Play, AlertTriangle, Shield,
  Code, Copy, ExternalLink, Zap, Clock, BarChart2, History
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { format, formatDistanceToNow } from 'date-fns'

const STATUS_CFG = {
  active:      { badge: 'badge-success', dot: '#22c55e' },
  inactive:    { badge: 'badge-neutral', dot: '#94a3b8' },
  maintenance: { badge: 'badge-warning', dot: '#f59e0b' },
  down:        { badge: 'badge-danger',  dot: '#ef4444' },
  degraded:    { badge: 'badge-warning', dot: '#f97316' },
}
const ENV_BADGE = {
  production: 'badge-danger', staging: 'badge-warning',
  development: 'badge-info',  testing: 'badge-neutral',
}
const HTTP_METHODS = ['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS']
const AUTH_TYPES   = ['api_key','oauth2','basic','bearer','none']

/* ─── Service Form ───────────────────────────────────────────────── */
function ServiceModal({ service, onClose, onSaved }, onSyncResult ) {
  const isEdit = !!service
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: service ? {
      name: service.name, description: service.description,
      baseUrl: service.base_url, version: service.version,
      authType: service.auth_type, status: service.status,
      environment: service.environment, timeoutMs: service.timeout_ms,
      retryCount: service.retry_count, rateLimit: service.rate_limit,
      isActive: service.is_active,
    } : {
      version: 'v1', authType: 'api_key', status: 'active',
      environment: 'production', timeoutMs: 30000, retryCount: 3,
      rateLimit: 100, isActive: true,
    }
  })

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        const res = await webServicesAPI.update(service.id, data)
        onSyncResult?.('web-service', data.name, res.data?.data?.syncSummary)
      }
      else        await webServicesAPI.create(data)
      toast.success(isEdit ? 'Service updated' : 'Service created')
      onSaved(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 580 }}>
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(var(--info),0.1)', border: '1px solid rgba(var(--info),0.2)' }}>
              <Globe2 size={15} style={{ color: 'rgb(var(--info))' }} />
            </div>
            <h2 className="section-title">{isEdit ? `Edit: ${service.name}` : 'New Web Service'}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: '70vh' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input className="input-field" placeholder="Payment Gateway"
                {...register('name', { required: 'Required' })} />
              {errors.name && <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{errors.name.message}</p>}
            </div>
            <div>
              <label className="label">Version</label>
              <input className="input-field font-mono" placeholder="v1" {...register('version')} />
            </div>
          </div>
          <div>
            <label className="label">Base URL *</label>
            <input className="input-field font-mono" placeholder="https://api.example.com/v1"
              {...register('baseUrl', { required: 'Base URL is required' })} />
            {errors.baseUrl && <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{errors.baseUrl.message}</p>}
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input-field" rows={2} {...register('description')} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Auth Type</label>
              <select className="input-field" {...register('authType')}>
                {AUTH_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Environment</label>
              <select className="input-field" {...register('environment')}>
                {['production','staging','development','testing'].map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input-field" {...register('status')}>
                {['active','inactive','maintenance'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Timeout (ms)</label>
              <input type="number" className="input-field" {...register('timeoutMs')} />
            </div>
            <div>
              <label className="label">Retry Count</label>
              <input type="number" min={0} max={10} className="input-field" {...register('retryCount')} />
            </div>
            <div>
              <label className="label">Rate Limit/min</label>
              <input type="number" className="input-field" {...register('rateLimit')} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
              {isSubmitting ? 'Saving...' : isEdit ? 'Update Service' : 'Create Service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Endpoint Form ──────────────────────────────────────────────── */
function EndpointModal({ serviceId, endpoint, onClose, onSaved }) {
  const isEdit = !!endpoint
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: endpoint ? {
      name: endpoint.name, method: endpoint.method, path: endpoint.path,
      description: endpoint.description, authRequired: endpoint.auth_required,
      isActive: endpoint.is_active,
    } : { method: 'GET', authRequired: true, isActive: true }
  })
  const onSubmit = async (data) => {
    try {
      if (isEdit) await webServicesAPI.updateEndpoint(serviceId, endpoint.id, data)
      else        await webServicesAPI.createEndpoint(serviceId, data)
      toast.success(isEdit ? 'Endpoint updated' : 'Endpoint added')
      onSaved(); onClose()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 500 }}>
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <h2 className="section-title">{isEdit ? 'Edit Endpoint' : 'Add Endpoint'}</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="label">Endpoint Name *</label>
            <input className="input-field" placeholder="Get User Profile"
              {...register('name', { required: 'Required' })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Method</label>
              <select className="input-field font-mono" {...register('method')}>
                {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Path *</label>
              <input className="input-field font-mono" placeholder="/users/{id}"
                {...register('path', { required: 'Required' })} />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input-field" rows={2} {...register('description')} />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('authRequired')}
                style={{ accentColor: 'rgb(var(--accent))', width: 14, height: 14 }} />
              <span className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>Auth Required</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...register('isActive')}
                style={{ accentColor: 'rgb(var(--accent))', width: 14, height: 14 }} />
              <span className="text-sm" style={{ color: 'rgb(var(--text-primary))' }}>Active</span>
            </label>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
              {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Add Endpoint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Generate API Key Modal ─────────────────────────────────────── */
function ApiKeyModal({ serviceId, onClose, onSaved }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { name: 'API Key', scopes: [] }
  })
  const [generatedKey, setGeneratedKey] = useState(null)

  const onSubmit = async (data) => {
    try {
      const res = await webServicesAPI.generateApiKey(serviceId, data)
      setGeneratedKey(res.data.data.rawKey)
      toast.success('API key generated!')
      onSaved()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed') }
  }

  if (generatedKey) return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 460 }}>
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: 'rgba(var(--success),0.1)', border: '1px solid rgba(var(--success),0.2)' }}>
            <Key size={20} style={{ color: 'rgb(var(--success))' }} />
          </div>
          <div>
            <h3 className="section-title">API Key Generated!</h3>
            <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>
              ⚠️ Copy this key now — it won't be shown again
            </p>
          </div>
          <div className="p-3 rounded-xl flex items-center gap-2"
            style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
            <code className="text-xs flex-1 break-all font-mono" style={{ color: 'rgb(var(--text-primary))' }}>
              {generatedKey}
            </code>
            <button onClick={() => { navigator.clipboard.writeText(generatedKey); toast.success('Copied!') }}
              className="btn-ghost p-1.5 flex-shrink-0"><Copy size={13} /></button>
          </div>
          <button onClick={onClose} className="btn-primary mx-auto">Done</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 420 }}>
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <h2 className="section-title">Generate API Key</h2>
          <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div>
            <label className="label">Key Name</label>
            <input className="input-field" placeholder="Production Key" {...register('name', { required: true })} />
          </div>
          <div>
            <label className="label">Expires At (optional)</label>
            <input type="datetime-local" className="input-field" {...register('expiresAt')} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 justify-center">
              <Key size={13} /> {isSubmitting ? 'Generating...' : 'Generate Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ─── Service Detail Modal ───────────────────────────────────────── */
function ServiceDetail({ service: svc, onClose, onEdit }) {
  const queryClient = useQueryClient()
  const { hasPermission } = useAuthStore()
  const [detailTab, setDetailTab] = useState('endpoints')
  const [showEpModal, setShowEpModal]     = useState(false)
  const [editingEp, setEditingEp]         = useState(null)
  const [showKeyModal, setShowKeyModal]   = useState(false)
  const [healthResult, setHealthResult]   = useState(null)
  const [checkingHealth, setCheckingHealth] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['service-detail', svc.id],
    queryFn: () => webServicesAPI.getById(svc.id).then(r => r.data.data),
  })
  const s = data || svc

  const deletEpMutation = useMutation({
    mutationFn: (epId) => webServicesAPI.deleteEndpoint(svc.id, epId),
    onSuccess: () => { toast.success('Endpoint deleted'); queryClient.invalidateQueries(['service-detail', svc.id]) },
    onError: () => toast.error('Failed'),
  })
  const revokeKeyMutation = useMutation({
    mutationFn: (keyId) => webServicesAPI.revokeApiKey(svc.id, keyId),
    onSuccess: () => { toast.success('Key revoked'); queryClient.invalidateQueries(['service-detail', svc.id]) },
    onError: () => toast.error('Failed'),
  })

  const handleHealthCheck = async () => {
    setCheckingHealth(true)
    try {
      const res = await webServicesAPI.healthCheck(svc.id)
      setHealthResult(res.data.data)
      queryClient.invalidateQueries(['web-services'])
    } catch (err) {
      setHealthResult({ status: 'error', error: err.response?.data?.message || 'Failed' })
    } finally {
      setCheckingHealth(false)
    }
  }

  const METHOD_COLORS = { GET:'#22c55e', POST:'#6366f1', PUT:'#f59e0b', PATCH:'#f97316', DELETE:'#ef4444', HEAD:'#94a3b8', OPTIONS:'#8b5cf6' }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 800 }}>
        {/* Header */}
        <div className="p-5 flex items-start justify-between gap-3"
          style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(var(--info),0.12)', border: '1px solid rgba(var(--info),0.2)' }}>
              <Globe2 size={17} style={{ color: 'rgb(var(--info))' }} />
            </div>
            <div>
              <p className="font-display font-bold" style={{ color: 'rgb(var(--text-primary))' }}>{s.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="font-mono text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{s.base_url}</span>
                <span className={`badge ${STATUS_CFG[s.status]?.badge || 'badge-neutral'}`} style={{ fontSize: 10 }}>
                  {s.status}
                </span>
                <span className={`badge ${ENV_BADGE[s.environment] || 'badge-neutral'}`} style={{ fontSize: 10 }}>
                  {s.environment}
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={handleHealthCheck} disabled={checkingHealth}
              className="btn-secondary text-xs px-3 py-1.5" style={{ color: checkingHealth ? 'rgb(var(--text-muted))' : 'rgb(var(--success))' }}>
              <Play size={11} /> {checkingHealth ? 'Checking...' : 'Health Check'}
            </button>
            <button onClick={() => { onClose(); onEdit(svc) }} className="btn-secondary text-xs px-3 py-1.5">
              <Edit size={11} /> Edit
            </button>
            <button onClick={onClose} className="btn-ghost p-1.5"><X size={16} /></button>
          </div>
        </div>

        {/* Health result banner */}
        {healthResult && (
          <div className="mx-5 mt-4 p-3 rounded-xl flex items-center gap-3"
            style={{
              background: healthResult.status === 'healthy' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${healthResult.status === 'healthy' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
            }}>
            {healthResult.status === 'healthy'
              ? <Check size={15} style={{ color: '#22c55e' }} />
              : <AlertTriangle size={15} style={{ color: '#ef4444' }} />
            }
            <div className="flex-1">
              <p className="text-xs font-semibold"
                style={{ color: healthResult.status === 'healthy' ? '#22c55e' : '#ef4444' }}>
                {healthResult.status === 'healthy' ? 'Service is healthy' : `Service is ${healthResult.status}`}
              </p>
              {healthResult.responseTime && (
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                  Response: {healthResult.responseTime}ms · Status: {healthResult.statusCode || 'N/A'}
                </p>
              )}
              {healthResult.error && (
                <p className="text-xs" style={{ color: '#ef4444' }}>{healthResult.error}</p>
              )}
            </div>
            <button onClick={() => setHealthResult(null)} className="btn-ghost p-1"><X size={12} /></button>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-3 px-5 mt-4">
          {[
            { label: 'Endpoints',   value: s.endpoint_count ?? data?.endpoints?.length ?? 0, color: 'rgb(var(--accent-light))' },
            { label: 'API Keys',    value: s.key_count ?? data?.apiKeys?.length ?? 0,         color: 'rgb(var(--success))' },
            { label: 'Calls (24h)', value: s.calls_24h ?? 0,                                  color: 'rgb(var(--warning))' },
            { label: 'Uptime',      value: `${s.uptime_pct ?? 100}%`,                          color: s.uptime_pct >= 99 ? '#22c55e' : '#f59e0b' },
          ].map(stat => (
            <div key={stat.label} className="text-center p-2 rounded-xl"
              style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
              <p className="text-lg font-display font-bold" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-4">
          {[
            { id: 'endpoints', label: `Endpoints (${data?.endpoints?.length ?? 0})` },
            { id: 'apikeys',   label: `API Keys (${data?.apiKeys?.length ?? 0})` },
            { id: 'logs',      label: 'Recent Logs' },
          ].map(t => (
            <button key={t.id} onClick={() => setDetailTab(t.id)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: detailTab === t.id ? 'rgba(var(--accent),0.15)' : 'transparent',
                color: detailTab === t.id ? 'rgb(var(--accent-light))' : 'rgb(var(--text-muted))',
                border: detailTab === t.id ? '1px solid rgba(var(--accent),0.25)' : '1px solid transparent',
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-5 pb-5 overflow-y-auto" style={{ maxHeight: '45vh' }}>

          {/* ENDPOINTS */}
          {detailTab === 'endpoints' && (
            <div className="mt-3 space-y-2">
              {hasPermission('web-services','create') && (
                <button onClick={() => { setEditingEp(null); setShowEpModal(true) }}
                  className="btn-secondary text-xs px-3 py-1.5 mb-2">
                  <Plus size={11} /> Add Endpoint
                </button>
              )}
              {data?.endpoints?.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: 'rgb(var(--text-muted))' }}>No endpoints defined</p>
              )}
              {data?.endpoints?.map(ep => (
                <div key={ep.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                    style={{ background: `${METHOD_COLORS[ep.method] || '#6366f1'}18`,
                             color: METHOD_COLORS[ep.method] || '#6366f1', minWidth: 52, textAlign: 'center' }}>
                    {ep.method}
                  </span>
                  <code className="text-xs flex-1 font-mono" style={{ color: 'rgb(var(--text-primary))' }}>
                    {ep.path}
                  </code>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{ep.name}</span>
                    {ep.auth_required && <Shield size={10} style={{ color: 'rgb(var(--warning))' }} />}
                    {!ep.is_active && <span className="badge badge-neutral" style={{ fontSize: 9 }}>disabled</span>}
                  </div>
                  {hasPermission('web-services','update') && (
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingEp(ep); setShowEpModal(true) }}
                        className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/5"
                        style={{ color: 'rgb(var(--text-muted))' }}>
                        <Edit size={10} />
                      </button>
                      <button onClick={() => confirm('Delete endpoint?') && deletEpMutation.mutate(ep.id)}
                        className="w-6 h-6 rounded flex items-center justify-center"
                        style={{ color: 'rgb(var(--danger))' }}>
                        <Trash2 size={10} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* API KEYS */}
          {detailTab === 'apikeys' && (
            <div className="mt-3 space-y-2">
              {hasPermission('web-services','manage') && (
                <button onClick={() => setShowKeyModal(true)} className="btn-secondary text-xs px-3 py-1.5 mb-2">
                  <Key size={11} /> Generate Key
                </button>
              )}
              {data?.apiKeys?.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: 'rgb(var(--text-muted))' }}>No API keys</p>
              )}
              {data?.apiKeys?.map(k => (
                <div key={k.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: k.is_active ? 'rgba(var(--bg-hover))' : 'rgba(var(--bg-hover), 0.5)',
                    border: '1px solid rgba(var(--border))',
                    opacity: k.is_active ? 1 : 0.6,
                  }}>
                  <Key size={13} style={{ color: k.is_active ? 'rgb(var(--success))' : 'rgb(var(--text-muted))' }} />
                  <div className="flex-1">
                    <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{k.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <code className="text-xs font-mono" style={{ color: 'rgb(var(--text-muted))' }}>{k.key_prefix}</code>
                      {k.last_used && (
                        <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                          Used {formatDistanceToNow(new Date(k.last_used), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                      {k.usage_count} calls
                    </span>
                    <span className={`badge ${k.is_active ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: 9 }}>
                      {k.is_active ? 'active' : 'revoked'}
                    </span>
                    {k.is_active && hasPermission('web-services','manage') && (
                      <button onClick={() => confirm('Revoke this key?') && revokeKeyMutation.mutate(k.id)}
                        className="btn-ghost p-1" style={{ color: 'rgb(var(--danger))' }}>
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* LOGS */}
          {detailTab === 'logs' && (
            <div className="mt-3">
              {data?.recentLogs?.length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: 'rgb(var(--text-muted))' }}>No logs yet</p>
              )}
              <div className="space-y-1.5">
                {data?.recentLogs?.map((log, i) => {
                  const ok = log.status_code && log.status_code < 400
                  return (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg"
                      style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: ok ? '#22c55e' : '#ef4444' }} />
                      <span className="text-xs font-mono font-bold" style={{ color: ok ? '#22c55e' : '#ef4444', minWidth: 36 }}>
                        {log.status_code || '?'}
                      </span>
                      <span className="text-xs font-mono truncate flex-1" style={{ color: 'rgb(var(--text-secondary))' }}>
                        {log.method} {log.path}
                      </span>
                      {log.response_time_ms && (
                        <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{log.response_time_ms}ms</span>
                      )}
                      <span className="text-xs font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
                        {format(new Date(log.created_at), 'HH:mm:ss')}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sub-modals */}
      {showEpModal && (
        <EndpointModal
          serviceId={svc.id}
          endpoint={editingEp}
          onClose={() => setShowEpModal(false)}
          onSaved={() => queryClient.invalidateQueries(['service-detail', svc.id])}
        />
      )}
      {showKeyModal && (
        <ApiKeyModal
          serviceId={svc.id}
          onClose={() => setShowKeyModal(false)}
          onSaved={() => queryClient.invalidateQueries(['service-detail', svc.id])}
        />
      )}
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function WebServicesPage() {
  const { hasPermission } = useAuthStore()
  const queryClient = useQueryClient()
  const [showModal, setShowModal]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [viewing, setViewing]       = useState(null)
  const [deleting, setDeleting]     = useState(null)
  const [historyFor, setHistoryFor] = useState(null)
  const { handleSyncResult } = useSyncStore()
  const [search, setSearch]         = useState('')
  const [envFilter, setEnvFilter]   = useState('')
  const [page, setPage]             = useState(1)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['web-services', search, envFilter, page],
    queryFn: () => webServicesAPI.getAll({ search, environment: envFilter, page, limit: 12 }).then(r => r.data),
    keepPreviousData: true,
  })
  const { data: stats } = useQuery({
    queryKey: ['ws-stats'],
    queryFn: () => webServicesAPI.getStats().then(r => r.data.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => webServicesAPI.delete(id),
    onSuccess: () => {
      toast.success('Service deleted')
      queryClient.invalidateQueries(['web-services'])
      queryClient.invalidateQueries(['ws-stats'])
      setDeleting(null)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  })

  const services = data?.data || []
  const pagination = data?.pagination

  return (
    <div className="space-y-5">
      <SyncBanner />
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Total',        value: stats.total,            color: 'rgb(var(--accent-light))' },
            { label: 'Active',       value: stats.active,           color: 'rgb(var(--success))' },
            { label: 'Maintenance',  value: stats.maintenance,      color: 'rgb(var(--warning))' },
            { label: 'Production',   value: stats.production,       color: 'rgb(var(--danger))' },
            { label: 'Staging',      value: stats.staging,          color: 'rgb(var(--warning))' },
            { label: 'Endpoints',    value: stats.total_endpoints,  color: 'rgb(var(--info))' },
            { label: 'Active Keys',  value: stats.active_keys,      color: 'rgb(var(--success))' },
            { label: 'Calls (24h)',  value: stats.calls_24h ?? 0,   color: 'rgb(var(--text-secondary))' },
          ].map(s => (
            <div key={s.label} className="stat-card text-center py-3">
              <p className="text-xl font-display font-bold" style={{ color: s.color }}>{s.value ?? 0}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'rgb(var(--text-muted))' }} />
          <input className="input-field pl-9" placeholder="Search services..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <select className="input-field" style={{ width: 160 }}
          value={envFilter} onChange={e => { setEnvFilter(e.target.value); setPage(1) }}>
          <option value="">All Environments</option>
          {['production','staging','development','testing'].map(e => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <button onClick={() => queryClient.invalidateQueries(['web-services'])} className="btn-secondary px-3">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
        </button>
        {hasPermission('web-services','create') && (
          <button className="btn-primary whitespace-nowrap"
            onClick={() => { setEditing(null); setShowModal(true) }}>
            <Plus size={14} /> New Service
          </button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card p-5 animate-pulse h-48" />)}
        </div>
      ) : services.length === 0 ? (
        <div className="card p-16 text-center">
          <Globe2 size={42} className="mx-auto mb-3" style={{ color: 'rgb(var(--text-muted))' }} />
          <p className="font-semibold mb-4" style={{ color: 'rgb(var(--text-primary))' }}>No web services configured</p>
          {hasPermission('web-services','create') && (
            <button className="btn-primary mx-auto" onClick={() => { setEditing(null); setShowModal(true) }}>
              <Plus size={14} /> Add Service
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {services.map(s => {
            const cfg = STATUS_CFG[s.status] || STATUS_CFG.inactive
            return (
              <div key={s.id} className="card-hover p-5 flex flex-col gap-3"
                style={{ opacity: s.is_active ? 1 : 0.65 }}>
                {/* Top */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative"
                      style={{ background: 'rgba(var(--info),0.1)', border: '1px solid rgba(var(--info),0.2)' }}>
                      <Globe2 size={17} style={{ color: 'rgb(var(--info))' }} />
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                        style={{ background: cfg.dot, borderColor: 'rgb(var(--bg-card))' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: 'rgb(var(--text-primary))' }}>{s.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="badge badge-neutral font-mono" style={{ fontSize: 10 }}>
                          {s.version || 'v1'}
                        </span>
                        <span className={`badge ${ENV_BADGE[s.environment] || 'badge-neutral'}`} style={{ fontSize: 10 }}>
                          {s.environment}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setViewing(s)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"
                      style={{ color: 'rgb(var(--text-muted))' }}>
                      <Eye size={12} />
                    </button>
                    <button onClick={() => setHistoryFor(s)}
                      title="Change History"
                      className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"
                      style={{ color: 'rgb(var(--text-muted))' }}>
                      <Clock size={12} />
                    </button>
                    {hasPermission('web-services','update') && (
                      <button onClick={() => { setEditing(s); setShowModal(true) }}
                        className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/5"
                        style={{ color: 'rgb(var(--text-muted))' }}>
                        <Edit size={12} />
                      </button>
                    )}
                    {hasPermission('web-services','delete') && (
                      <button onClick={() => setDeleting(s)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ color: 'rgb(var(--danger))' }}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                {/* URL */}
                <div className="flex items-center gap-2 p-2 rounded-lg"
                  style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                  <Code size={11} style={{ color: 'rgb(var(--text-muted))', flexShrink: 0 }} />
                  <span className="text-xs font-mono truncate" style={{ color: 'rgb(var(--text-muted))' }}>
                    {s.base_url}
                  </span>
                  <button onClick={() => { navigator.clipboard.writeText(s.base_url); toast.success('URL copied') }}
                    className="flex-shrink-0 btn-ghost p-0.5">
                    <Copy size={10} />
                  </button>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2"
                  style={{ borderTop: '1px solid rgba(var(--border))' }}>
                  <span className={`badge ${cfg.badge}`}>{s.status}</span>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                    <span title="Endpoints">{s.endpoint_count ?? 0} ep</span>
                    <span title="Active API keys">{s.key_count ?? 0} keys</span>
                    {s.calls_24h > 0 && <span title="Calls in 24h">{s.calls_24h} calls/24h</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
            {pagination.total} services · Page {pagination.page}/{pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button disabled={!pagination.hasPrevPage} onClick={() => setPage(p => p-1)}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Previous</button>
            <button disabled={!pagination.hasNextPage} onClick={() => setPage(p => p+1)}
              className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <ServiceModal
          service={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { queryClient.invalidateQueries(['web-services']); queryClient.invalidateQueries(['ws-stats']) }}
          onSyncResult={handleSyncResult}
        />
      )}
      {viewing && (
        <ServiceDetail
          service={viewing}
          onClose={() => setViewing(null)}
          onEdit={(s) => { setEditing(s); setShowModal(true) }}
        />
      )}
      {historyFor && (
        <ChangeHistoryDrawer
          entityType="web_service"
          entityId={historyFor.id}
          entityName={historyFor.name}
          fetchFn={() => changeHistoryAPI.getServiceChanges(historyFor.id)}
          onClose={() => setHistoryFor(null)}
        />
      )}
      {deleting && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleting(null)}>
          <div className="modal-content" style={{ maxWidth: 360 }}>
            <div className="p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: 'rgba(var(--danger),0.1)', border: '1px solid rgba(var(--danger),0.2)' }}>
                <Trash2 size={20} style={{ color: 'rgb(var(--danger))' }} />
              </div>
              <p className="font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>Delete "{deleting.name}"?</p>
              <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>All endpoints, API keys, and logs will be deleted.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleting(null)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => deleteMutation.mutate(deleting.id)}
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
