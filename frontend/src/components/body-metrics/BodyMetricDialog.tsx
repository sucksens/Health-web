import { useState, useEffect } from "react"
import { bodyMetricsApi } from "@/lib/api"
import type { BodyMetricOut, BodyMetricCreate } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface BodyMetricDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  metric: BodyMetricOut | null
  heightCm: number | null
  onSuccess: () => void
}

function calcBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100
  return Math.round((weightKg / (heightM * heightM)) * 100) / 100
}

function getBmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Bajo peso"
  if (bmi < 25) return "Normal"
  if (bmi < 30) return "Sobrepeso"
  return "Obesidad"
}

export function BodyMetricDialog({
  open,
  onOpenChange,
  metric,
  heightCm,
  onSuccess,
}: BodyMetricDialogProps) {
  const isEdit = !!metric
  const [weightKg, setWeightKg] = useState("")
  const [waistCm, setWaistCm] = useState("")
  const [chestCm, setChestCm] = useState("")
  const [armCm, setArmCm] = useState("")
  const [recordedAt, setRecordedAt] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (metric) {
      setWeightKg(metric.weight_kg.toString())
      setWaistCm(metric.waist_cm?.toString() || "")
      setChestCm(metric.chest_cm?.toString() || "")
      setArmCm(metric.arm_cm?.toString() || "")
      const d = new Date(metric.recorded_at)
      setRecordedAt(d.toISOString().slice(0, 10))
    } else {
      setWeightKg("")
      setWaistCm("")
      setChestCm("")
      setArmCm("")
      setRecordedAt(new Date().toISOString().slice(0, 10))
    }
  }, [metric, open])

  const weight = parseFloat(weightKg)
  const bmi = weight > 0 && heightCm ? calcBmi(weight, heightCm) : null

  const handleSave = async () => {
    if (!weightKg || parseFloat(weightKg) <= 0) {
      toast.error("Ingresa un peso valido")
      return
    }

    setSaving(true)
    try {
      const payload: BodyMetricCreate = {
        weight_kg: parseFloat(weightKg),
        waist_cm: waistCm ? parseFloat(waistCm) : null,
        chest_cm: chestCm ? parseFloat(chestCm) : null,
        arm_cm: armCm ? parseFloat(armCm) : null,
        recorded_at: recordedAt || undefined,
      }

      if (isEdit) {
        await bodyMetricsApi.update(metric!.id, payload)
        toast.success("Medicion actualizada")
      } else {
        await bodyMetricsApi.create(payload)
        toast.success("Medicion registrada")
      }
      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast.error(err.detail || "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar medicion" : "Nueva medicion"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos de la medicion"
              : "Registra tus medidas corporales actuales"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weightKg">Peso (kg) *</Label>
            <Input
              id="weightKg"
              type="number"
              min="20"
              max="500"
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="75.5"
            />
          </div>
          {bmi !== null && (
            <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">IMC calculado: </span>
              <span className="font-medium">{bmi}</span>
              <span className="text-muted-foreground"> ({getBmiCategory(bmi)})</span>
            </div>
          )}
          {!heightCm && (
            <p className="text-xs text-destructive">
              Configura tu estatura en Mi Perfil para calcular el IMC
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="waistCm">Cintura (cm)</Label>
              <Input
                id="waistCm"
                type="number"
                min="10"
                max="300"
                step="0.1"
                value={waistCm}
                onChange={(e) => setWaistCm(e.target.value)}
                placeholder="80"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chestCm">Pecho (cm)</Label>
              <Input
                id="chestCm"
                type="number"
                min="10"
                max="300"
                step="0.1"
                value={chestCm}
                onChange={(e) => setChestCm(e.target.value)}
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="armCm">Brazo (cm)</Label>
              <Input
                id="armCm"
                type="number"
                min="10"
                max="300"
                step="0.1"
                value={armCm}
                onChange={(e) => setArmCm(e.target.value)}
                placeholder="35"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recordedAt">Fecha</Label>
            <Input
              id="recordedAt"
              type="date"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !weightKg}>
            {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
