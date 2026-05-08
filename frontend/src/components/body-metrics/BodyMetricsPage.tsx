import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { bodyMetricsApi, weightGoalsApi } from "@/lib/api"
import type { BodyMetricOut, WeightGoalWithProgress } from "@/lib/types"
import { useNavigate } from "@/lib/router"
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
import { BodyMetricsChart } from "./BodyMetricsChart"
import { BodyMetricDialog } from "./BodyMetricDialog"
import { WeightGoalCard } from "./WeightGoalCard"
import { WeightGoalDialog } from "./WeightGoalDialog"
import { WeightGoalDetailDialog } from "./WeightGoalDetailDialog"
import { RiAddLine, RiPencilLine, RiDeleteBinLine, RiBodyScanLine, RiArrowUpLine, RiArrowDownLine } from "@remixicon/react"
import { toast } from "sonner"

function getBmiCategory(bmi: number): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  if (bmi < 18.5) return { label: "Bajo peso", variant: "secondary" }
  if (bmi < 25) return { label: "Normal", variant: "default" }
  if (bmi < 30) return { label: "Sobrepeso", variant: "outline" }
  return { label: "Obesidad", variant: "destructive" }
}

type Trend = "up" | "down" | "same" | null

function getTrend(current: number | null, previous: number | null): Trend {
  if (current === null || previous === null) return null
  if (current > previous) return "up"
  if (current < previous) return "down"
  return "same"
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
}

export function BodyMetricsPage() {
  const { user, hasPermission } = useAuth()
  const navigate = useNavigate()

  const canRead = hasPermission("body_metrics:read")
  const canCreate = hasPermission("body_metrics:create")
  const canUpdate = hasPermission("body_metrics:update")
  const canDelete = hasPermission("body_metrics:delete")

  const [metrics, setMetrics] = useState<BodyMetricOut[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editMetric, setEditMetric] = useState<BodyMetricOut | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)

  const [activeGoal, setActiveGoal] = useState<WeightGoalWithProgress | null>(null)
  const [allGoals, setAllGoals] = useState<WeightGoalWithProgress[]>([])
  const [showGoalDialog, setShowGoalDialog] = useState(false)
  const [editGoal, setEditGoal] = useState<WeightGoalWithProgress | null>(null)
  const [goalDetailId, setGoalDetailId] = useState<number | null>(null)
  const [deleteGoalId, setDeleteGoalId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await bodyMetricsApi.list()
      setMetrics(data)
    } catch {
      toast.error("Error al cargar mediciones")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchGoal = useCallback(async () => {
    try {
      const active = await weightGoalsApi.getActive()
      setActiveGoal(active)
      const list = await weightGoalsApi.list()
      setAllGoals(list as WeightGoalWithProgress[])
    } catch (err: any) {
      console.error("Error fetching goal:", err)
    }
  }, [])

  useEffect(() => {
    if (canRead) {
      fetchMetrics()
      fetchGoal()
    }
  }, [canRead, fetchMetrics, fetchGoal])

  if (!canRead) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No tienes permisos para ver este modulo
      </div>
    )
  }

  const handleEdit = (metric: BodyMetricOut) => {
    setEditMetric(metric)
    setShowDialog(true)
  }

  const handleCreate = () => {
    setEditMetric(null)
    setShowDialog(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await bodyMetricsApi.delete(deleteId)
      toast.success("Medicion eliminada")
      setDeleteId(null)
      fetchMetrics()
    } catch (err: any) {
      toast.error(err.detail || "Error al eliminar")
    } finally {
      setDeleting(false)
    }
  }

  const latestMetric = metrics.length > 0 ? metrics[0] : null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Medidas Corporales</h1>
          <p className="text-sm text-muted-foreground">
            Historial de peso y medidas corporales
          </p>
        </div>
        {canCreate && (
          <Button onClick={handleCreate}>
            <RiAddLine className="size-4" />
            Nueva medicion
          </Button>
        )}
      </div>

      {!user?.height_cm && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="flex items-center gap-3 pt-6">
            <RiBodyScanLine className="size-5 text-yellow-600" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Configura tu estatura
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Ve a{" "}
                <button
                  onClick={() => navigate("/profile")}
                  className="underline font-medium"
                >
                  Mi Perfil
                </button>{" "}
                para registrar tu estatura y poder calcular tu IMC.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {latestMetric && (() => {
        const prevMetric = metrics[1] || null
        const weightTrend = getTrend(latestMetric.weight_kg, prevMetric?.weight_kg ?? null)
        const bmiTrend = getTrend(latestMetric.bmi, prevMetric?.bmi ?? null)

        const lastWaist = latestMetric.waist_cm ?? metrics.find(m => m.waist_cm)?.waist_cm ?? null
        const lastChest = latestMetric.chest_cm ?? metrics.find(m => m.chest_cm)?.chest_cm ?? null

        const prevWaist = lastWaist && !latestMetric.waist_cm
          ? (prevMetric?.waist_cm ?? null)
          : prevMetric?.waist_cm ?? null
        const prevChest = lastChest && !latestMetric.chest_cm
          ? metrics.find((m, i) => i > 0 && m.chest_cm && m.chest_cm !== lastChest)?.chest_cm ?? null
          : prevMetric?.chest_cm ?? null

        const waistTrend = getTrend(lastWaist, prevWaist)
        const chestTrend = getTrend(lastChest, prevChest)

        return (
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Peso actual</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-2xl font-bold">{latestMetric.weight_kg} kg</p>
                {weightTrend && (
                  <div className={weightTrend === "up" ? "text-red-500" : "text-green-500"}>
                    {weightTrend === "up" ? <RiArrowUpLine /> : <RiArrowDownLine />}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>IMC</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold">{latestMetric.bmi}</p>
                  <Badge variant={getBmiCategory(latestMetric.bmi).variant}>
                    {getBmiCategory(latestMetric.bmi).label}
                  </Badge>
                </div>
                {bmiTrend && (
                  <div className={bmiTrend === "up" ? "text-red-500" : "text-green-500"}>
                    {bmiTrend === "up" ? <RiArrowUpLine /> : <RiArrowDownLine />}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Cintura</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-2xl font-bold">
                  {lastWaist ? `${lastWaist} cm` : "—"}
                </p>
                {waistTrend && (
                  <div className={waistTrend === "up" ? "text-red-500" : "text-green-500"}>
                    {waistTrend === "up" ? <RiArrowUpLine /> : <RiArrowDownLine />}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Pecho</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-2xl font-bold">
                  {lastChest ? `${lastChest} cm` : "—"}
                </p>
                {chestTrend && (
                  <div className={chestTrend === "up" ? "text-red-500" : "text-green-500"}>
                    {chestTrend === "up" ? <RiArrowUpLine /> : <RiArrowDownLine />}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )
      })()}

      {activeGoal && (
        <WeightGoalCard
          goal={activeGoal}
          onEdit={() => {
            setEditGoal(activeGoal)
            setShowGoalDialog(true)
          }}
          onDelete={() => setDeleteGoalId(activeGoal.id)}
          onAchieve={async () => {
            try {
              await weightGoalsApi.achieve(activeGoal.id)
              toast.success("Meta marcada como lograda")
              fetchGoal()
            } catch (err: any) {
              toast.error(err.detail || "Error")
            }
          }}
          onAbandon={async () => {
            try {
              await weightGoalsApi.abandon(activeGoal.id)
              toast.success("Meta abandonada")
              fetchGoal()
            } catch (err: any) {
              toast.error(err.detail || "Error")
            }
          }}
        />
      )}

      {!activeGoal && canCreate && (
        <Card>
          <CardContent className="pt-6">
            <Button onClick={() => setShowGoalDialog(true)}>
              <RiAddLine className="size-4" />
              Nueva meta de peso
            </Button>
          </CardContent>
        </Card>
      )}

      {allGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Historial de metas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allGoals.slice(1, 6).map((g) => (
                <div
                  key={g.id}
                  className="flex items-center justify-between rounded-md border p-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => setGoalDetailId(g.id)}
                >
                  <div>
                    <span className="font-medium">{g.target_weight_kg} kg</span>
                    <span className="text-muted-foreground"> ({new Date(g.target_date).toLocaleDateString()})</span>
                  </div>
                  <Badge variant={g.status === "achieved" ? "default" : "destructive"}>
                    {g.status === "achieved" ? "Lograda" : "Abandonada"}
                  </Badge>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="mt-4 w-full"
              onClick={() => navigate("/body-metrics/goals")}
            >
              Ver historial completo ({allGoals.length - 1} meta{allGoals.length - 1 !== 1 ? "s" : ""})
            </Button>
          </CardContent>
        </Card>
      )}

      <BodyMetricsChart metrics={metrics} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="size-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : metrics.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <RiBodyScanLine className="size-10 mb-2" />
              <p className="text-sm">No hay mediciones registradas</p>
              {canCreate && (
                <Button variant="outline" className="mt-4" onClick={handleCreate}>
                  <RiAddLine className="size-4" />
                  Registrar primera medicion
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Peso (kg)</TableHead>
                  <TableHead className="text-right">IMC</TableHead>
                  <TableHead className="text-right">Cintura</TableHead>
                  <TableHead className="text-right">Pecho</TableHead>
                  <TableHead className="text-right">Brazo</TableHead>
                  {(canUpdate || canDelete) && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((m) => {
                  const bmiCat = getBmiCategory(m.bmi)
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{formatDate(m.recorded_at)}</TableCell>
                      <TableCell className="text-right">{m.weight_kg}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {m.bmi}
                          <Badge variant={bmiCat.variant} className="text-[10px] px-1 py-0">
                            {bmiCat.label}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{m.waist_cm ?? "—"}</TableCell>
                      <TableCell className="text-right">{m.chest_cm ?? "—"}</TableCell>
                      <TableCell className="text-right">{m.arm_cm ?? "—"}</TableCell>
                      {(canUpdate || canDelete) && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canUpdate && (
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(m)}>
                                <RiPencilLine className="size-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button variant="ghost" size="icon" onClick={() => setDeleteId(m.id)}>
                                <RiDeleteBinLine className="size-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <BodyMetricDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        metric={editMetric}
        heightCm={user?.height_cm ?? null}
        onSuccess={fetchMetrics}
      />

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar medicion</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara el registro de medicion.
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

      <WeightGoalDialog
        open={showGoalDialog}
        onOpenChange={setShowGoalDialog}
        goal={editGoal}
        latestMetric={latestMetric || null}
        onSuccess={() => {
          fetchGoal()
          setEditGoal(null)
        }}
      />

      <WeightGoalDetailDialog
        open={!!goalDetailId}
        onOpenChange={() => setGoalDetailId(null)}
        goalId={goalDetailId}
      />

      <Dialog open={!!deleteGoalId} onOpenChange={() => setDeleteGoalId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar meta</DialogTitle>
            <DialogDescription>
              Esta accion no se puede deshacer. Se eliminara la meta de peso.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteGoalId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deleteGoalId) return
                try {
                  await weightGoalsApi.delete(deleteGoalId)
                  toast.success("Meta eliminada")
                  setDeleteGoalId(null)
                  fetchGoal()
                } catch (err: any) {
                  toast.error(err.detail || "Error al eliminar")
                }
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
