import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { weightGoalsApi } from "@/lib/api"
import type { WeightGoalWithProgress } from "@/lib/types"
import { useNavigate } from "@/lib/router"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WeightGoalDetailDialog } from "./WeightGoalDetailDialog"
import {
  RiArrowLeftLine,
  RiTrophyLine,
  RiCloseCircleLine,
  RiCalendarLine,
  RiTimeLine,
  RiFlashlightLine,
} from "@remixicon/react"
import { toast } from "sonner"

type FilterTab = "all" | "achieved" | "abandoned"

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatDuration(start: string, end: string | null): string {
  const s = new Date(start)
  const e = end ? new Date(end) : new Date()
  const days = Math.max(0, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)))
  if (days < 1) return "Menos de un dia"
  if (days < 7) return `${days} dia${days > 1 ? "s" : ""}`
  const weeks = Math.floor(days / 7)
  const rem = days % 7
  if (weeks < 4) {
    return rem > 0 ? `${weeks} sem ${rem} dia${rem > 1 ? "s" : ""}` : `${weeks} sem`
  }
  const months = Math.floor(weeks / 4)
  const remWeeks = weeks % 4
  return remWeeks > 0 ? `${months} mes${months > 1 ? "es" : ""} ${remWeeks} sem` : `${months} mes${months > 1 ? "es" : ""}`
}

export function WeightGoalHistoryPage() {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()

  const canRead = hasPermission("weight_goals:read")

  const [goals, setGoals] = useState<WeightGoalWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>("all")
  const [goalDetailId, setGoalDetailId] = useState<number | null>(null)

  const fetchGoals = useCallback(async () => {
    try {
      const data = await weightGoalsApi.list()
      setGoals(data as WeightGoalWithProgress[])
    } catch {
      toast.error("Error al cargar metas")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (canRead) {
      fetchGoals()
    }
  }, [canRead, fetchGoals])

  if (!canRead) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No tienes permisos para ver este modulo
      </div>
    )
  }

  const filteredGoals = goals.filter((g) => {
    if (filter === "achieved") return g.status === "achieved"
    if (filter === "abandoned") return g.status === "abandoned"
    return true
  })

  const achievedCount = goals.filter((g) => g.status === "achieved").length
  const abandonedCount = goals.filter((g) => g.status === "abandoned").length
  const activeCount = goals.filter((g) => g.status === "active").length

  const totalChange = goals
    .filter((g) => g.status === "achieved" && g.total_change !== null)
    .reduce((sum, g) => sum + (g.total_change ?? 0), 0)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/body-metrics")}>
          <RiArrowLeftLine className="size-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Historial de Metas</h1>
          <p className="text-sm text-muted-foreground">
            Todas tus metas de peso, logradas y abandonadas
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Logradas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <RiTrophyLine className="size-5 text-green-500" />
              <p className="text-2xl font-bold">{achievedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Abandonadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <RiCloseCircleLine className="size-5 text-red-500" />
              <p className="text-2xl font-bold">{abandonedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Activas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <RiFlashlightLine className="size-5 text-yellow-500" />
              <p className="text-2xl font-bold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {achievedCount > 0 && (
        <Card className="border-green-500/30 bg-green-50/50 dark:bg-green-950/10">
          <CardContent className="flex items-center gap-3 pt-6">
            <RiTrophyLine className="size-5 text-green-600" />
            <div>
              <p className="text-sm font-medium">
                {totalChange !== 0
                  ? `Cambio total acumulado en metas logradas: ${totalChange > 0 ? "+" : ""}${totalChange} kg`
                  : "Todas tus metas logradas mantuvieron tu peso"}
              </p>
              {achievedCount > 1 && (
                <p className="text-xs text-muted-foreground">
                  {achievedCount} metas completadas exitosamente
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            Todas ({goals.length})
          </TabsTrigger>
          <TabsTrigger value="achieved">
            Logradas ({achievedCount})
          </TabsTrigger>
          <TabsTrigger value="abandoned">
            Abandonadas ({abandonedCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredGoals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <RiTrophyLine className="size-12 mb-3" />
            <p className="text-sm font-medium">
              {filter === "achieved"
                ? "No hay metas logradas"
                : filter === "abandoned"
                  ? "No hay metas abandonadas"
                  : "No hay metas registradas"}
            </p>
            <p className="text-xs mt-1">
              {filter === "all"
                ? "Crea tu primera meta desde la pagina de medidas corporales"
                : `Aun no tienes metas ${filter === "achieved" ? "logradas" : "abandonadas"}`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredGoals.map((g) => {
            const isAchieved = g.status === "achieved"
            const isActive = g.status === "active"
            const endDate = g.achieved_at || g.updated_at

            return (
              <Card
                key={g.id}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => setGoalDetailId(g.id)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`mt-0.5 flex size-10 items-center justify-center rounded-full ${
                        isAchieved
                          ? "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                          : isActive
                            ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
                            : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {isAchieved ? (
                        <RiTrophyLine className="size-5" />
                      ) : isActive ? (
                        <RiFlashlightLine className="size-5" />
                      ) : (
                        <RiCloseCircleLine className="size-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {g.start_weight_kg} kg → {g.target_weight_kg} kg
                        </span>
                        {isActive && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                            Activa
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <RiCalendarLine className="size-3" />
                          Meta: {formatDate(g.target_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <RiTimeLine className="size-3" />
                          {formatDuration(g.created_at, endDate)}
                        </span>
                      </div>
                      {g.notes && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                          {g.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge
                      variant={isAchieved ? "default" : isActive ? "outline" : "destructive"}
                    >
                      {isAchieved ? "Lograda" : isActive ? "Activa" : "Abandonada"}
                    </Badge>
                    {g.total_change !== null && !isActive && (
                      <span
                        className={`text-xs font-medium ${
                          g.total_change > 0 ? "text-red-500" : "text-green-500"
                        }`}
                      >
                        {g.total_change > 0 ? "+" : ""}
                        {g.total_change} kg
                      </span>
                    )}
                    {g.progress !== null && isActive && (
                      <span className="text-xs font-medium text-muted-foreground">
                        {g.progress}% completado
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <WeightGoalDetailDialog
        open={!!goalDetailId}
        onOpenChange={() => setGoalDetailId(null)}
        goalId={goalDetailId}
      />
    </div>
  )
}
