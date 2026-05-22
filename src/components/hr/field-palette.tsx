"use client"

import type { ElementType } from "react"
import { CalendarIcon, CheckSquareIcon, MousePointer2Icon, PenLineIcon, TypeIcon } from "lucide-react"

import { FieldType } from "@/lib/field-utils"
import { cn } from "@/lib/utils"

type FieldToolType = FieldType | "select"

const fieldTools: Array<{ type: FieldToolType; label: string; icon: ElementType; accent: string }> = [
  { type: "select", label: "Select", icon: MousePointer2Icon, accent: "text-muted-foreground" },
  { type: "signature", label: "Signature", icon: PenLineIcon, accent: "text-blue-400" },
  { type: "text", label: "Text", icon: TypeIcon, accent: "text-emerald-400" },
  { type: "date", label: "Date", icon: CalendarIcon, accent: "text-amber-400" },
  { type: "checkbox", label: "Checkbox", icon: CheckSquareIcon, accent: "text-purple-400" },
]

function FieldPalette({
  selectedType,
  fieldCounts,
  onSelectType,
}: {
  selectedType: FieldToolType
  fieldCounts: Record<FieldType, number>
  onSelectType: (type: FieldToolType) => void
}) {
  return (
    <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-col">
      {fieldTools.map(({ type, label, icon: Icon, accent }) => (
        <button
          key={type}
          type="button"
          onClick={() => onSelectType(type)}
          data-active={selectedType === type}
          className="flex h-12 min-w-0 items-center justify-between gap-2 border border-dashed border-border bg-card px-2 text-sm transition-colors hover:bg-muted data-[active=true]:border-primary data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
        >
          <span className="flex min-w-0 items-center gap-2 font-mono text-[9px] font-medium uppercase tracking-wider">
            <Icon className={cn("size-4", accent)} />
            <span className="truncate">{label}</span>
          </span>
          <span className="font-mono text-xs text-muted-foreground">{type === "select" ? "" : fieldCounts[type] || 0}</span>
        </button>
      ))}
    </div>
  )
}

export type { FieldToolType }
export { FieldPalette, fieldTools }
