import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { emailSettingsAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import {
  Mail, Send, CheckCircle2, XCircle, AlertTriangle, Eye, EyeOff,
  RefreshCw, Save, Play, Wifi, WifiOff, Clock, Check, X,
  Bell, Settings, Shield, User, Inbox, Info, Zap
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const SMTP_PRESETS = [
  { name: 'Gmail',    host: 'smtp.gmail.com',    port: 587, secure: false, hint: 'Use App Password, not your Gmail password' },
  { name: 'Outlook',  host: 'smtp-mail.outlook.com', port: 587, secure: false, hint: 'Use your Microsoft account credentials' },
  { name: 'Yahoo',    host: 'smtp.mail.yahoo.com',   port: 465, secure: true,  hint: 'Enable "Less secure app access" or use App Password' },
  { name: 'SendGrid', host: 'smtp.sendgrid.net',      port: 587, secure: false, hint: 'Use "apikey" as username, API key as password' },
  { name: 'Mailgun',  host: 'smtp.mailgun.org',       port: 587, secure: false, hint: 'Use SMTP credentials from Mailgun dashboard' },
  { name: 'AWS SES',  host: 'email-smtp.us-east-1.amazonaws.com', port: 587, secure: false, hint: 'Use SMTP credentials from SES' },
  { name: 'Custom',   host: '',                   port: 587, secure: false, hint: 'Enter your SMTP server details manually' },
]

const NOTIF_SETTINGS = [
  { key: 'email_notifications_enabled', icon: Bell,   label: 'Enable Email Notifications', desc: 'Master toggle for all email notifications' },
  { key: 'email_task_assigned',         icon: Check,  label: 'Task Assigned',               desc: 'Email when a task is assigned to a user' },
  { key: 'email_leave_request',         icon: Clock,  label: 'Leave Request',               desc: 'Email HR when a leave request is submitted' },
  { key: 'email_leave_approved',        icon: Check,  label: 'Leave Approved/Rejected',     desc: 'Email employee when leave decision is made' },
  { key: 'email_welcome_user',          icon: User,   label: 'Welcome Email',               desc: 'Send welcome email to newly created users' },
]

/* ─── Password field ─────────────────────────────────────────────── */
function PasswordField({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        className="input-field pr-10"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <button type="button" onClick={() => setShow(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 btn-ghost p-0"
        style={{ color: 'rgb(var(--text-muted))' }}>
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

/* ─── Toggle row ─────────────────────────────────────────────────── */
function ToggleRow({ icon: Icon, label, desc, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between py-3 gap-4"
      style={{ borderBottom: '1px solid rgba(var(--border))' }}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'rgba(var(--bg-hover))' }}>
          <Icon size={14} style={{ color: 'rgb(var(--text-muted))' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>{label}</p>
          <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{desc}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className="relative w-10 h-5 rounded-full transition-all duration-200 flex-shrink-0 mt-1"
        style={{
          background: checked ? 'rgb(var(--accent))' : 'rgba(var(--bg-hover))',
          border: '1px solid rgba(var(--border))',
          opacity: disabled ? 0.5 : 1,
        }}>
        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200"
          style={{ left: checked ? '22px' : '2px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function EmailSettingsPage() {
  const { hasPermission } = useAuthStore()
  const queryClient = useQueryClient()
  const canEdit = hasPermission('settings', 'manage')
  const [activeTab, setActiveTab] = useState('smtp')
  const [testEmail, setTestEmail] = useState('')
  const [localSettings, setLocalSettings] = useState({})
  const [connectionStatus, setConnectionStatus] = useState(null) // null | 'testing' | 'ok' | 'fail'
  const [connectionMsg, setConnectionMsg] = useState('')
  const [selectedPreset, setSelectedPreset] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['email-settings'],
    queryFn: () => emailSettingsAPI.get().then(r => r.data.data),
    onSuccess: (d) => {
      const flat = {}
      Object.entries(d).forEach(([k, v]) => { flat[k] = v.value })
      setLocalSettings(flat)
    },
  })

  const { data: logsData } = useQuery({
    queryKey: ['email-logs'],
    queryFn: () => emailSettingsAPI.getLogs().then(r => r.data.data),
    enabled: activeTab === 'logs',
  })

  const saveMutation = useMutation({
    mutationFn: () => emailSettingsAPI.save({ settings: localSettings }),
    onSuccess: () => { toast.success('Email settings saved'); queryClient.invalidateQueries(['email-settings']) },
    onError: () => toast.error('Failed to save'),
  })

  const testConnMutation = useMutation({
    mutationFn: () => emailSettingsAPI.testConnection(),
    onMutate: () => { setConnectionStatus('testing'); setConnectionMsg('') },
    onSuccess: (res) => {
      setConnectionStatus('ok')
      setConnectionMsg(res.data.message || 'Connection successful')
      toast.success('SMTP connected!')
    },
    onError: (err) => {
      setConnectionStatus('fail')
      setConnectionMsg(err.response?.data?.message || 'Connection failed')
      toast.error('SMTP connection failed')
    },
  })

  const [sendResult, setSendResult] = useState(null)  // { ok, msg, detail }

  const sendTestMutation = useMutation({
    mutationFn: () => emailSettingsAPI.sendTest(testEmail),
    onSuccess: (res) => {
      const d = res.data?.data
      setSendResult({
        ok: true,
        msg: res.data?.message || `Sent to ${testEmail}`,
        detail: d ? `MessageID: ${d.messageId || '—'}  |  Server: ${d.response || '—'}` : null,
      })
      toast.success(`✅ Email sent to ${testEmail}!`)
      queryClient.invalidateQueries(['email-logs'])
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to send'
      setSendResult({ ok: false, msg, detail: null })
      toast.error(msg)
    },
  })

  const set = (key, value) => setLocalSettings(prev => ({ ...prev, [key]: value }))

  const applyPreset = (preset) => {
    if (preset.host) {
      set('smtp_host', preset.host)
      set('smtp_port', String(preset.port))
      set('smtp_secure', String(preset.secure))
    }
    setSelectedPreset(preset.name)
  }

  const TABS = [
    { id: 'smtp',          label: 'SMTP Server',         icon: Mail },
    { id: 'notifications', label: 'Notifications',       icon: Bell },
    { id: 'logs',          label: 'Email Logs',           icon: Inbox },
  ]

  if (isLoading) return <div className="space-y-4">{[...Array(3)].map((_,i)=><div key={i} className="card h-32 animate-pulse"/>)}</div>

  const settings = data || {}

  return (
    <div className="max-w-3xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(var(--accent),0.12)', border: '1px solid rgba(var(--accent),0.2)' }}>
            <Mail size={18} style={{ color: 'rgb(var(--accent-light))' }} />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl" style={{ color: 'rgb(var(--text-primary))' }}>Email Settings</h2>
            <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>Configure SMTP and notification preferences</p>
          </div>
        </div>
        {canEdit && activeTab !== 'logs' && (
          <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
            className="btn-primary">
            {saveMutation.isPending
              ? <span className="flex items-center gap-2"><span className="animate-spin">⟳</span> Saving...</span>
              : <><Save size={14} /> Save Settings</>
            }
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(var(--bg-hover))', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: activeTab === t.id ? 'rgba(var(--accent),0.15)' : 'transparent',
              color: activeTab === t.id ? 'rgb(var(--accent-light))' : 'rgb(var(--text-muted))',
              border: activeTab === t.id ? '1px solid rgba(var(--accent),0.25)' : '1px solid transparent',
            }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ─── SMTP TAB ─────────────────────────────────────────────── */}
      {activeTab === 'smtp' && (
        <div className="space-y-4">
          {/* Important notice */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl"
            style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <AlertTriangle size={15} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#f59e0b' }}>Save before testing</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                Click <strong>"Save Settings"</strong> (top right) before clicking Test Connection or Send Test Email.
                The server reads credentials from the database, not the form fields.
              </p>
            </div>
          </div>
          {/* Preset selector */}
          <div className="card p-5">
            <h3 className="section-title mb-3">Quick Setup — Choose Provider</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SMTP_PRESETS.map(p => (
                <button key={p.name} onClick={() => applyPreset(p)}
                  className="px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all"
                  style={{
                    background: selectedPreset === p.name ? 'rgba(var(--accent),0.15)' : 'rgba(var(--bg-hover))',
                    border: `1px solid ${selectedPreset === p.name ? 'rgba(var(--accent),0.35)' : 'rgba(var(--border))'}`,
                    color: selectedPreset === p.name ? 'rgb(var(--accent-light))' : 'rgb(var(--text-secondary))',
                  }}>
                  {p.name}
                </button>
              ))}
            </div>
            {selectedPreset && selectedPreset !== 'Custom' && (
              <div className="mt-3 p-3 rounded-xl flex items-start gap-2"
                style={{ background: 'rgba(var(--info),0.06)', border: '1px solid rgba(var(--info),0.15)' }}>
                <Info size={13} style={{ color: 'rgb(var(--info))', flexShrink: 0, marginTop: 1 }} />
                <p className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                  <strong>{selectedPreset}:</strong> {SMTP_PRESETS.find(p => p.name === selectedPreset)?.hint}
                </p>
              </div>
            )}
          </div>

          {/* SMTP Config */}
          <div className="card p-5 space-y-4">
            <h3 className="section-title">Server Configuration</h3>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="label">SMTP Host *</label>
                <input className="input-field font-mono"
                  placeholder="smtp.gmail.com"
                  value={localSettings.smtp_host || ''}
                  onChange={e => set('smtp_host', e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <label className="label">Port</label>
                <input type="number" className="input-field font-mono"
                  value={localSettings.smtp_port || '587'}
                  onChange={e => set('smtp_port', e.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl"
              style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>Use SSL/TLS</p>
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Enable for port 465. Use STARTTLS (false) for port 587</p>
              </div>
              <button type="button"
                onClick={() => canEdit && set('smtp_secure', localSettings.smtp_secure === 'true' ? 'false' : 'true')}
                disabled={!canEdit}
                className="relative w-10 h-5 rounded-full transition-all"
                style={{
                  background: localSettings.smtp_secure === 'true' ? 'rgb(var(--accent))' : 'rgba(var(--bg-hover))',
                  border: '1px solid rgba(var(--border))',
                }}>
                <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: localSettings.smtp_secure === 'true' ? '22px' : '2px' }} />
              </button>
            </div>
          </div>

          {/* Auth */}
          <div className="card p-5 space-y-4">
            <h3 className="section-title">Authentication</h3>
            <div>
              <label className="label">SMTP Username / Email</label>
              <input type="email" className="input-field"
                placeholder="your@email.com"
                value={localSettings.smtp_user || ''}
                onChange={e => set('smtp_user', e.target.value)}
                disabled={!canEdit}
              />
              <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
                {settings.smtp_user?.description}
              </p>
            </div>
            <div>
              <label className="label">SMTP Password / App Password</label>
              <PasswordField
                value={localSettings.smtp_password || ''}
                onChange={v => set('smtp_password', v)}
                placeholder="Enter password or App Password"
              />
              <p className="text-xs mt-1" style={{ color: 'rgb(var(--text-muted))' }}>
                For Gmail: use a 16-character App Password (not your Gmail password).
                <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer"
                  className="ml-1 underline" style={{ color: 'rgb(var(--accent-light))' }}>
                  Create App Password →
                </a>
              </p>
            </div>
          </div>

          {/* Sender */}
          <div className="card p-5 space-y-4">
            <h3 className="section-title">Sender Identity</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">From Name</label>
                <input className="input-field"
                  placeholder="Admin Panel"
                  value={localSettings.smtp_from_name || ''}
                  onChange={e => set('smtp_from_name', e.target.value)}
                  disabled={!canEdit}
                />
              </div>
              <div>
                <label className="label">From Email</label>
                <input type="email" className="input-field"
                  placeholder="noreply@yourcompany.com"
                  value={localSettings.smtp_from_email || ''}
                  onChange={e => set('smtp_from_email', e.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </div>
            <div>
              <label className="label">Reply-To (optional)</label>
              <input type="email" className="input-field"
                placeholder="support@yourcompany.com"
                value={localSettings.smtp_reply_to || ''}
                onChange={e => set('smtp_reply_to', e.target.value)}
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Test Connection */}
          {canEdit && (
            <div className="card p-5 space-y-4">
              <h3 className="section-title">Test & Verify</h3>

              {/* Connection test */}
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => testConnMutation.mutate()} disabled={testConnMutation.isPending}
                  className="btn-secondary gap-2"
                  style={{ color: connectionStatus === 'ok' ? '#22c55e' : connectionStatus === 'fail' ? '#ef4444' : 'rgb(var(--text-secondary))' }}>
                  {connectionStatus === 'testing'
                    ? <><span className="animate-spin">⟳</span> Testing...</>
                    : connectionStatus === 'ok'
                      ? <><Wifi size={14} /> Connected ✓</>
                      : connectionStatus === 'fail'
                        ? <><WifiOff size={14} /> Failed</>
                        : <><Play size={14} /> Test Connection</>
                  }
                </button>
                {connectionMsg && (
                  <span className="text-xs" style={{ color: connectionStatus === 'ok' ? '#22c55e' : '#ef4444' }}>
                    {connectionMsg}
                  </span>
                )}
              </div>

              {/* Send test email */}
              <div>
                <label className="label">Send Test Email</label>
                <div className="flex gap-2">
                  <input type="email" className="input-field flex-1"
                    placeholder="recipient@example.com"
                    value={testEmail}
                    onChange={e => { setTestEmail(e.target.value); setSendResult(null) }}
                    onKeyDown={e => e.key === 'Enter' && testEmail && sendTestMutation.mutate()}
                  />
                  <button
                    onClick={() => { setSendResult(null); sendTestMutation.mutate() }}
                    disabled={!testEmail || sendTestMutation.isPending}
                    className="btn-primary px-4 gap-2">
                    {sendTestMutation.isPending
                      ? <><span className="animate-spin inline-block">⟳</span> Sending...</>
                      : <><Send size={14} /> Send</>
                    }
                  </button>
                </div>

                {/* Result banner */}
                {sendResult && (
                  <div className="mt-3 p-3 rounded-xl"
                    style={{
                      background: sendResult.ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                      border: `1px solid ${sendResult.ok ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                    }}>
                    <div className="flex items-start gap-2">
                      {sendResult.ok
                        ? <CheckCircle2 size={15} style={{ color: '#22c55e', flexShrink: 0, marginTop: 1 }} />
                        : <XCircle size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold" style={{ color: sendResult.ok ? '#22c55e' : '#ef4444' }}>
                          {sendResult.msg}
                        </p>
                        {sendResult.detail && (
                          <p className="text-xs mt-0.5 font-mono break-all" style={{ color: 'rgb(var(--text-muted))' }}>
                            {sendResult.detail}
                          </p>
                        )}
                      </div>
                    </div>
                    {sendResult.ok && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-xs font-semibold" style={{ color: 'rgb(var(--text-muted))' }}>
                          Didn't receive it? Check:
                        </p>
                        {[
                          ['Spam / Junk folder', 'Most test emails land in spam first'],
                          ['Mailtrap inbox', 'If using sandbox.smtp.mailtrap.io — check mailtrap.io → Email Testing → Inboxes'],
                          ['From address', `Check the "From Email" field matches what your SMTP server allows`],
                          ['Promotions tab', 'Gmail often puts HTML emails in Promotions'],
                        ].map(([t, d]) => (
                          <div key={t} className="flex items-start gap-2">
                            <span style={{ color: '#f59e0b', fontSize: 11 }}>→</span>
                            <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                              <strong style={{ color: 'rgb(var(--text-secondary))' }}>{t}:</strong> {d}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs mt-2" style={{ color: 'rgb(var(--text-muted))' }}>
                  ⚠️ Save settings first, then send the test. The server reads settings from the database, not the current form.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── NOTIFICATIONS TAB ────────────────────────────────────── */}
      {activeTab === 'notifications' && (
        <div className="card p-5">
          <h3 className="section-title mb-1">Email Notification Preferences</h3>
          <p className="text-xs mb-5" style={{ color: 'rgb(var(--text-muted))' }}>
            Control which events trigger email notifications. In-app notifications are always sent.
          </p>
          <div>
            {NOTIF_SETTINGS.map(ns => (
              <ToggleRow
                key={ns.key}
                icon={ns.icon}
                label={ns.label}
                desc={ns.desc}
                checked={localSettings[ns.key] === 'true'}
                onChange={v => set(ns.key, v ? 'true' : 'false')}
                disabled={!canEdit || (ns.key !== 'email_notifications_enabled' && localSettings.email_notifications_enabled !== 'true')}
              />
            ))}
          </div>

          {localSettings.email_notifications_enabled !== 'true' && (
            <div className="mt-4 p-3 rounded-xl flex items-center gap-2"
              style={{ background: 'rgba(var(--warning),0.06)', border: '1px solid rgba(var(--warning),0.15)' }}>
              <AlertTriangle size={13} style={{ color: 'rgb(var(--warning))' }} />
              <p className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                Email notifications are disabled. Enable the master toggle to configure individual settings.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── LOGS TAB ─────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="card">
          <div className="flex items-center justify-between p-5"
            style={{ borderBottom: '1px solid rgba(var(--border))' }}>
            <div>
              <h3 className="section-title">Email Logs</h3>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>Recent emails sent from the system</p>
            </div>
            <button onClick={() => queryClient.invalidateQueries(['email-logs'])} className="btn-ghost p-2">
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>To</th>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Sent At</th>
                  <th>Sent By</th>
                </tr>
              </thead>
              <tbody>
                {!logsData?.length ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <Inbox size={32} className="mx-auto mb-2" style={{ color: 'rgb(var(--text-muted))' }} />
                      <p style={{ color: 'rgb(var(--text-muted))' }}>No emails sent yet</p>
                    </td>
                  </tr>
                ) : logsData.map(log => (
                  <tr key={log.id}>
                    <td>
                      <div>
                        <p className="text-xs font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{log.to_email}</p>
                        {log.to_name && <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{log.to_name}</p>}
                      </div>
                    </td>
                    <td><span className="text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>{log.subject}</span></td>
                    <td><span className="badge badge-neutral capitalize" style={{ fontSize: 10 }}>{log.template || '—'}</span></td>
                    <td>
                      <span className={`badge ${log.status === 'sent' ? 'badge-success' : 'badge-danger'} flex items-center gap-1`}>
                        {log.status === 'sent' ? <Check size={9} /> : <X size={9} />}
                        {log.status}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
                        {format(new Date(log.sent_at), 'MMM d, HH:mm')}
                      </span>
                    </td>
                    <td>
                      <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                        {log.first_name ? `${log.first_name} ${log.last_name}` : 'System'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
