import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { medicalHistoryApi } from "@/lib/api"
import type { DoctorOut, SpecialtyOut } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Badge } from "@/components/ui/badge"
import { RiAddLine, RiMoreLine, RiPencilLine, RiDeleteBinLine } from "@remixicon/react"
import { toast } from "sonner"

export function DoctorsPage() {
  const { hasPermission } = useAuth()
  const [doctors, setDoctors] = useState<DoctorOut[]>([])
  const [specialties, setSpecialties] = useState<SpecialtyOut[]>([])
  const [loading, setLoading] = useState(true)

  const canRead = hasPermission("medical_history:read")
  const canCreate = hasPermission("medical_history:create")
  const canUpdate = hasPermission("medical_history:update")
  const canDelete = hasPermission("medical_history:delete")

  const [showCreate, setShowCreate] = useState(false)
  const [editDoc, setEditDoc] = useState<DoctorOut | null>(null)
  const [deleteDoc, setDeleteDoc] = useState<DoctorOut | null>(null)

  const [name, setName] = useState("")
  const [specialtyIds, setSpecialtyIds] = useState<number[]>([])
  const [licenseNum, setLicenseNum] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")

  const load = useCallback(async () => {
    try {
      const [docs, specs] = await Promise.all([
        medicalHistoryApi.doctors.list(),
        medicalHistoryApi.specialties.list(),
      ])
      setDoctors(docs)
      setSpecialties(specs)
    } catch (err: any) {
      toast.error(err.detail || "Error al cargar")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (canRead) load()
  }, [canRead, load])

  const resetForm = () => {
    setName("")
    setSpecialtyIds([])
    setLicenseNum("")
    setPhone("")
    setEmail("")
    setAddress("")
    setNotes("")
  }

  const openCreate = () => {
    resetForm()
    setShowCreate(true)
  }

  const openEdit = (doc: DoctorOut) => {
    setEditDoc(doc)
    setName(doc.name)
    setSpecialtyIds(doc.specialty_ids || [])
    setLicenseNum(doc.license_number || "")
    setPhone(doc.phone || "")
    setEmail(doc.email || "")
    setAddress(doc.address || "")
    setNotes(doc.notes || "")
  }

  const handleSave = async (isEdit: boolean) => {
    try {
      const payload = {
        name,
        specialty_ids: specialtyIds,
        license_number: licenseNum || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
      }

      if (isEdit && editDoc) {
        const updated = await medicalHistoryApi.doctors.update(editDoc.id, payload)
        setDoctors((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
        toast.success("Doctor actualizado")
        setEditDoc(null)
      } else {
        const created = await medicalHistoryApi.doctors.create(payload)
        setDoctors((prev) => [...prev, created])
        toast.success("Doctor registrado")
        setShowCreate(false)
      }
      resetForm()
    } catch (err: any) {
      toast.error(err.detail || "Error al guardar")
    }
  }

  const handleDelete = async () => {
    if (!deleteDoc) return
    try {
      await medicalHistoryApi.doctors.delete(deleteDoc.id)
      setDoctors((prev) => prev.filter((d) => d.id !== deleteDoc.id))
      toast.success("Doctor eliminado")
      setDeleteDoc(null)
    } catch (err: any) {
      toast.error(err.detail || "Error al eliminar")
    }
  }

  const specNames = (ids: number[]) => {
    if (!ids.length) return "-"
    return ids.map((id) => specialties.find((s) => s.id === id)?.name || "-").join(", ")
  }

  const toggleSpecialty = (id: number) => {
    setSpecialtyIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
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

  const formFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Nombre</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Juan Perez" />
      </div>
      <div className="space-y-2">
        <Label>Especialidades</Label>
        <div className="max-h-40 overflow-y-auto rounded-md border p-2 space-y-1">
          {specialties.length === 0 && (
            <p className="text-xs text-muted-foreground px-1">Sin especialidades registradas</p>
          )}
          {specialties.map((s) => (
            <label key={s.id} className="flex items-center gap-2 px-1 py-0.5 cursor-pointer text-sm hover:bg-muted/50 rounded">
              <input
                type="checkbox"
                checked={specialtyIds.includes(s.id)}
                onChange={() => toggleSpecialty(s.id)}
                className="accent-primary"
              />
              {s.name}
            </label>
          ))}
        </div>
        {specialtyIds.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {specialtyIds.map((id) => {
              const s = specialties.find((sp) => sp.id === id)
              return s ? (
                <Badge key={id} variant="secondary" className="text-xs">{s.name}</Badge>
              ) : null
            })}
          </div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Telefono</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+52 555 123 4567" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="doctor@email.com" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Direccion</Label>
        <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Consultorio 101, Hospital Central" />
      </div>
      <div className="space-y-2">
        <Label>Notas</Label>
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas personales..." />
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Doctores</h1>
          <p className="text-sm text-muted-foreground">Catalogo de doctores</p>
        </div>
        {canCreate && (
          <Button onClick={openCreate}>
            <RiAddLine className="mr-2 size-4" />
            Nuevo doctor
          </Button>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Especialidad</TableHead>
              <TableHead>Telefono</TableHead>
              <TableHead>Email</TableHead>
              {(canUpdate || canDelete) && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {doctors.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.name}</TableCell>
                <TableCell className="text-sm">{specNames(doc.specialty_ids)}</TableCell>
                <TableCell className="text-sm">{doc.phone || "-"}</TableCell>
                <TableCell className="text-sm">{doc.email || "-"}</TableCell>
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
                          <DropdownMenuItem onClick={() => openEdit(doc)}>
                            <RiPencilLine className="mr-2 size-4" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {canDelete && (
                          <DropdownMenuItem onClick={() => setDeleteDoc(doc)} className="text-destructive">
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

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo doctor</DialogTitle>
            <DialogDescription>Registra un doctor</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => handleSave(false)} disabled={!name}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editDoc} onOpenChange={() => setEditDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar doctor</DialogTitle>
            <DialogDescription>Modifica los datos del doctor</DialogDescription>
          </DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDoc(null)}>Cancelar</Button>
            <Button onClick={() => handleSave(true)}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar doctor</DialogTitle>
            <DialogDescription>
              Estas seguro de eliminar a {deleteDoc?.name}? Esta accion no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDoc(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
