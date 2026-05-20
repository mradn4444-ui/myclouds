import { useState, useEffect, useCallback, createContext, useContext, createElement } from 'react'
import { AUTH_TOKEN_KEY, apiFetch } from '@/lib/api'

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
  acceptToken: (token: string) => Promise<void>
  logout: () => void
}

type AuthResponse = {
  token: string
  user: AuthUser
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  acceptToken: async () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem(AUTH_TOKEN_KEY),
    loading: true,
  })

  const verifyToken = useCallback(async (token: string) => {
    try {
      const data = await apiFetch<{ user: AuthUser }>('/auth/me')
      setState({ user: data.user, token, loading: false })
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      setState({ user: null, token: null, loading: false })
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (token) {
      verifyToken(token)
    } else {
      setState((s) => ({ ...s, loading: false }))
    }
  }, [verifyToken])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem(AUTH_TOKEN_KEY, data.token)
    setState({ user: data.user, token: data.token, loading: false })
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem(AUTH_TOKEN_KEY, data.token)
    setState({ user: data.user, token: data.token, loading: false })
  }, [])

  const acceptToken = useCallback(async (token: string) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    try {
      const data = await apiFetch<{ user: AuthUser }>('/auth/me')
      setState({ user: data.user, token, loading: false })
    } catch (err) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      setState({ user: null, token: null, loading: false })
      throw err
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    setState({ user: null, token: null, loading: false })
  }, [])

  return createElement(
    AuthContext.Provider,
    { value: { ...state, login, register, acceptToken, logout } },
    children
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
