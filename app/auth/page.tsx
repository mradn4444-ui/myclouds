import { signInWithEmail, signInWithGoogle } from './actions'

export default function AuthPage({
  searchParams,
}: {
  searchParams: { error?: string; message?: string }
}) {
  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">MyCloud</h1>
          <p className="text-gray-400 mt-2 text-sm">Votre espace personnel sécurisé</p>
        </div>

        {searchParams.error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {decodeURIComponent(searchParams.error)}
          </div>
        )}
        {searchParams.message && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
            {decodeURIComponent(searchParams.message)}
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white text-sm font-medium hover:bg-gray-750 hover:border-gray-600 transition-all duration-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuer avec Google
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-gray-900 text-gray-500">ou par email</span>
            </div>
          </div>

          <AuthTabs />
        </div>
      </div>
    </main>
  )
}

function AuthTabs() {
  return (
    <div className="space-y-6">
      <form action={signInWithEmail} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            placeholder="vous@exemple.com"
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Mot de passe
          </label>
          <input
            name="password"
            type="password"
            required
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors duration-200 shadow-lg shadow-indigo-500/20"
        >
          Se connecter
        </button>
      </form>

      <div className="text-center text-xs text-gray-500">
        Pas encore de compte ?{' '}
        <a href="/auth/signup" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
          Créer un compte
        </a>
      </div>
    </div>
  )
}
