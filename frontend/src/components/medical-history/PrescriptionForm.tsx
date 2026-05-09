import { useState, useEffect, useRef } from "react"
import { useNavigate } from "@/lib/router"
import { useAuth } from "@/lib/auth"
import { medicalHistoryApi } from "@/lib/api"
import type { DoctorOut, MedicationOut, PrescriptionOut, PrescriptionDetailCreate } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { RiAddLine, RiDeleteBinLine, RiArrowLeftLine, RiTimeLine, RiUploadLine, RiFileLine, RiCheckLine, RiDownloadLine } from "@remixicon/react"
import { toast } from "sonner"

interface DetailRow {
  medication_id: number | null
  medication_name: string
  dosage: string
  frequency: string
  duration_days: string
  instructions: string
  scheduled_times: string[]
}

function emptyDetail(): DetailRow {
  return { medication_id: null, medication_name: "", dosage: "", frequency: "", duration_days: "", instructions: "", scheduled_times: ["08:00"] }
}

export function PrescriptionForm() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [doctors, setDoctors] = useState<DoctorOut[]>([])
  const [medications, setMedications] = useState<MedicationOut[]>([])
  const [saving, setSaving] = useState(false)
  const [createdRx, setCreatedRx] = useState<PrescriptionOut | null>(null)
  const [scanFile, setScanFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const scanRef = useRef<HTMLInputElement>(null)

  const [doctorId, setDoctorId] = useState("")
  const [diagnosis, setDiagnosis] = useState("")
  const [validUntil, setValidUntil] = useState("")
  const [notes, setNotes] = useState("")
  const [details, setDetails] = useState<DetailRow[]>([emptyDetail()])

  useEffect(() => {
    Promise.all([medicalHistoryApi.doctors.list(), medicalHistoryApi.medications.list()])
      .then(([docs, meds]) => { setDoctors(docs); setMedications(meds) })
      .catch(() => toast.error("Error al cargar datos"))
  }, [])

  if (!hasPermission("medical_history:create")) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">No tienes permisos</div>
  }

  const addDetail = () => setDetails((prev) => [...prev, emptyDetail()])

  const removeDetail = (idx: number) => {
    if (details.length <= 1) return
    setDetails((prev) => prev.filter((_, i) => i !== idx))
  }

  const updateDetail = (idx: number, field: keyof DetailRow, value: string) => {
    setDetails((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)))
  }

  const selectMedication = (idx: number, medId: string) => {
    if (!medId) return
    const med = medications.find((m) => m.id === Number(medId))
    if (med) {
      setDetails((prev) => prev.map((d, i) => (i === idx ? { ...d, medication_id: med.id, medication_name: med.generic_name } : d)))
    }
  }

  const handleSave = async () => {
    if (!doctorId) { toast.error("Selecciona un doctor"); return }
    const validDetails = details.filter((d) => d.medication_name.trim())
    if (validDetails.length === 0) { toast.error("Agrega al menos un medicamento"); return }

    setSaving(true)
    try {
      const payload: any = {
        doctor_id: Number(doctorId),
        diagnosis: diagnosis || null,
        valid_until: validUntil || null,
        notes: notes || null,
        details: validDetails.map((d) => ({
          medication_id: d.medication_id,
          medication_name: d.medication_name,
          dosage: d.dosage || null,
          frequency: d.frequency || null,
          duration_days: d.duration_days ? Number(d.duration_days) : null,
          instructions: d.instructions || null,
          scheduled_times: d.scheduled_times.length > 0 ? d.scheduled_times : null,
        })),
      }
      const rx = await medicalHistoryApi.prescriptions.create(payload)
      toast.success("Receta creada exitosamente")
      setCreatedRx(rx)
    } catch (err: any) {
      toast.error(err.detail || "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const handleUploadScan = async () => {
    if (!scanFile || !createdRx) return
    setUploading(true)
    try {
      const doc = await medicalHistoryApi.documents.upload(scanFile, "prescription", createdRx.id)
      setCreatedRx({ ...createdRx, documents: [doc] })
      toast.success("Escaneo adjuntado")
      setScanFile(null)
    } catch (err: any) {
      toast.error(err.detail || "Error al subir escaneo")
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (docId: number) => {
    try {
      await medicalHistoryApi.documents.download(docId)
    } catch (err: any) {
      toast.error(err.detail || "Error al descargar")
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/medical-history/prescriptions")}>
          <RiArrowLeftLine className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Nueva Receta</h1>
          <p className="text-sm text-muted-foreground">Registra una receta medica con medicamentos</p>
        </div>
      </div>

      {createdRx ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RiCheckLine className="size-5 text-green-600" />
              <CardTitle>Receta creada exitosamente</CardTitle>
            </div>
            <CardDescription>ID #{createdRx.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {createdRx.documents.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">Escaneo adjuntado</p>
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <RiFileLine className="size-4 text-muted-foreground" />
                  <span className="flex-1 text-sm font-medium">{createdRx.documents[0].filename}</span>
                  <Button variant="ghost" size="icon-xs" onClick={() => handleDownload(createdRx.documents[0].id)}>
                    <RiDownloadLine className="size-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium">Adjuntar escaneo o foto (opcional)</p>
                <Input
                  ref={scanRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
                  onChange={(e) => setScanFile(e.target.files?.[0] || null)}
                />
                {scanFile && (
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      <RiFileLine className="size-4 text-muted-foreground" />
                      <span className="text-sm">{scanFile.name}</span>
                    </div>
                    <Button size="sm" onClick={handleUploadScan} disabled={uploading}>
                      <RiUploadLine className="mr-1 size-4" />
                      {uploading ? "Subiendo..." : "Subir"}
                    </Button>
                  </div>
                )}
              </div>
            )}
            <Button variant="outline" className="w-full" onClick={() => navigate("/medical-history/prescriptions")}>
              Volver a recetas
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
        <Card>
        <CardHeader>
          <CardTitle>Datos de la receta</CardTitle>
          <CardDescription>Doctor, diagnostico y vigencia</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Doctor *</Label>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vigencia</Label>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Diagnostico</Label>
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Diagnostico breve..." />
          </div>
          <div className="space-y-2">
            <Label>Notas</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas de la consulta..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Medicamentos</CardTitle>
              <CardDescription>Agrega los medicamentos recetados</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addDetail}>
              <RiAddLine className="mr-1 size-4" />Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {details.map((det, idx) => (
            <div key={idx} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Medicamento {idx + 1}</span>
                {details.length > 1 && (
                  <Button variant="ghost" size="icon-xs" onClick={() => removeDetail(idx)} className="text-destructive">
                    <RiDeleteBinLine className="size-4" />
                  </Button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Seleccionar del catalogo</Label>
                  <Select value="" onValueChange={(v) => selectMedication(idx, v)}>
                    <SelectTrigger><SelectValue placeholder="Buscar medicamento..." /></SelectTrigger>
                    <SelectContent>
                      {medications.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.generic_name}{m.brand_name ? ` (${m.brand_name})` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nombre *</Label>
                  <Input value={det.medication_name} onChange={(e) => updateDetail(idx, "medication_name", e.target.value)} placeholder="Amoxicilina 500mg" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">Dosis</Label>
                  <Input value={det.dosage} onChange={(e) => updateDetail(idx, "dosage", e.target.value)} placeholder="1 comprimido" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Frecuencia</Label>
                  <Input value={det.frequency} onChange={(e) => updateDetail(idx, "frequency", e.target.value)} placeholder="Cada 8 horas" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Duracion (dias)</Label>
                  <Input type="number" value={det.duration_days} onChange={(e) => updateDetail(idx, "duration_days", e.target.value)} placeholder="7" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Indicaciones</Label>
                <Input value={det.instructions} onChange={(e) => updateDetail(idx, "instructions", e.target.value)} placeholder="En ayunas, con agua..." />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Hora(s) de toma</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      setDetails((prev) => prev.map((d, i) => i === idx ? { ...d, scheduled_times: [...d.scheduled_times, "08:00"] } : d))
                    }}
                  >
                    <RiAddLine className="size-3" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {det.scheduled_times.map((t, ti) => (
                    <div key={ti} className="flex items-center gap-1">
                      <Input
                        type="time"
                        className="w-28 text-xs"
                        value={t}
                        onChange={(e) => {
                          setDetails((prev) => prev.map((d, i) => {
                            if (i !== idx) return d
                            const times = [...d.scheduled_times]
                            times[ti] = e.target.value
                            return { ...d, scheduled_times: times }
                          }))
                        }}
                      />
                      {det.scheduled_times.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          className="text-destructive"
                          onClick={() => {
                            setDetails((prev) => prev.map((d, i) => {
                              if (i !== idx) return d
                              return { ...d, scheduled_times: d.scheduled_times.filter((_, j) => j !== ti) }
                            }))
                          }}
                        >
                          <RiDeleteBinLine className="size-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate("/medical-history/prescriptions")}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar receta"}
        </Button>
      </div>
      </>
      )}
    </div>
  )
}