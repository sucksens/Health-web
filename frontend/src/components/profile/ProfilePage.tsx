import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { useNavigate } from "@/lib/router"
import { authApi, usersApi } from "@/lib/api"
import { isValidEmail } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RiLockLine, RiLogoutBoxRLine } from "@remixicon/react"
import { toast } from "sonner"

export function ProfilePage() {
  const { user, refreshUser, logout } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState(user?.email || "")
  const [firstName, setFirstName] = useState(user?.first_name || "")
  const [lastName, setLastName] = useState(user?.last_name || "")
  const [heightCm, setHeightCm] = useState<string>(user?.height_cm?.toString() || "")
  const [sex, setSex] = useState<string>(user?.sex || "")
  const [emailError, setEmailError] = useState("")
  const [saving, setSaving] = useState(false)

  const [showPassword, setShowPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  if (user?.must_change_password) {
    navigate("/force-password-change")
    return null
  }

  const handleSaveInfo = async () => {
    if (!isValidEmail(email)) {
      setEmailError("Ingresa un correo electronico valido")
      return
    }
    setSaving(true)
    try {
      await usersApi.update(user!.id, {
        email,
        first_name: firstName || null,
        last_name: lastName || null,
        height_cm: heightCm ? parseFloat(heightCm) : null,
        sex: sex || null,
      })
      await refreshUser()
      toast.success("Informacion actualizada")
    } catch (err: any) {
      toast.error(err.detail || "Error al actualizar")
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordError("")
    if (newPassword.length < 6) {
      setPasswordError("La nueva contrasena debe tener al menos 6 caracteres")
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contrasenas no coinciden")
      return
    }
    setChangingPassword(true)
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      })
      toast.success("Contrasena cambiada. Debes iniciar sesion nuevamente.")
      setShowPassword(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      await logout()
      navigate("/login")
    } catch (err: any) {
      toast.error(err.detail || "Error al cambiar contrasena")
    } finally {
      setChangingPassword(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate("/login")
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mi Perfil</h1>
        <p className="text-sm text-muted-foreground">
          Administra tu informacion personal y seguridad
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informacion personal</CardTitle>
          <CardDescription>
            Actualiza tus datos de contacto y nombre
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre(s)</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Juan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido(s)</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Perez"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setEmailError("")
              }}
              aria-invalid={!!emailError}
            />
            {emailError && (
              <p className="text-xs text-destructive">{emailError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Usuario</Label>
            <Input value={user?.username || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              El nombre de usuario no se puede cambiar
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="heightCm">Estatura (cm)</Label>
              <Input
                id="heightCm"
                type="number"
                min="50"
                max="300"
                step="0.1"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="170"
              />
              <p className="text-xs text-muted-foreground">
                Requerida para calcular el IMC
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sex">Sexo</Label>
              <Select value={sex} onValueChange={setSex}>
                <SelectTrigger id="sex">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Femenino</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label>Estado</Label>
            <Badge variant={user?.is_active ? "default" : "destructive"}>
              {user?.is_active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-sm text-muted-foreground">Roles</Label>
            <div className="flex flex-wrap gap-1">
              {user?.roles.map((r) => (
                <Badge key={r.id} variant="secondary">{r.name}</Badge>
              ))}
            </div>
          </div>
          <Button onClick={handleSaveInfo} disabled={saving}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seguridad</CardTitle>
          <CardDescription>
            Cambia tu contrasena para mantener tu cuenta segura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setShowPassword(true)}>
            <RiLockLine data-icon="inline-start" />
            Cambiar contrasena
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Sesion</CardTitle>
          <CardDescription>
            Cierra tu sesion en este dispositivo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleLogout}>
            <RiLogoutBoxRLine data-icon="inline-start" />
            Cerrar sesion
          </Button>
        </CardContent>
      </Card>

      {/* Change Password Dialog */}
      <Dialog open={showPassword} onOpenChange={setShowPassword}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contrasena</DialogTitle>
            <DialogDescription>
              Al cambiar tu contrasena se cerraran todas tus sesiones activas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Contrasena actual</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contrasena</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
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
                minLength={6}
              />
            </div>
            {passwordError && (
              <p className="text-xs text-destructive">{passwordError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPassword(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={
                changingPassword ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
            >
              {changingPassword ? "Cambiando..." : "Cambiar contrasena"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
