import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  UserOut,
  ChangePasswordRequest,
  ForceChangePasswordRequest,
} from "./types"

const API_BASE = import.meta.env.API_URL || "http://localhost:8000/api/v1"

class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

let onSessionExpired: (() => void) | null = null

export function setOnSessionExpired(cb: () => void) {
  onSessionExpired = cb
}

function getAccessToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("access_token")
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("refresh_token")
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem("access_token", access)
  localStorage.setItem("refresh_token", refresh)
}

function clearTokens() {
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
  localStorage.removeItem("user")
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401 && token) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      headers["Authorization"] = `Bearer ${getAccessToken()}`
      const retry = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
      })
      if (retry.ok) {
        if (retry.status === 204) return undefined as T
        return retry.json()
      }
      clearTokens()
      onSessionExpired?.()
      throw new ApiError(retry.status, "Sesion expirada")
    }
    clearTokens()
    onSessionExpired?.()
    throw new ApiError(401, "Sesion expirada")
  }

  if (!res.ok) {
    let detail = "Error desconocido"
    try {
      const body = await res.json()
      detail = body.detail || JSON.stringify(body)
    } catch {}
    throw new ApiError(res.status, detail)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) return false

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    })
    if (!res.ok) return false
    const data: TokenResponse = await res.json()
    setTokens(data.access_token, data.refresh_token)
    return true
  } catch {
    return false
  }
}

export const authApi = {
  login: async (body: LoginRequest): Promise<TokenResponse> => {
    const data = await request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    })
    setTokens(data.access_token, data.refresh_token)
    return data
  },

  register: async (body: RegisterRequest): Promise<UserOut> => {
    return request<UserOut>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    })
  },

  me: async (): Promise<UserOut> => {
    return request<UserOut>("/auth/me")
  },

  logout: async (): Promise<void> => {
    const refresh = getRefreshToken()
    if (refresh) {
      await request("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refresh }),
      })
    }
    clearTokens()
  },

  changePassword: async (body: ChangePasswordRequest): Promise<void> => {
    return request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(body),
    })
  },

  forceChangePassword: async (
    body: ForceChangePasswordRequest
  ): Promise<TokenResponse> => {
    const data = await request<TokenResponse>("/auth/force-change-password", {
      method: "POST",
      body: JSON.stringify(body),
    })
    setTokens(data.access_token, data.refresh_token)
    return data
  },
}

export { setTokens, clearTokens, getAccessToken, getRefreshToken, ApiError }
