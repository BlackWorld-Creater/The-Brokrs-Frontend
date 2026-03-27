import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Lock, Mail, Zap, Sun, Moon, ShieldCheck, BarChart3, Globe } from 'lucide-react'
import useAuthStore from '../store/authStore'
import useThemeStore from '../store/themeStore'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const { login, isLoading } = useAuthStore()
  const { theme, toggleTheme, initTheme } = useThemeStore()
  const isDark = theme === 'dark'
  const navigate = useNavigate()

  useEffect(() => { initTheme() }, [])

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { email: 'admin@erpadmin.com', password: 'Admin@123456' }
  })

  const onSubmit = async (data) => {
    const result = await login(data.email, data.password)
    if (result.success) {
      toast.success('Welcome back!')
      navigate('/dashboard')
    } else {
      toast.error(result.message)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'rgb(var(--bg-primary))' }}>

      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-between w-[460px] relative overflow-hidden flex-shrink-0"
        style={{
          background: isDark
            ? 'linear-gradient(155deg, rgb(20 20 35) 0%, rgb(28 20 55) 100%)'
            : 'linear-gradient(155deg, rgb(238 240 255) 0%, rgb(220 224 255) 100%)',
        }}>

        {/* Orbs */}
        <div className="absolute top-[-80px] left-[-80px] w-80 h-80 rounded-full pointer-events-none"
          style={{ background: isDark ? 'radial-gradient(circle, rgba(var(--accent), 0.25), transparent)' : 'radial-gradient(circle, rgba(var(--accent), 0.18), transparent)' }} />
        <div className="absolute bottom-[-60px] right-[-60px] w-64 h-64 rounded-full pointer-events-none"
          style={{ background: isDark ? 'radial-gradient(circle, rgba(139,92,246,0.2), transparent)' : 'radial-gradient(circle, rgba(139,92,246,0.15), transparent)' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3 px-10 pt-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(var(--accent), 0.15)', border: '1px solid rgba(var(--accent), 0.3)' }}>
            <Zap size={20} style={{ color: 'rgb(var(--accent-light))' }} />
          </div>
          <div>
            <span className="font-display font-bold text-xl" style={{ color: 'rgb(var(--text-primary))' }}>Admin</span>
            <span className="font-display font-bold text-xl ml-1" style={{ color: 'rgb(var(--accent-light))' }}>Panel</span>
          </div>
        </div>

        {/* Features */}
        <div className="relative z-10 px-10 pb-4 space-y-6">
          <div>
            <h2 className="font-display text-3xl font-bold leading-tight mb-3" style={{ color: 'rgb(var(--text-primary))' }}>
              Enterprise-Grade<br />Access Control
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgb(var(--text-secondary))' }}>
              Complete management panel with granular permissions, real-time analytics, IP tracking, and full audit trails.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { icon: ShieldCheck, label: 'Role-Based Access Control', desc: 'Per-module, per-user permissions' },
              { icon: Globe, label: 'IP Tracking & Geolocation', desc: 'Monitor all access attempts' },
              { icon: BarChart3, label: 'Real-time Analytics', desc: 'Live dashboard & reports' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(var(--accent), 0.06)', border: '1px solid rgba(var(--accent), 0.1)' }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(var(--accent), 0.15)' }}>
                  <Icon size={14} style={{ color: 'rgb(var(--accent-light))' }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'rgb(var(--text-primary))' }}>{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgb(var(--text-muted))' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 px-10 pb-8">
          <p className="text-xs" style={{ color: 'rgb(var(--text-muted))' }}>© 2025 Admin Panel v2.0</p>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center p-6 relative">

        {/* Theme toggle top-right */}
        <button
          onClick={toggleTheme}
          className="absolute top-5 right-5 w-9 h-9 rounded-xl flex items-center justify-center transition-all"
          style={{ background: 'rgba(var(--bg-hover))', border: '1px solid rgba(var(--border))', color: 'rgb(var(--text-secondary))' }}
          title="Toggle theme">
          {isDark ? <Sun size={15} style={{ color: '#f59e0b' }} /> : <Moon size={15} style={{ color: '#6366f1' }} />}
        </button>

        <div className="w-full max-w-sm animate-slide-up">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(var(--accent), 0.15)', border: '1px solid rgba(var(--accent), 0.3)' }}>
              <Zap size={16} style={{ color: 'rgb(var(--accent-light))' }} />
            </div>
            <div>
              <span className="font-display font-bold" style={{ color: 'rgb(var(--text-primary))' }}>Admin</span>
              <span className="font-display font-bold ml-1" style={{ color: 'rgb(var(--accent-light))' }}>Panel</span>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold mb-1.5" style={{ color: 'rgb(var(--text-primary))' }}>
              Sign in
            </h1>
            <p className="text-sm" style={{ color: 'rgb(var(--text-muted))' }}>
              Access your management panel
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(var(--text-muted))' }} />
                <input type="email" className="input-field pl-9"
                  placeholder="admin@company.com"
                  {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/, message: 'Invalid email' } })} />
              </div>
              {errors.email && <p className="text-xs mt-1.5" style={{ color: 'rgb(var(--danger))' }}>{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(var(--text-muted))' }} />
                <input type={showPassword ? 'text' : 'password'} className="input-field pl-9 pr-10"
                  placeholder="Enter your password"
                  {...register('password', { required: 'Password is required' })} />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'rgb(var(--text-muted))' }}>
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && <p className="text-xs mt-1.5" style={{ color: 'rgb(var(--danger))' }}>{errors.password.message}</p>}
            </div>

            <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-2.5 mt-1">
              {isLoading
                ? <span className="flex items-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="32" strokeDashoffset="32" />
                    </svg>
                    Signing in...
                  </span>
                : 'Sign in'
              }
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-5 p-3 rounded-xl" style={{ background: 'rgba(var(--accent), 0.06)', border: '1px solid rgba(var(--accent), 0.12)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: 'rgb(var(--accent-light))' }}>Demo Credentials</p>
            <p className="text-xs font-mono" style={{ color: 'rgb(var(--text-muted))' }}>
              admin@erpadmin.com&nbsp;&nbsp;/&nbsp;&nbsp;Admin@123456
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
