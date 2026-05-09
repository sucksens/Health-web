import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { medicalHistoryApi } from "@/lib/api"
import type { AppointmentOut, DoctorOut } from "@/lib/types"
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { RiAddLine, RiMoreLine, RiPencilLine, RiDeleteBinLine } from "@remixicon/react"
import { toast } from "sonner"

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  completed: "bg-green-500",
  cancelled: "bg-red-500",
}

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  completed: "Completada",
  cancelled: "Cancelada",
}

function emptyForm() {
  return { doctor_id: 0, date_time: "", reason: "", location: "" }
}

export function AppointmentsPage() {
  const { hasPermission } = useAuth()
  const [appointments, setAppointments] = useState<AppointmentOut[]>([])
  const [doctors, setDoctors] = useState<DoctorOut[]>([])
  const [loading, setLoading] = useState(true)

  const canRead = hasPermission("medical_history:read")
  const canCreate = hasPermission("medical_history:create")
  const canUpdate = hasPermission("medical_history:update")
  const canDelete = hasPermission("medical_history:delete")

  const [showCreate, setShowCreate] = useState(false)
  const [editAppt, setEditAppt] = useState<AppointmentOut | null>(null)
  const [deleteAppt, setDeleteAppt] = useState<AppointmentOut | null>(null)
  const [form, setForm] = useState(emptyForm())

  const load = useCallback(async () => {
    try {
      const [appts, docs] = await Promise.all([
        medicalHistoryApi.appointments.list(0, 100),
        medicalHistoryApi.doctors.list(),
      ])
      setAppointments(appts)
      setDoctors(docs)
    } catch (err: any) {
      toast.error(err.detail || "Error al cargar")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (canRead) load() }, [canRead, load])

  const openCreate = () => { setForm(emptyForm()); setShowCreate(true) }

  const openEdit = (appt: AppointmentOut) => {
    setEditAppt(appt)
    const dt = appt.date_time.slice(0, 16)
    setForm({
      doctor_id: appt.doctor_id,
      date_time: dt,
      reason: appt.reason || "",
      location: appt.location || "",
    })
  }

  const handleSave = async (isEdit: boolean) => {
    try {
      const payload = {
        doctor_id: form.doctor_id,
        date_time: form.date_time + ":00",
        reason: form.reason || null,
        location: form.location || null,
      }

      if (isEdit && editAppt) {
        const updated = await medicalHistoryApi.appointments.update(editAppt.id, payload)
        setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
        toast.success("Cita actualizada")
        setEditAppt(null)
      } else {
        const created = await medicalHistoryApi.appointments.create(payload)
        setAppointments((prev) => [created, ...prev])
        toast.success("Cita registrada")
        setShowCreate(false)
      }
    } catch (err: any) {
      toast.error(err.detail || "Error al guardar")
    }
  }

  const handleDelete = async () => {
    if (!deleteAppt) return
    try {
      await medicalHistoryApi.appointments.delete(deleteAppt.id)
      setAppointments((prev) => prev.filter((a) => a.id !== deleteAppt.id))
      toast.success("Cita eliminada")
      setDeleteAppt(null)
    } catch (err: any) {
      toast.error(err.detail || "Error al eliminar")
    }
  }

  const handleStatusChange = async (appt: AppointmentOut, newStatus: string) => {
    try {
      const updated = await medicalHistoryApi.appointments.update(appt.id, { status: newStatus })
      setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      toast.success(`Cita marcada como ${statusLabels[newStatus as keyof typeof statusLabels]}`)
    } catch (err: any) {
      toast.error(err.detail || "Error al actualizar estado")
    }
  }

  const formatDate = (dt: string) => {
    const d = new Date(dt)
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  }

  const getDoctorName = (id: number) => doctors.find((d) => d.id === id)?.name || "Doctor"

  const formFields = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Doctor *</Label>
        <Select value={String(form.doctor_id)} onValueChange={(v) => setForm((p) => ({ ...p, doctor_id: Number(v) }))}>
          <SelectTrigger><SelectValue placeholder="Seleccionar doctor" /></SelectTrigger>
          <SelectContent>
            {doctors.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Fecha y hora *</Label>
        <Input type="datetime-local" value={form.date_time} onChange={(e) => setForm((p) => ({ ...p, date_time: e.target.value }))} />
      </div>
      <div className="space-y-2">
        <Label>Motivo</Label>
        <Input value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} placeholder="Chequeo general, dolor de cabeza..." />
      </div>
      <div className="space-y-2">
        <Label>Lugar</Label>
        <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="Consultorio, videollamada..." />
      </div>
    </div>
  )

  if (!canRead) return <div className="flex h-64 items-center justify-center text-muted-foreground">No tienes permisos</div>
  if (loading) return <div className="flex h-64 items-center justify-center"><div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Citas</h1>
          <p className="text-sm text-muted-foreground">Gestion de citas medicas</p>
        </div>
        {canCreate && <Button onClick={openCreate}><RiAddLine className="mr-2 size-4" />Nueva cita</Button>}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Lugar</TableHead>
              <TableHead>Estado</TableHead>
              {(canUpdate || canDelete) && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No hay citas</TableCell></TableRow>
            ) : (
              appointments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm">{formatDate(a.date_time)}</TableCell>
                  <TableCell className="font-medium">{getDoctorName(a.doctor_id)}</TableCell>
                  <TableCell className="text-sm">{a.reason || "-"}</TableCell>
                  <TableCell className="text-sm">{a.location || "-"}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[a.status]}>{statusLabels[a.status as keyof typeof statusLabels] || a.status}</Badge>
                  </TableCell>
                  {(canUpdate || canDelete) && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-xs"><RiMoreLine className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canUpdate && (
                            <>
                              <DropdownMenuItem onClick={() => openEdit(a)}><RiPencilLine className="mr-2 size-4" />Editar</DropdownMenuItem>
                              {a.status === "pending" && (
                                <>
                                  <DropdownMenuItem onClick={() => handleStatusChange(a, "completed")}>Marcar completada</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleStatusChange(a, "cancelled")}>Marcar cancelada</DropdownMenuItem>
                                </>
                              )}
                            </>
                          )}
                          {canDelete && <DropdownMenuItem onClick={() => setDeleteAppt(a)} className="text-destructive"><RiDeleteBinLine className="mr-2 size-4" />Eliminar</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nueva cita</DialogTitle><DialogDescription>Agenda una nueva cita medica</DialogDescription></DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => handleSave(false)} disabled={!form.doctor_id || !form.date_time}>Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editAppt} onOpenChange={() => setEditAppt(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar cita</DialogTitle></DialogHeader>
          {formFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAppt(null)}>Cancelar</Button>
            <Button onClick={() => handleSave(true)}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteAppt} onOpenChange={() => setDeleteAppt(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar cita</DialogTitle><DialogDescription>Eliminar esta cita? Esta accion no se puede deshacer.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAppt(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}