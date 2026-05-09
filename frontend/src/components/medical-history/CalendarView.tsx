import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { RiArrowLeftSLine, RiArrowRightSLine } from "@remixicon/react"
import type { AppointmentOut, DoctorOut } from "@/lib/types"

interface CalendarViewProps {
  appointments: AppointmentOut[]
  doctors: DoctorOut[]
  selectedMonth: Date
  selectedDate: Date | null
  onMonthChange: (date: Date) => void
  onDayClick: (date: Date | null) => void
}

const DAYS_OF_WEEK = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

const chipColors: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function buildGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevLast = new Date(year, month, 0).getDate()

  const cells: { date: Date; isCurrentMonth: boolean }[] = []

  for (let i = startPad - 1; i >= 0; i--) {
    cells.push({
      date: new Date(year, month - 1, prevLast - i),
      isCurrentMonth: false,
    })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }
  const rows = Math.ceil(cells.length / 7)
  const total = rows * 7
  for (let d = 1; cells.length < total; d++) {
    cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false })
  }

  return cells
}

export function CalendarView({
  appointments,
  doctors,
  selectedMonth,
  selectedDate,
  onMonthChange,
  onDayClick,
}: CalendarViewProps) {
  const today = useMemo(() => new Date(), [])

  const cells = useMemo(
    () => buildGrid(selectedMonth.getFullYear(), selectedMonth.getMonth()),
    [selectedMonth],
  )

  const byDay = useMemo(() => {
    const map = new Map<string, AppointmentOut[]>()
    for (const a of appointments) {
      const d = new Date(a.date_time)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      const list = map.get(key) || []
      list.push(a)
      map.set(key, list)
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => new Date(a.date_time).getTime() - new Date(b.date_time).getTime(),
      )
    }
    return map
  }, [appointments])

  const dayKey = (d: Date) =>
    `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

  const doctorName = (id: number) =>
    doctors.find((d) => d.id === id)?.name?.split(" ").slice(0, 2).join(" ") ||
    "Dr."

  const fmtTime = (dt: string) =>
    new Date(dt).toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    })

  const monthLabel = selectedMonth.toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  })

  const prev = () =>
    onMonthChange(
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1),
    )
  const next = () =>
    onMonthChange(
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1),
    )
  const goToday = () => {
    onMonthChange(new Date(today.getFullYear(), today.getMonth(), 1))
    onDayClick(null)
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={goToday}>
            Hoy
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={prev}>
            <RiArrowLeftSLine className="size-5" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={next}>
            <RiArrowRightSLine className="size-5" />
          </Button>
        </div>
        <h2 className="text-base font-semibold capitalize">{monthLabel}</h2>
        <div className="w-24" />
      </div>

      <div className="grid grid-cols-7 border-b bg-muted/30">
        {DAYS_OF_WEEK.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const isToday = isSameDay(cell.date, today)
          const isSelected =
            selectedDate !== null && isSameDay(cell.date, selectedDate)
          const dayAppts = byDay.get(dayKey(cell.date)) || []

          return (
            <div
              key={i}
              className={cn(
                "min-h-[100px] border-b border-r p-1 transition-colors cursor-pointer",
                !cell.isCurrentMonth && "bg-muted/20",
                cell.isCurrentMonth && "hover:bg-muted/40",
                isSelected && "bg-accent",
              )}
              onClick={() => {
                if (!cell.isCurrentMonth) return
                onDayClick(
                  selectedDate && isSameDay(cell.date, selectedDate)
                    ? null
                    : cell.date,
                )
              }}
            >
              <div className="mb-1 flex items-center justify-center">
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs",
                    isToday &&
                      "bg-primary text-primary-foreground font-semibold",
                    !isToday &&
                      cell.isCurrentMonth &&
                      "text-foreground",
                    !isToday &&
                      !cell.isCurrentMonth &&
                      "text-muted-foreground",
                  )}
                >
                  {cell.date.getDate()}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayAppts.slice(0, 3).map((appt) => (
                  <div
                    key={appt.id}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[11px] leading-tight",
                      chipColors[appt.status] || "bg-muted text-muted-foreground",
                    )}
                  >
                    {fmtTime(appt.date_time)} {doctorName(appt.doctor_id)}
                  </div>
                ))}
                {dayAppts.length > 3 && (
                  <div className="px-1 text-[11px] text-muted-foreground">
                    +{dayAppts.length - 3} más
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
