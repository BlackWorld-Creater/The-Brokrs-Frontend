import { useState } from 'react'
import { Eye, EyeOff, Check, X } from 'lucide-react'
import { PASSWORD_RULES, validatePassword, getPasswordStrength } from '../../utils/passwordValidator'

export default function PasswordInput({ register, name, label, showStrength = true, error, watch }) {
  const [show, setShow] = useState(false)
  const value = watch ? (watch(name) || '') : ''
  const { results } = validatePassword(value)
  const strength = getPasswordStrength(value)

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          className="input-field pr-10"
          placeholder="Enter password..."
          {...register}
        />
        <button type="button" onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
          style={{ color: 'rgb(var(--text-muted))' }}>
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>

      {error && (
        <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{error.message}</p>
      )}

      {showStrength && value && (
        <div className="mt-2 space-y-1.5">
          {/* Strength bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(var(--bg-hover))' }}>
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${(strength.score / 5) * 100}%`, background: strength.color }} />
            </div>
            {strength.label && (
              <span className="text-xs font-semibold" style={{ color: strength.color, minWidth: 72 }}>
                {strength.label}
              </span>
            )}
          </div>

          {/* Rules */}
          <div className="grid grid-cols-1 gap-0.5">
            {results.map(r => (
              <div key={r.id} className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: r.passed ? 'rgba(34,197,94,0.15)' : 'rgba(var(--bg-hover))' }}>
                  {r.passed
                    ? <Check size={8} style={{ color: '#22c55e' }} strokeWidth={3} />
                    : <X    size={8} style={{ color: 'rgb(var(--text-muted))' }} strokeWidth={3} />
                  }
                </div>
                <span className="text-xs" style={{ color: r.passed ? '#22c55e' : 'rgb(var(--text-muted))' }}>
                  {r.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
