import { signUpWithEmail, signInWithGoogle } from '../actions'

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string }
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
          <h1 className="text-3xl font-bold text-white tracking-tight">Créer un compte</h1>
          <p className="text-gray-400 mt-2 text-sm">Rejoignez MyCloud</p>
        </div>

        {searchParams.error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {decodeURIComponent(searchParams.error)}
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <form action={signInWithGoogle}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-gray-700 bg-gray-800 text-white text-sm font-medium hover:bg-gray-700 hover:border-gray-600 transition-all duration-200"
            >
              Inscription avec Google
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

          <form action={signUpWithEmail} className="space-y-4">
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
                minLength={6}
                placeholder="6 caractères minimum"
                className="w-full px-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors duration-200 shadow-lg shadow-indigo-500/20"
            >
              Créer mon compte
            </button>
          </form>

          <div className="text-center text-xs text-gray-500 mt-6">
            Déjà un compte ?{' '}
            <a href="/auth" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Se connecter
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
