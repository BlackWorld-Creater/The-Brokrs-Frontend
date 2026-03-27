import { useState } from 'react'
import { authAPI } from '../services/api'
import useAuthStore from '../store/authStore'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Save, User, Lock, Globe, Clock } from 'lucide-react'
import PasswordInput from '../components/ui/PasswordInput'
import { validatePassword } from '../utils/passwordValidator'
import { format } from 'date-fns'

export default function ProfilePage() {
  const { user, updateUser, refreshUser } = useAuthStore()
  const [tab, setTab] = useState('info')

  const { register: reg1, handleSubmit: hs1, formState: { isSubmitting: s1 } } = useForm({
    defaultValues: {
      firstName: user?.firstName, lastName: user?.lastName,
      phone: user?.phone, designation: user?.designation,
    }
  })

  const { register: reg2, handleSubmit: hs2, watch: watch2,
          formState: { isSubmitting: s2, errors: err2 }, reset: reset2 } = useForm()

  const onUpdateProfile = async (data) => {
    try {
      await authAPI.updateProfile(data)
      updateUser({ firstName: data.firstName, lastName: data.lastName })
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    }
  }

  const onChangePassword = async (data) => {
    const { allPassed } = validatePassword(data.newPassword || '')
    if (!allPassed) { toast.error('New password does not meet requirements'); return }
    if (data.newPassword !== data.confirmPassword) { toast.error('Passwords do not match'); return }
    try {
      await authAPI.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword })
      toast.success('Password changed successfully')
      reset2()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    }
  }

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Header card */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(var(--accent), 0.15)', border: '1px solid rgba(var(--accent), 0.25)' }}>
            <span className="font-display text-xl font-bold" style={{ color: 'rgb(var(--accent-light))' }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{user?.email}</p>
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {user?.roles?.map(r => <span key={r} className="badge badge-accent">{r}</span>)}
            </div>
          </div>
        </div>

        {/* Last login info */}
        {(user?.lastLogin || user?.last_login_ip) && (
          <div className="mt-4 pt-4 grid grid-cols-2 gap-3"
            style={{ borderTop: '1px solid rgba(var(--border))' }}>
            <div className="flex items-center gap-2">
              <Clock size={13} style={{ color: 'rgb(var(--text-muted))' }} />
              <div>
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Last Login</p>
                <p className="text-xs font-semibold" style={{ color: 'rgb(var(--text-secondary))' }}>
                  {user?.lastLogin
                    ? format(new Date(user.lastLogin), 'MMM d, yyyy HH:mm')
                    : user?.last_login
                    ? format(new Date(user.last_login), 'MMM d, yyyy HH:mm')
                    : '—'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Globe size={13} style={{ color: 'rgb(var(--text-muted))' }} />
              <div>
                <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>Login IP</p>
                <p className="text-xs font-mono font-semibold" style={{ color: 'rgb(var(--text-secondary))' }}>
                  {user?.lastLoginIP || user?.last_login_ip || '—'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(var(--bg-hover))', width: 'fit-content' }}>
        {[
          { id: 'info',     icon: User, label: 'Profile Info' },
          { id: 'security', icon: Lock, label: 'Change Password' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? 'rgba(var(--accent), 0.15)' : 'transparent',
              color: tab === t.id ? 'rgb(var(--accent-light))' : 'rgb(var(--text-muted))',
              border: tab === t.id ? '1px solid rgba(var(--accent), 0.25)' : '1px solid transparent',
            }}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {tab === 'info' && (
        <div className="card p-5">
          <form onSubmit={hs1(onUpdateProfile)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <input className="input-field" {...reg1('firstName', { required: true })} />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input className="input-field" {...reg1('lastName', { required: true })} />
              </div>
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input-field" {...reg1('phone')} />
            </div>
            <div>
              <label className="label">Designation</label>
              <input className="input-field" {...reg1('designation')} />
            </div>
            <div className="flex justify-end pt-1">
              <button type="submit" disabled={s1} className="btn-primary">
                <Save size={14} /> {s1 ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Security / Change Password tab */}
      {tab === 'security' && (
        <div className="card p-5">
          <div className="mb-4 p-3 rounded-xl"
            style={{ background: 'rgba(var(--accent), 0.06)', border: '1px solid rgba(var(--accent), 0.12)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'rgb(var(--accent-light))' }}>
              Password Requirements
            </p>
            <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>
              Min 8 chars · 1+ uppercase · 1+ lowercase · 2+ numbers · 2+ special characters
            </p>
          </div>

          <form onSubmit={hs2(onChangePassword)} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input type="password" className="input-field"
                {...reg2('currentPassword', { required: 'Current password is required' })} />
              {err2.currentPassword && (
                <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{err2.currentPassword.message}</p>
              )}
            </div>

            <PasswordInput
              register={reg2('newPassword', {
                required: 'New password is required',
                validate: (v) => validatePassword(v).allPassed || 'Password does not meet requirements'
              })}
              name="newPassword"
              label="New Password"
              showStrength={true}
              error={err2.newPassword}
              watch={watch2}
            />

            <div>
              <label className="label">Confirm New Password</label>
              <input type="password" className="input-field"
                {...reg2('confirmPassword', { required: 'Please confirm your password' })} />
              {err2.confirmPassword && (
                <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{err2.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <button type="submit" disabled={s2} className="btn-primary">
                <Lock size={14} /> {s2 ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
