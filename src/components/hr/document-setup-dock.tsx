"use client"

import { useEffect, useMemo, useState } from "react"
import type { MouseEvent } from "react"
import { Rnd } from "react-rnd"
import {
  CalendarIcon,
  CheckSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PenLineIcon,
  Trash2Icon,
  TypeIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react"
import { toast } from "sonner"

import { FieldInspector } from "@/components/hr/field-inspector"
import { FieldPalette } from "@/components/hr/field-palette"
import type { DocumentRecord } from "@/components/hr/types"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { PdfCanvasViewer } from "@/components/pdf/PdfCanvasViewer"
import { Field, FieldType, clampField, fieldDefaults } from "@/lib/field-utils"
import { cn } from "@/lib/utils"

const fieldIconMap = {
  signature: PenLineIcon,
  text: TypeIcon,
  date: CalendarIcon,
  checkbox: CheckSquareIcon,
}

function DocumentSetupDock({
  document,
  onFieldsChange,
  fullHeight = false,
}: {
  document: DocumentRecord
  onFieldsChange?: (documentId: string, fields: Field[]) => void
  fullHeight?: boolean
}) {
  const [fields, setFields] = useState<Field[]>(document.fields || [])
  const [selectedType, setSelectedType] = useState<FieldType>("signature")
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(document.fields?.[0]?.id || null)
  const [isSaving, setIsSaving] = useState(false)
  const [zoom, setZoom] = useState(72)

  useEffect(() => {
    queueMicrotask(() => {
      setFields(document.fields || [])
      setSelectedFieldId(document.fields?.[0]?.id || null)
    })
  }, [document.id, document.fields])

  const selectedField = fields.find((field) => field.id === selectedFieldId)
  const fieldCounts = useMemo(
    () => ({
      signature: fields.filter((field) => field.type === "signature").length,
      text: fields.filter((field) => field.type === "text").length,
      date: fields.filter((field) => field.type === "date").length,
      checkbox: fields.filter((field) => field.type === "checkbox").length,
    }),
    [fields],
  )

  async function addField(page: number, point: { x: number; y: number }) {
    const defaults = fieldDefaults[selectedType]
    const draft = clampField({
      type: selectedType,
      page,
      x: point.x,
      y: point.y,
      width: defaults.width,
      height: defaults.height,
    })

    const res = await fetch(`/api/documents/${document.id}`, {
      method: "POST",
      body: JSON.stringify(draft),
    })
    const data = await res.json()
    const field = { ...draft, id: data.id } as Field
    updateLocalFields([...fields, field])
    setSelectedFieldId(field.id)
    toast.success(`${selectedType} field placed`)
  }

  function updateLocalFields(nextFields: Field[]) {
    setFields(nextFields)
    onFieldsChange?.(document.id, nextFields)
  }

  async function persistField(fieldId: string, updates: Partial<Field>) {
    const nextFields = fields.map((field) =>
      field.id === fieldId ? ({ ...field, ...clampField(updates) } as Field) : field,
    )
    updateLocalFields(nextFields)
    setSelectedFieldId(fieldId)

    const field = nextFields.find((item) => item.id === fieldId)
    if (!field) return

    setIsSaving(true)
    await fetch(`/api/documents/${document.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        fieldId,
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
      }),
    })
    setIsSaving(false)
  }

  async function deleteField(fieldId: string) {
    await fetch(`/api/documents/${document.id}`, {
      method: "DELETE",
      body: JSON.stringify({ fieldId }),
    })
    const nextFields = fields.filter((field) => field.id !== fieldId)
    updateLocalFields(nextFields)
    if (selectedFieldId === fieldId) setSelectedFieldId(nextFields[0]?.id || null)
    toast.success("Field removed")
  }

  return (
    <div
      className={cn(
        "grid min-h-0 overflow-hidden border border-border bg-card lg:grid-cols-[150px_minmax(0,1fr)_220px]",
        fullHeight ? "h-full" : "h-[520px]",
      )}
    >
      <aside className="min-h-0 border-b border-border bg-background p-3 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col gap-3 sm:flex-row sm:items-end lg:flex-col lg:items-stretch">
          <div className="sm:w-44 lg:w-auto">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-widest">Add Field</h3>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Click the PDF to place selected fields.</p>
          </div>
          <FieldPalette selectedType={selectedType} fieldCounts={fieldCounts} onSelectType={setSelectedType} />
        </div>
      </aside>

      <section className="grid min-h-[430px] grid-rows-[auto_minmax(0,1fr)_auto] lg:min-h-0">
        <EditorToolbar zoom={zoom} onZoomChange={setZoom} isSaving={isSaving} />
        <div className="sleek-grid min-h-0 overflow-auto bg-[#121214] p-3 sm:p-6">
          <PdfCanvasViewer
            fileUrl={document.fileUrl}
            maxPageWidth={Math.max(320, zoom * 8)}
            className="mx-auto w-full max-w-[760px]"
            pageClassName="relative border-t-8 border-[#3f3f46] bg-white shadow-2xl ring-1 ring-black/10"
            onPageClick={addField}
            renderOverlay={(pageIndex, metrics) =>
              fields
                .filter((field) => field.page === pageIndex)
                .map((field, index) => {
                  const Icon = fieldIconMap[field.type]

                  return (
                    <Rnd
                      key={field.id}
                      bounds="parent"
                      size={{
                        width: (field.width / 100) * metrics.width,
                        height: (field.height / 100) * metrics.height,
                      }}
                      position={{
                        x: (field.x / 100) * metrics.width,
                        y: (field.y / 100) * metrics.height,
                      }}
                      onClick={(event: MouseEvent) => {
                        event.stopPropagation()
                        setSelectedFieldId(field.id)
                      }}
                      onDragStop={(_, data) => {
                        persistField(field.id, {
                          x: (data.x / metrics.width) * 100,
                          y: (data.y / metrics.height) * 100,
                        })
                      }}
                      onResizeStop={(_, __, ref, ___, position) => {
                        persistField(field.id, {
                          x: (position.x / metrics.width) * 100,
                          y: (position.y / metrics.height) * 100,
                          width: (ref.offsetWidth / metrics.width) * 100,
                          height: (ref.offsetHeight / metrics.height) * 100,
                        })
                      }}
                      className={cn(
                        "group flex items-center justify-center border border-dashed bg-background/75 text-primary shadow-sm backdrop-blur-sm",
                        field.type === "signature" && "border-blue-500/60 bg-blue-500/10 text-blue-300",
                        field.type === "text" && "border-emerald-500/60 bg-emerald-500/10 text-emerald-300",
                        field.type === "date" && "border-amber-500/60 bg-amber-500/10 text-amber-300",
                        field.type === "checkbox" && "border-purple-500/60 bg-purple-500/10 text-purple-300",
                        selectedFieldId === field.id && "ring-2 ring-primary",
                      )}
                    >
                      <span className="pointer-events-none flex items-center gap-1 px-1 font-mono text-[10px] font-medium uppercase tracking-wider">
                        <Icon className="size-3" />
                        {field.type}
                      </span>
                      <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center bg-primary font-mono text-[10px] text-primary-foreground">
                        {index + 1}
                      </span>
                      <button
                        onClick={(event) => {
                          event.stopPropagation()
                          deleteField(field.id)
                        }}
                        className="absolute -left-2 -top-2 hidden size-5 items-center justify-center border border-border bg-background text-destructive shadow-sm group-hover:flex"
                      >
                        <Trash2Icon className="size-3" />
                      </button>
                    </Rnd>
                  )
                })
            }
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border bg-card px-3 py-2 sm:gap-4 sm:px-4">
          <Button variant="ghost" size="icon-sm">
            <ChevronLeftIcon />
          </Button>
          <span className="border border-border bg-background px-3 py-1 font-mono text-xs">1</span>
          <span className="font-mono text-xs text-muted-foreground">/ 3</span>
          <Button variant="ghost" size="icon-sm">
            <ChevronRightIcon />
          </Button>
          <Select defaultValue="fit" className="h-8 w-32">
            <option value="fit">Fit Width</option>
            <option value="page">Fit Page</option>
          </Select>
        </div>
      </section>

      <aside className="min-h-[220px] border-t border-border bg-card p-3 lg:min-h-0 lg:border-l lg:border-t-0">
        <h3 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest">Field Inspector</h3>
        <FieldInspector selectedField={selectedField} onUpdate={persistField} onDelete={deleteField} />
      </aside>
    </div>
  )
}

function EditorToolbar({
  zoom,
  onZoomChange,
  isSaving,
}: {
  zoom: number
  onZoomChange: (zoom: number) => void
  isSaving: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon-sm" onClick={() => onZoomChange(Math.max(58, zoom - 6))}>
          <ZoomOutIcon />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => onZoomChange(Math.min(104, zoom + 6))}>
          <ZoomInIcon />
        </Button>
        <Select value={`${zoom}`} onChange={(event) => onZoomChange(Number(event.target.value))} className="h-7 w-20">
          <option value="58">58%</option>
          <option value="72">72%</option>
          <option value="86">86%</option>
          <option value="100">100%</option>
        </Select>
      </div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{isSaving ? "saving..." : "autosaved"}</div>
    </div>
  )
}

export { DocumentSetupDock }
