import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { medicalHistoryApi } from "@/lib/api"
import type { AdherenceRecordOut } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Card, CardContent,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RiCheckLine, RiCloseLine, RiTimeLine, RiCapsuleLine, RiEditLine, RiAddLine } from "@remixicon/react"
import { toast } from "sonner"

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800", icon: RiTimeLine },
  taken: { label: "Tomada", color: "bg-green-100 text-green-800", icon: RiCheckLine },
  skipped: { label: "Omitida", color: "bg-red-100 text-red-800", icon: RiCloseLine },
  late: { label: "Tarde", color: "bg-orange-100 text-orange-800", icon: RiTimeLine },
}

export function AdherenceTracker() {
  const { hasPermission } = useAuth()
  const [todayRecords, setTodayRecords] = useState<AdherenceRecordOut[]>([])
  const [historyRecords, setHistoryRecords] = useState<AdherenceRecordOut[]>([])
  const [loading, setLoading] = useState(true)
  const [showNotes, setShowNotes] = useState<AdherenceRecordOut | null>(null)
  const [notes, setNotes] = useState("")
  const [editingTime, setEditingTime] = useState<number | null>(null)
  const [editTimeValue, setEditTimeValue] = useState("")
  const [showManual, setShowManual] = useState(false)
  const [manualName, setManualName] = useState("")
  const [manualTime, setManualTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
  })
  const [manualNotes, setManualNotes] = useState("")
  const [manualSaving, setManualSaving] = useState(false)

  const canRead = hasPermission("medical_history:read")
  const canUpdate = hasPermission("medical_history:update")

  const load = useCallback(async () => {
    try {
      const [today, history] = await Promise.all([
        medicalHistoryApi.adherence.today(),
        medicalHistoryApi.adherence.history(0, 50),
      ])
      setTodayRecords(today)
      setHistoryRecords(history)
    } catch (err: any) {
      toast.error(err.detail || "Error al cargar")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (canRead) load() }, [canRead, load])

  const _updateRecordInState = (updated: AdherenceRecordOut) => {
    const updater = (prev: AdherenceRecordOut[]) =>
      prev.map((r) => (r.id === updated.id ? updated : r))
    setTodayRecords(updater)
    setHistoryRecords(updater)
  }

  const handleStatus = async (record: AdherenceRecordOut, newStatus: string) => {
    try {
      const updated = await medicalHistoryApi.adherence.update(record.id, { status: newStatus })
      _updateRecordInState(updated)
      toast.success(`Marcada como ${statusConfig[newStatus]?.label || newStatus}`)
    } catch (err: any) {
      toast.error(err.detail || "Error al actualizar")
    }
  }

  const handleSaveNotes = async () => {
    if (!showNotes) return
    try {
      const updated = await medicalHistoryApi.adherence.update(showNotes.id, { notes })
      _updateRecordInState(updated)
      toast.success("Notas guardadas")
      setShowNotes(null)
    } catch (err: any) {
      toast.error(err.detail || "Error al guardar")
    }
  }

  const formatTime = (dt: string) => {
    const d = new Date(dt)
    return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
  }

  const timeToStr = (dt: string) => {
    const d = new Date(dt)
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  }

  const handleUpdateTime = async (record: AdherenceRecordOut) => {
    const datePart = record.scheduled_time.slice(0, 10)
    try {
      const updated = await medicalHistoryApi.adherence.update(record.id, {
        scheduled_time: `${datePart}T${editTimeValue}:00-06:00`,
      })
      setTodayRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      toast.success("Hora actualizada")
    } catch (err: any) {
      toast.error(err.detail || "Error al actualizar hora")
    }
    setEditingTime(null)
  }

  const formatDate = (dt: string) => {
    const d = new Date(dt)
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
  }

  const handleManualSave = async () => {
    if (!manualName.trim()) {
      toast.error("Ingresa el nombre del medicamento")
      return
    }
    setManualSaving(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      await medicalHistoryApi.adherence.create({
        medication_name: manualName.trim(),
        scheduled_time: `${today}T${manualTime}:00-06:00`,
        notes: manualNotes.trim() || undefined,
      })
      toast.success("Registro agregado")
      setShowManual(false)
      setManualName("")
      setManualNotes("")
      const now = new Date()
      setManualTime(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`)
      load()
    } catch (err: any) {
      toast.error(err.detail || "Error al guardar")
    } finally {
      setManualSaving(false)
    }
  }

  const pending = todayRecords.filter((r) => r.status === "pending")
  const completed = todayRecords.filter((r) => r.status !== "pending")

  if (!canRead) return <div className="flex h-64 items-center justify-center text-muted-foreground">No tienes permisos</div>
  if (loading) return <div className="flex h-64 items-center justify-center"><div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tratamiento Activo</h1>
        <p className="text-sm text-muted-foreground">
          Registro diario de tomas — {new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold">{todayRecords.length}</p>
            <p className="text-sm text-muted-foreground">Total hoy</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-green-600">{completed.length}</p>
            <p className="text-sm text-muted-foreground">Completadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-yellow-600">{pending.length}</p>
            <p className="text-sm text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div>
        <h2 className="text-lg font-semibold mb-3">Tomas de hoy</h2>
        {todayRecords.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <RiCapsuleLine className="mx-auto size-8 mb-2 opacity-50" />
              <p>No hay tomas programadas para hoy</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {todayRecords.map((record) => {
              const cfg = statusConfig[record.status] || statusConfig.pending
              const Icon = cfg.icon
              return (
                <Card key={record.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <RiCapsuleLine className="size-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">
                            {record.medication_name || "Medicamento"}
                            {!record.prescription_detail_id && (
                              <span className="ml-2 text-xs font-normal text-muted-foreground">(sin receta)</span>
                            )}
                          </p>
                          <div className="flex items-center gap-1">
                            {editingTime === record.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="time"
                                  className="h-7 w-28 text-xs"
                                  value={editTimeValue}
                                  onChange={(e) => setEditTimeValue(e.target.value)}
                                  onBlur={() => handleUpdateTime(record)}
                                  onKeyDown={(e) => { if (e.key === "Enter") handleUpdateTime(record); if (e.key === "Escape") setEditingTime(null) }}
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <>
                                <p className="text-xs text-muted-foreground">Programada: {formatTime(record.scheduled_time)}</p>
                                {canUpdate && record.status === "pending" && (
                                  <button
                                    className="ml-1 text-muted-foreground hover:text-foreground"
                                    onClick={() => { setEditingTime(record.id); setEditTimeValue(timeToStr(record.scheduled_time)) }}
                                  >
                                    <RiEditLine className="size-3" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={cfg.color}>
                              <Icon className="mr-1 size-3" />
                              {cfg.label}
                            </Badge>
                            {record.taken_at && (
                              <span className="text-xs text-muted-foreground">
                                Tomada a las {formatTime(record.taken_at)}
                              </span>
                            )}
                          </div>
                          {record.notes && <p className="text-xs text-muted-foreground mt-1">{record.notes}</p>}
                        </div>
                      </div>
                      {canUpdate && (
                        <div className="flex gap-2">
                          {record.status === "pending" && (
                            <>
                              <Button size="sm" onClick={() => handleStatus(record, "taken")}>
                                <RiCheckLine className="mr-1 size-4" />Tomada
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleStatus(record, "skipped")}>
                                Omitir
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => { setShowNotes(record); setNotes(record.notes || "") }}>
                            Notas
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Separator />

      <div>
        <h2 className="text-lg font-semibold mb-3">Historial reciente</h2>
        {historyRecords.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay registros</p>
        ) : (
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Medicamento</th>
                  <th className="px-4 py-2 text-left font-medium">Fecha</th>
                  <th className="px-4 py-2 text-left font-medium">Hora</th>
                  <th className="px-4 py-2 text-left font-medium">Estado</th>
                  <th className="px-4 py-2 text-left font-medium">Notas</th>
                </tr>
              </thead>
              <tbody>
                {historyRecords.slice(0, 20).map((r) => {
                  const cfg = statusConfig[r.status] || statusConfig.pending
                  return (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{r.medication_name || "-"}</td>
                      <td className="px-4 py-2">{formatDate(r.scheduled_time)}</td>
                      <td className="px-4 py-2">{formatTime(r.scheduled_time)}</td>
                      <td className="px-4 py-2"><Badge className={cfg.color}>{cfg.label}</Badge></td>
                      <td className="px-4 py-2 text-muted-foreground">{r.notes || "-"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!showNotes} onOpenChange={() => setShowNotes(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Agregar notas</DialogTitle><DialogDescription>Notas sobre esta toma (efectos secundarios, motivo de omision, etc.)</DialogDescription></DialogHeader>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Me olvide, me dio nauseas..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotes(null)}>Cancelar</Button>
            <Button onClick={handleSaveNotes}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showManual} onOpenChange={setShowManual}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar medicamento</DialogTitle>
            <DialogDescription>Agrega un medicamento que tomaste sin receta medica</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Medicamento *</Label>
              <Input
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                placeholder="Ej: Paracetamol 500mg"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input
                type="time"
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Input
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Ej: Tome por dolor de cabeza"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManual(false)}>Cancelar</Button>
            <Button onClick={handleManualSave} disabled={manualSaving}>
              {manualSaving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {hasPermission("medical_history:create") && (
        <button
          onClick={() => setShowManual(true)}
          className="fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 active:scale-95"
          title="Registrar medicamento"
        >
          <RiAddLine className="size-6" />
        </button>
      )}
    </div>
  )
}