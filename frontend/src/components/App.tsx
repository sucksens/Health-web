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
