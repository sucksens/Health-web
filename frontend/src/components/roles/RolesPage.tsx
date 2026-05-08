import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { rolesApi, permissionsApi } from "@/lib/api"
import type { RoleOut, PermissionOut } from "@/lib/types"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RiAddLine, RiMoreLine, RiPencilLine, RiDeleteBinLine, RiKeyLine } from "@remixicon/react"
import { toast } from "sonner"

export function RolesPage() {
  const { hasPermission } = useAuth()
  const [roles, setRoles] = useState<RoleOut[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [editRole, setEditRole] = useState<RoleOut | null>(null)
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [permsRole, setPermsRole] = useState<RoleOut | null>(null)
  const [allPerms, setAllPerms] = useState<PermissionOut[]>([])
  const [selectedPermIds, setSelectedPermIds] = useState<number[]>([])
  const [deleteRole, setDeleteRole] = useState<RoleOut | null>(null)

  const canRead = hasPermission("roles:read")
  const canCreate = hasPermission("roles:create")
  const canUpdate = hasPermission("roles:update")
  const canDelete = hasPermission("roles:delete")

  const loadRoles = useCallback(async () => {
    try {
      const data = await rolesApi.list()
      setRoles(data)
    } catch (err: any) {
      toast.error(err.detail || "Error al cargar roles")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (canRead) loadRoles()
  }, [canRead, loadRoles])

  const handleCreate = async () => {
    try {
      const created = await rolesApi.create({
        name: newName,
        description: newDesc || undefined,
      })
      setRoles((prev) => [...prev, created])
      toast.success("Rol creado")
      setShowCreate(false)
      setNewName("")
      setNewDesc("")
    } catch (err: any) {
      toast.error(err.detail || "Error al crear rol")
    }
  }

  const openEdit = (role: RoleOut) => {
    setEditRole(role)
    setEditName(role.name)
    setEditDesc(role.description || "")
  }

  const handleEdit = async () => {
    if (!editRole) return
    try {
      const updated = await rolesApi.update(editRole.id, {
        name: editName,
        description: editDesc || undefined,
      })
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      toast.success("Rol actualizado")
      setEditRole(null)
    } catch (err: any) {
      toast.error(err.detail || "Error al actualizar")
    }
  }

  const handleDelete = async () => {
    if (!deleteRole) return
    try {
      await rolesApi.delete(deleteRole.id)
      setRoles((prev) => prev.filter((r) => r.id !== deleteRole.id))
      toast.success("Rol eliminado")
      setDeleteRole(null)
    } catch (err: any) {
      toast.error(err.detail || "Error al eliminar")
    }
  }

  const openPerms = async (role: RoleOut) => {
    setPermsRole(role)
    setSelectedPermIds(role.permissions.map((p) => p.id))
    try {
      const perms = await permissionsApi.list()
      setAllPerms(perms)
    } catch {
      toast.error("Error al cargar permisos")
    }
  }

  const handleAssignPerms = async () => {
    if (!permsRole) return
    try {
      const updated = await rolesApi.assignPermissions(permsRole.id, {
        permission_ids: selectedPermIds,
      })
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      toast.success("Permisos actualizados")
      setPermsRole(null)
    } catch (err: any) {
      toast.error(err.detail || "Error al asignar permisos")
    }
  }

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
          <h1 className="text-2xl font-semibold">Roles</h1>
          <p className="text-sm text-muted-foreground">
            Gestion de roles del sistema
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowCreate(true)}>
            <RiAddLine className="mr-2 size-4" />
            Nuevo rol
          </Button>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Descripcion</TableHead>
              <TableHead>Permisos</TableHead>
              {(canUpdate || canDelete) && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-mono text-xs">{role.id}</TableCell>
                <TableCell className="font-medium">{role.name}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {role.description || "-"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.map((p) => (
                      <Badge
                        key={p.id}
                        variant="outline"
                        className="text-xs"
                      >
                        {p.code}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                {(canUpdate || canDelete) && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs">
                          <RiMoreLine className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canUpdate && (
                          <>
                            <DropdownMenuItem onClick={() => openEdit(role)}>
                              <RiPencilLine className="mr-2 size-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPerms(role)}>
                              <RiKeyLine className="mr-2 size-4" />
                              Permisos
                            </DropdownMenuItem>
                          </>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() => setDeleteRole(role)}
                            className="text-destructive"
                          >
                            <RiDeleteBinLine className="mr-2 size-4" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo rol</DialogTitle>
            <DialogDescription>Crea un nuevo rol en el sistema</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="nombre-del-rol"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Descripcion del rol"
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

      {/* Edit Dialog */}
      <Dialog open={!!editRole} onOpenChange={() => setEditRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar rol</DialogTitle>
            <DialogDescription>Modifica los datos del rol</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Descripcion</Label>
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRole(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={!!permsRole} onOpenChange={() => setPermsRole(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Permisos del rol: {permsRole?.name}</DialogTitle>
            <DialogDescription>
              Selecciona los permisos para este rol
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {allPerms.map((perm) => (
              <label
                key={perm.id}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={selectedPermIds.includes(perm.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPermIds((prev) => [...prev, perm.id])
                    } else {
                      setSelectedPermIds((prev) =>
                        prev.filter((id) => id !== perm.id)
                      )
                    }
                  }}
                  className="size-4 rounded border"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{perm.code}</p>
                  {perm.description && (
                    <p className="text-xs text-muted-foreground">
                      {perm.description}
                    </p>
                  )}
                </div>
                {perm.module && (
                  <Badge variant="secondary" className="text-xs capitalize">
                    {perm.module}
                  </Badge>
                )}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermsRole(null)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignPerms}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteRole} onOpenChange={() => setDeleteRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar rol</DialogTitle>
            <DialogDescription>
              Estas seguro de eliminar el rol {deleteRole?.name}? Esta accion
              no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRole(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
