import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import type { AuthUser, LoginRequest, RegisterRequest } from "@/lib/types"
import { authApi, clearTokens, setOnSessionExpired } from "@/lib/api"

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  permissions: Set<string>
  login: (data: LoginRequest) => Promise<"must_change_password" | "success">
  register: (data: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  hasPermission: (perm: string) => boolean
  hasAnyPermission: (...perms: string[]) => boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [permissions, setPermissions] = useState<Set<string>>(new Set())

  const extractPermissions = useCallback((u: AuthUser): Set<string> => {
    const perms = new Set<string>()
    for (const role of u.roles) {
      for (const perm of role.permissions) {
        perms.add(perm.code)
      }
    }
    return perms
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.me()
      setUser(me)
      setPermissions(extractPermissions(me))
      localStorage.setItem("user", JSON.stringify(me))
    } catch {
      setUser(null)
      setPermissions(new Set())
      clearTokens()
    }
  }, [extractPermissions])

  useEffect(() => {
    setOnSessionExpired(() => {
      setUser(null)
      setPermissions(new Set())
      window.history.replaceState({}, "", "/login")
      window.dispatchEvent(new PopStateEvent("popstate"))
    })
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (token) {
      refreshUser().finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [refreshUser])

  const login = useCallback(
    async (data: LoginRequest) => {
      await authApi.login(data)
      await refreshUser()
      const user = JSON.parse(localStorage.getItem("user") || "{}")
      return user.must_change_password ? "must_change_password" : "success"
    },
    [refreshUser]
  )

  const register = useCallback(
    async (data: RegisterRequest) => {
      await authApi.register(data)
    },
    []
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch { /* no-op */ }
    setUser(null)
    setPermissions(new Set())
  }, [])

  const hasPermission = useCallback(
    (perm: string) => permissions.has(perm),
    [permissions]
  )

  const hasAnyPermission = useCallback(
    (...perms: string[]) => perms.some((p) => permissions.has(p)),
    [permissions]
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        permissions,
        login,
        register,
        logout,
        hasPermission,
        hasAnyPermission,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
