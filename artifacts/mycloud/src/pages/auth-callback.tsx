import { useEffect } from 'react'
import { useLocation } from 'wouter'

export default function AuthCallback() {
  const [, navigate] = useLocation()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(
          new URLSearchParams(window.location.search).get('code') ?? ''
        )
        if (error) {
          navigate('/auth?error=' + encodeURIComponent('auth_callback_failed'))
        } else {
          navigate('/')
        }
      } catch {
        navigate('/auth?error=' + encodeURIComponent('auth_callback_failed'))
      }
    }

    handleCallback()
  }, [navigate])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400 text-sm">Connexion en cours...</p>
    </div>
  )
}
