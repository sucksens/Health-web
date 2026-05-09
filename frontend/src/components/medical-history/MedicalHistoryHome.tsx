import { useAuth } from "@/lib/auth"
import { useNavigate } from "@/lib/router"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  RiStethoscopeLine,
  RiCalendarScheduleLine,
  RiFileTextLine,
  RiCapsuleLine,
  RiClipboardLine,
  RiUserHeartLine,
  RiFolderLine,
  RiTimeLine,
  RiFilePdf2Line,
} from "@remixicon/react"

const sections = [
  { title: "Perfil de Salud", url: "/medical-history/profile", icon: RiUserHeartLine, desc: "Datos medicos personales", perm: "medical_history:read" },
  { title: "Doctores", url: "/medical-history/doctors", icon: RiStethoscopeLine, desc: "Catalogo de doctores", perm: "medical_history:read" },
  { title: "Especialidades", url: "/medical-history/specialties", icon: RiClipboardLine, desc: "Especialidades medicas", perm: "medical_history:read" },
  { title: "Citas", url: "/medical-history/appointments", icon: RiCalendarScheduleLine, desc: "Gestion de citas medicas", perm: "medical_history:read" },
  { title: "Recetas", url: "/medical-history/prescriptions", icon: RiFileTextLine, desc: "Recetas y diagnosticos", perm: "medical_history:read" },
  { title: "Medicamentos", url: "/medical-history/medications", icon: RiCapsuleLine, desc: "Catalogo de medicamentos", perm: "medical_history:read" },
  { title: "Documentos", url: "/medical-history/documents", icon: RiFolderLine, desc: "Archivos y documentos medicos", perm: "medical_history:read" },
  { title: "Tratamiento Activo", url: "/medical-history/adherence", icon: RiTimeLine, desc: "Registro diario de tomas", perm: "medical_history:read" },
  { title: "Reportes", url: "/medical-history/reports", icon: RiFilePdf2Line, desc: "Genera reportes en PDF", perm: "medical_history:read" },
]

export function MedicalHistoryHome() {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()

  const visible = sections.filter((s) => hasPermission(s.perm))

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Historial Medico</h1>
        <p className="text-sm text-muted-foreground">
          Gestion de tu salud personal: citas, recetas, medicamentos y tratamientos
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((s) => {
          const Icon = s.icon
          return (
            <Card
              key={s.url}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => navigate(s.url)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{s.title}</CardTitle>
                    <CardDescription className="text-xs">{s.desc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
