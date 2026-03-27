import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersAPI, modulesAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import {
  ArrowLeft, Shield, Mail, Phone, Building, Calendar,
  Check, Key, Globe, Clock, Monitor, Smartphone, Chrome,
  AlertTriangle, RefreshCw, UserCheck, Ban, X
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import PasswordInput from '../components/ui/PasswordInput'
import { validatePassword } from '../utils/passwordValidator'

const PERM_TYPES = ['create','read','update','delete','export','import','approve','manage']
const PERM_COLOR = {
  create:'#22c55e', read:'#6366f1', update:'#f59e0b', delete:'#ef4444',
  export:'#06b6d4', import:'#8b5cf6', approve:'#f97316', manage:'#ec4899'
}
const STATUS_BADGE = {
  active:'badge-success', inactive:'badge-neutral',
  suspended:'badge-danger', pending:'badge-warning'
}

/* ── Login Session Card ───────────────────────────────────────────── */
function SessionCard({ session }) {
  const isActive = session.is_active
  const isSuspicious = session.is_suspicious
  const DeviceIcon = session.device_type === 'Mobile' ? Smartphone : Monitor

  return (
    <div className="p-3 rounded-xl transition-all"
      style={{
        background: isSuspicious ? 'rgba(var(--danger), 0.06)' : 'rgba(var(--bg-hover))',
        border: `1px solid ${isSuspicious ? 'rgba(var(--danger), 0.2)' : 'rgba(var(--border))'}`,
      }}>
      <div className="flex items-start gap-3">
        {/* Status dot */}
        <div className="flex flex-col items-center gap-1 pt-0.5 flex-shrink-0">
          <div className="w-2.5 h-2.5 rounded-full"
            style={{ background: isActive ? 'rgb(var(--success))' : 'rgba(var(--text-muted))' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* IP */}
            <span className="ip-chip">
              <Globe size={9} />
              {session.ip_address || '—'}
            </span>

            {/* Device & Browser */}
            <span className="flex items-center gap-1 text-xs"
              style={{ color: 'rgb(var(--text-secondary))' }}>
              <DeviceIcon size={11} />
              {session.device_type || 'Desktop'}
            </span>
            {session.browser && (
              <span className="badge badge-neutral" style={{ fontSize: 10 }}>
                {session.browser}
              </span>
            )}

            {/* Status badges */}
            {isActive && <span className="badge badge-success" style={{ fontSize: 10 }}>Active</span>}
            {isSuspicious && (
              <span className="badge badge-danger" style={{ fontSize: 10 }}>
                <AlertTriangle size={8} /> Suspicious
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
              <Clock size={9} className="inline mr-1" />
              {session.login_at ? formatDistanceToNow(new Date(session.login_at), { addSuffix: true }) : '—'}
            </span>
            {session.logout_at && (
              <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                Logged out {formatDistanceToNow(new Date(session.logout_at), { addSuffix: true })}
              </span>
            )}
            {session.country && (
              <span className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
                📍 {session.city ? `${session.city}, ` : ''}{session.country}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Main Page ────────────────────────────────────────────────────── */
export default function UserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hasPermission } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('profile')
  const [customPerms, setCustomPerms] = useState(null)
  const [savingPerms, setSavingPerms] = useState(false)

  /* queries */
  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersAPI.getById(id).then(r => r.data.data),
  })
  const { data: modules } = useQuery({
    queryKey: ['modules'],
    queryFn: () => modulesAPI.getAll().then(r => r.data.data),
  })
  const { data: loginHistory } = useQuery({
    queryKey: ['user-login-history', id],
    queryFn: () => usersAPI.getLoginHistory
      ? usersAPI.getLoginHistory(id).then(r => r.data.data)
      : Promise.resolve([]),
    enabled: tab === 'sessions',
  })

  /* reset-password mutation — uses PasswordInput + strength check */
  const [newPwd, setNewPwd] = useState('')
  const resetMutation = useMutation({
    mutationFn: () => usersAPI.resetPassword(id, { newPassword: newPwd }),
    onSuccess: () => { toast.success('Password reset successfully'); setNewPwd('') },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  })

  /* permissions helpers */
  const initPerms = () => {
    if (customPerms) return
    setCustomPerms({})
  }
  const togglePerm = (moduleId, perm) => {
    if (!customPerms || !hasPermission('roles','manage')) return
    setCustomPerms(p => ({
      ...p,
      [moduleId]: { ...p[moduleId], [perm]: !(p[moduleId]?.[perm]) }
    }))
  }
  const toggleAllPerms = (moduleId) => {
    if (!customPerms || !hasPermission('roles','manage')) return
    const allSet = PERM_TYPES.every(p => customPerms[moduleId]?.[p])
    setCustomPerms(prev => ({
      ...prev,
      [moduleId]: Object.fromEntries(PERM_TYPES.map(p => [p, !allSet]))
    }))
  }
  const savePermissions = async () => {
    if (!customPerms) return
    setSavingPerms(true)
    try {
      const permissions = []
      for (const [moduleId, mp] of Object.entries(customPerms)) {
        for (const [permType, isGranted] of Object.entries(mp)) {
          permissions.push({ moduleId, permissionType: permType, isGranted })
        }
      }
      await usersAPI.updatePermissions(id, { permissions })
      toast.success('Custom permissions saved')
      queryClient.invalidateQueries(['user', id])
    } catch {
      toast.error('Failed to save permissions')
    } finally {
      setSavingPerms(false)
    }
  }

  /* status toggle */
  const statusMutation = useMutation({
    mutationFn: (newStatus) => usersAPI.update(id, {
      firstName: user.first_name, lastName: user.last_name,
      phone: user.phone, departmentId: user.department_id,
      designation: user.designation, status: newStatus,
    }),
    onSuccess: () => {
      toast.success('Status updated')
      queryClient.invalidateQueries(['user', id])
    },
    onError: () => toast.error('Failed to update status'),
  })

  if (isLoading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-32 rounded" style={{ background: 'rgba(var(--bg-hover))' }} />
      <div className="card h-40" />
      <div className="grid grid-cols-2 gap-4">
        <div className="card h-64" /><div className="card h-64" />
      </div>
    </div>
  )
  if (!user) return (
    <div className="card p-16 text-center">
      <p className="text-lg font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>User not found</p>
      <button onClick={() => navigate('/users')} className="btn-secondary mt-4 mx-auto">
        <ArrowLeft size={14} /> Back to Users
      </button>
    </div>
  )

  const TABS = [
    { id: 'profile',     label: 'Profile' },
    { id: 'sessions',    label: `Sessions${user.loginSessions?.length ? ` (${user.loginSessions.length})` : ''}` },
    { id: 'permissions', label: 'Permissions' },
    { id: 'security',    label: 'Security' },
  ]

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={() => navigate('/users')}
        className="flex items-center gap-2 text-sm transition-colors"
        style={{ color: 'rgb(var(--text-muted))' }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgb(var(--accent-light))'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgb(var(--text-muted))'}>
        <ArrowLeft size={15} /> Back to Users
      </button>

      {/* ── Header card ─────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(var(--accent), 0.15)', border: '1px solid rgba(var(--accent), 0.25)' }}>
            <span className="text-xl font-display font-bold" style={{ color: 'rgb(var(--accent-light))' }}>
              {user.first_name?.[0]}{user.last_name?.[0]}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="font-display text-xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>
                {user.first_name} {user.last_name}
              </h1>
              <span className={`badge ${STATUS_BADGE[user.status] || 'badge-neutral'}`}>
                {user.status}
              </span>
            </div>
            <p className="text-sm mb-2" style={{ color: 'rgb(var(--text-muted))' }}>
              {user.designation || 'No designation'} {user.department_name && `· ${user.department_name}`}
            </p>
            <div className="flex flex-wrap gap-1">
              {user.roles?.map(r => (
                <span key={r.id} className="badge badge-accent">{r.name}</span>
              ))}
            </div>
          </div>

          {/* Right info block */}
          <div className="sm:text-right space-y-2 flex-shrink-0">
            <div>
              <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Employee ID</p>
              <p className="font-mono font-bold text-sm" style={{ color: 'rgb(var(--text-primary))' }}>
                {user.employee_id}
              </p>
            </div>
            {user.last_login && (
              <div>
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Last Login</p>
                <p className="text-xs font-medium" style={{ color: 'rgb(var(--text-secondary))' }}>
                  {format(new Date(user.last_login), 'MMM d, HH:mm')}
                </p>
              </div>
            )}
            {user.last_login_ip && (
              <div>
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Last IP</p>
                <span className="ip-chip text-xs">
                  <Globe size={9} />{user.last_login_ip}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Previous login row */}
        {user.previous_login && (
          <div className="mt-4 pt-4 flex flex-wrap gap-6"
            style={{ borderTop: '1px solid rgba(var(--border))' }}>
            <div>
              <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Previous Login</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: 'rgb(var(--text-secondary))' }}>
                {format(new Date(user.previous_login), 'MMM d, yyyy HH:mm')}
              </p>
            </div>
            {user.previous_login_ip && (
              <div>
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Previous IP</p>
                <span className="ip-chip text-xs mt-0.5">
                  <Globe size={9} />{user.previous_login_ip}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Tabs ───────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl flex-wrap"
        style={{ background: 'rgba(var(--bg-hover))', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.id}
            onClick={() => { setTab(t.id); if (t.id === 'permissions') initPerms() }}
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

      {/* ── PROFILE TAB ────────────────────────────────────────── */}
      {tab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contact */}
          <div className="card p-5 space-y-3">
            <h3 className="section-title">Contact Information</h3>
            {[
              { icon: Mail,     label: 'Email',       value: user.email },
              { icon: Phone,    label: 'Phone',       value: user.phone || '—' },
              { icon: Building, label: 'Department',  value: user.department_name || '—' },
              { icon: Calendar, label: 'Joined',      value: user.date_of_joining ? format(new Date(user.date_of_joining), 'MMM d, yyyy') : '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(var(--bg-hover))' }}>
                  <Icon size={13} style={{ color: 'rgb(var(--text-muted))' }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>{label}</p>
                  <p className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Account status */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="section-title">Account Status</h3>
              {hasPermission('users','update') && (
                <div className="flex gap-2">
                  {user.status !== 'active' && (
                    <button onClick={() => statusMutation.mutate('active')}
                      disabled={statusMutation.isPending}
                      className="btn-secondary text-xs px-2 py-1"
                      style={{ color: 'rgb(var(--success))' }}>
                      <UserCheck size={11} /> Activate
                    </button>
                  )}
                  {user.status !== 'suspended' && (
                    <button onClick={() => statusMutation.mutate('suspended')}
                      disabled={statusMutation.isPending}
                      className="btn-secondary text-xs px-2 py-1"
                      style={{ color: 'rgb(var(--danger))' }}>
                      <Ban size={11} /> Suspend
                    </button>
                  )}
                </div>
              )}
            </div>
            {[
              { label: 'Status',         value: user.status,               badge: STATUS_BADGE[user.status] },
              { label: 'Email Verified', value: user.email_verified ? 'Yes' : 'No' },
              { label: '2FA Enabled',    value: user.two_factor_enabled ? 'Enabled' : 'Disabled' },
              { label: 'Last Login',     value: user.last_login ? format(new Date(user.last_login), 'MMM d, yyyy HH:mm') : 'Never' },
              { label: 'Last Login IP',  value: user.last_login_ip || '—', ip: true },
              { label: 'Member Since',   value: format(new Date(user.created_at), 'MMM d, yyyy') },
            ].map(({ label, value, badge, ip }) => (
              <div key={label} className="flex items-center justify-between py-0.5">
                <span className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>{label}</span>
                {badge
                  ? <span className={`badge ${badge}`}>{value}</span>
                  : ip && value !== '—'
                    ? <span className="ip-chip"><Globe size={9} />{value}</span>
                    : <span className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>{value}</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SESSIONS TAB ───────────────────────────────────────── */}
      {tab === 'sessions' && (
        <div className="card">
          <div className="flex items-center justify-between p-5"
            style={{ borderBottom: '1px solid rgba(var(--border))' }}>
            <div>
              <h3 className="section-title">Login Sessions</h3>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                Recent login history with IP addresses and device info
              </p>
            </div>
            <button onClick={() => queryClient.invalidateQueries(['user-login-history', id])}
              className="btn-ghost p-1.5"><RefreshCw size={13} /></button>
          </div>

          <div className="p-5 space-y-2">
            {/* Current last login summary */}
            {user.last_login_ip && (
              <div className="p-3 rounded-xl mb-4"
                style={{ background: 'rgba(var(--accent), 0.06)', border: '1px solid rgba(var(--accent), 0.15)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: 'rgb(var(--success))' }} />
                  <p className="text-xs font-semibold" style={{ color: 'rgb(var(--accent-light))' }}>
                    Most Recent Login
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                  <span className="ip-chip"><Globe size={9} />{user.last_login_ip}</span>
                  {user.last_login && (
                    <span>{format(new Date(user.last_login), 'MMM d, yyyy HH:mm:ss')}</span>
                  )}
                </div>
              </div>
            )}

            {user.previous_login_ip && (
              <div className="p-3 rounded-xl mb-2"
                style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))' }}>
                <p className="text-xs font-medium mb-1" style={{ color: 'rgb(var(--text-muted))' }}>Previous Login</p>
                <div className="flex flex-wrap gap-4 text-xs" style={{ color: 'rgb(var(--text-secondary))' }}>
                  <span className="ip-chip"><Globe size={9} />{user.previous_login_ip}</span>
                  {user.previous_login && (
                    <span>{format(new Date(user.previous_login), 'MMM d, yyyy HH:mm:ss')}</span>
                  )}
                </div>
              </div>
            )}

            {/* Session history */}
            {user.loginSessions?.length > 0 ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-widest pt-2 pb-1"
                  style={{ color: 'rgb(var(--text-muted))' }}>Session History</p>
                {user.loginSessions.map((s, i) => (
                  <SessionCard key={i} session={s} />
                ))}
              </>
            ) : (
              <div className="text-center py-8">
                <Clock size={32} className="mx-auto mb-2" style={{ color: 'rgb(var(--text-muted))' }} />
                <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
                  No session history available yet
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PERMISSIONS TAB ────────────────────────────────────── */}
      {tab === 'permissions' && (
        <div className="card">
          <div className="flex items-center justify-between p-5"
            style={{ borderBottom: '1px solid rgba(var(--border))' }}>
            <div>
              <h3 className="section-title">Custom Permissions</h3>
              <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                Override role-based permissions for this user specifically
              </p>
            </div>
            {hasPermission('roles','manage') && (
              <button onClick={savePermissions} disabled={savingPerms || !customPerms}
                className="btn-primary">
                {savingPerms
                  ? <span className="flex items-center gap-2">
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="32"/>
                      </svg>
                      Saving...
                    </span>
                  : 'Save Overrides'
                }
              </button>
            )}
          </div>

          <div className="p-5 overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th className="text-left pb-3 pr-4"
                    style={{ color: 'rgb(var(--text-muted))', fontWeight: 600, width: 170, fontSize: 11, textTransform:'uppercase', letterSpacing:'0.06em' }}>
                    Module
                  </th>
                  {PERM_TYPES.map(p => (
                    <th key={p} className="pb-3 text-center"
                      style={{ color: PERM_COLOR[p], fontSize: 10, textTransform:'uppercase', letterSpacing:'0.06em', minWidth: 50 }}>
                      {p}
                    </th>
                  ))}
                  <th className="pb-3 text-center text-xs"
                    style={{ color: 'rgb(var(--text-muted))', fontSize: 10 }}>ALL</th>
                </tr>
              </thead>
              <tbody>
                {modules?.map(mod => {
                  const allSet = PERM_TYPES.every(p => customPerms?.[mod.id]?.[p])
                  return (
                    <tr key={mod.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5 pr-4">
                        <span className="text-sm font-medium" style={{ color: 'rgb(var(--text-primary))' }}>
                          {mod.name}
                        </span>
                      </td>
                      {PERM_TYPES.map(p => (
                        <td key={p} className="py-2.5 text-center">
                          <button onClick={() => togglePerm(mod.id, p)}
                            className="w-6 h-6 rounded flex items-center justify-center mx-auto transition-all"
                            style={{
                              background: customPerms?.[mod.id]?.[p] ? `${PERM_COLOR[p]}20` : 'rgba(var(--bg-hover))',
                              border: `1px solid ${customPerms?.[mod.id]?.[p] ? PERM_COLOR[p]+'50' : 'rgba(var(--border))'}`,
                              cursor: hasPermission('roles','manage') ? 'pointer' : 'not-allowed',
                            }}>
                            {customPerms?.[mod.id]?.[p] && (
                              <Check size={10} style={{ color: PERM_COLOR[p] }} strokeWidth={3} />
                            )}
                          </button>
                        </td>
                      ))}
                      <td className="py-2.5 text-center">
                        <button onClick={() => toggleAllPerms(mod.id)}
                          className="w-6 h-6 rounded flex items-center justify-center mx-auto transition-all"
                          style={{
                            background: allSet ? 'rgba(var(--accent), 0.18)' : 'rgba(var(--bg-hover))',
                            border: `1px solid ${allSet ? 'rgba(var(--accent), 0.4)' : 'rgba(var(--border))'}`,
                            cursor: hasPermission('roles','manage') ? 'pointer' : 'not-allowed',
                          }}>
                          {allSet && <Check size={10} style={{ color: 'rgb(var(--accent-light))' }} strokeWidth={3} />}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SECURITY TAB ───────────────────────────────────────── */}
      {tab === 'security' && (
        <div className="max-w-md space-y-4">
          {hasPermission('users','update') && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(var(--danger), 0.1)', border: '1px solid rgba(var(--danger), 0.2)' }}>
                  <Key size={15} style={{ color: 'rgb(var(--danger))' }} />
                </div>
                <div>
                  <h3 className="section-title">Admin Password Reset</h3>
                  <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>
                    User will be forced to change on next login
                  </p>
                </div>
              </div>

              {/* Password strength input */}
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Enter new password..."
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                  />
                </div>
                {/* inline strength using utility */}
                {newPwd && (() => {
                  const { results } = validatePassword(newPwd)
                  const passed = results.filter(r => r.passed).length
                  const colors = ['','#ef4444','#f97316','#f59e0b','#22c55e','#10b981']
                  return (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className="flex-1 h-1 rounded-full transition-all"
                            style={{ background: i <= passed ? colors[passed] : 'rgba(var(--bg-hover))' }} />
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>

              <button
                onClick={() => {
                  if (!newPwd) return toast.error('Enter a new password')
                  const { allPassed } = validatePassword(newPwd)
                  if (!allPassed) return toast.error('Password does not meet requirements')
                  resetMutation.mutate()
                }}
                disabled={!newPwd || resetMutation.isPending}
                className="btn-danger w-full justify-center">
                <Key size={13} />
                {resetMutation.isPending ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          )}

          {/* Security info */}
          <div className="card p-5 space-y-3">
            <h3 className="section-title">Security Info</h3>
            {[
              { label: 'Must Change Password', value: user.must_change_password ? 'Yes' : 'No',
                color: user.must_change_password ? 'rgb(var(--warning))' : 'rgb(var(--success))' },
              { label: 'Email Verified',        value: user.email_verified ? 'Verified' : 'Not Verified',
                color: user.email_verified ? 'rgb(var(--success))' : 'rgb(var(--danger))' },
              { label: '2FA Status',            value: user.two_factor_enabled ? 'Enabled' : 'Disabled',
                color: user.two_factor_enabled ? 'rgb(var(--success))' : 'rgb(var(--text-muted))' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between py-0.5">
                <span className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>{label}</span>
                <span className="text-sm font-semibold" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
