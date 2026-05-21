import { useState, type FormEvent } from "react"
import { useNavigate } from "@/lib/router"
import { authApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from "sonner"

interface ForcePasswordChangePageProps {
  onPasswordChanged: (user: any) => void
}

export function ForcePasswordChangePage({ onPasswordChanged }: ForcePasswordChangePageProps) {
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPasswordError("")

    if (newPassword.length < 6) {
      setPasswordError("La nueva contrasena debe tener al menos 6 caracteres")
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contrasenas no coinciden")
      return
    }

    setLoading(true)
    try {
      const tokens = await authApi.forceChangePassword({
        new_password: newPassword,
        confirm_password: confirmPassword,
      })
      const user = await authApi.me()
      localStorage.setItem("user", JSON.stringify({ ...user, ...tokens }))
      toast.success("Contrasena actualizada exitosamente")
      onPasswordChanged({ ...user, ...tokens })
      navigate("/dashboard")
    } catch (err: any) {
      toast.error(err.detail || "Error al cambiar contrasena")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Cambiar contrasena</CardTitle>
          <CardDescription>
            Debes cambiar tu contrasena antes de continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contrasena</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar contrasena</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            {passwordError && (
              <p className="text-xs text-destructive">{passwordError}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Cambiando..." : "Cambiar contrasena"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}