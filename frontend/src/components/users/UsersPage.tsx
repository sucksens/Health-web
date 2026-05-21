import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { usersApi, rolesApi } from "@/lib/api"
import type { UserOut, RoleOut, SessionOut } from "@/lib/types"
import { isValidEmail } from "@/lib/utils"
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
import { RiMoreLine, RiPencilLine, RiDeleteBinLine, RiShieldLine, RiAddLine, RiLogoutBoxRLine } from "@remixicon/react"
import { toast } from "sonner"

export function UsersPage() {
  const { hasPermission } = useAuth()
  const [users, setUsers] = useState<UserOut[]>([])
  const [loading, setLoading] = useState(true)

  const canRead = hasPermission("users:read")
  const canCreate = hasPermission("users:create")
  const canUpdate = hasPermission("users:update")
  const canDelete = hasPermission("users:delete")
  const canSessions = hasPermission("users:sessions")

  const [showCreate, setShowCreate] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newEmailError, setNewEmailError] = useState("")
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newActive, setNewActive] = useState(true)
  const [newRoleIds, setNewRoleIds] = useState<number[]>([])
  const [allRoles, setAllRoles] = useState<RoleOut[]>([])

  const [editUser, setEditUser] = useState<UserOut | null>(null)
  const [editEmail, setEditEmail] = useState("")
  const [editEmailError, setEditEmailError] = useState("")
  const [editUsername, setEditUsername] = useState("")
  const [editActive, setEditActive] = useState(true)
  const [editPassword, setEditPassword] = useState("")
  const [editMustChange, setEditMustChange] = useState(false)

  const [rolesUser, setRolesUser] = useState<UserOut | null>(null)
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([])
  const [rolesList, setRolesList] = useState<RoleOut[]>([])

  const [deleteUser, setDeleteUser] = useState<UserOut | null>(null)

  const [sessionsUser, setSessionsUser] = useState<UserOut | null>(null)
  const [sessions, setSessions] = useState<SessionOut[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [confirmInvalidate, setConfirmInvalidate] = useState(false)

  const loadUsers = useCallback(async () => {
    try {
      const data = await usersApi.list()
      setUsers(data)
    } catch (err: any) {
      toast.error(err.detail || "Error al cargar usuarios")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (canRead) loadUsers()
  }, [canRead, loadUsers])

  const openCreate = async () => {
    setNewEmail("")
    setNewEmailError("")
    setNewUsername("")
    setNewPassword("")
    setNewActive(true)
    setNewRoleIds([])
    try {
      const roles = await rolesApi.list()
      setAllRoles(roles)
    } catch { /* no-op */ }
    setShowCreate(true)
  }

  const handleCreate = async () => {
    if (!isValidEmail(newEmail)) {
      setNewEmailError("Ingresa un correo electronico valido")
      return
    }
    try {
      const created = await usersApi.create({
        email: newEmail,
        username: newUsername,
        password: newPassword,
        is_active: newActive,
        role_ids: newRoleIds,
      })
      setUsers((prev) => [...prev, created])
      toast.success("Usuario creado")
      setShowCreate(false)
    } catch (err: any) {
      toast.error(err.detail || "Error al crear usuario")
    }
  }

  const openEdit = (user: UserOut) => {
    setEditUser(user)
    setEditEmail(user.email)
    setEditEmailError("")
    setEditUsername(user.username)
    setEditActive(user.is_active)
    setEditPassword("")
    setEditMustChange(false)
  }

  const handleEdit = async () => {
    if (!editUser) return
    if (!isValidEmail(editEmail)) {
      setEditEmailError("Ingresa un correo electronico valido")
      return
    }
    try {
      const updateData: any = {
        email: editEmail,
        username: editUsername,
        is_active: editActive,
      }
      if (editPassword) {
        updateData.password = editPassword
      }
      if (editMustChange) {
        updateData.must_change_password = true
      }
      const updated = await usersApi.update(editUser.id, updateData)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      toast.success("Usuario actualizado")
      setEditUser(null)
    } catch (err: any) {
      toast.error(err.detail || "Error al actualizar")
    }
  }

  const handleDelete = async () => {
    if (!deleteUser) return
    try {
      await usersApi.delete(deleteUser.id)
      setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id))
      toast.success("Usuario eliminado")
      setDeleteUser(null)
    } catch (err: any) {
      toast.error(err.detail || "Error al eliminar")
    }
  }

  const openRoles = async (user: UserOut) => {
    setRolesUser(user)
    setSelectedRoleIds(user.roles.map((r) => r.id))
    try {
      const roles = await rolesApi.list()
      setRolesList(roles)
    } catch {
      toast.error("Error al cargar roles")
    }
  }

  const handleAssignRoles = async () => {
    if (!rolesUser) return
    try {
      const updated = await usersApi.assignRoles(rolesUser.id, {
        role_ids: selectedRoleIds,
      })
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      toast.success("Roles actualizados")
      setRolesUser(null)
    } catch (err: any) {
      toast.error(err.detail || "Error al asignar roles")
    }
  }

  const openSessions = async (user: UserOut) => {
    setSessionsUser(user)
    setSessionsLoading(true)
    setConfirmInvalidate(false)
    try {
      const data = await usersApi.sessions(user.id)
      setSessions(data)
    } catch (err: any) {
      toast.error(err.detail || "Error al cargar sesiones")
    } finally {
      setSessionsLoading(false)
    }
  }

  const handleInvalidateSessions = async () => {
    if (!sessionsUser) return
    try {
      await usersApi.invalidateSessions(sessionsUser.id)
      toast.success(`Sesiones de ${sessionsUser.username} invalidadas`)
      const data = await usersApi.sessions(sessionsUser.id)
      setSessions(data)
      setConfirmInvalidate(false)
    } catch (err: any) {
      toast.error(err.detail || "Error al invalidar sesiones")
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
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Gestion de usuarios del sistema
          </p>
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
            <RiAddLine data-icon="inline-start" />
            Nuevo usuario
          </Button>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead>Creado</TableHead>
              {(canUpdate || canDelete || canSessions) && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-mono text-xs">{user.id}</TableCell>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? "default" : "destructive"}>
                    {user.is_active ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((r) => (
                      <Badge key={r.id} variant="secondary" className="text-xs">
                        {r.name}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                {(canUpdate || canDelete || canSessions) && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs">
                          <RiMoreLine className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canSessions && (
                          <DropdownMenuItem onClick={() => openSessions(user)}>
                            <RiLogoutBoxRLine className="mr-2 size-4" />
                            Sesiones
                          </DropdownMenuItem>
                        )}
                        {canUpdate && (
                          <>
                            <DropdownMenuItem onClick={() => openEdit(user)}>
                              <RiPencilLine className="mr-2 size-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openRoles(user)}>
                              <RiShieldLine className="mr-2 size-4" />
                              Asignar roles
                            </DropdownMenuItem>
                          </>
                        )}
                        {canDelete && (
                          <DropdownMenuItem
                            onClick={() => setDeleteUser(user)}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo usuario</DialogTitle>
            <DialogDescription>
              Crea un nuevo usuario en el sistema
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value)
                  setNewEmailError("")
                }}
                aria-invalid={!!newEmailError}
                placeholder="usuario@email.com"
              />
              {newEmailError && (
                <p className="text-xs text-destructive">{newEmailError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-username">Usuario</Label>
              <Input
                id="create-username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="nombre.usuario"
                minLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Contrasena</Label>
              <Input
                id="create-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimo 6 caracteres"
                minLength={6}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="create-active"
                checked={newActive}
                onChange={(e) => setNewActive(e.target.checked)}
                className="size-4 rounded border"
              />
              <Label htmlFor="create-active">Activo</Label>
            </div>
            {allRoles.length > 0 && (
              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="max-h-40 space-y-2 overflow-y-auto">
                  {allRoles.map((role) => (
                    <label
                      key={role.id}
                      className="flex items-center gap-3 rounded-lg border p-2.5 hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={newRoleIds.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewRoleIds((prev) => [...prev, role.id])
                          } else {
                            setNewRoleIds((prev) =>
                              prev.filter((id) => id !== role.id)
                            )
                          }
                        }}
                        className="size-4 rounded border"
                      />
                      <div>
                        <p className="text-sm font-medium">{role.name}</p>
                        {role.description && (
                          <p className="text-xs text-muted-foreground">
                            {role.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newEmail || !newUsername || !newPassword}
            >
              Crear usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
            <DialogDescription>
              Modifica los datos del usuario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => {
                  setEditEmail(e.target.value)
                  setEditEmailError("")
                }}
                aria-invalid={!!editEmailError}
              />
              {editEmailError && (
                <p className="text-xs text-destructive">{editEmailError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Usuario</Label>
              <Input
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={editActive}
                onChange={(e) => setEditActive(e.target.checked)}
                className="size-4 rounded border"
              />
              <Label htmlFor="active">Activo</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Nueva contrasena</Label>
              <Input
                id="edit-password"
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Dejar vacio para mantener"
                minLength={6}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="must-change"
                checked={editMustChange}
                onChange={(e) => setEditMustChange(e.target.checked)}
                className="size-4 rounded border"
              />
              <Label htmlFor="must-change">
                Forzar cambio de contrasena al iniciar sesion
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Roles Dialog */}
      <Dialog open={!!rolesUser} onOpenChange={() => setRolesUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar roles</DialogTitle>
            <DialogDescription>
              Selecciona los roles para {rolesUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {rolesList.map((role) => (
              <label
                key={role.id}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={selectedRoleIds.includes(role.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRoleIds((prev) => [...prev, role.id])
                    } else {
                      setSelectedRoleIds((prev) =>
                        prev.filter((id) => id !== role.id)
                      )
                    }
                  }}
                  className="size-4 rounded border"
                />
                <div>
                  <p className="text-sm font-medium">{role.name}</p>
                  {role.description && (
                    <p className="text-xs text-muted-foreground">
                      {role.description}
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRolesUser(null)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignRoles}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sessions Dialog */}
      <Dialog open={!!sessionsUser} onOpenChange={() => setSessionsUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sesiones de {sessionsUser?.username}</DialogTitle>
            <DialogDescription>
              {sessionsLoading
                ? "Cargando..."
                : `${sessions.filter((s) => s.is_active).length} sesion(es) activa(s) de ${sessions.length} total`}
            </DialogDescription>
          </DialogHeader>
          {sessionsLoading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="size-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No hay sesiones registradas
            </p>
          ) : (
            <div className="max-h-[300px] overflow-y-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Sesion</TableHead>
                    <TableHead className="w-36">Creada</TableHead>
                    <TableHead className="w-36">Expira</TableHead>
                    <TableHead className="w-24">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="whitespace-nowrap font-mono text-xs">
                        ...{session.token_jti.slice(-8)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(session.created_at).toLocaleDateString()}
                        <br />
                        <span className="text-muted-foreground">
                          {new Date(session.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {new Date(session.expires_at).toLocaleDateString()}
                        <br />
                        <span className="text-muted-foreground">
                          {new Date(session.expires_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </TableCell>
                      <TableCell>
                        {session.is_active ? (
                          <Badge variant="default" className="text-xs">Activa</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {session.revoked_at ? "Revocada" : "Expirada"}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!confirmInvalidate && sessions.some((s) => s.is_active) && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setSessionsUser(null)}>
                Cerrar
              </Button>
              <Button
                variant="destructive"
                onClick={() => setConfirmInvalidate(true)}
              >
                Invalidar todas las sesiones
              </Button>
            </DialogFooter>
          )}
          {confirmInvalidate && (
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmInvalidate(false)}
              >
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleInvalidateSessions}>
                Confirmar invalidacion
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar usuario</DialogTitle>
            <DialogDescription>
              Estas seguro de eliminar a {deleteUser?.username}? Esta accion no
              se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)}>
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
