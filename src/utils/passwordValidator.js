export const PASSWORD_RULES = [
  { id: 'length',  label: 'At least 8 characters',                      test: (p) => p.length >= 8 },
  { id: 'upper',   label: '1+ uppercase letter (A–Z)',                   test: (p) => /[A-Z]/.test(p) },
  { id: 'lower',   label: '1+ lowercase letter (a–z)',                   test: (p) => /[a-z]/.test(p) },
  { id: 'digits',  label: '2+ numbers (0–9)',                            test: (p) => (p.match(/\d/g)||[]).length >= 2 },
  { id: 'special', label: '2+ special chars (@$!%*?&#^()_+=)',           test: (p) => (p.match(/[@$!%*?&#^()_+=\-[\]{}|]/g)||[]).length >= 2 },
]
export const validatePassword = (password) => {
  const results = PASSWORD_RULES.map(r => ({ ...r, passed: r.test(password || '') }))
  return { results, allPassed: results.every(r => r.passed) }
}
export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: '', color: '' }
  const { results } = validatePassword(password)
  const score = results.filter(r => r.passed).length
  if (score <= 1) return { score, label: 'Very Weak',   color: '#ef4444' }
  if (score === 2) return { score, label: 'Weak',        color: '#f97316' }
  if (score === 3) return { score, label: 'Fair',        color: '#f59e0b' }
  if (score === 4) return { score, label: 'Strong',      color: '#22c55e' }
  return              { score, label: 'Very Strong',  color: '#10b981' }
}
