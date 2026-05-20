"use client"

import { useAuth } from "@/lib/auth"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { RiWallet3Line, RiUser3Line, RiShieldLine, RiKey2Line, RiFileList2Line, RiUserSettingsLine, RiBodyScanLine, RiHeart2Line, RiHeartPulseLine } from "@remixicon/react"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, hasPermission } = useAuth()

  const hasUsers = hasPermission("users:read")
  const hasRoles = hasPermission("roles:read")
  const hasPermissions = hasPermission("permissions:read")
  const hasActivity = hasPermission("activity:read")
  const hasBodyMetrics = hasPermission("body_metrics:read")
  const hasBloodPressure = hasPermission("blood_pressure:read")
  const hasMedicalHistory = hasPermission("medical_history:read")

  const adminItems = [
    ...(hasUsers
      ? [
          {
            title: "Usuarios",
            url: "/users",
            icon: <RiUser3Line />,
            items: [{ title: "Gestion de usuarios", url: "/users" }],
          },
        ]
      : []),
    ...(hasRoles
      ? [
          {
            title: "Roles",
            url: "/roles",
            icon: <RiShieldLine />,
            items: [{ title: "Gestion de roles", url: "/roles" }],
          },
        ]
      : []),
    ...(hasPermissions
      ? [
          {
            title: "Permisos",
            url: "/permissions",
            icon: <RiKey2Line />,
            items: [{ title: "Gestion de permisos", url: "/permissions" }],
          },
        ]
      : []),
    ...(hasActivity
      ? [
          {
            title: "Auditoria",
            url: "/activity",
            icon: <RiFileList2Line />,
            items: [{ title: "Registro de actividad", url: "/activity" }],
          },
        ]
      : []),
  ]

  const navItems = [
    {
      title: "Panel",
      url: "/dashboard",
      icon: <RiWallet3Line />,
      items: [{ title: "Resumen", url: "/dashboard" }],
    },
    ...(hasBodyMetrics
      ? [
          {
            title: "Medidas Corporales",
            url: "/body-metrics",
            icon: <RiBodyScanLine />,
            items: [
              { title: "Historial de medidas", url: "/body-metrics" },
              { title: "Historial de metas", url: "/body-metrics/goals" },
            ],
          },
        ]
      : []),
    ...(hasBloodPressure
      ? [
          {
            title: "Presion Arterial",
            url: "/blood-pressure",
            icon: <RiHeartPulseLine />,
            items: [
              { title: "Historial de lecturas", url: "/blood-pressure" },
            ],
          },
        ]
      : []),
    ...(hasMedicalHistory
      ? [
          {
            title: "Historial Medico",
            url: "/medical-history",
            icon: <RiHeart2Line />,
            items: [
              { title: "Inicio", url: "/medical-history" },
              { title: "Doctores", url: "/medical-history/doctors" },
              { title: "Especialidades", url: "/medical-history/specialties" },
              { title: "Citas", url: "/medical-history/appointments" },
              { title: "Recetas", url: "/medical-history/prescriptions" },
              { title: "Medicamentos", url: "/medical-history/medications" },
              { title: "Documentos", url: "/medical-history/documents" },
              { title: "Tratamiento Activo", url: "/medical-history/adherence" },
              { title: "Reportes", url: "/medical-history/reports" },
            ],
          },
        ]
      : []),
  ]

  if (adminItems.length > 0) {
    navItems.push({
      title: "Administracion",
      url: "/users",
      icon: <RiShieldLine />,
      items: adminItems,
    })
  }

  const initials = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : "U"

  const userData = {
    name: user?.username || "Usuario",
    email: user?.email || "",
    avatar: "",
    initials,
    roles: user?.roles.map((r) => r.name).join(", ") || "",
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Health">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <img src="/favicon.svg" alt="Health" className="size-5" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Health</span>
                <span className="truncate text-xs">Sistema RBAC</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}