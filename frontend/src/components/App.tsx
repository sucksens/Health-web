import { AppRouter, usePath } from "@/lib/router"
import { AuthProvider, useAuth } from "@/lib/auth"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "@/components/ui/sonner"
import { LoginPage } from "@/components/auth/LoginPage"
import { RegisterPage } from "@/components/auth/RegisterPage"
import { DashboardPage } from "@/components/dashboard/DashboardPage"
import { UsersPage } from "@/components/users/UsersPage"
import { RolesPage } from "@/components/roles/RolesPage"
import { PermissionsPage } from "@/components/permissions/PermissionsPage"
import { ActivityPage } from "@/components/activity/ActivityPage"
import { ProfilePage } from "@/components/profile/ProfilePage"
import { BodyMetricsPage } from "@/components/body-metrics/BodyMetricsPage"
import { WeightGoalHistoryPage } from "@/components/body-metrics/WeightGoalHistoryPage"
import { ForcePasswordChangePage } from "@/components/auth/ForcePasswordChangePage"
import { MedicalHistoryHome } from "@/components/medical-history/MedicalHistoryHome"
import { PatientProfileForm } from "@/components/medical-history/PatientProfileForm"
import { DoctorsPage } from "@/components/medical-history/DoctorsPage"
import { SpecialtiesPage } from "@/components/medical-history/SpecialtiesPage"
import { MedicationCatalog } from "@/components/medical-history/MedicationCatalog"
import { AppointmentsPage } from "@/components/medical-history/AppointmentsPage"
import { PrescriptionsPage } from "@/components/medical-history/PrescriptionsPage"
import { PrescriptionForm } from "@/components/medical-history/PrescriptionForm"
import { DocumentsPage } from "@/components/medical-history/DocumentsPage"
import { AdherenceTracker } from "@/components/medical-history/AdherenceTracker"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"

const routeLabels: Record<string, string> = {
  "/dashboard": "Panel",
  "/users": "Usuarios",
  "/roles": "Roles",
  "/permissions": "Permisos",
  "/activity": "Auditoria",
  "/profile": "Mi Perfil",
  "/body-metrics": "Medidas Corporales",
  "/body-metrics/goals": "Historial de Metas",
  "/force-password-change": "Cambiar contrasena",
  "/medical-history": "Historial Medico",
  "/medical-history/profile": "Perfil de Salud",
  "/medical-history/doctors": "Doctores",
  "/medical-history/specialties": "Especialidades",
  "/medical-history/appointments": "Citas",
  "/medical-history/prescriptions": "Recetas",
  "/medical-history/prescriptions/new": "Nueva Receta",
  "/medical-history/medications": "Medicamentos",
  "/medical-history/documents": "Documentos",
  "/medical-history/adherence": "Tratamiento Activo",
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const path = usePath()
  const label = routeLabels[path] || "Panel"

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>{label}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function RouteGuard() {
  const { user, loading, refreshUser } = useAuth()
  const path = usePath()

  if (loading) {
    return (
      <div className="flex h-svh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    if (path === "/register") return <RegisterPage />
    if (path === "/force-password-change") {
      window.history.replaceState({}, "", "/login")
      return <LoginPage />
    }
    return <LoginPage />
  }

  if (path === "/force-password-change") {
    if (user.must_change_password) {
      const handlePasswordChanged = () => {
        refreshUser()
      }
      return <ForcePasswordChangePage onPasswordChanged={handlePasswordChanged} />
    }
    window.history.replaceState({}, "", "/dashboard")
  }

  if (user.must_change_password && path !== "/force-password-change") {
    window.history.replaceState({}, "", "/force-password-change")
  }

  if (path === "/login" || path === "/register") {
    window.history.replaceState({}, "", "/dashboard")
  }

  const currentPath =
    path === "/" || path === "/login" || path === "/register" || path === "/force-password-change"
      ? "/dashboard"
      : path

  return (
    <DashboardShell>
      {currentPath === "/dashboard" && <DashboardPage />}
      {currentPath === "/users" && <UsersPage />}
      {currentPath === "/roles" && <RolesPage />}
      {currentPath === "/permissions" && <PermissionsPage />}
      {currentPath === "/activity" && <ActivityPage />}
      {currentPath === "/profile" && <ProfilePage />}
      {currentPath === "/body-metrics" && <BodyMetricsPage />}
      {currentPath === "/body-metrics/goals" && <WeightGoalHistoryPage />}
      {currentPath === "/medical-history" && <MedicalHistoryHome />}
      {currentPath === "/medical-history/profile" && <PatientProfileForm />}
      {currentPath === "/medical-history/doctors" && <DoctorsPage />}
      {currentPath === "/medical-history/specialties" && <SpecialtiesPage />}
      {currentPath === "/medical-history/medications" && <MedicationCatalog />}
      {currentPath === "/medical-history/appointments" && <AppointmentsPage />}
      {currentPath === "/medical-history/prescriptions" && <PrescriptionsPage />}
      {currentPath === "/medical-history/prescriptions/new" && <PrescriptionForm />}
      {currentPath === "/medical-history/documents" && <DocumentsPage />}
      {currentPath === "/medical-history/adherence" && <AdherenceTracker />}
    </DashboardShell>
  )
}

function AppContent() {
  return (
    <TooltipProvider>
      <AppRouter>
        <AuthProvider>
          <RouteGuard />
          <Toaster />
        </AuthProvider>
      </AppRouter>
    </TooltipProvider>
  )
}

export default function App() {
  return <AppContent />
}
