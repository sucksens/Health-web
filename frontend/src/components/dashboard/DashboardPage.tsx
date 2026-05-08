import { useAuth } from "@/lib/auth"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { RiGroupLine, RiShieldLine, RiKeyLine } from "@remixicon/react"

export function DashboardPage() {
  const { user, permissions } = useAuth()

  const modules = Array.from(
    new Set(
      user?.roles
        .flatMap((r) => r.permissions)
        .map((p) => p.module) || []
    )
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Bienvenido, {user?.username}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <RiGroupLine className="size-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Roles</CardTitle>
              <CardDescription>Tus roles asignados</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {user?.roles.map((role) => (
                <Badge key={role.id} variant="secondary">
                  {role.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <RiKeyLine className="size-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Permisos</CardTitle>
              <CardDescription>
                {permissions.size} permisos activos
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {Array.from(permissions)
                .slice(0, 8)
                .map((p) => (
                  <Badge key={p} variant="outline" className="text-xs">
                    {p}
                  </Badge>
                ))}
              {permissions.size > 8 && (
                <Badge variant="outline" className="text-xs">
                  +{permissions.size - 8} mas
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <RiShieldLine className="size-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-base">Modulos</CardTitle>
              <CardDescription>Modulos con acceso</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {modules.map((m) => (
                <Badge key={m} variant="secondary" className="capitalize">
                  {m}
                </Badge>
              ))}
              {modules.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  Sin modulos asignados
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div>
        <h2 className="mb-3 text-lg font-medium">Informacion de la cuenta</h2>
        <div className="grid gap-2 text-sm">
          <div className="flex gap-2">
            <span className="text-muted-foreground">Email:</span>
            <span>{user?.email}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground">Usuario:</span>
            <span>{user?.username}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground">Estado:</span>
            <Badge variant={user?.is_active ? "default" : "destructive"}>
              {user?.is_active ? "Activo" : "Inactivo"}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
