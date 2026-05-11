import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { RegisterPage } from "@/components/auth/RegisterPage"
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

function renderRegister() {
  return render(
    <AppRouter>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </AppRouter>
  )
}

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("renders the register form", () => {
    renderRegister()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText("Usuario")).toBeInTheDocument()
    expect(screen.getByLabelText("Contrasena")).toBeInTheDocument()
  })

  it("calls register on valid form submission", async () => {
    const mockRegister = authApi.register as ReturnType<typeof vi.fn>
    mockRegister.mockResolvedValueOnce({ id: 2, username: "newuser" })

    renderRegister()

    await userEvent.type(screen.getByLabelText(/email/i), "new@test.com")
    await userEvent.type(screen.getByLabelText("Usuario"), "newuser")
    await userEvent.type(screen.getByLabelText("Contrasena"), "password123")
    await userEvent.click(screen.getByRole("button", { name: /registrarse|crear cuenta|registrar/i }))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: "new@test.com",
        username: "newuser",
        password: "password123",
      })
    })
  })
})
