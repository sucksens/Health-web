import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth"
import { medicalHistoryApi } from "@/lib/api"
import type { PatientProfileOut } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

export function PatientProfileForm() {
  const { hasPermission } = useAuth()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [, setProfile] = useState<PatientProfileOut | null>(null)

  const [dob, setDob] = useState("")
  const [allergies, setAllergies] = useState("")
  const [chronic, setChronic] = useState("")
  const [bloodType, setBloodType] = useState("")
  const [emergName, setEmergName] = useState("")
  const [emergPhone, setEmergPhone] = useState("")

  useEffect(() => {
    if (!hasPermission("medical_history:read")) return
    medicalHistoryApi.profile
      .get()
      .then((data) => {
        if (data) {
          setProfile(data)
          setDob(data.date_of_birth || "")
          setAllergies(data.allergies || "")
          setChronic(data.chronic_conditions || "")
          setBloodType(data.blood_type || "")
          setEmergName(data.emergency_contact_name || "")
          setEmergPhone(data.emergency_contact_phone || "")
        }
      })
      .catch(() => toast.error("Error al cargar perfil"))
      .finally(() => setLoading(false))
  }, [hasPermission])

  if (!hasPermission("medical_history:read")) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        No tienes permisos para ver esta seccion
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await medicalHistoryApi.profile.upsert({
        date_of_birth: dob || null,
        allergies: allergies || null,
        chronic_conditions: chronic || null,
        blood_type: bloodType || null,
        emergency_contact_name: emergName || null,
        emergency_contact_phone: emergPhone || null,
      })
      setProfile(updated)
      toast.success("Perfil guardado")
    } catch (err: any) {
      toast.error(err.detail || "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Perfil de Salud</h1>
        <p className="text-sm text-muted-foreground">
          Informacion medica personal
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
          <CardDescription>Fecha de nacimiento, tipo de sangre y condiciones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Fecha de nacimiento</Label>
              <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de sangre</Label>
              <Select value={bloodType} onValueChange={setBloodType}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {bloodTypes.map((bt) => (
                    <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Alergias</Label>
            <Input
              value={allergies}
              onChange={(e) => setAllergies(e.target.value)}
              placeholder="Penicilina, sulfa, lactosa..."
            />
          </div>
          <div className="space-y-2">
            <Label>Condiciones cronicas</Label>
            <Input
              value={chronic}
              onChange={(e) => setChronic(e.target.value)}
              placeholder="Diabetes, hipertension, asma..."
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Contacto de emergencia</CardTitle>
          <CardDescription>Persona a contactar en caso de emergencia</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={emergName}
                onChange={(e) => setEmergName(e.target.value)}
                placeholder="Nombre completo"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefono</Label>
              <Input
                value={emergPhone}
                onChange={(e) => setEmergPhone(e.target.value)}
                placeholder="+52 555 123 4567"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Guardando..." : "Guardar perfil"}
      </Button>
    </div>
  )
}
