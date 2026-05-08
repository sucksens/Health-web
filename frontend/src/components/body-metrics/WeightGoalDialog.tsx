import { useState, useEffect } from "react"
import { weightGoalsApi } from "@/lib/api"
import type { WeightGoalOut, WeightGoalCreate, BodyMetricOut } from "@/lib/types"
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

interface WeightGoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: WeightGoalOut | null
  latestMetric: BodyMetricOut | null
  onSuccess: () => void
}

export function WeightGoalDialog({
  open,
  onOpenChange,
  goal,
  latestMetric,
  onSuccess,
}: WeightGoalDialogProps) {
  const isEdit = !!goal
  const [targetWeight, setTargetWeight] = useState("")
  const [startWeight, setStartWeight] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (goal) {
      setTargetWeight(goal.target_weight_kg.toString())
      setStartWeight(goal.start_weight_kg.toString())
      const d = new Date(goal.target_date)
      setTargetDate(d.toISOString().slice(0, 10))
      setNotes(goal.notes || "")
    } else {
      setTargetWeight("")
      setStartWeight(latestMetric ? latestMetric.weight_kg.toString() : "")
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 90)
      setTargetDate(futureDate.toISOString().slice(0, 10))
      setNotes("")
    }
  }, [goal, open, latestMetric])

  const handleSave = async () => {
    if (!targetWeight || !startWeight || !targetDate) {
      toast.error("Completa todos los campos requeridos")
      return
    }

    setSaving(true)
    try {
      const payload: WeightGoalCreate = {
        target_weight_kg: parseFloat(targetWeight),
        start_weight_kg: parseFloat(startWeight),
        target_date: targetDate,
        notes: notes || undefined,
      }

      if (isEdit) {
        await weightGoalsApi.update(goal!.id, payload)
        toast.success("Meta actualizada")
      } else {
        await weightGoalsApi.create(payload)
        toast.success("Meta creada")
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
          <DialogTitle>{isEdit ? "Editar meta" : "Nueva meta de peso"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Modifica los datos de tu meta de peso"
              : "Establece una meta de peso que quieres alcanzar"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="startWeight">Peso actual (kg)</Label>
              <Input
                id="startWeight"
                type="number"
                min="20"
                max="500"
                step="0.1"
                value={startWeight}
                onChange={(e) => setStartWeight(e.target.value)}
                placeholder="Peso actual"
              />
              <p className="text-xs text-muted-foreground">
                Se toma automáticamente tu última medición registrada
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="targetWeight">Peso objetivo (kg)</Label>
            <Input
              id="targetWeight"
              type="number"
              min="20"
              max="500"
              step="0.1"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              placeholder="70"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetDate">Fecha objetivo</Label>
            <Input
              id="targetDate"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas personales..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !targetWeight || !startWeight || !targetDate}
          >
            {saving ? "Guardando..." : isEdit ? "Guardar cambios" : "Crear meta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}