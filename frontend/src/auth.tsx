import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { api, clearToken, getToken, saveToken } from './lib/api'

interface AuthContextValue {
  token: string | null
  email: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getToken)
  const [email, setEmail] = useState<string | null>(() =>
    localStorage.getItem('avito_email'),
  )

  useEffect(() => {
    const onUnauthorized = () => {
      setToken(null)
      setEmail(null)
    }
    window.addEventListener('avito:unauthorized', onUnauthorized)
    return () => window.removeEventListener('avito:unauthorized', onUnauthorized)
  }, [])

  const login = async (em: string, password: string) => {
    const res = await api.login(em, password)
    saveToken(res.accessToken)
    localStorage.setItem('avito_email', res.email)
    setToken(res.accessToken)
    setEmail(res.email)
  }

  const logout = () => {
    clearToken()
    localStorage.removeItem('avito_email')
    setToken(null)
    setEmail(null)
  }

  return (
    <AuthContext.Provider value={{ token, email, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
