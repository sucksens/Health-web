import { useState, useEffect } from "react"
import { weightGoalsApi } from "@/lib/api"
import type { WeightGoalWithProgress, BodyMetricOut } from "@/lib/types"
import ReactECharts from "echarts-for-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface WeightGoalDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goalId: number | null
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
}

function getBmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Bajo peso"
  if (bmi < 25) return "Normal"
  if (bmi < 30) return "Sobrepeso"
  return "Obesidad"
}

export function WeightGoalDetailDialog({
  open,
  onOpenChange,
  goalId,
}: WeightGoalDetailDialogProps) {
  const [goal, setGoal] = useState<WeightGoalWithProgress | null>(null)
  const [metrics, setMetrics] = useState<BodyMetricOut[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && goalId) {
      setLoading(true)
      weightGoalsApi
        .getDetails(goalId)
        .then((res) => {
          setGoal(res.goal)
          setMetrics(res.metrics)
        })
        .catch(() => {
          toast.error("Error al cargar details")
        })
        .finally(() => setLoading(false))
    }
  }, [open, goalId])

  const chartOption = {
    tooltip: { trigger: "axis" as const },
    grid: { left: 50, right: 20, bottom: 30, top: 40 },
    xAxis: {
      type: "category" as const,
      data: metrics.map((m) => formatDate(m.recorded_at)),
    },
    yAxis: { type: "value" as const, name: "kg" },
    series: [
      {
        name: "Peso",
        type: "line" as const,
        data: metrics.map((m) => m.weight_kg),
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        itemStyle: { color: "var(--color-chart-1, #22c55e)" },
        lineStyle: { width: 2 },
      },
    ],
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {goal?.status === "achieved" ? "Meta lograda" : "Meta abandonada"}
            {goal?.achieved_at && ` el ${formatDate(goal.achieved_at)}`}
          </DialogTitle>
        </DialogHeader>

        {goal && (
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Inicio</p>
                <p className="text-lg font-bold">{goal.start_weight_kg} kg</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Objetivo</p>
                <p className="text-lg font-bold">{goal.target_weight_kg} kg</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Resultado</p>
                <p className="text-lg font-bold">
                  {goal.current_weight !== null ? `${goal.current_weight} kg` : "—"}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Cambio</p>
                <p
                  className={`text-lg font-bold ${
                    (goal.total_change || 0) > 0 ? "text-red-500" : "text-green-500"
                  }`}
                >
                  {goal.total_change !== null
                    ? `${goal.total_change > 0 ? "+" : ""}${goal.total_change} kg`
                    : "—"}
                </p>
              </div>
            </div>

            {metrics.length > 1 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Evolución</CardTitle>
                </CardHeader>
                <CardContent>
                  <ReactECharts option={chartOption} style={{ height: 200 }} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Registros</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Peso</TableHead>
                      <TableHead className="text-right">IMC</TableHead>
                      <TableHead className="text-right">Cintura</TableHead>
                      <TableHead className="text-right">Pecho</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>{formatDate(m.recorded_at)}</TableCell>
                        <TableCell className="text-right">{m.weight_kg}</TableCell>
                        <TableCell className="text-right">{m.bmi}</TableCell>
                        <TableCell className="text-right">
                          {m.waist_cm ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {m.chest_cm ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {metrics.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No hay registros en este período
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}