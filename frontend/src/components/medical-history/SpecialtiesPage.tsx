import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { medicalHistoryApi } from "@/lib/api"
import type { SpecialtyOut } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RiAddLine, RiMoreLine, RiPencilLine, RiDeleteBinLine } from "@remixicon/react"
import { toast } from "sonner"

export function SpecialtiesPage() {
  const { hasPermission } = useAuth()
  const [items, setItems] = useState<SpecialtyOut[]>([])
  const [loading, setLoading] = useState(true)

  const canRead = hasPermission("medical_history:read")
  const canCreate = hasPermission("medical_history:create")
  const canUpdate = hasPermission("medical_history:update")
  const canDelete = hasPermission("medical_history:delete")

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [editItem, setEditItem] = useState<SpecialtyOut | null>(null)
  const [editName, setEditName] = useState("")
  const [deleteItem, setDeleteItem] = useState<SpecialtyOut | null>(null)

  const load = useCallback(async () => {
    try {
      setItems(await medicalHistoryApi.specialties.list())
    } catch (err: any) {
      toast.error(err.detail || "Error al cargar")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (canRead) load() }, [canRead, load])

  const handleCreate = async () => {
    try {
      const created = await medicalHistoryApi.specialties.create({ name: newName })
      setItems((prev) => [...prev, created])
      toast.success("Especialidad creada")
      setShowCreate(false)
      setNewName("")
    } catch (err: any) { toast.error(err.detail || "Error al crear") }
  }

  const openEdit = (item: SpecialtyOut) => { setEditItem(item); setEditName(item.name) }

  const handleEdit = async () => {
    if (!editItem) return
    try {
      const updated = await medicalHistoryApi.specialties.update(editItem.id, { name: editName })
      setItems((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
      toast.success("Especialidad actualizada")
      setEditItem(null)
    } catch (err: any) { toast.error(err.detail || "Error al actualizar") }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await medicalHistoryApi.specialties.delete(deleteItem.id)
      setItems((prev) => prev.filter((s) => s.id !== deleteItem.id))
      toast.success("Especialidad eliminada")
      setDeleteItem(null)
    } catch (err: any) { toast.error(err.detail || "Error al eliminar") }
  }

  if (!canRead) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">No tienes permisos</div>
  }
  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Especialidades</h1>
          <p className="text-sm text-muted-foreground">Especialidades medicas</p>
        </div>
        {canCreate && (
          <Button onClick={() => { setNewName(""); setShowCreate(true) }}>
            <RiAddLine className="mr-2 size-4" />Nueva especialidad
          </Button>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              {(canUpdate || canDelete) && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-medium">{s.name}</TableCell>
                {(canUpdate || canDelete) && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs"><RiMoreLine className="size-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canUpdate && <DropdownMenuItem onClick={() => openEdit(s)}><RiPencilLine className="mr-2 size-4" />Editar</DropdownMenuItem>}
                        {canDelete && <DropdownMenuItem onClick={() => setDeleteItem(s)} className="text-destructive"><RiDeleteBinLine className="mr-2 size-4" />Eliminar</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva especialidad</DialogTitle><DialogDescription>Crea una especialidad medica</DialogDescription></DialogHeader>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Cardiologia" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newName}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar especialidad</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button onClick={handleEdit}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar especialidad</DialogTitle><DialogDescription>Eliminar "{deleteItem?.name}"? Esta accion no se puede deshacer.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
