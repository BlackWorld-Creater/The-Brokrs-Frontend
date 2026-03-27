import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ipTrackingAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import {
  Globe, Shield, ShieldOff, ShieldAlert, Activity,
  Search, Ban, RefreshCw, X, MapPin, Clock,
  TrendingUp, Eye, Wifi, AlertTriangle, CheckCircle2
} from 'lucide-react'
import { format } from 'date-fns'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import toast from 'react-hot-toast'

/* ─── Block IP Modal ─────────────────────────────────────────────────── */
function BlockIPModal({ ip, onClose, onSaved }) {
  const [reason, setReason] = useState('')
  const [isPermanent, setIsPermanent] = useState(true)
  const [expiresAt, setExpiresAt] = useState('')
  const [saving, setSaving] = useState(false)

  const handleBlock = async () => {
    if (!reason.trim()) { toast.error('Reason is required'); return }
    setSaving(true)
    try {
      await ipTrackingAPI.blockIP({
        ipAddress: ip,
        reason,
        isPermanent,
        expiresAt: !isPermanent && expiresAt ? expiresAt : null,
      })
      toast.success(`IP ${ip} has been blocked`)
      onSaved(); onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to block IP')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 420 }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid rgba(var(--border))' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(var(--danger), 0.12)', border: '1px solid rgba(var(--danger), 0.2)' }}>
              <Ban size={15} style={{ color: 'rgb(var(--danger))' }} />
            </div>
            <h2 className="section-title">Block IP Address</h2>
          </div>
          <button onClick={onClose} style={{ color: 'rgb(var(--text-muted))' }}><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-3 rounded-xl font-mono text-sm font-bold"
            style={{ background: 'rgba(var(--danger), 0.06)', border: '1px solid rgba(var(--danger), 0.15)', color: 'rgb(var(--danger))' }}>
            {ip}
          </div>

          <div>
            <label className="label">Reason *</label>
            <textarea className="input-field" rows={3}
              placeholder="e.g. Brute force attempt, suspicious activity..."
              value={reason} onChange={e => setReason(e.target.value)} />
          </div>

          <div>
            <label className="label">Block Duration</label>
            <div className="flex gap-2">
              {[true, false].map(perm => (
                <button key={String(perm)} type="button"
                  onClick={() => setIsPermanent(perm)}
                  className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: isPermanent === perm ? 'rgba(var(--accent), 0.15)' : 'rgba(var(--bg-hover))',
                    border: `1px solid ${isPermanent === perm ? 'rgba(var(--accent), 0.3)' : 'rgba(var(--border))'}`,
                    color: isPermanent === perm ? 'rgb(var(--accent-light))' : 'rgb(var(--text-secondary))',
                  }}>
                  {perm ? '♾ Permanent' : '⏱ Temporary'}
                </button>
              ))}
            </div>
          </div>

          {!isPermanent && (
            <div>
              <label className="label">Expires At</label>
              <input type="datetime-local" className="input-field"
                value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleBlock} disabled={saving} className="btn-danger flex-1 justify-center">
              <Ban size={13} /> {saving ? 'Blocking...' : 'Block IP'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── IP Lookup Drawer ───────────────────────────────────────────────── */
function IPLookupDrawer({ ip, onClose }) {
  const queryClient = useQueryClient()
  const [showBlock, setShowBlock] = useState(false)
  const { hasPermission } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['ip-lookup', ip],
    queryFn: () => ipTrackingAPI.lookupIP(ip).then(r => r.data.data),
  })

  const unblockMutation = useMutation({
    mutationFn: () => ipTrackingAPI.unblockIP(ip),
    onSuccess: () => {
      toast.success(`IP ${ip} unblocked`)
      queryClient.invalidateQueries(['ip-lookup', ip])
      queryClient.invalidateQueries(['ip-stats'])
      queryClient.invalidateQueries(['ip-blocked'])
    },
    onError: () => toast.error('Failed to unblock'),
  })

  return (
    <>
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal-content" style={{ maxWidth: 600 }}>
          <div className="flex items-center justify-between p-5"
            style={{ borderBottom: '1px solid rgba(var(--border))' }}>
            <div>
              <p className="font-mono font-bold text-base" style={{ color: 'rgb(var(--text-primary))' }}>{ip}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>IP Address Details</p>
            </div>
            <div className="flex gap-2">
              {hasPermission('audit', 'manage') && (
                data?.blockInfo
                  ? <button onClick={() => unblockMutation.mutate()} disabled={unblockMutation.isPending}
                      className="btn-secondary text-xs px-3 py-1.5" style={{ color: 'rgb(var(--success))' }}>
                      <CheckCircle2 size={12} /> Unblock
                    </button>
                  : <button onClick={() => setShowBlock(true)} className="btn-danger text-xs px-3 py-1.5">
                      <Ban size={12} /> Block IP
                    </button>
              )}
              <button onClick={onClose} style={{ color: 'rgb(var(--text-muted))' }}><X size={18} /></button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-8 text-center" style={{ color: 'rgb(var(--text-muted))' }}>Loading...</div>
          ) : (
            <div className="p-5 space-y-4">
              {/* Block status banner */}
              {data?.blockInfo && (
                <div className="p-3 rounded-xl flex items-center gap-3"
                  style={{ background: 'rgba(var(--danger), 0.08)', border: '1px solid rgba(var(--danger), 0.2)' }}>
                  <Ban size={15} style={{ color: 'rgb(var(--danger))' }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'rgb(var(--danger))' }}>BLOCKED</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                      {data.blockInfo.reason} · {data.blockInfo.is_permanent ? 'Permanent' : `Expires ${format(new Date(data.blockInfo.expires_at), 'MMM d, yyyy HH:mm')}`}
                    </p>
                  </div>
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Requests', value: data?.stats?.total_requests || 0, color: 'rgb(var(--accent-light))' },
                  { label: 'Unique Users', value: data?.stats?.unique_users || 0, color: 'rgb(var(--success))' },
                  { label: 'Login Attempts', value: data?.stats?.login_attempts || 0, color: 'rgb(var(--warning))' },
                  { label: 'Days Active', value: data?.stats?.first_seen
                      ? Math.ceil((Date.now() - new Date(data.stats.first_seen)) / 86400000)
                      : 0, color: 'rgb(var(--info))' },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-xl text-center"
                    style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                    <p className="text-xl font-display font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              <div>
                <p className="section-title mb-3">Recent Activity</p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {data?.history?.slice(0, 20).map((h, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg"
                      style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: h.event_type === 'login' ? 'rgb(var(--warning))' : 'rgb(var(--accent))' }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium font-mono"
                            style={{ color: 'rgb(var(--text-secondary))' }}>{h.method} {h.path}</span>
                          {h.status_code && (
                            <span className={`badge text-xs ${h.status_code < 400 ? 'badge-success' : h.status_code < 500 ? 'badge-warning' : 'badge-danger'}`}>
                              {h.status_code}
                            </span>
                          )}
                        </div>
                        {(h.first_name || h.email) && (
                          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                            {h.first_name ? `${h.first_name} ${h.last_name}` : h.email}
                          </p>
                        )}
                      </div>
                      <p className="text-xs flex-shrink-0 font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
                        {format(new Date(h.created_at), 'HH:mm:ss')}
                      </p>
                    </div>
                  ))}
                  {(!data?.history || data.history.length === 0) && (
                    <p className="text-sm text-center py-6" style={{ color: 'rgb(var(--text-muted))' }}>No activity recorded</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {showBlock && (
        <BlockIPModal ip={ip}
          onClose={() => setShowBlock(false)}
          onSaved={() => {
            queryClient.invalidateQueries(['ip-lookup', ip])
            queryClient.invalidateQueries(['ip-stats'])
            queryClient.invalidateQueries(['ip-blocked'])
          }} />
      )}
    </>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────────── */
export default function IPTrackingPage() {
  const { hasPermission } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('overview')
  const [searchIP, setSearchIP] = useState('')
  const [eventType, setEventType] = useState('')
  const [page, setPage] = useState(1)
  const [blockTarget, setBlockTarget] = useState(null)
  const [lookupIP, setLookupIP] = useState(null)

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['ip-stats'],
    queryFn: () => ipTrackingAPI.getStats().then(r => r.data.data),
    refetchInterval: 30000,
  })

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['ip-logs', page, searchIP, eventType],
    queryFn: () => ipTrackingAPI.getLogs({ page, limit: 20, ip: searchIP, eventType }).then(r => r.data),
    keepPreviousData: true,
    enabled: tab === 'logs',
  })

  const { data: blocked, isLoading: blockedLoading } = useQuery({
    queryKey: ['ip-blocked'],
    queryFn: () => ipTrackingAPI.getBlocked().then(r => r.data.data),
    enabled: tab === 'blocked',
  })

  const unblockMutation = useMutation({
    mutationFn: (ip) => ipTrackingAPI.unblockIP(ip),
    onSuccess: () => {
      toast.success('IP unblocked')
      queryClient.invalidateQueries(['ip-blocked'])
      queryClient.invalidateQueries(['ip-stats'])
    },
    onError: () => toast.error('Failed to unblock IP'),
  })

  // Hourly traffic chart data
  const hourlyData = stats?.hourlyTraffic?.map(h => ({
    hour: format(new Date(h.hour), 'HH:mm'),
    requests: parseInt(h.requests),
  })) || []

  const EVENT_COLORS = {
    login: '#f59e0b', request: 'rgb(var(--accent))', blocked: '#ef4444'
  }

  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { icon: Activity,      label: 'Requests (24h)',  value: stats?.total24h   ?? '—', color: '#6366f1' },
          { icon: Globe,         label: 'Unique IPs',      value: stats?.uniqueIPs  ?? '—', color: '#22c55e' },
          { icon: ShieldAlert,   label: 'Blocked IPs',     value: stats?.blockedIPs ?? '—', color: '#ef4444' },
          { icon: Wifi,          label: 'Logins (24h)',    value: stats?.logins24h  ?? '—', color: '#f59e0b' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="stat-card animate-slide-up">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <p className="text-3xl font-display font-bold" style={{ color: 'rgb(var(--text-primary))' }}>{value}</p>
            <p className="text-xs mt-1 font-medium" style={{ color: 'rgb(var(--text-muted))' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hourly traffic */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="section-title">Traffic (Last 24h)</h3>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>Requests per hour</p>
            </div>
            <button onClick={() => queryClient.invalidateQueries(['ip-stats'])}
              className="btn-ghost p-1.5"><RefreshCw size={13} /></button>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="ipGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Area type="monotone" dataKey="requests" stroke="#6366f1" strokeWidth={2} fill="url(#ipGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top IPs */}
        <div className="card p-5">
          <h3 className="section-title mb-3">Top IPs (24h)</h3>
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 220 }}>
            {stats?.topIPs?.map((ip, i) => (
              <div key={i}
                className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.03]"
                onClick={() => setLookupIP(ip.ip_address)}>
                <span className="text-xs font-bold w-5 text-center" style={{ color: 'rgb(var(--text-muted))' }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs font-medium truncate" style={{ color: 'rgb(var(--text-primary))' }}>
                    {ip.ip_address}
                  </p>
                  {ip.country && (
                    <p className="text-xs truncate" style={{ color: 'rgb(var(--text-muted))' }}>{ip.country}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-bold" style={{ color: 'rgb(var(--accent-light))' }}>{ip.hits}</p>
                  {ip.is_flagged && <Ban size={10} style={{ color: 'rgb(var(--danger))' }} className="ml-auto mt-0.5" />}
                </div>
              </div>
            ))}
            {(!stats?.topIPs || stats.topIPs.length === 0) && (
              <p className="text-sm text-center py-8" style={{ color: 'rgb(var(--text-muted))' }}>No data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(var(--bg-hover))', width: 'fit-content' }}>
        {[
          { id: 'overview', label: 'Live Activity' },
          { id: 'logs', label: 'Access Logs' },
          { id: 'blocked', label: `Blocked IPs${stats?.blockedIPs ? ` (${stats.blockedIPs})` : ''}` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? 'rgba(var(--accent), 0.15)' : 'transparent',
              color: tab === t.id ? 'rgb(var(--accent-light))' : 'rgb(var(--text-muted))',
              border: tab === t.id ? '1px solid rgba(var(--accent), 0.25)' : '1px solid transparent',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW: Recent Activity ── */}
      {tab === 'overview' && (
        <div className="card">
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid rgba(var(--border))' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'rgb(var(--success))' }} />
              <h3 className="section-title">Live Activity Feed</h3>
            </div>
            <button onClick={() => queryClient.invalidateQueries(['ip-stats'])} className="btn-ghost p-1.5">
              <RefreshCw size={13} />
            </button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>IP Address</th>
                  <th>User</th>
                  <th>Event</th>
                  <th>Path</th>
                  <th>Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {statsLoading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>{[...Array(6)].map((_, j) => (
                      <td key={j}><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(var(--bg-hover))' }} /></td>
                    ))}</tr>
                  ))
                ) : stats?.recentActivity?.map((item, i) => (
                  <tr key={i}>
                    <td>
                      <button onClick={() => setLookupIP(item.ip_address)}
                        className="ip-chip hover:border-indigo-500/40 transition-colors">
                        <Globe size={10} />
                        {item.ip_address}
                      </button>
                    </td>
                    <td>
                      {item.first_name
                        ? <div>
                            <p className="text-xs font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{item.first_name} {item.last_name}</p>
                            <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{item.email}</p>
                          </div>
                        : <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Anonymous</span>
                      }
                    </td>
                    <td>
                      <span className={`badge ${item.event_type === 'login' ? 'badge-warning' : item.event_type === 'blocked' ? 'badge-danger' : 'badge-accent'}`}>
                        {item.event_type}
                      </span>
                    </td>
                    <td className="font-mono text-xs max-w-[180px] truncate" style={{ color: 'rgb(var(--text-muted))' }}>
                      <span className="mr-1.5" style={{ color: 'rgb(var(--text-secondary))' }}>{item.method}</span>
                      {item.path}
                    </td>
                    <td className="font-mono text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                      {format(new Date(item.created_at), 'HH:mm:ss')}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => setLookupIP(item.ip_address)}
                          className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/5 transition-colors"
                          style={{ color: 'rgb(var(--text-muted))' }}>
                          <Eye size={11} />
                        </button>
                        {hasPermission('audit', 'manage') && (
                          <button onClick={() => setBlockTarget(item.ip_address)}
                            className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/10 transition-colors"
                            style={{ color: 'rgb(var(--danger))' }}>
                            <Ban size={11} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── LOGS TAB ── */}
      {tab === 'logs' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(var(--text-muted))' }} />
              <input className="input-field pl-8" placeholder="Search by IP address..."
                value={searchIP} onChange={e => { setSearchIP(e.target.value); setPage(1) }} />
            </div>
            <select className="input-field sm:w-44" value={eventType} onChange={e => { setEventType(e.target.value); setPage(1) }}>
              <option value="">All Events</option>
              <option value="request">Request</option>
              <option value="login">Login</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>IP Address</th>
                    <th>User</th>
                    <th>Event</th>
                    <th>Method & Path</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i}>{[...Array(7)].map((_, j) => (
                        <td key={j}><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(var(--bg-hover))' }} /></td>
                      ))}</tr>
                    ))
                  ) : logs?.data?.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12" style={{ color: 'rgb(var(--text-muted))' }}>
                      No logs found
                    </td></tr>
                  ) : logs?.data?.map((log, i) => (
                    <tr key={i}>
                      <td>
                        <button onClick={() => setLookupIP(log.ip_address)} className="ip-chip hover:border-indigo-500/40 transition-colors">
                          <Globe size={10} />{log.ip_address}
                        </button>
                      </td>
                      <td>
                        {log.first_name
                          ? <p className="text-xs font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{log.first_name} {log.last_name}</p>
                          : <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>—</span>
                        }
                      </td>
                      <td>
                        <span className={`badge ${log.event_type === 'login' ? 'badge-warning' : log.is_blocked ? 'badge-danger' : 'badge-accent'}`}>
                          {log.event_type}
                        </span>
                      </td>
                      <td className="font-mono text-xs max-w-[200px] truncate" style={{ color: 'rgb(var(--text-muted))' }}>
                        <span className="font-medium mr-1" style={{ color: 'rgb(var(--text-secondary))' }}>{log.method}</span>
                        {log.path}
                      </td>
                      <td>
                        {log.status_code
                          ? <span className={`badge ${log.status_code < 400 ? 'badge-success' : log.status_code < 500 ? 'badge-warning' : 'badge-danger'}`}>
                              {log.status_code}
                            </span>
                          : <span style={{ color: 'rgb(var(--text-muted))' }}>—</span>
                        }
                      </td>
                      <td className="font-mono text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                        {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => setLookupIP(log.ip_address)}
                            className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/5 transition-colors"
                            style={{ color: 'rgb(var(--text-muted))' }}>
                            <Eye size={11} />
                          </button>
                          {hasPermission('audit', 'manage') && (
                            <button onClick={() => setBlockTarget(log.ip_address)}
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-red-500/10 transition-colors"
                              style={{ color: 'rgb(var(--danger))' }}>
                              <Ban size={11} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {logs?.pagination && (
              <div className="flex items-center justify-between px-4 py-3"
                style={{ borderTop: '1px solid rgba(var(--border))' }}>
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                  {logs.pagination.total} total entries · Page {logs.pagination.page}/{logs.pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <button disabled={!logs.pagination.hasPrevPage} onClick={() => setPage(p => p - 1)}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Prev</button>
                  <button disabled={!logs.pagination.hasNextPage} onClick={() => setPage(p => p + 1)}
                    className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── BLOCKED IPs TAB ── */}
      {tab === 'blocked' && (
        <div className="card">
          <div className="flex items-center justify-between p-4"
            style={{ borderBottom: '1px solid rgba(var(--border))' }}>
            <h3 className="section-title">Blocked IP Addresses</h3>
            <span className="badge badge-danger">{blocked?.length || 0} blocked</span>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>IP Address</th>
                  <th>Reason</th>
                  <th>Type</th>
                  <th>Blocked By</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {blockedLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>{[...Array(6)].map((_, j) => (
                      <td key={j}><div className="h-4 rounded animate-pulse" style={{ background: 'rgba(var(--bg-hover))' }} /></td>
                    ))}</tr>
                  ))
                ) : blocked?.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <ShieldOff size={32} style={{ color: 'rgb(var(--text-muted))' }} />
                      <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>No IPs are currently blocked</p>
                    </div>
                  </td></tr>
                ) : blocked?.map((b, i) => (
                  <tr key={i}>
                    <td>
                      <button onClick={() => setLookupIP(b.ip_address)} className="ip-chip hover:border-red-500/40 transition-colors"
                        style={{ color: 'rgb(var(--danger))' }}>
                        <Ban size={10} />{b.ip_address}
                      </button>
                    </td>
                    <td className="text-xs max-w-[200px] truncate" style={{ color: 'rgb(var(--text-secondary))' }}>
                      {b.reason || '—'}
                    </td>
                    <td>
                      <span className={`badge ${b.is_permanent ? 'badge-danger' : 'badge-warning'}`}>
                        {b.is_permanent ? '♾ Permanent' : '⏱ Temporary'}
                      </span>
                    </td>
                    <td className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                      {b.blocked_by_name ? `${b.blocked_by_name} ${b.blocked_by_last}` : 'System'}
                    </td>
                    <td className="font-mono text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                      {b.is_permanent ? '—' : b.expires_at ? format(new Date(b.expires_at), 'MMM d, yyyy') : '—'}
                    </td>
                    <td>
                      {hasPermission('audit', 'manage') && (
                        <button
                          onClick={() => confirm(`Unblock ${b.ip_address}?`) && unblockMutation.mutate(b.ip_address)}
                          className="btn-secondary text-xs px-2 py-1"
                          style={{ color: 'rgb(var(--success))' }}>
                          <CheckCircle2 size={11} /> Unblock
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {blockTarget && (
        <BlockIPModal ip={blockTarget}
          onClose={() => setBlockTarget(null)}
          onSaved={() => {
            queryClient.invalidateQueries(['ip-stats'])
            queryClient.invalidateQueries(['ip-blocked'])
          }} />
      )}
      {lookupIP && (
        <IPLookupDrawer ip={lookupIP} onClose={() => setLookupIP(null)} />
      )}
    </div>
  )
}
