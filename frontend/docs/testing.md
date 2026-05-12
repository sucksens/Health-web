# Testing del Frontend

## Stack tecnologico

| Herramienta | Version | Proposito |
|---|---|---|
| Vitest | ^4.1.6 | Test runner |
| @testing-library/react | ^16.3.2 | Renderizado de componentes React |
| @testing-library/user-event | ^14.6.1 | Simulacion de interacciones de usuario |
| @testing-library/jest-dom | ^6.9.1 | Matchers DOM (toBeInTheDocument, toHaveTextContent, etc.) |
| jsdom | ^29.1.1 | Entorno DOM para tests |

```
frontend/
├── vitest.config.ts             # Configuracion de Vitest
├── package.json                 # Scripts: test, test:watch
├── src/
│   ├── __tests__/
│   │   ├── setup.ts             # Setup global (import jest-dom matchers)
│   │   ├── LoginPage.test.tsx   # Tests del login
│   │   └── RegisterPage.test.tsx# Tests del registro
│   ├── lib/
│   │   ├── api.ts               # Capa de API (se mockea en tests)
│   │   ├── auth.tsx              # AuthProvider + useAuth context
│   │   ├── router.tsx            # Router custom (AppRouter, useNavigate)
│   │   └── types.ts             # Interfaces TypeScript
│   └── components/
│       ├── auth/                 # LoginPage, RegisterPage, ForcePasswordChangePage
│       ├── body-metrics/         # 7 componentes (pagina, dialogos, chart, cards)
│       ├── medical-history/      # 12 componentes (hub, forms, CRUD pages)
│       ├── dashboard/            # DashboardPage
│       ├── profile/              # ProfilePage
│       ├── users/                # UsersPage (admin CRUD)
│       ├── roles/                # RolesPage (admin CRUD)
│       ├── permissions/          # PermissionsPage (admin CRUD)
│       ├── activity/             # ActivityPage (logs)
│       └── ui/                   # Componentes shadcn (no requieren tests unitarios)
```

---

## Configuracion

### vitest.config.ts

```ts
import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    globals: true,                            // describe, it, expect, vi sin imports
    environment: "jsdom",                      // DOM simulado en Node
    setupFiles: ["./src/__tests__/setup.ts"],  // Corre antes de cada archivo de test
    include: ["src/__tests__/**/*.test.{ts,tsx}"], // Solo busca en __tests__/
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),  // Alias @/ para imports
    },
  },
})
```

### package.json (scripts de test)

```json
{
  "scripts": {
    "test": "vitest run",        // Un solo ciclo (CI)
    "test:watch": "vitest"        // Modo watch (desarrollo)
  }
}
```

---

## Estado actual: solo 2 archivos de test

| Archivo | Tests | Lo que cubre |
|---|---|---|
| `LoginPage.test.tsx` | 5 | Render, validacion vacio, submit exitoso, loading state, link registro |
| `RegisterPage.test.tsx` | 2 | Render form, submit exitoso |
| **Sin test** | — | ~15 componentes sin cobertura |

### Componentes sin test

| Modulo | Componentes | Dependencias especiales |
|---|---|---|
| `auth/` | ForcePasswordChangePage | `authApi.forceChangePassword`, `authApi.me`, `useNavigate` |
| `body-metrics/` | BodyMetricsPage, BodyMetricDialog, BodyMetricsChart, WeightGoalCard, WeightGoalDialog, WeightGoalDetailDialog, WeightGoalHistoryPage | `bodyMetricsApi`, `weightGoalsApi`, ECharts |
| `medical-history/` | MedicalHistoryHome, PatientProfileForm, DoctorsPage, SpecialtiesPage, AppointmentsPage, CalendarView, PrescriptionsPage, PrescriptionForm, MedicationCatalog, DocumentsPage, AdherenceTracker, ReportsPage | `medicalHistoryApi`, ECharts, sub-componentes |
| `dashboard/` | DashboardPage | Datos del usuario autenticado |
| `profile/` | ProfilePage | `usersApi.update`, `authApi.changePassword` |
| `users/` | UsersPage | `usersApi` CRUD, dialogos modales |
| `roles/` | RolesPage | `rolesApi` CRUD, asignacion permisos |
| `permissions/` | PermissionsPage | `permissionsApi` |
| `activity/` | ActivityPage | `activityApi.list` |
| `lib/` | AuthProvider, api.ts, router.tsx | Logica de estado, tokens, refresh |

---

## Plan de mejora de infraestructura (Fase 1)

### Problema actual

Cada archivo de test duplica el mock completo de `@/lib/api` y el helper de renderizado. Para expandir tests a otros modulos (body-metrics, medical-history, etc.) se necesita mockear `bodyMetricsApi`, `weightGoalsApi`, `medicalHistoryApi`, etc. Tener todo duplicado en cada archivo no escala.

### Solucion: archivos compartidos

Crear dos archivos de soporte en `src/__tests__/`:

---

#### 1. `src/__tests__/mocks/api.ts` — Mock completo del API layer

```ts
// src/__tests__/mocks/api.ts
import { vi } from "vitest"

export const mockAuthApi = {
  login: vi.fn(),
  register: vi.fn(),
  me: vi.fn().mockRejectedValue(new Error("No token")),
  logout: vi.fn(),
  logoutAll: vi.fn(),
  changePassword: vi.fn(),
  forceChangePassword: vi.fn(),
}

export const mockUsersApi = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  assignRoles: vi.fn(),
  sessions: vi.fn(),
  invalidateSessions: vi.fn(),
}

export const mockRolesApi = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  assignPermissions: vi.fn(),
}

export const mockPermissionsApi = {
  list: vi.fn(),
  create: vi.fn(),
}

export const mockBodyMetricsApi = {
  list: vi.fn(),
  getLatest: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

export const mockWeightGoalsApi = {
  getActive: vi.fn(),
  list: vi.fn(),
  get: vi.fn(),
  getDetails: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  achieve: vi.fn(),
  abandon: vi.fn(),
  delete: vi.fn(),
}

export const mockMedicalHistoryApi = {
  profile: {
    get: vi.fn(),
    upsert: vi.fn(),
  },
  specialties: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  doctors: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  appointments: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  medications: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  prescriptions: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addDetail: vi.fn(),
    updateDetail: vi.fn(),
    deleteDetail: vi.fn(),
  },
  documents: {
    list: vi.fn(),
    get: vi.fn(),
    upload: vi.fn(),
    delete: vi.fn(),
    download: vi.fn(),
  },
  adherence: {
    today: vi.fn(),
    history: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  reports: {
    download: vi.fn(),
  },
}

export const mockActivityApi = {
  list: vi.fn(),
}

export const mockApiHelpers = {
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  setOnSessionExpired: vi.fn(),
  getAccessToken: vi.fn(() => null),
  getRefreshToken: vi.fn(() => null),
  ApiError: class ApiError extends Error {
    status: number
    detail: string
    constructor(status: number, detail: string) {
      super(detail)
      this.status = status
      this.detail = detail
    }
  },
}

// Mock completo de @/lib/api
vi.mock("@/lib/api", () => ({
  authApi: mockAuthApi,
  usersApi: mockUsersApi,
  rolesApi: mockRolesApi,
  permissionsApi: mockPermissionsApi,
  bodyMetricsApi: mockBodyMetricsApi,
  weightGoalsApi: mockWeightGoalsApi,
  medicalHistoryApi: mockMedicalHistoryApi,
  activityApi: mockActivityApi,
  ...mockApiHelpers,
}))
```

**Como se usa en cada test file:**

```ts
// src/__tests__/BodyMetricsPage.test.tsx
import "@/__tests__/mocks/api"  // <-- import unico, activa el mock completo

import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { BodyMetricsPage } from "@/components/body-metrics/BodyMetricsPage"
import { AuthProvider } from "@/lib/auth"
import { AppRouter } from "@/lib/router"
import { mockBodyMetricsApi, mockWeightGoalsApi } from "@/__tests__/mocks/api"

function renderPage() {
  return render(
    <AppRouter>
      <AuthProvider>
        <BodyMetricsPage />
      </AuthProvider>
    </AppRouter>
  )
}

describe("BodyMetricsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("muestra mensaje de permisos insuficientes", () => {
    // Sin token en localStorage => me() falla => sin permisos
    renderPage()
    expect(screen.getByText(/no tienes permisos/i)).toBeInTheDocument()
  })

  it("carga y muestra las metricas", async () => {
    localStorage.setItem("access_token", "fake-token")
    mockBodyMetricsApi.list.mockResolvedValueOnce([
      { id: 1, weight_kg: 75.5, bmi: 24.5, waist_cm: 85, chest_cm: null, arm_cm: null, recorded_at: "2026-05-01T00:00:00", created_at: "", user_id: 1 },
    ])
    mockWeightGoalsApi.getActive.mockResolvedValueOnce(null)
    mockWeightGoalsApi.list.mockResolvedValueOnce([])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText("75.5 kg")).toBeInTheDocument()
    })
  })
})
```

---

#### 2. `src/__tests__/test-utils.tsx` — Helpers de renderizado

```ts
// src/__tests__/test-utils.tsx
import { type ReactNode } from "react"
import { render, type RenderResult } from "@testing-library/react"
import { AuthProvider } from "@/lib/auth"
import { AppRouter } from "@/lib/router"

// Wrapper con todos los providers necesarios
export function TestProviders({ children }: { children: ReactNode }) {
  return (
    <AppRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </AppRouter>
  )
}

// Render custom que envuelve en los providers
export function renderWithProviders(ui: ReactNode): RenderResult {
  return render(<TestProviders>{ui}</TestProviders>)
}

// Helper para simular sesion iniciada
export function setupAuthenticatedUser(userOverrides?: Record<string, any>) {
  const defaultUser = {
    id: 1,
    email: "admin@test.com",
    username: "admin",
    first_name: null,
    last_name: null,
    height_cm: 175,
    sex: null,
    is_active: true,
    must_change_password: false,
    created_at: "2026-01-01",
    roles: [
      {
        id: 1,
        name: "admin",
        description: "Admin",
        permissions: [
          { id: 1, code: "body_metrics:read", description: "", module: "body_metrics" },
          { id: 2, code: "body_metrics:create", description: "", module: "body_metrics" },
          { id: 3, code: "body_metrics:update", description: "", module: "body_metrics" },
          { id: 4, code: "body_metrics:delete", description: "", module: "body_metrics" },
          { id: 5, code: "medical_history:read", description: "", module: "medical_history" },
          { id: 6, code: "medical_history:create", description: "", module: "medical_history" },
          { id: 7, code: "medical_history:update", description: "", module: "medical_history" },
          { id: 8, code: "medical_history:delete", description: "", module: "medical_history" },
          { id: 9, code: "weight_goals:read", description: "", module: "weight_goals" },
          { id: 10, code: "weight_goals:create", description: "", module: "weight_goals" },
          { id: 11, code: "weight_goals:update", description: "", module: "weight_goals" },
          { id: 12, code: "weight_goals:delete", description: "", module: "weight_goals" },
        ],
      },
    ],
  }

  const user = { ...defaultUser, ...userOverrides }
  localStorage.setItem("access_token", "fake-token")
  localStorage.setItem("user", JSON.stringify(user))

  return { user, defaultUser }
}
```

**Los test files existentes se simplifican drasticamente:**

```tsx
// src/__tests__/LoginPage.test.tsx (refactorizado)
import "@/__tests__/mocks/api"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LoginPage } from "@/components/auth/LoginPage"
import { renderWithProviders } from "@/__tests__/test-utils"
import { mockAuthApi } from "@/__tests__/mocks/api"

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("renders the login form", () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText("Health")).toBeInTheDocument()
  })

  it("calls login on valid form submission", async () => {
    mockAuthApi.login.mockResolvedValueOnce({
      access_token: "test-access", refresh_token: "test-refresh", token_type: "bearer",
    })
    mockAuthApi.me.mockResolvedValueOnce({
      id: 1, email: "admin@test.com", username: "admin",
      first_name: null, last_name: null, height_cm: null, sex: null,
      is_active: true, must_change_password: false, created_at: "2026-01-01", roles: [],
    })

    renderWithProviders(<LoginPage />)

    await userEvent.type(screen.getByLabelText("Usuario"), "admin")
    await userEvent.type(screen.getByLabelText("Contrasena"), "admin123")
    await userEvent.click(screen.getByRole("button", { name: /iniciar sesion/i }))

    await waitFor(() => {
      expect(mockAuthApi.login).toHaveBeenCalledWith({
        username: "admin", password: "admin123",
      })
    })
  })

  it("shows loading state during submission", async () => {
    mockAuthApi.login.mockImplementation(() => new Promise(() => {}))
    renderWithProviders(<LoginPage />)
    await userEvent.type(screen.getByLabelText("Usuario"), "admin")
    await userEvent.type(screen.getByLabelText("Contrasena"), "admin123")
    await userEvent.click(screen.getByRole("button", { name: /iniciar sesion/i }))
    expect(screen.getByText("Ingresando...")).toBeInTheDocument()
  })
})
```

---

## Guia: como crear tests para nuevos componentes

### Paso 1: Identificar el tipo de componente

| Tipo | Caracteristicas | Estrategia de test |
|---|---|---|
| **Dialog/Form** | Recibe `onSuccess`, `open`, datos. Sin dependencia directa de auth. | Testear render, validacion, submit, loading. Mockear solo el API necesario. |
| **Pagina completa** | Usa `useAuth()`, carga datos al montar, CRUD completo. | Usar `setupAuthenticatedUser()`, mockear APIs, testear estados vacio/lleno/error. |
| **Card/Widget** | Props de entrada, render condicional. | Test por props: activo, logrado, abandonado, sin datos. |
| **Provider/Context** | Logica de estado, sin UI. | Test unitario de funciones (login, logout, refreshUser). |

### Paso 2: Importar infraestructura compartida

```ts
import "@/__tests__/mocks/api"                                // Mock completo del API
import { renderWithProviders, setupAuthenticatedUser } from "@/__tests__/test-utils"  // Helpers
import { mockBodyMetricsApi, mockUsersApi } from "@/__tests__/mocks/api"  // APIs necesarios
```

### Paso 3: Escribir escenarios

#### Ejemplo: ForcePasswordChangePage

```ts
// src/__tests__/ForcePasswordChangePage.test.tsx
import "@/__tests__/mocks/api"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ForcePasswordChangePage } from "@/components/auth/ForcePasswordChangePage"
import { renderWithProviders } from "@/__tests__/test-utils"
import { mockAuthApi } from "@/__tests__/mocks/api"

describe("ForcePasswordChangePage", () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear() })

  it("renderiza el formulario", () => {
    renderWithProviders(<ForcePasswordChangePage onPasswordChanged={() => {}} />)
    expect(screen.getByText("Cambiar contrasena")).toBeInTheDocument()
    expect(screen.getByLabelText("Nueva contrasena")).toBeInTheDocument()
    expect(screen.getByLabelText("Confirmar contrasena")).toBeInTheDocument()
  })

  it("muestra error si las contrasenas no coinciden", async () => {
    renderWithProviders(<ForcePasswordChangePage onPasswordChanged={() => {}} />)
    await userEvent.type(screen.getByLabelText("Nueva contrasena"), "123456")
    await userEvent.type(screen.getByLabelText("Confirmar contrasena"), "654321")
    await userEvent.click(screen.getByRole("button", { name: /cambiar contrasena/i }))
    expect(screen.getByText("Las contrasenas no coinciden")).toBeInTheDocument()
  })

  it("llama a forceChangePassword en submit exitoso", async () => {
    mockAuthApi.forceChangePassword.mockResolvedValueOnce({
      access_token: "new-token", refresh_token: "new-refresh", token_type: "bearer",
    })
    mockAuthApi.me.mockResolvedValueOnce({
      id: 1, email: "a@b.com", username: "test", roles: [], must_change_password: false,
    })

    const onChanged = vi.fn()
    renderWithProviders(<ForcePasswordChangePage onPasswordChanged={onChanged} />)

    await userEvent.type(screen.getByLabelText("Nueva contrasena"), "newpass123")
    await userEvent.type(screen.getByLabelText("Confirmar contrasena"), "newpass123")
    await userEvent.click(screen.getByRole("button", { name: /cambiar contrasena/i }))

    await waitFor(() => {
      expect(mockAuthApi.forceChangePassword).toHaveBeenCalledWith({
        new_password: "newpass123", confirm_password: "newpass123",
      })
    })
  })
})
```

#### Ejemplo: SpecialtiesPage (CRUD simple)

```ts
// src/__tests__/SpecialtiesPage.test.tsx
import "@/__tests__/mocks/api"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SpecialtiesPage } from "@/components/medical-history/SpecialtiesPage"
import { renderWithProviders, setupAuthenticatedUser } from "@/__tests__/test-utils"
import { mockMedicalHistoryApi } from "@/__tests__/mocks/api"

describe("SpecialtiesPage", () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear() })

  it("muestra lista vacia", async () => {
    setupAuthenticatedUser()
    mockMedicalHistoryApi.specialties.list.mockResolvedValueOnce([])
    renderWithProviders(<SpecialtiesPage />)
    await waitFor(() => {
      expect(screen.getByText(/no hay especialidades/i)).toBeInTheDocument()
    })
  })

  it("crea una especialidad", async () => {
    setupAuthenticatedUser()
    mockMedicalHistoryApi.specialties.list.mockResolvedValueOnce([])
    mockMedicalHistoryApi.specialties.create.mockResolvedValueOnce({
      id: 1, user_id: 1, name: "Cardiologia", created_at: "2026-01-01",
    })
    mockMedicalHistoryApi.specialties.list.mockResolvedValueOnce([
      { id: 1, user_id: 1, name: "Cardiologia", created_at: "2026-01-01" },
    ])

    renderWithProviders(<SpecialtiesPage />)

    await userEvent.click(screen.getByRole("button", { name: /nueva especialidad/i }))
    await userEvent.type(screen.getByLabelText(/nombre/i), "Cardiologia")
    await userEvent.click(screen.getByRole("button", { name: /guardar|crear/i }))

    await waitFor(() => {
      expect(screen.getByText("Cardiologia")).toBeInTheDocument()
    })
  })

  it("elimina una especialidad", async () => {
    setupAuthenticatedUser()
    mockMedicalHistoryApi.specialties.list.mockResolvedValueOnce([
      { id: 1, user_id: 1, name: "Cardiologia", created_at: "2026-01-01" },
    ])
    renderWithProviders(<SpecialtiesPage />)
    await waitFor(() => {
      expect(screen.getByText("Cardiologia")).toBeInTheDocument()
    })
    await userEvent.click(screen.getByRole("button", { name: /eliminar/i }))
    await waitFor(() => {
      expect(mockMedicalHistoryApi.specialties.delete).toHaveBeenCalledWith(1)
    })
  })
})
```

#### Ejemplo: WeightGoalCard (render condicional por status)

```ts
// src/__tests__/WeightGoalCard.test.tsx
import "@/__tests__/mocks/api"
import { describe, it, expect, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { WeightGoalCard } from "@/components/body-metrics/WeightGoalCard"
import { renderWithProviders } from "@/__tests__/test-utils"
import type { WeightGoalWithProgress } from "@/lib/types"

const baseGoal: WeightGoalWithProgress = {
  id: 1, user_id: 1,
  target_weight_kg: 70, start_weight_kg: 80,
  target_date: "2026-07-01", status: "active",
  notes: null, achieved_at: null,
  created_at: "2026-01-01", updated_at: "2026-01-01",
  current_weight: 75, progress: 50, days_remaining: 50,
  total_change: 5, avg_weekly_change: 0.5,
}

describe("WeightGoalCard", () => {
  const noop = vi.fn()

  it("muestra goal activo con progreso", () => {
    renderWithProviders(
      <WeightGoalCard goal={baseGoal} onEdit={noop} onDelete={noop} onAchieve={noop} onAbandon={noop} />
    )
    expect(screen.getByText("50%")).toBeInTheDocument()
    expect(screen.getByText("Meta activa")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /marcar como lograda/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /abandonar/i })).toBeInTheDocument()
  })

  it("muestra goal logrado", () => {
    const achieved = { ...baseGoal, status: "achieved", achieved_at: "2026-06-01T00:00:00" }
    renderWithProviders(
      <WeightGoalCard goal={achieved} onEdit={noop} onDelete={noop} onAchieve={noop} onAbandon={noop} />
    )
    expect(screen.getByText(/lograda/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /marcar como lograda/i })).not.toBeInTheDocument()
  })

  it("llama a onAchieve al hacer click", async () => {
    const onAchieve = vi.fn()
    renderWithProviders(
      <WeightGoalCard goal={baseGoal} onEdit={noop} onDelete={noop} onAchieve={onAchieve} onAbandon={noop} />
    )
    await userEvent.click(screen.getByRole("button", { name: /marcar como lograda/i }))
    expect(onAchieve).toHaveBeenCalledOnce()
  })
})
```

---

## Escenarios recomendados por tipo de componente

### Dialog/Form

| Escenario | Assert |
|---|---|
| Render con campos | `getByLabelText` para cada campo |
| Validacion campos requeridos | `toHaveTextContent` con mensaje de error |
| Submit exitoso | `mockApi.create` fue llamado con datos correctos |
| Loading state | Boton deshabilitado, texto "Guardando..." |
| Error de API | Toast con mensaje de error |
| Cancelar | Dialog se cierra, API no se llama |

### Pagina con listado y CRUD

| Escenario | Assert |
|---|---|
| Sin permisos | Texto "No tienes permisos" |
| Cargando | Spinner visible |
| Lista vacia | Mensaje "No hay registros" + CTA |
| Lista con datos | Filas en tabla visibles |
| Crear item | Dialog aparece, submit → item en lista |
| Eliminar item | Confirmacion → item desaparece |

### Card/Widget con render condicional

| Escenario | Assert |
|---|---|
| Estado activo | Botones de accion visibles, progreso visible |
| Estado finalizado (logrado/abandonado) | Sin botones de accion, mensaje de estado |
| Sin datos | Valores por defecto o null |
| Con datos | Valores formateados correctamente |

---

## Mapeo de componentes y APIs mockeados

| Componente | APIs que requiere mockear |
|---|---|
| ForcePasswordChangePage | `authApi.forceChangePassword`, `authApi.me` |
| BodyMetricsPage | `bodyMetricsApi.list`, `weightGoalsApi.getActive`, `weightGoalsApi.list`, `bodyMetricsApi.delete` |
| BodyMetricDialog | `bodyMetricsApi.create`, `bodyMetricsApi.update` |
| WeightGoalCard | No llama API directamente (props callbacks) |
| WeightGoalDialog | `weightGoalsApi.create`, `weightGoalsApi.update` |
| WeightGoalHistoryPage | `weightGoalsApi.list`, `weightGoalsApi.getDetails` |
| ProfilePage | `usersApi.update`, `authApi.changePassword` |
| UsersPage | `usersApi.list`, `usersApi.create`, `usersApi.update`, `usersApi.delete`, `usersApi.assignRoles` |
| RolesPage | `rolesApi.list`, `rolesApi.create`, `rolesApi.update`, `rolesApi.delete`, `rolesApi.assignPermissions` |
| PermissionsPage | `permissionsApi.list`, `permissionsApi.create` |
| ActivityPage | `activityApi.list` |
| SpecialtiesPage | `medicalHistoryApi.specialties.*` |
| DoctorsPage | `medicalHistoryApi.doctors.*`, `medicalHistoryApi.specialties.list` |
| AppointmentsPage | `medicalHistoryApi.appointments.*`, `medicalHistoryApi.doctors.list` |
| MedicationsPage | `medicalHistoryApi.medications.*` |
| PrescriptionsPage | `medicalHistoryApi.prescriptions.*`, `medicalHistoryApi.doctors.list` |
| DocumentsPage | `medicalHistoryApi.documents.*` |
| AdherenceTracker | `medicalHistoryApi.adherence.*`, `medicalHistoryApi.prescriptions.list` |
| DashboardPage | `authApi.me` (ya mockeado por defecto) |

---

## Plan de implementacion por fases

### Fase 1 — Infraestructura (prioridad alta)
1. Crear `src/__tests__/mocks/api.ts` con todos los APIs mockeados
2. Crear `src/__tests__/test-utils.tsx` con `renderWithProviders` y `setupAuthenticatedUser`
3. Refactorizar `LoginPage.test.tsx` y `RegisterPage.test.tsx` para usar los nuevos helpers
4. Verificar que todos los tests existentes siguen pasando

### Fase 2 — Auth + perfil (prioridad alta, patron conocido)
1. `ForcePasswordChangePage.test.tsx`
2. `ProfilePage.test.tsx`

### Fase 3 — Body metrics (prioridad media, componentes autocontenidos)
1. `BodyMetricDialog.test.tsx`
2. `WeightGoalCard.test.tsx`
3. `WeightGoalDialog.test.tsx`
4. `BodyMetricsPage.test.tsx`

### Fase 4 — Medical history basico (prioridad media, CRUD simples)
1. `SpecialtiesPage.test.tsx`
2. `MedicationCatalog.test.tsx`
3. `DoctorsPage.test.tsx`

### Fase 5 — Admin (prioridad media, dependen de roles/permisos mockeados)
1. `PermissionsPage.test.tsx`
2. `RolesPage.test.tsx`
3. `UsersPage.test.tsx`

### Fase 6 — Medical history avanzado (prioridad baja, componentes complejos)
1. `AppointmentsPage.test.tsx`
2. `PrescriptionsPage.test.tsx`
3. `DocumentsPage.test.tsx`
4. `AdherenceTracker.test.tsx`

### Fase 7 — Dashboard + Activity (prioridad baja)
1. `DashboardPage.test.tsx`
2. `ActivityPage.test.tsx`

---

## Notas importantes

- El mock de `authApi.me` por defecto devuelve `Promise.reject(new Error("No token"))`. Para simular sesion iniciada, usa `setupAuthenticatedUser()` que ademas pone el token en localStorage.
- Los componentes que usan ECharts (`BodyMetricsChart`, `WeightGoalDetailDialog`) requieren mockear `echarts-for-react` o usar `vi.mock("echarts-for-react", ...)`. Considera posponer estos tests o usar un stub que renderice un div vacio.
- Los tests de `DocumentsPage` involucran subida/descarga de archivos. Usa `URL.createObjectURL` y `document.createElement` que jsdom soporta parcialmente (pueden requerir polyfills o mocks adicionales).
- Los componentes que usan `sonner` (toast) muestran notificaciones que se pueden verificar con `screen.findByText` para mensajes de exito/error.
- La mayoria de paginas hacen fetch de datos en `useEffect`. Usa `waitFor` o `findBy*` para esperar a que los datos se carguen.
- El hook `useAuth` requiere `AuthProvider`. Todos los tests de paginas deben usar `renderWithProviders` o el wrapper manual.
- Para componentes que no requieren autenticacion (como dialogos), renderizalos directamente con `render` normal + sus props.
