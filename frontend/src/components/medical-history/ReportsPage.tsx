import { useState } from "react"
import { useAuth } from "@/lib/auth"
import { medicalHistoryApi } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import {
  RiFilePdf2Line, RiUserHeartLine, RiScales2Line, RiFileTextLine,
  RiCalendarScheduleLine, RiCapsuleLine, RiClipboardLine, RiHeartPulseLine,
} from "@remixicon/react"
import { toast } from "sonner"

const reportTypes = [
  {
    type: "health-summary",
    title: "Resumen de Salud",
    desc: "Vista general: metricas, meta de peso, citas, medicamentos y adherencia",
    icon: RiUserHeartLine,
    hasDateFilter: false,
  },
  {
    type: "weight-history",
    title: "Historial de Peso",
    desc: "Evolucion de peso, IMC y medidas corporales con graficos",
    icon: RiScales2Line,
    hasDateFilter: true,
  },
  {
    type: "prescriptions",
    title: "Historial de Recetas",
    desc: "Recetas, medicamentos recetados y documentos adjuntos",
    icon: RiFileTextLine,
    hasDateFilter: true,
  },
  {
    type: "appointments",
    title: "Historial de Citas",
    desc: "Citas medicas con resumen por estado y doctor",
    icon: RiCalendarScheduleLine,
    hasDateFilter: true,
  },
  {
    type: "adherence",
    title: "Adherencia a Medicamentos",
    desc: "Cumplimiento del tratamiento con graficos por medicamento",
    icon: RiCapsuleLine,
    hasDateFilter: true,
  },
  {
    type: "patient-profile",
    title: "Ficha del Paciente",
    desc: "Datos personales, perfil medico, doctores y medicamentos",
    icon: RiClipboardLine,
    hasDateFilter: false,
  },
  {
    type: "blood-pressure",
    title: "Presion Arterial",
    desc: "Historial de lecturas con estadisticas, grafico y clasificacion",
    icon: RiHeartPulseLine,
    hasDateFilter: true,
    permission: "blood_pressure:read",
  },
]

export function ReportsPage() {
  const { hasPermission } = useAuth()
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [loading, setLoading] = useState<string | null>(null)

  const canRead = hasPermission("medical_history:read")
  const canReadBp = hasPermission("blood_pressure:read")

  const visibleReports = reportTypes.filter((r) => {
    if (r.permission === "blood_pressure:read") return canReadBp
    return canRead
  })

  const handleDownload = async (type: string) => {
    setLoading(type)
    try {
      await medicalHistoryApi.reports.download(type, dateFrom || undefined, dateTo || undefined)
    } catch (err: any) {
      toast.error(err.detail || "Error al generar reporte")
    } finally {
      setLoading(null)
    }
  }

  if (!canRead && !canReadBp) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">No tienes permisos</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reportes</h1>
        <p className="text-sm text-muted-foreground">Genera reportes en PDF de tu historial medico</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtro de Fechas (opcional)</CardTitle>
          <CardDescription>Aplica a los reportes que lo soportan. Dejar vacio para incluir todos los datos.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full sm:w-44" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full sm:w-44" />
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo("") }}>
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleReports.map((r) => {
          const Icon = r.icon
          const isLoading = loading === r.type
          return (
            <Card key={r.type} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{r.title}</CardTitle>
                    <CardDescription className="text-xs">{r.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="mt-auto pt-2">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleDownload(r.type)}
                  disabled={isLoading}
                >
                  <RiFilePdf2Line className="mr-2 size-4" />
                  {isLoading ? "Generando..." : "Descargar PDF"}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
