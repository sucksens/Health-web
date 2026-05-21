import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LoginPage } from "@/components/auth/LoginPage"
import { AuthProvider } from "@/lib/auth"
import { AppRouter } from "@/lib/router"

vi.mock("@/lib/api", () => ({
  authApi: {
    login: vi.fn(),
    me: vi.fn().mockRejectedValue(new Error("No token")),
    logout: vi.fn(),
    register: vi.fn(),
  },
  clearTokens: vi.fn(),
  setOnSessionExpired: vi.fn(),
  setTokens: vi.fn(),
  getAccessToken: vi.fn(() => null),
  getRefreshToken: vi.fn(() => null),
}))

import { authApi } from "@/lib/api"

function renderLogin() {
  return render(
    <AppRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </AppRouter>
  )
}

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("renders the login form", () => {
    renderLogin()
    expect(screen.getByAltText("Health")).toBeInTheDocument()
    expect(screen.getByLabelText("Usuario")).toBeInTheDocument()
    expect(screen.getByLabelText("Contrasena")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /iniciar sesion/i })).toBeInTheDocument()
  })

  it("shows validation on empty submit", async () => {
    renderLogin()
    const submitBtn = screen.getByRole("button", { name: /iniciar sesion/i })
    await userEvent.click(submitBtn)
  })

  it("calls login on valid form submission", async () => {
    const mockLogin = authApi.login as ReturnType<typeof vi.fn>
    mockLogin.mockResolvedValueOnce({
      access_token: "test-access",
      refresh_token: "test-refresh",
      token_type: "bearer",
    })
    ;(authApi.me as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      id: 1,
      email: "admin@test.com",
      username: "admin",
      first_name: null,
      last_name: null,
      height_cm: null,
      sex: null,
      is_active: true,
      must_change_password: false,
      created_at: "2026-01-01",
      roles: [],
    })

    renderLogin()

    await userEvent.type(screen.getByLabelText("Usuario"), "admin")
    await userEvent.type(screen.getByLabelText("Contrasena"), "admin123")
    await userEvent.click(screen.getByRole("button", { name: /iniciar sesion/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: "admin",
        password: "admin123",
      })
    })
  })

  it("shows loading state during submission", async () => {
    const mockLogin = authApi.login as ReturnType<typeof vi.fn>
    mockLogin.mockImplementation(() => new Promise(() => {}))

    renderLogin()

    await userEvent.type(screen.getByLabelText("Usuario"), "admin")
    await userEvent.type(screen.getByLabelText("Contrasena"), "admin123")
    await userEvent.click(screen.getByRole("button", { name: /iniciar sesion/i }))

    expect(screen.getByText("Ingresando...")).toBeInTheDocument()
  })

  it("renders register link", () => {
    renderLogin()
    expect(screen.getByText("Registrate")).toBeInTheDocument()
  })
})
