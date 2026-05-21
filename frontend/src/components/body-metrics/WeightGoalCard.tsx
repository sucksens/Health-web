import type { WeightGoalWithProgress } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RiEditLine, RiDeleteBinLine, RiCheckboxCircleLine, RiCloseCircleLine } from "@remixicon/react"

interface WeightGoalCardProps {
  goal: WeightGoalWithProgress
  onEdit: () => void
  onDelete: () => void
  onAchieve: () => void
  onAbandon: () => void
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
}

export function WeightGoalCard({
  goal,
  onEdit,
  onDelete,
  onAchieve,
  onAbandon,
}: WeightGoalCardProps) {
  const isActive = goal.status === "active"
  const isAchieved = goal.status === "achieved"
  const isAbandoned = goal.status === "abandoned"

  return (
    <Card className={isAchieved ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" : isAbandoned ? "border-red-500/50 bg-red-50/50 dark:bg-red-950/20" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Meta de peso</CardTitle>
          {isActive && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <RiEditLine className="size-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={onDelete}>
                <RiDeleteBinLine className="size-4 text-destructive" />
              </Button>
            </div>
          )}
        </div>
        <CardDescription>
          {isActive && "Meta activa"}
          {isAchieved && <span className="text-green-600 dark:text-green-400">Lograda</span>}
          {isAbandoned && <span className="text-red-600 dark:text-red-400">Abandonada</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {goal.start_weight_kg} kg → {goal.target_weight_kg} kg
            </span>
            {goal.current_weight !== null && (
              <span className="font-medium">{goal.current_weight} kg actual</span>
            )}
          </div>

          {isActive && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progreso</span>
                  <span className="font-medium">{goal.progress?.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${goal.progress || 0}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  📅{" "}
                  {formatDate(goal.target_date)}
                </span>
                {goal.days_remaining > 0 && (
                  <span className="text-muted-foreground">
                    Faltan {goal.days_remaining} día{goal.days_remaining === 1 ? "" : "s"}
                  </span>
                )}
                {goal.days_remaining === 0 && (
                  <span className="text-yellow-600 dark:text-yellow-400">Hoy es el día</span>
                )}
                {goal.days_remaining < 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    {Math.abs(goal.days_remaining)} día{Math.abs(goal.days_remaining) === 1 ? "" : "s"} vencido{Math.abs(goal.days_remaining) === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {goal.total_change !== null && (
                <div className="text-sm text-muted-foreground">
                  Cambio total:{" "}
                  <span className={goal.total_change > 0 ? "text-red-500" : "text-green-500"}>
                    {goal.total_change > 0 ? "+" : ""}{goal.total_change} kg
                  </span>
                  {" "}({goal.avg_weekly_change || 0} kg/semana)
                </div>
              )}

              <div className="flex gap-2">
                <Button size="sm" onClick={onAchieve}>
                  <RiCheckboxCircleLine className="size-4" />
                  Marcar como lograda
                </Button>
                <Button size="sm" variant="outline" onClick={onAbandon}>
                  <RiCloseCircleLine className="size-4" />
                  Abandonar
                </Button>
              </div>
            </>
          )}

          {isAchieved && goal.achieved_at && (
            <div className="text-sm text-green-600 dark:text-green-400">
              ✅ Lograda el {formatDate(goal.achieved_at)}
              {goal.current_weight && (
                <span> • Peso final: {goal.current_weight} kg</span>
              )}
            </div>
          )}

          {isAbandoned && (
            <div className="text-sm">
              <span className="text-muted-foreground">Abandonada</span>
              {goal.current_weight && <span> • Peso actual: {goal.current_weight} kg</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}