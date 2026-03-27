import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(var(--bg-primary))' }}>
      <div className="text-center space-y-4">
        <div className="font-display text-8xl font-bold" style={{ color: 'rgba(var(--accent), 0.2)' }}>404</div>
        <h1 className="font-display text-2xl font-bold" style={{ color: 'rgb(var(--text-primary))' }}>Page Not Found</h1>
        <p style={{ color: 'rgb(var(--text-muted))' }}>The page you're looking for doesn't exist.</p>
        <Link to="/dashboard" className="btn-primary inline-flex">Go to Dashboard</Link>
      </div>
    </div>
  )
}
