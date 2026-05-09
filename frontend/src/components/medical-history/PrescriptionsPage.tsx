import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth"
import { useNavigate } from "@/lib/router"
import { medicalHistoryApi } from "@/lib/api"
import type { PrescriptionOut, DoctorOut } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { RiAddLine, RiMoreLine, RiDeleteBinLine, RiEyeLine, RiFileLine, RiDownloadLine } from "@remixicon/react"
import { toast } from "sonner"

export function PrescriptionsPage() {
  const { hasPermission } = useAuth()
  const navigate = useNavigate()
  const [prescriptions, setPrescriptions] = useState<PrescriptionOut[]>([])
  const [doctors, setDoctors] = useState<DoctorOut[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteRx, setDeleteRx] = useState<PrescriptionOut | null>(null)
  const [detailRx, setDetailRx] = useState<PrescriptionOut | null>(null)

  const canRead = hasPermission("medical_history:read")
  const canCreate = hasPermission("medical_history:create")
  const canDelete = hasPermission("medical_history:delete")

  const load = useCallback(async () => {
    try {
      const [rxs, docs] = await Promise.all([
        medicalHistoryApi.prescriptions.list(0, 100),
        medicalHistoryApi.doctors.list(),
      ])
      setPrescriptions(rxs)
      setDoctors(docs)
    } catch (err: any) {
      toast.error(err.detail || "Error al cargar")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (canRead) load() }, [canRead, load])

  const handleDelete = async () => {
    if (!deleteRx) return
    try {
      await medicalHistoryApi.prescriptions.delete(deleteRx.id)
      setPrescriptions((prev) => prev.filter((r) => r.id !== deleteRx.id))
      toast.success("Receta eliminada")
      setDeleteRx(null)
    } catch (err: any) {
      toast.error(err.detail || "Error al eliminar")
    }
  }

  const handleDownload = async (docId: number) => {
    try {
      await medicalHistoryApi.documents.download(docId)
    } catch (err: any) {
      toast.error(err.detail || "Error al descargar")
    }
  }

  const getDoctorName = (id: number) => doctors.find((d) => d.id === id)?.name || "Doctor"

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })
  }

  const detailStatusColors: Record<string, string> = {
    active: "bg-green-500",
    completed: "bg-blue-500",
    suspended: "bg-red-500",
  }

  if (!canRead) return <div className="flex h-64 items-center justify-center text-muted-foreground">No tienes permisos</div>
  if (loading) return <div className="flex h-64 items-center justify-center"><div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Recetas</h1>
          <p className="text-sm text-muted-foreground">Recetas y diagnosticos medicos</p>
        </div>
        {canCreate && (
          <Button onClick={() => navigate("/medical-history/prescriptions/new")}>
            <RiAddLine className="mr-2 size-4" />Nueva receta
          </Button>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Doctor</TableHead>
              <TableHead>Diagnostico</TableHead>
              <TableHead>Medicamentos</TableHead>
              <TableHead>Vigencia</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {prescriptions.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No hay recetas</TableCell></TableRow>
            ) : (
              prescriptions.map((rx) => (
                <TableRow key={rx.id}>
                  <TableCell className="text-sm">{formatDate(rx.issue_date)}</TableCell>
                  <TableCell className="font-medium">{getDoctorName(rx.doctor_id)}</TableCell>
                  <TableCell className="text-sm">{rx.diagnosis || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{rx.details.length} medicamento{rx.details.length !== 1 ? "s" : ""}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{rx.valid_until || "-"}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs"><RiMoreLine className="size-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setDetailRx(rx)}>
                          <RiEyeLine className="mr-2 size-4" />Ver detalle
                        </DropdownMenuItem>
                        {canDelete && (
                          <DropdownMenuItem onClick={() => setDeleteRx(rx)} className="text-destructive">
                            <RiDeleteBinLine className="mr-2 size-4" />Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteRx} onOpenChange={() => setDeleteRx(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar receta</DialogTitle><DialogDescription>Eliminar esta receta y todos sus medicamentos? Esta accion no se puede deshacer.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRx(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailRx} onOpenChange={() => setDetailRx(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de receta</DialogTitle>
            <DialogDescription>
              {formatDate(detailRx?.issue_date || "")} — {detailRx ? getDoctorName(detailRx.doctor_id) : ""}
            </DialogDescription>
          </DialogHeader>
          {detailRx && (
            <div className="space-y-4">
              {detailRx.diagnosis && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Diagnostico</p>
                  <p className="text-sm">{detailRx.diagnosis}</p>
                </div>
              )}
              {detailRx.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notas</p>
                  <p className="text-sm">{detailRx.notes}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Medicamentos</p>
                <div className="space-y-2">
                  {detailRx.details.map((det) => (
                    <div key={det.id} className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{det.medication_name}</p>
                        <Badge className={detailStatusColors[det.status] || "bg-gray-500"}>{det.status}</Badge>
                      </div>
                      {det.dosage && <p className="text-xs text-muted-foreground">Dosis: {det.dosage}</p>}
                      {det.frequency && <p className="text-xs text-muted-foreground">Frecuencia: {det.frequency}</p>}
                      {det.duration_days && <p className="text-xs text-muted-foreground">Duracion: {det.duration_days} dias</p>}
                      {det.instructions && <p className="text-xs text-muted-foreground">Indicaciones: {det.instructions}</p>}
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {det.start_date && <span>Inicio: {det.start_date}</span>}
                        {det.end_date && <span>Fin: {det.end_date}</span>}
                      </div>
                    </div>
                  ))}
                  {detailRx.details.length === 0 && <p className="text-sm text-muted-foreground">Sin medicamentos</p>}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Documento</p>
                {detailRx.documents.length > 0 ? (
                  <div className="space-y-2">
                    {detailRx.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center gap-2 rounded-lg border p-3">
                        <RiFileLine className="size-4 text-muted-foreground" />
                        <span className="flex-1 text-sm font-medium">{doc.filename}</span>
                        <Button variant="ghost" size="icon-xs" onClick={() => handleDownload(doc.id)}>
                          <RiDownloadLine className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin documento adjunto</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailRx(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}