import { useEffect, useState, useCallback, useRef } from "react"
import { useAuth } from "@/lib/auth"
import { medicalHistoryApi } from "@/lib/api"
import type { MedicalDocumentOut } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { RiUploadLine, RiMoreLine, RiDeleteBinLine, RiFileLine, RiDownloadLine, RiSearchLine } from "@remixicon/react"
import { toast } from "sonner"

const docTypes = [
  { value: "prescription", label: "Receta" },
  { value: "lab_result", label: "Analisis de laboratorio" },
  { value: "imaging", label: "Imagen / Radiografia" },
  { value: "report", label: "Informe medico" },
  { value: "other", label: "Otro" },
]

export function DocumentsPage() {
  const { hasPermission } = useAuth()
  const [documents, setDocuments] = useState<MedicalDocumentOut[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [deleteDoc, setDeleteDoc] = useState<MedicalDocumentOut | null>(null)
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState("other")

  const canRead = hasPermission("medical_history:read")
  const canCreate = hasPermission("medical_history:create")
  const canDelete = hasPermission("medical_history:delete")

  const load = useCallback(async (search?: string, docType?: string) => {
    setLoading(true)
    try {
      const params: { search?: string; docType?: string } = {}
      if (search) params.search = search
      if (docType) params.docType = docType
      setDocuments(await medicalHistoryApi.documents.list(params))
    } catch (err: any) {
      toast.error(err.detail || "Error al cargar")
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!canRead) return
    const timer = setTimeout(() => {
      load(searchQuery, typeFilter)
    }, searchQuery ? 300 : 0)
    return () => clearTimeout(timer)
  }, [canRead, searchQuery, typeFilter, load])

  const handleUpload = async () => {
    if (!file) { toast.error("Selecciona un archivo"); return }
    setUploading(true)
    try {
      const doc = await medicalHistoryApi.documents.upload(file, docType)
      setDocuments((prev) => [doc, ...prev])
      toast.success("Documento subido")
      setShowUpload(false)
      setFile(null)
      setDocType("other")
      load(searchQuery, typeFilter)
    } catch (err: any) {
      toast.error(err.detail || "Error al subir")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteDoc) return
    try {
      await medicalHistoryApi.documents.delete(deleteDoc.id)
      setDocuments((prev) => prev.filter((d) => d.id !== deleteDoc.id))
      toast.success("Documento eliminado")
      setDeleteDoc(null)
      load(searchQuery, typeFilter)
    } catch (err: any) {
      toast.error(err.detail || "Error al eliminar")
    }
  }

  const handleDownload = async (doc: MedicalDocumentOut) => {
    try {
      await medicalHistoryApi.documents.download(doc.id)
    } catch (err: any) {
      toast.error(err.detail || "Error al descargar")
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })

  const formatSize = (bytes: number | null) => {
    if (!bytes) return "-"
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const docTypeLabel = (t: string) => docTypes.find((d) => d.value === t)?.label || t

  if (!canRead) return <div className="flex h-64 items-center justify-center text-muted-foreground">No tienes permisos</div>
  if (initialLoading) return <div className="flex h-64 items-center justify-center"><div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Documentos</h1>
          <p className="text-sm text-muted-foreground">Archivos y documentos medicos</p>
        </div>
        {canCreate && (
          <Button onClick={() => { setFile(null); setDocType("other"); setShowUpload(true) }}>
            <RiUploadLine className="mr-2 size-4" />Subir documento
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === "__all__" ? "" : v)}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos los tipos</SelectItem>
            {docTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Archivo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Tamano</TableHead>
              <TableHead>Fecha</TableHead>
              {canRead || canDelete ? <TableHead className="w-10" /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                <div className="size-5 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </TableCell></TableRow>
            ) : documents.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">
                {searchQuery || typeFilter ? "Sin resultados para los filtros aplicados" : "No hay documentos"}
              </TableCell></TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <RiFileLine className="size-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{doc.filename}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{docTypeLabel(doc.doc_type)}</Badge></TableCell>
                  <TableCell className="text-sm">{formatSize(doc.file_size)}</TableCell>
                  <TableCell className="text-sm">{formatDate(doc.created_at)}</TableCell>
                  {(canRead || canDelete) && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-xs"><RiMoreLine className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDownload(doc)}>
                            <RiDownloadLine className="mr-2 size-4" />Descargar
                          </DropdownMenuItem>
                          {canDelete && (
                            <DropdownMenuItem onClick={() => setDeleteDoc(doc)} className="text-destructive">
                              <RiDeleteBinLine className="mr-2 size-4" />Eliminar
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent>
          <DialogHeader><DialogTitle>Subir documento</DialogTitle><DialogDescription>Sube un archivo medico (receta, analisis, radiografia, etc.)</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de documento</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {docTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Archivo</Label>
              <Input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  {file.name} ({formatSize(file.size)})
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpload(false)}>Cancelar</Button>
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? "Subiendo..." : "Subir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar documento</DialogTitle><DialogDescription>Eliminar "{deleteDoc?.filename}"? Esta accion no se puede deshacer.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDoc(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}