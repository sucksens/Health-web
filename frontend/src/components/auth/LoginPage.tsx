import { useState } from "react"
import type React from "react"
import { useAuth } from "@/lib/auth"
import { useNavigate } from "@/lib/router"
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

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await login({ username, password })
      if (result === "must_change_password") {
        toast.warning("Debes cambiar tu contrasena antes de continuar")
        navigate("/force-password-change")
        return
      }
      toast.success("Inicio de sesion exitoso")
      navigate("/dashboard")
    } catch (err: any) {
      toast.error(err.detail || "Error al iniciar sesion")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">GastosApp</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contrasena</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Ingresando..." : "Iniciar sesion"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            No tienes cuenta?{" "}
            <a
              href="/register"
              className="text-primary underline-offset-4 hover:underline"
              onClick={(e) => {
                e.preventDefault()
                navigate("/register")
              }}
            >
              Registrate
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
