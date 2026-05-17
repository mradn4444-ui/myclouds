import { useState, useEffect, useCallback, createContext, useContext } from 'react'

export interface AuthUser {
  id: string
  email: string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  loading: boolean
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const TOKEN_KEY = 'mycloud-auth-token'

function getBaseUrl() {
  const base = import.meta.env.BASE_URL ?? '/'
  return base.replace(/\/$/, '')
}

async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem(TOKEN_KEY)
  const res = await fetch(`${getBaseUrl()}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Erreur serveur')
  return data
}

import { createElement } from 'react'

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem(TOKEN_KEY),
    loading: true,
  })

  const verifyToken = useCallback(async (token: string) => {
    try {
      const data = await apiFetch('/auth/me')
      setState({ user: data.user, token, loading: false })
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      setState({ user: null, token: null, loading: false })
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      verifyToken(token)
    } else {
      setState((s) => ({ ...s, loading: false }))
    }
  }, [verifyToken])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem(TOKEN_KEY, data.token)
    setState({ user: data.user, token: data.token, loading: false })
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem(TOKEN_KEY, data.token)
    setState({ user: data.user, token: data.token, loading: false })
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setState({ user: null, token: null, loading: false })
  }, [])

  return createElement(
    AuthContext.Provider,
    { value: { ...state, login, register, logout } },
    children
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
