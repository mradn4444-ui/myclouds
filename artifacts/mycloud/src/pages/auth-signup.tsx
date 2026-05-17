import { useState } from 'react'
import { Link, useLocation } from 'wouter'

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [, navigate] = useLocation()

  const handleGoogleSignIn = async () => {
    setError(null)
    setLoading(true)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) setError(error.message)
      else if (data.url) window.location.href = data.url
    } catch {
      setError('Erreur de connexion Google')
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const form = e.currentTarget
    const email = (form.elements.namedItem('email') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    try {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        setError(error.message)
      } else {
        navigate('/auth?message=' + encodeURIComponent('Vérifiez votre email pour confirmer votre compte'))
      }
    } catch {
      setError("Erreur lors de l'inscription")
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

        {error && (
          <div className="auth-alert auth-alert-error">{error}</div>
        )}

        <div className="auth-card">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="auth-google-btn"
          >
            <svg className="auth-google-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#fff" d="M21.805 10.023H12v3.977h5.617c-.242 1.242-1 2.297-2.117 3l3.43 2.664C20.777 17.773 22 15.273 22 12.25c0-.758-.07-1.492-.195-2.227z" opacity=".9"/>
              <path fill="#fff" d="M12 22c2.7 0 4.965-.895 6.617-2.43l-3.43-2.664c-.895.602-2.04.957-3.188.957-2.453 0-4.531-1.656-5.273-3.883H3.195v2.742C4.836 19.867 8.195 22 12 22z" opacity=".7"/>
              <path fill="#fff" d="M6.727 13.98A5.94 5.94 0 0 1 6.375 12c0-.688.117-1.352.352-1.98V7.277H3.195A9.988 9.988 0 0 0 2 12c0 1.617.387 3.148 1.07 4.5l3.657-2.52z" opacity=".5"/>
              <path fill="#fff" d="M12 6.094c1.383 0 2.625.477 3.602 1.414l2.695-2.695C16.961 3.242 14.695 2.25 12 2.25 8.195 2.25 4.836 4.383 3.195 7.5l3.532 2.742C7.469 7.75 9.547 6.094 12 6.094z" opacity=".3"/>
            </svg>
            Continuer avec Google
          </button>

          <div className="auth-divider">
            <span>ou par email</span>
          </div>

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
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                'Créer mon compte'
              )}
            </button>
          </form>

          <div className="auth-footer">
            Déjà un compte ?{' '}
            <Link href="/auth" className="auth-link">Se connecter</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
