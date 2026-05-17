import { useState, useEffect } from 'react'
import { Link, useLocation, useSearch } from 'wouter'
import { useAuth } from '@/hooks/useAuth'

export default function AuthPage() {
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const { login, user } = useAuth()
  const [, navigate] = useLocation()
  const search = useSearch()

  useEffect(() => {
    if (user) { navigate('/'); return; }
    const params = new URLSearchParams(search)
    const msg = params.get('message')
    if (msg) setMessage(decodeURIComponent(msg))
  }, [search, user, navigate])

  const handleEmailSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    try {
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-dot-grid" />
      <div className="auth-container">
        <div className="auth-brand">
          <span className="auth-logo">MYCLOUD</span>
          <p className="auth-tagline">Votre espace personnel</p>
        </div>

        {error && <div className="auth-alert auth-alert-error">{error}</div>}
        {message && <div className="auth-alert auth-alert-success">{message}</div>}

        <div className="auth-card">
          <form onSubmit={handleEmailSignIn} className="auth-form">
            <div className="auth-field">
              <input
                name="email"
                type="email"
                required
                placeholder=" "
                id="login-email"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className="auth-input"
              />
              <label htmlFor="login-email" className="auth-label">Email</label>
              <div className={`auth-underline${focusedField === 'email' ? ' active' : ''}`} />
            </div>

            <div className="auth-field">
              <input
                name="password"
                type="password"
                required
                placeholder=" "
                id="login-password"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className="auth-input"
              />
              <label htmlFor="login-password" className="auth-label">Mot de passe</label>
              <div className={`auth-underline${focusedField === 'password' ? ' active' : ''}`} />
            </div>

            <button type="submit" disabled={loading} className="auth-submit-btn">
              {loading ? <span className="auth-spinner" /> : 'Se connecter'}
            </button>
          </form>

          <div className="auth-footer">
            Pas encore de compte ?{' '}
            <Link href="/auth/signup" className="auth-link">Créer un compte</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
