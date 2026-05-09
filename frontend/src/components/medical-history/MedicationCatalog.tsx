import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { medicalHistoryApi } from "@/lib/api"
import type { MedicationOut } from "@/lib/types"
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

function emptyForm() {
  return { generic_name: "", brand_name: "", presentation: "", concentration: "", notes: "" }
}

export function MedicationCatalog() {
  const { hasPermission } = useAuth()
  const [items, setItems] = useState<MedicationOut[]>([])
  const [loading, setLoading] = useState(true)

  const canRead = hasPermission("medical_history:read")
  const canCreate = hasPermission("medical_history:create")
  const canUpdate = hasPermission("medical_history:update")
  const canDelete = hasPermission("medical_history:delete")

  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState<MedicationOut | null>(null)
  const [deleteItem, setDeleteItem] = useState<MedicationOut | null>(null)
  const [form, setForm] = useState(emptyForm())

  const load = useCallback(async () => {
    try {
      setItems(await medicalHistoryApi.medications.list())
    } catch (err: any) {
      toast.error(err.detail || "Error al cargar")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (canRead) load() }, [canRead, load])

  const openCreate = () => { setForm(emptyForm()); setShowCreate(true) }

  const openEdit = (med: MedicationOut) => {
    setEditItem(med)
    setForm({
      generic_name: med.generic_name,
      brand_name: med.brand_name || "",
      presentation: med.presentation || "",
      concentration: med.concentration || "",
      notes: med.notes || "",
    })
  }

  const handleSave = async (isEdit: boolean) => {
    try {
      const payload = {
        generic_name: form.generic_name,
        brand_name: form.brand_name || null,
        presentation: form.presentation || null,
        concentration: form.concentration || null,
        notes: form.notes || null,
      }

      if (isEdit && editItem) {
        const updated = await medicalHistoryApi.medications.update(editItem.id, payload)
        setItems((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
        toast.success("Medicamento actualizado")
        setEditItem(null)
      } else {
        const created = await medicalHistoryApi.medications.create(payload)
        setItems((prev) => [...prev, created])
        toast.success("Medicamento registrado")
        setShowCreate(false)
      }
    } catch (err: any) {
      toast.error(err.detail || "Error al guardar")
    }
  }

  const handleDelete = async () => {
    if (!deleteItem) return
    try {
      await medicalHistoryApi.medications.delete(deleteItem.id)
      setItems((prev) => prev.filter((m) => m.id !== deleteItem.id))
      toast.success("Medicamento eliminado")
      setDeleteItem(null)
    } catch (err: any) {
      toast.error(err.detail || "Error al eliminar")
    }
  }

  const f = (field: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  const formFields = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Nombre generico *</Label>
          <Input value={form.generic_name} onChange={(e) => f("generic_name", e.target.value)} placeholder="Amoxicilina" />
        </div>
        <div className="space-y-2">
          <Label>Nombre comercial</Label>
          <Input value={form.brand_name} onChange={(e) => f("brand_name", e.target.value)} placeholder="Trimox" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Presentacion</Label>
          <Input value={form.presentation} onChange={(e) => f("presentation", e.target.value)} placeholder="Comprimido, jarabe..." />
        </div>
        <div className="space-y-2">
          <Label>Concentracion</Label>
          <Input value={form.concentration} onChange={(e) => f("concentration", e.target.value)} placeholder="500 mg" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Notas</Label>
        <Input value={form.notes} onChange={(e) => f("notes", e.target.value)} placeholder="Notas personales..." />
      </div>
    </div>
  )

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
          <h1 className="text-2xl font-semibold">Medicamentos</h1>
          <p className="text-sm text-muted-foreground">Catalogo personal de medicamentos</p>
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
            <RiAddLine className="mr-2 size-4" />Nuevo medicamento
          </Button>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Generico</TableHead>
              <TableHead>Comercial</TableHead>
              <TableHead>Presentacion</TableHead>
              <TableHead>Concentracion</TableHead>
              {(canUpdate || canDelete) && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((med) => (
              <TableRow key={med.id}>
                <TableCell className="font-medium">{med.generic_name}</TableCell>
                <TableCell className="text-sm">{med.brand_name || "-"}</TableCell>
                <TableCell className="text-sm">{med.presentation || "-"}</TableCell>
                <TableCell className="text-sm">{med.concentration || "-"}</TableCell>
                {(canUpdate || canDelete) && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs"><RiMoreLine className="size-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canUpdate && <DropdownMenuItem onClick={() => openEdit(med)}><RiPencilLine className="mr-2 size-4" />Editar</DropdownMenuItem>}
                        {canDelete && <DropdownMenuItem onClick={() => setDeleteItem(med)} className="text-destructive"><RiDeleteBinLine className="mr-2 size-4" />Eliminar</DropdownMenuItem>}
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
          <DialogHeader><DialogTitle>Nuevo medicamento</DialogTitle><DialogDescription>Registra un medicamento</DialogDescription></DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => handleSave(false)} disabled={!form.generic_name}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar medicamento</DialogTitle><DialogDescription>Modifica los datos</DialogDescription></DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button onClick={() => handleSave(true)}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar medicamento</DialogTitle><DialogDescription>Eliminar "{deleteItem?.generic_name}"? Esta accion no se puede deshacer.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
