import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { bloodPressureApi, medicalHistoryApi } from "@/lib/api"
import type { BloodPressureOut, BloodPressureStats } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BloodPressureChart } from "./BloodPressureChart"
import { RiAddLine, RiPencilLine, RiDeleteBinLine, RiHeartPulseLine, RiFileDownloadLine } from "@remixicon/react"
import { toast } from "sonner"

function classifyBP(systolic: number, diastolic: number): string {
  if (systolic > 180 || diastolic > 120) return "Crisis"
  if (systolic >= 140 || diastolic >= 90) return "Stage 2"
  if (systolic >= 130 || diastolic >= 80) return "Stage 1"
  if (systolic >= 120 && diastolic < 80) return "Elevated"
  return "Normal"
}

function getClassColor(c: string): "default" | "secondary" | "destructive" | "outline" {
  switch (c) {
    case "Normal": return "default"
    case "Elevated": return "secondary"
    case "Stage 1": return "outline"
    case "Stage 2": return "destructive"
    case "Crisis": return "destructive"
    default: return "secondary"
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
}

export function BloodPressurePage() {
  const { hasPermission } = useAuth()

  const canRead = hasPermission("blood_pressure:read")
  const canCreate = hasPermission("blood_pressure:create")
  const canUpdate = hasPermission("blood_pressure:update")
  const canDelete = hasPermission("blood_pressure:delete")

  const [readings, setReadings] = useState<BloodPressureOut[]>([])
  const [stats, setStats] = useState<BloodPressureStats | null>(null)
  const [loading, setLoading] = useState(true)

  const [showDialog, setShowDialog] = useState(false)
  const [editReading, setEditReading] = useState<BloodPressureOut | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [formSystolic, setFormSystolic] = useState("")
  const [formDiastolic, setFormDiastolic] = useState("")
  const [formHeartRate, setFormHeartRate] = useState("")
  const [formNotes, setFormNotes] = useState("")
  const [formDate, setFormDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [showPdfDialog, setShowPdfDialog] = useState(false)
  const [pdfDateFrom, setPdfDateFrom] = useState("")
  const [pdfDateTo, setPdfDateTo] = useState("")
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  const fetchReadings = useCallback(async () => {
    try {
      const data = await bloodPressureApi.list()
      setReadings(data)
    } catch {
      toast.error("Error al cargar lecturas")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const data = await bloodPressureApi.stats()
      setStats(data)
    } catch {}
  }, [])

  useEffect(() => {
    if (canRead) {
      fetchReadings()
      fetchStats()
    }
  }, [canRead, fetchReadings, fetchStats])

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true)
    try {
      await medicalHistoryApi.reports.download(
        "blood-pressure",
        pdfDateFrom || undefined,
        pdfDateTo || undefined,
      )
      setShowPdfDialog(false)
    } catch (err: any) {
      toast.error(err.detail || "Error al generar reporte")
    } finally {
      setDownloadingPdf(false)
    }
  }

  if (!canRead) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No tienes permisos para ver este modulo
      </div>
    )
  }

  const latest = readings.length > 0 ? readings[0] : null
  const prev = readings.length > 1 ? readings[1] : null

  const handleCreate = () => {
    setEditReading(null)
    setFormSystolic("")
    setFormDiastolic("")
    setFormHeartRate("")
    setFormNotes("")
    setFormDate("")
    setShowDialog(true)
  }

  const handleEdit = (r: BloodPressureOut) => {
    setEditReading(r)
    setFormSystolic(String(r.systolic))
    setFormDiastolic(String(r.diastolic))
    setFormHeartRate(r.heart_rate ? String(r.heart_rate) : "")
    setFormNotes(r.notes || "")
    const iso = r.recorded_at
    if (iso.endsWith("Z")) {
      const d = new Date(iso)
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
      setFormDate(d.toISOString().slice(0, 16))
    } else {
      setFormDate(iso.slice(0, 16))
    }
    setShowDialog(true)
  }

  const handleSave = async () => {
    const sys = parseFloat(formSystolic)
    const dia = parseFloat(formDiastolic)
    if (!sys || !dia) {
      toast.error("Sistolica y diastolica son requeridas")
      return
    }
    if (sys <= dia) {
      toast.error("La sistolica debe ser mayor que la diastolica")
      return
    }

    setSaving(true)
    try {
      const body: Record<string, any> = {
        systolic: sys,
        diastolic: dia,
        heart_rate: formHeartRate ? parseInt(formHeartRate) : null,
        notes: formNotes || null,
        recorded_at: formDate ? formDate + ":00" : null,
      }

      if (editReading) {
        await bloodPressureApi.update(editReading.id, body)
        toast.success("Lectura actualizada")
      } else {
        await bloodPressureApi.create(body)
        toast.success("Lectura registrada")
      }
      setShowDialog(false)
      fetchReadings()
      fetchStats()
    } catch (err: any) {
      toast.error(err.detail || "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await bloodPressureApi.delete(deleteId)
      toast.success("Lectura eliminada")
      setDeleteId(null)
      fetchReadings()
      fetchStats()
    } catch (err: any) {
      toast.error(err.detail || "Error al eliminar")
    } finally {
      setDeleting(false)
    }
  }

  const liveSystolic = parseFloat(formSystolic) || 0
  const liveDiastolic = parseFloat(formDiastolic) || 0
  const liveClass = liveSystolic > 0 && liveDiastolic > 0 && liveSystolic > liveDiastolic
    ? classifyBP(liveSystolic, liveDiastolic)
    : null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Presion Arterial</h1>
          <p className="text-sm text-muted-foreground">
            Historial de lecturas de presion arterial
          </p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            {readings.length > 0 && (
              <Button variant="outline" onClick={() => { setPdfDateFrom(""); setPdfDateTo(""); setShowPdfDialog(true) }}>
                <RiFileDownloadLine className="size-4" />
                Reporte PDF
              </Button>
            )}
            <Button onClick={handleCreate}>
              <RiAddLine className="size-4" />
              Nueva lectura
            </Button>
          </div>
        )}
      </div>

      {latest && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Sistolica</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{latest.systolic} <span className="text-sm font-normal text-muted-foreground">mmHg</span></p>
              {prev && prev.systolic !== latest.systolic && (
                <p className={`text-xs mt-1 ${latest.systolic > prev.systolic ? "text-red-500" : "text-green-500"}`}>
                  {latest.systolic > prev.systolic ? "+" : ""}{(latest.systolic - prev.systolic).toFixed(0)}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Diastolica</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{latest.diastolic} <span className="text-sm font-normal text-muted-foreground">mmHg</span></p>
              {prev && prev.diastolic !== latest.diastolic && (
                <p className={`text-xs mt-1 ${latest.diastolic > prev.diastolic ? "text-red-500" : "text-green-500"}`}>
                  {latest.diastolic > prev.diastolic ? "+" : ""}{(latest.diastolic - prev.diastolic).toFixed(0)}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pulso</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {latest.heart_rate ? latest.heart_rate : "—"}{" "}
                {latest.heart_rate && <span className="text-sm font-normal text-muted-foreground">bpm</span>}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Clasificacion</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <Badge variant={getClassColor(latest.classification)} className="w-fit">
                {latest.classification}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {formatDate(latest.recorded_at)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <BloodPressureChart readings={readings} />

      {stats && stats.total > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Promedio 7 dias</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.avg_7d ? (
                <p className="text-xl font-bold">{stats.avg_7d.systolic}/{stats.avg_7d.diastolic} <span className="text-sm font-normal text-muted-foreground">mmHg</span></p>
              ) : (
                <p className="text-muted-foreground">Sin datos</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Promedio 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.avg_30d ? (
                <p className="text-xl font-bold">{stats.avg_30d.systolic}/{stats.avg_30d.diastolic} <span className="text-sm font-normal text-muted-foreground">mmHg</span></p>
              ) : (
                <p className="text-muted-foreground">Sin datos</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total lecturas</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-bold">{stats.total}</p>
              {Object.keys(stats.distribution).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {Object.entries(stats.distribution).map(([cls, count]) => (
                    <Badge key={cls} variant={getClassColor(cls)} className="text-[10px] px-1 py-0">
                      {cls}: {count}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de lecturas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="size-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : readings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <RiHeartPulseLine className="size-10 mb-2" />
              <p className="text-sm">No hay lecturas registradas</p>
              {canCreate && (
                <Button variant="outline" className="mt-4" onClick={handleCreate}>
                  <RiAddLine className="size-4" />
                  Registrar primera lectura
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Sistolica</TableHead>
                  <TableHead className="text-right">Diastolica</TableHead>
                  <TableHead className="text-right">Pulso</TableHead>
                  <TableHead>Clasificacion</TableHead>
                  {(canUpdate || canDelete) && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {readings.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{formatDate(r.recorded_at)}</TableCell>
                    <TableCell className="text-right">{r.systolic}</TableCell>
                    <TableCell className="text-right">{r.diastolic}</TableCell>
                    <TableCell className="text-right">{r.heart_rate ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={getClassColor(r.classification)} className="text-[10px] px-1.5 py-0">
                        {r.classification}
                      </Badge>
                    </TableCell>
                    {(canUpdate || canDelete) && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {canUpdate && (
                            <Button variant="ghost" size="icon" onClick={() => handleEdit(r)}>
                              <RiPencilLine className="size-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(r.id)}>
                              <RiDeleteBinLine className="size-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editReading ? "Editar lectura" : "Nueva lectura"}</DialogTitle>
            <DialogDescription>
              Ingresa los valores de presion arterial
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="systolic">Sistolica (mmHg)</Label>
                <Input
                  id="systolic"
                  type="number"
                  value={formSystolic}
                  onChange={(e) => setFormSystolic(e.target.value)}
                  placeholder="120"
                  min={60}
                  max={250}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diastolic">Diastolica (mmHg)</Label>
                <Input
                  id="diastolic"
                  type="number"
                  value={formDiastolic}
                  onChange={(e) => setFormDiastolic(e.target.value)}
                  placeholder="80"
                  min={30}
                  max={150}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="heart_rate">Frecuencia cardiaca (bpm)</Label>
              <Input
                id="heart_rate"
                type="number"
                value={formHeartRate}
                onChange={(e) => setFormHeartRate(e.target.value)}
                placeholder="72 (opcional)"
                min={30}
                max={250}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp-date">Fecha y hora</Label>
              <Input
                id="bp-date"
                type="datetime-local"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bp-notes">Notas</Label>
              <Input
                id="bp-notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Notas opcionales"
              />
            </div>
            {liveClass && (
              <div className="flex items-center gap-2 rounded-md border p-3 bg-muted/50">
                <Badge variant={getClassColor(liveClass)}>{liveClass}</Badge>
                <span className="text-sm text-muted-foreground">
                  {liveSystolic}/{liveDiastolic}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPdfDialog} onOpenChange={setShowPdfDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reporte PDF - Presion Arterial</DialogTitle>
            <DialogDescription>
              Selecciona un rango de fechas. Dejar vacio para incluir todo el historial.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Desde</Label>
              <Input
                type="date"
                value={pdfDateFrom}
                onChange={(e) => setPdfDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={pdfDateTo}
                onChange={(e) => setPdfDateTo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPdfDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDownloadPdf} disabled={downloadingPdf}>
              <RiFileDownloadLine className="size-4 mr-1" />
              {downloadingPdf ? "Generando..." : "Descargar PDF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar lectura</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara el registro de presion arterial.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
