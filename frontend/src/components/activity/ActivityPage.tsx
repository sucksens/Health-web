import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { activityApi } from "@/lib/api"
import type { ActivityLogOut } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { RiRefreshLine } from "@remixicon/react"
import { toast } from "sonner"

const typeColors: Record<string, "default" | "secondary" | "destructive"> = {
  auth: "default",
  action: "secondary",
  error: "destructive",
}

const moduleLabels: Record<string, string> = {
  auth: "Autenticacion",
  users: "Usuarios",
  roles: "Roles",
  permissions: "Permisos",
}

const actionLabels: Record<string, string> = {
  login: "Inicio de sesion",
  login_failed: "Intento fallido",
  logout: "Cierre de sesion",
  logout_all: "Cerro todas las sesiones",
  register: "Registro",
  create_user: "Creo usuario",
  update_user: "Actualizo usuario",
  delete_user: "Elimino usuario",
  assign_roles: "Asigno roles",
  invalidate_sessions: "Invalido sesiones",
  create_role: "Creo rol",
  update_role: "Actualizo rol",
  delete_role: "Elimino rol",
  assign_permissions: "Asigno permisos",
  create_permission: "Creo permiso",
}

export function ActivityPage() {
  const { hasPermission } = useAuth()
  const [logs, setLogs] = useState<ActivityLogOut[]>([])
  const [loading, setLoading] = useState(true)
  const [filterModule, setFilterModule] = useState<string>("all")
  const [filterType, setFilterType] = useState<string>("all")

  const canRead = hasPermission("activity:read")

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const data = await activityApi.list({
        limit: 200,
        module: filterModule !== "all" ? filterModule : undefined,
        type: filterType !== "all" ? filterType : undefined,
      })
      setLogs(data)
    } catch (err: any) {
      toast.error(err.detail || "Error al cargar registros")
    } finally {
      setLoading(false)
    }
  }, [filterModule, filterType])

  useEffect(() => {
    if (canRead) loadLogs()
  }, [canRead, loadLogs])

  const formatDetails = (details: Record<string, any> | string | null) => {
    if (!details) return "-"
    if (typeof details === "string") return details
    return Object.entries(details)
      .map(([k, v]) => {
        if (k === "changes" && typeof v === "object") {
          return Object.entries(v).map(([ck, cv]) => `${ck}: ${cv}`).join(", ")
        }
        if (Array.isArray(v)) return `${k}: [${v.join(", ")}]`
        return `${k}: ${v}`
      })
      .join(" | ")
  }

  if (!canRead) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No tienes permisos para ver esta seccion
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Auditoria</h1>
          <p className="text-sm text-muted-foreground">
            Registro de actividad del sistema ({logs.length} registros)
          </p>
        </div>
        <Button variant="outline" onClick={loadLogs} disabled={loading}>
          <RiRefreshLine data-icon="inline-start" />
          Actualizar
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={filterModule} onValueChange={setFilterModule}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Modulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los modulos</SelectItem>
            <SelectItem value="auth">Autenticacion</SelectItem>
            <SelectItem value="users">Usuarios</SelectItem>
            <SelectItem value="roles">Roles</SelectItem>
            <SelectItem value="permissions">Permisos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="auth">Auth</SelectItem>
            <SelectItem value="action">Accion</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="max-h-[calc(100vh-280px)] overflow-y-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Fecha</TableHead>
                <TableHead className="w-28">Usuario</TableHead>
                <TableHead className="w-44">Accion</TableHead>
                <TableHead className="w-28">Modulo</TableHead>
                <TableHead className="w-20">Tipo</TableHead>
                <TableHead>Detalles</TableHead>
                <TableHead className="w-32">IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No hay registros de actividad
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(log.created_at).toLocaleDateString()}
                      <br />
                      <span className="text-muted-foreground">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.username || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {actionLabels[log.action] || log.action}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {moduleLabels[log.module] || log.module}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={typeColors[log.type] || "secondary"} className="text-xs">
                        {log.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {formatDetails(log.details)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.ip_address || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
