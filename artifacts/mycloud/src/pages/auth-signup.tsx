import { useState, useEffect } from 'react'
import { Link, useLocation } from 'wouter'
import { useAuth } from '@/hooks/useAuth'
import { getApiUrl } from '@/lib/api'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const { register, user } = useAuth()
  const [, navigate] = useLocation()

  useEffect(() => {
    if (user) navigate('/')
  }, [user, navigate])

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    try {
      await register(email, password)
      navigate('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription")
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
          <p className="auth-tagline">Créer un compte</p>
        </div>

        {error && <div className="auth-alert auth-alert-error">{error}</div>}

        <div className="auth-card">
          <form onSubmit={handleSignUp} className="auth-form">
            <div className="auth-field">
              <input
                name="email"
                type="email"
                required
                placeholder=" "
                id="signup-email"
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                className="auth-input"
              />
              <label htmlFor="signup-email" className="auth-label">Email</label>
              <div className={`auth-underline${focusedField === 'email' ? ' active' : ''}`} />
            </div>

            <div className="auth-field">
              <input
                name="password"
                type="password"
                required
                minLength={6}
                placeholder=" "
                id="signup-password"
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                className="auth-input"
              />
              <label htmlFor="signup-password" className="auth-label">Mot de passe (6+ caractères)</label>
              <div className={`auth-underline${focusedField === 'password' ? ' active' : ''}`} />
            </div>

            <button type="submit" disabled={loading} className="auth-submit-btn">
              {loading ? <span className="auth-spinner" /> : 'Créer mon compte'}
            </button>
          </form>

          <div className="auth-oauth-row">
            <a className="auth-oauth-btn" href={getApiUrl('/auth/oauth/google')}>Google</a>
            <a className="auth-oauth-btn" href={getApiUrl('/auth/oauth/github')}>GitHub</a>
          </div>

          <div className="auth-footer">
            Déjà un compte ?{' '}
            <Link href="/auth" className="auth-link">Se connecter</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
