import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  UserOut,
  RoleOut,
  PermissionOut,
  RoleCreate,
  RoleUpdate,
  PermissionCreate,
  UserUpdate,
  UserAdminCreate,
  AssignRoleRequest,
  AssignPermissionsRequest,
  SessionOut,
  ActivityLogOut,
  ChangePasswordRequest,
  ForceChangePasswordRequest,
  BodyMetricOut,
  BodyMetricCreate,
  BodyMetricUpdate,
  WeightGoalOut,
  WeightGoalWithProgress,
  WeightGoalCreate,
  WeightGoalUpdate,
  WeightGoalDetailResponse,
  PatientProfileOut,
  PatientProfileUpdate,
  SpecialtyOut,
  SpecialtyCreate,
  SpecialtyUpdate,
  DoctorOut,
  DoctorCreate,
  DoctorUpdate,
  AppointmentOut,
  AppointmentCreate,
  AppointmentUpdate,
  MedicationOut,
  MedicationCreate,
  MedicationUpdate,
  PrescriptionOut,
  PrescriptionCreate,
  PrescriptionUpdate,
  PrescriptionDetailOut,
  PrescriptionDetailCreate,
  PrescriptionDetailUpdate,
  MedicalDocumentOut,
  AdherenceRecordOut,
  AdherenceRecordCreate,
  AdherenceRecordUpdate,
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

// Auth
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

  logoutAll: async (): Promise<void> => {
    await request("/auth/logout-all", { method: "POST" })
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

// Users
export const usersApi = {
  list: async (skip = 0, limit = 50): Promise<UserOut[]> => {
    return request<UserOut[]>(`/users?skip=${skip}&limit=${limit}`)
  },

  get: async (id: number): Promise<UserOut> => {
    return request<UserOut>(`/users/${id}`)
  },

  create: async (body: UserAdminCreate): Promise<UserOut> => {
    return request<UserOut>("/users", {
      method: "POST",
      body: JSON.stringify(body),
    })
  },

  update: async (id: number, body: UserUpdate): Promise<UserOut> => {
    return request<UserOut>(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
  },

  delete: async (id: number): Promise<void> => {
    return request(`/users/${id}`, { method: "DELETE" })
  },

  assignRoles: async (id: number, body: AssignRoleRequest): Promise<UserOut> => {
    return request<UserOut>(`/users/${id}/roles`, {
      method: "POST",
      body: JSON.stringify(body),
    })
  },

  sessions: async (id: number): Promise<SessionOut[]> => {
    return request<SessionOut[]>(`/users/${id}/sessions`)
  },

  invalidateSessions: async (id: number): Promise<void> => {
    return request(`/users/${id}/invalidate-sessions`, { method: "POST" })
  },
}

// Roles
export const rolesApi = {
  list: async (skip = 0, limit = 50): Promise<RoleOut[]> => {
    return request<RoleOut[]>(`/roles?skip=${skip}&limit=${limit}`)
  },

  get: async (id: number): Promise<RoleOut> => {
    return request<RoleOut>(`/roles/${id}`)
  },

  create: async (body: RoleCreate): Promise<RoleOut> => {
    return request<RoleOut>("/roles", {
      method: "POST",
      body: JSON.stringify(body),
    })
  },

  update: async (id: number, body: RoleUpdate): Promise<RoleOut> => {
    return request<RoleOut>(`/roles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
  },

  delete: async (id: number): Promise<void> => {
    return request(`/roles/${id}`, { method: "DELETE" })
  },

  assignPermissions: async (
    id: number,
    body: AssignPermissionsRequest
  ): Promise<RoleOut> => {
    return request<RoleOut>(`/roles/${id}/permissions`, {
      method: "POST",
      body: JSON.stringify(body),
    })
  },
}

// Permissions
export const permissionsApi = {
  list: async (module?: string): Promise<PermissionOut[]> => {
    const params = module ? `?module=${module}` : ""
    return request<PermissionOut[]>(`/permissions${params}`)
  },

  create: async (body: PermissionCreate): Promise<PermissionOut> => {
    return request<PermissionOut>("/permissions", {
      method: "POST",
      body: JSON.stringify(body),
    })
  },
}

// Activity
export const activityApi = {
  list: async (params?: {
    skip?: number
    limit?: number
    module?: string
    type?: string
    user_id?: number
  }): Promise<ActivityLogOut[]> => {
    const searchParams = new URLSearchParams()
    if (params?.skip) searchParams.set("skip", String(params.skip))
    if (params?.limit) searchParams.set("limit", String(params.limit))
    if (params?.module) searchParams.set("module", params.module)
    if (params?.type) searchParams.set("type", params.type)
    if (params?.user_id) searchParams.set("user_id", String(params.user_id))
    const qs = searchParams.toString()
    return request<ActivityLogOut[]>(`/activity${qs ? `?${qs}` : ""}`)
  },
}

export const bodyMetricsApi = {
  list: async (skip = 0, limit = 50): Promise<BodyMetricOut[]> => {
    return request<BodyMetricOut[]>(`/body-metrics?skip=${skip}&limit=${limit}`)
  },

  getLatest: async (): Promise<BodyMetricOut | null> => {
    return request<BodyMetricOut | null>("/body-metrics/latest")
  },

  get: async (id: number): Promise<BodyMetricOut> => {
    return request<BodyMetricOut>(`/body-metrics/${id}`)
  },

  create: async (body: BodyMetricCreate): Promise<BodyMetricOut> => {
    return request<BodyMetricOut>("/body-metrics", {
      method: "POST",
      body: JSON.stringify(body),
    })
  },

  update: async (id: number, body: BodyMetricUpdate): Promise<BodyMetricOut> => {
    return request<BodyMetricOut>(`/body-metrics/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
  },

  delete: async (id: number): Promise<void> => {
    return request(`/body-metrics/${id}`, { method: "DELETE" })
  },
}

export const weightGoalsApi = {
  getActive: async (): Promise<WeightGoalWithProgress | null> => {
    return request<WeightGoalWithProgress | null>("/weight-goals/active")
  },

  list: async (skip = 0, limit = 50): Promise<WeightGoalOut[]> => {
    return request<WeightGoalOut[]>(`/weight-goals?skip=${skip}&limit=${limit}`)
  },

  get: async (id: number): Promise<WeightGoalOut> => {
    return request<WeightGoalOut>(`/weight-goals/${id}`)
  },

  getDetails: async (id: number): Promise<WeightGoalDetailResponse> => {
    return request<WeightGoalDetailResponse>(`/weight-goals/${id}/details`)
  },

  create: async (body: WeightGoalCreate): Promise<WeightGoalOut> => {
    return request<WeightGoalOut>("/weight-goals", {
      method: "POST",
      body: JSON.stringify(body),
    })
  },

  update: async (id: number, body: WeightGoalUpdate): Promise<WeightGoalOut> => {
    return request<WeightGoalOut>(`/weight-goals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
  },

  achieve: async (id: number): Promise<WeightGoalOut> => {
    return request<WeightGoalOut>(`/weight-goals/${id}/achieve`, {
      method: "POST",
    })
  },

  abandon: async (id: number): Promise<WeightGoalOut> => {
    return request<WeightGoalOut>(`/weight-goals/${id}/abandon`, {
      method: "POST",
    })
  },

  delete: async (id: number): Promise<void> => {
    return request(`/weight-goals/${id}`, { method: "DELETE" })
  },
}

export const medicalHistoryApi = {
  profile: {
    get: async (): Promise<PatientProfileOut | null> => {
      return request<PatientProfileOut | null>("/medical-history/profile")
    },
    upsert: async (body: PatientProfileUpdate): Promise<PatientProfileOut> => {
      return request<PatientProfileOut>("/medical-history/profile", {
        method: "PUT",
        body: JSON.stringify(body),
      })
    },
  },

  specialties: {
    list: async (): Promise<SpecialtyOut[]> => {
      return request<SpecialtyOut[]>("/medical-history/specialties")
    },
    create: async (body: SpecialtyCreate): Promise<SpecialtyOut> => {
      return request<SpecialtyOut>("/medical-history/specialties", {
        method: "POST",
        body: JSON.stringify(body),
      })
    },
    update: async (id: number, body: SpecialtyUpdate): Promise<SpecialtyOut> => {
      return request<SpecialtyOut>(`/medical-history/specialties/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })
    },
    delete: async (id: number): Promise<void> => {
      return request(`/medical-history/specialties/${id}`, { method: "DELETE" })
    },
  },

  doctors: {
    list: async (): Promise<DoctorOut[]> => {
      return request<DoctorOut[]>("/medical-history/doctors")
    },
    get: async (id: number): Promise<DoctorOut> => {
      return request<DoctorOut>(`/medical-history/doctors/${id}`)
    },
    create: async (body: DoctorCreate): Promise<DoctorOut> => {
      return request<DoctorOut>("/medical-history/doctors", {
        method: "POST",
        body: JSON.stringify(body),
      })
    },
    update: async (id: number, body: DoctorUpdate): Promise<DoctorOut> => {
      return request<DoctorOut>(`/medical-history/doctors/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })
    },
    delete: async (id: number): Promise<void> => {
      return request(`/medical-history/doctors/${id}`, { method: "DELETE" })
    },
  },

  appointments: {
    list: async (skip = 0, limit = 50): Promise<AppointmentOut[]> => {
      return request<AppointmentOut[]>(`/medical-history/appointments?skip=${skip}&limit=${limit}`)
    },
    get: async (id: number): Promise<AppointmentOut> => {
      return request<AppointmentOut>(`/medical-history/appointments/${id}`)
    },
    create: async (body: AppointmentCreate): Promise<AppointmentOut> => {
      return request<AppointmentOut>("/medical-history/appointments", {
        method: "POST",
        body: JSON.stringify(body),
      })
    },
    update: async (id: number, body: AppointmentUpdate): Promise<AppointmentOut> => {
      return request<AppointmentOut>(`/medical-history/appointments/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })
    },
    delete: async (id: number): Promise<void> => {
      return request(`/medical-history/appointments/${id}`, { method: "DELETE" })
    },
  },

  medications: {
    list: async (): Promise<MedicationOut[]> => {
      return request<MedicationOut[]>("/medical-history/medications")
    },
    create: async (body: MedicationCreate): Promise<MedicationOut> => {
      return request<MedicationOut>("/medical-history/medications", {
        method: "POST",
        body: JSON.stringify(body),
      })
    },
    update: async (id: number, body: MedicationUpdate): Promise<MedicationOut> => {
      return request<MedicationOut>(`/medical-history/medications/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })
    },
    delete: async (id: number): Promise<void> => {
      return request(`/medical-history/medications/${id}`, { method: "DELETE" })
    },
  },

  prescriptions: {
    list: async (skip = 0, limit = 50): Promise<PrescriptionOut[]> => {
      return request<PrescriptionOut[]>(`/medical-history/prescriptions?skip=${skip}&limit=${limit}`)
    },
    get: async (id: number): Promise<PrescriptionOut> => {
      return request<PrescriptionOut>(`/medical-history/prescriptions/${id}`)
    },
    create: async (body: PrescriptionCreate): Promise<PrescriptionOut> => {
      return request<PrescriptionOut>("/medical-history/prescriptions", {
        method: "POST",
        body: JSON.stringify(body),
      })
    },
    update: async (id: number, body: PrescriptionUpdate): Promise<PrescriptionOut> => {
      return request<PrescriptionOut>(`/medical-history/prescriptions/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })
    },
    delete: async (id: number): Promise<void> => {
      return request(`/medical-history/prescriptions/${id}`, { method: "DELETE" })
    },
    addDetail: async (rxId: number, body: PrescriptionDetailCreate): Promise<PrescriptionDetailOut> => {
      return request<PrescriptionDetailOut>(`/medical-history/prescriptions/${rxId}/details`, {
        method: "POST",
        body: JSON.stringify(body),
      })
    },
    updateDetail: async (rxId: number, detId: number, body: PrescriptionDetailUpdate): Promise<PrescriptionDetailOut> => {
      return request<PrescriptionDetailOut>(`/medical-history/prescriptions/${rxId}/details/${detId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })
    },
    deleteDetail: async (rxId: number, detId: number): Promise<void> => {
      return request(`/medical-history/prescriptions/${rxId}/details/${detId}`, { method: "DELETE" })
    },
  },

  documents: {
    list: async (params?: { search?: string; docType?: string }): Promise<MedicalDocumentOut[]> => {
      const qs = new URLSearchParams()
      if (params?.search) qs.set("search", params.search)
      if (params?.docType) qs.set("doc_type", params.docType)
      const query = qs.toString()
      return request<MedicalDocumentOut[]>(`/medical-history/documents${query ? `?${query}` : ""}`)
    },
    get: async (id: number): Promise<MedicalDocumentOut> => {
      return request<MedicalDocumentOut>(`/medical-history/documents/${id}`)
    },
    upload: async (file: File, docType: string, prescriptionId?: number, appointmentId?: number): Promise<MedicalDocumentOut> => {
      const token = getAccessToken()
      const formData = new FormData()
      formData.append("file", file)
      const params = new URLSearchParams()
      params.set("doc_type", docType)
      if (prescriptionId) params.set("prescription_id", String(prescriptionId))
      if (appointmentId) params.set("appointment_id", String(appointmentId))
      const res = await fetch(`${API_BASE}/medical-history/documents/upload?${params}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) {
        let detail = "Error al subir archivo"
        try { const b = await res.json(); detail = b.detail || detail } catch {}
        throw new ApiError(res.status, detail)
      }
      return res.json()
    },
    delete: async (id: number): Promise<void> => {
      return request(`/medical-history/documents/${id}`, { method: "DELETE" })
    },
    download: async (id: number): Promise<void> => {
      const token = getAccessToken()
      const res = await fetch(`${API_BASE}/medical-history/documents/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        let detail = "Error al descargar archivo"
        try { const b = await res.json(); detail = b.detail || detail } catch {}
        throw new ApiError(res.status, detail)
      }
      const contentDisposition = res.headers.get("content-disposition")
      let filename = "documento"
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)/i)
        if (match) filename = decodeURIComponent(match[1])
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    },
  },

  adherence: {
    today: async (): Promise<AdherenceRecordOut[]> => {
      return request<AdherenceRecordOut[]>("/medical-history/adherence/today")
    },
    history: async (skip = 0, limit = 100): Promise<AdherenceRecordOut[]> => {
      return request<AdherenceRecordOut[]>(`/medical-history/adherence/history?skip=${skip}&limit=${limit}`)
    },
    create: async (body: AdherenceRecordCreate): Promise<AdherenceRecordOut> => {
      return request<AdherenceRecordOut>("/medical-history/adherence", {
        method: "POST",
        body: JSON.stringify(body),
      })
    },
    update: async (id: number, body: AdherenceRecordUpdate): Promise<AdherenceRecordOut> => {
      return request<AdherenceRecordOut>(`/medical-history/adherence/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      })
    },
  },

  reports: {
    download: async (type: string, dateFrom?: string, dateTo?: string): Promise<void> => {
      const token = getAccessToken()
      const params = new URLSearchParams()
      if (dateFrom) params.set("date_from", dateFrom)
      if (dateTo) params.set("date_to", dateTo)
      const qs = params.toString()
      const res = await fetch(`${API_BASE}/reports/${type}${qs ? `?${qs}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        let detail = "Error al generar reporte"
        try { const b = await res.json(); detail = b.detail || detail } catch {}
        throw new ApiError(res.status, detail)
      }
      const contentDisposition = res.headers.get("content-disposition")
      let filename = `${type}.pdf`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)/i)
        if (match) filename = decodeURIComponent(match[1])
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    },
  },
}

export { setTokens, clearTokens, getAccessToken, getRefreshToken, ApiError }
