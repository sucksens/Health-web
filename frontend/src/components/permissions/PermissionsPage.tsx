import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { permissionsApi } from "@/lib/api"
import type { PermissionOut } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RiAddLine } from "@remixicon/react"
import { toast } from "sonner"

export function PermissionsPage() {
  const { hasPermission } = useAuth()
  const [permissions, setPermissions] = useState<PermissionOut[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newCode, setNewCode] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newModule, setNewModule] = useState("")
  const [filterModule, setFilterModule] = useState<string>("all")

  const canRead = hasPermission("permissions:read")
  const canCreate = hasPermission("permissions:create")

  const loadPermissions = useCallback(async () => {
    try {
      const data = await permissionsApi.list(
        filterModule !== "all" ? filterModule : undefined
      )
      setPermissions(data)
    } catch (err: any) {
      toast.error(err.detail || "Error al cargar permisos")
    } finally {
      setLoading(false)
    }
  }, [filterModule])

  useEffect(() => {
    if (canRead) loadPermissions()
  }, [canRead, loadPermissions])

  const handleCreate = async () => {
    try {
      const created = await permissionsApi.create({
        code: newCode,
        description: newDesc || undefined,
        module: newModule || undefined,
      })
      setPermissions((prev) => [...prev, created])
      toast.success("Permiso creado")
      setShowCreate(false)
      setNewCode("")
      setNewDesc("")
      setNewModule("")
    } catch (err: any) {
      toast.error(err.detail || "Error al crear permiso")
    }
  }

  const modules = Array.from(
    new Set(permissions.map((p) => p.module).filter(Boolean) as string[])
  )

  if (!canRead) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No tienes permisos para ver esta seccion
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Permisos</h1>
          <p className="text-sm text-muted-foreground">
            Gestion de permisos del sistema ({permissions.length} permisos)
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <RiAddLine className="mr-2 size-4" />
            Nuevo permiso
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Select value={filterModule} onValueChange={setFilterModule}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por modulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los modulos</SelectItem>
            {modules.map((m) => (
              <SelectItem key={m} value={m!}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Codigo</TableHead>
              <TableHead>Descripcion</TableHead>
              <TableHead>Modulo</TableHead>
              <TableHead>Creado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((perm) => (
              <TableRow key={perm.id}>
                <TableCell className="font-mono text-xs">{perm.id}</TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
                    {perm.code}
                  </code>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {perm.description || "-"}
                </TableCell>
                <TableCell>
                  {perm.module && (
                    <Badge variant="secondary" className="capitalize">
                      {perm.module}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(perm.created_at).toLocaleDateString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo permiso</DialogTitle>
            <DialogDescription>
              Crea un nuevo permiso en el sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Codigo</Label>
              <Input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="modulo:accion (ej: reports:export)"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Descripcion del permiso"
              />
            </div>
            <div className="space-y-2">
              <Label>Modulo</Label>
              <Input
                value={newModule}
                onChange={(e) => setNewModule(e.target.value)}
                placeholder="modulo (ej: users, expenses)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
