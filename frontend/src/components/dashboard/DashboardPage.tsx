import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/lib/auth"
import { useNavigate } from "@/lib/router"
import { dashboardApi } from "@/lib/api"
import type { DashboardSummary } from "@/lib/types"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  RiWeightLine,
  RiHeart2Line,
  RiHeartPulseLine,
  RiCapsuleLine,
  RiCalendarEventLine,
  RiArrowRightLine,
  RiCheckDoubleLine,
  RiGroupLine,
  RiFileChartLine,
  RiTimeLine,
  RiErrorWarningLine,
  RiInformationLine,
} from "@remixicon/react"
import ReactECharts from "echarts-for-react"

function formatDate(d: string | Date): string {
  const date = new Date(d)
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

function formatTime(d: string | Date): string {
  const date = new Date(d)
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`
}

function formatDateTime(d: string | Date): string {
  return `${formatDate(d)} ${formatTime(d)}`
}

function getBmiCategory(
  bmi: number
): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (bmi < 18.5) return { label: "Bajo peso", variant: "secondary" }
  if (bmi < 25) return { label: "Normal", variant: "default" }
  if (bmi < 30) return { label: "Sobrepeso", variant: "outline" }
  return { label: "Obesidad", variant: "destructive" }
}

function getBpClassColor(c: string): "default" | "secondary" | "destructive" | "outline" {
  switch (c) {
    case "Normal": return "default"
    case "Elevated": return "secondary"
    case "Stage 1": return "outline"
    case "Stage 2": return "destructive"
    case "Crisis": return "destructive"
    default: return "secondary"
  }
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi
      .summary()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const weightChartOption = useMemo(() => {
    if (!data?.recent_metrics.length) return null
    const metrics = data.recent_metrics
    const goal = data.active_goal
    const sorted = [...metrics].sort(
      (a, b) =>
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    )
    const dates = sorted.map((m) => formatDate(m.recorded_at))
    const goalLine = goal
      ? new Array(dates.length).fill(goal.target_weight_kg)
      : null

    return {
      tooltip: { trigger: "axis", axisPointer: { type: "cross" } },
      legend: {
        data: goal ? ["Peso (kg)", "Meta"] : ["Peso (kg)"],
        top: 0,
      },
      grid: { left: 50, right: 20, bottom: 30, top: 40 },
      xAxis: {
        type: "category",
        data: dates,
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: "value",
        name: "kg",
        nameTextStyle: { fontSize: 11 },
        axisLabel: { fontSize: 11 },
      },
      series: [
        {
          name: "Peso (kg)",
          type: "line",
          data: sorted.map((m) => m.weight_kg),
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          itemStyle: { color: "var(--color-chart-1, #22c55e)" },
          lineStyle: { width: 2 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(34,197,94,0.25)" },
                { offset: 1, color: "rgba(34,197,94,0.02)" },
              ],
            },
          },
        },
        ...(goalLine
          ? [
              {
                name: "Meta",
                type: "line" as const,
                data: goalLine,
                lineStyle: {
                  width: 2,
                  type: "dashed" as const,
                  color: "#f59e0b",
                },
                symbol: "none",
                itemStyle: { color: "#f59e0b" },
              },
            ]
          : []),
      ],
    }
  }, [data])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No se pudo cargar el resumen.
      </div>
    )
  }

  const firstName = user?.first_name || user?.username || "Usuario"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Bienvenido, {firstName}
        </p>
      </div>

      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.map((alert, i) => (
            <Card
              key={i}
              className={
                alert.type === "warning"
                  ? "border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20"
                  : alert.type === "danger"
                    ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/20"
                    : "border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20"
              }
            >
              <CardContent className="flex items-center gap-3 pt-4 pb-4">
                {alert.type === "warning" ? (
                  <RiErrorWarningLine className="size-5 shrink-0 text-yellow-600" />
                ) : alert.type === "danger" ? (
                  <RiErrorWarningLine className="size-5 shrink-0 text-red-600" />
                ) : (
                  <RiInformationLine className="size-5 shrink-0 text-blue-600" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{alert.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {alert.message}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <RiWeightLine className="size-4" />
              Ultimo peso
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.latest_metric ? (
              <>
                <p className="text-2xl font-bold">
                  {data.latest_metric.weight_kg.toFixed(1)} kg
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={getBmiCategory(data.latest_metric.bmi).variant}>
                    IMC {data.latest_metric.bmi.toFixed(1)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {getBmiCategory(data.latest_metric.bmi).label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(data.latest_metric.recorded_at)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sin registros</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <RiHeart2Line className="size-4" />
              Meta activa
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.active_goal ? (
              <>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">
                    {data.active_goal.progress?.toFixed(0) ?? 0}%
                  </p>
                  <span className="text-xs text-muted-foreground">
                    progreso
                  </span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={data.active_goal.progress ?? 0} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.active_goal.current_weight?.toFixed(1) ?? "??"} /{" "}
                  {data.active_goal.target_weight_kg.toFixed(1)} kg ({data.active_goal.days_remaining}{" "}
                  dias restantes)
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sin meta activa</p>
            )}
          </CardContent>
        </Card>

        <Card className="cursor-pointer" onClick={() => navigate("/blood-pressure")}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <RiHeartPulseLine className="size-4" />
              Presion arterial
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.latest_bp ? (
              <>
                <p className="text-2xl font-bold">
                  {data.latest_bp.systolic}/{data.latest_bp.diastolic}
                  <span className="text-sm font-normal text-muted-foreground ml-1">mmHg</span>
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={getBpClassColor(data.latest_bp.classification)}>
                    {data.latest_bp.classification}
                  </Badge>
                  {data.latest_bp.heart_rate && (
                    <span className="text-xs text-muted-foreground">
                      {data.latest_bp.heart_rate} bpm
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(data.latest_bp.recorded_at)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sin lecturas</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <RiCapsuleLine className="size-4" />
              Medicamentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {data.active_medications_count}
            </p>
            <p className="text-xs text-muted-foreground">
              medicamento{data.active_medications_count !== 1 ? "s" : ""} activo
              {data.active_medications_count !== 1 ? "s" : ""}
            </p>
            {data.adherence_rate_7d !== null && (
              <p className="mt-2 text-xs text-muted-foreground">
                Adherencia 7 dias:{" "}
                <span className="font-medium">
                  {data.adherence_rate_7d.toFixed(0)}%
                </span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {data.recent_metrics.length >= 2 && weightChartOption && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Evolucion de peso</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/body-metrics")}
              >
                Ver todo <RiArrowRightLine className="ml-1 size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ReactECharts option={weightChartOption} style={{ height: 280 }} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <RiCalendarEventLine className="size-4" />
                  Proximas citas
                </CardTitle>
                <CardDescription>
                  {data.upcoming_appointments.length > 0
                    ? `${data.upcoming_appointments.length} cita${data.upcoming_appointments.length !== 1 ? "s" : ""} pendiente${data.upcoming_appointments.length !== 1 ? "s" : ""}`
                    : "Sin citas pendientes"}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/medical-history/appointments")}
              >
                Ver todo <RiArrowRightLine className="ml-1 size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.upcoming_appointments.length > 0 ? (
              <div className="space-y-3">
                {data.upcoming_appointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="flex items-start justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {appt.reason || "Sin motivo especificado"}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <RiTimeLine className="size-3" />
                        {formatDateTime(appt.date_time)}
                      </div>
                      {appt.location && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {appt.location}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">Pendiente</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No tienes citas programadas
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <RiCapsuleLine className="size-4" />
                  Medicacion de hoy
                </CardTitle>
                <CardDescription>
                  {data.today_adherence.length > 0
                    ? `${data.today_adherence.filter((r) => r.status === "taken" || r.status === "late").length} de ${data.today_adherence.length} dosis registradas`
                    : "Sin medicamentos programados"}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/medical-history/adherence")}
              >
                Ver todo <RiArrowRightLine className="ml-1 size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {data.today_adherence.length > 0 ? (
              <div className="space-y-2">
                {data.today_adherence.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {rec.medication_name || "Medicamento"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Programada: {formatTime(rec.scheduled_time)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        rec.status === "taken"
                          ? "default"
                          : rec.status === "late"
                            ? "secondary"
                            : rec.status === "skipped"
                              ? "destructive"
                              : "outline"
                      }
                    >
                      {rec.status === "taken"
                        ? "Tomada"
                        : rec.status === "late"
                          ? "Tarde"
                          : rec.status === "skipped"
                            ? "Saltada"
                            : "Pendiente"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No hay medicamentos programados para hoy
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {data.admin_stats && (
        <>
          <Separator />
          <div>
            <h2 className="mb-3 text-lg font-medium">
              Estadisticas del sistema
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5">
                    <RiGroupLine className="size-4" />
                    Usuarios
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {data.admin_stats.total_users}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.admin_stats.active_users} activos
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5">
                    <RiCalendarEventLine className="size-4" />
                    Citas registradas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {data.admin_stats.total_appointments}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5">
                    <RiFileChartLine className="size-4" />
                    Recetas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {data.admin_stats.total_prescriptions}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5">
                    <RiWeightLine className="size-4" />
                    Mediciones corporales
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {data.admin_stats.total_body_metrics}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1.5">
                    <RiFileChartLine className="size-4" />
                    Documentos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {data.admin_stats.total_documents}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
