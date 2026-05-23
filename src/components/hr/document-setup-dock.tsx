"use client";

import { useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Rnd } from "react-rnd";
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
} from "lucide-react";
import { toast } from "sonner";

import { FieldInspector } from "@/components/hr/field-inspector";
import { FieldPalette } from "@/components/hr/field-palette";
import type { FieldToolType } from "@/components/hr/field-palette";
import type { DocumentRecord } from "@/components/hr/types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { PdfCanvasViewer } from "@/components/pdf/PdfCanvasViewer";
import {
  Field,
  RoleConfig,
  DEFAULT_ROLE_CONFIGS,
  clampField,
  fieldDefaults,
  normalizeRoleConfigs,
  UNASSIGNED_ROLE,
} from "@/lib/field-utils";
import { cn } from "@/lib/utils";

const fieldIconMap = {
  signature: PenLineIcon,
  text: TypeIcon,
  date: CalendarIcon,
  checkbox: CheckSquareIcon,
};

const fieldToneMap = {
  signature: "border-blue-600/80 bg-blue-100/90 text-blue-800 dark:bg-blue-200/90 dark:text-blue-950",
  text: "border-emerald-600/80 bg-emerald-100/90 text-emerald-800 dark:bg-emerald-200/90 dark:text-emerald-950",
  date: "border-amber-600/80 bg-amber-100/90 text-amber-900 dark:bg-amber-200/90 dark:text-amber-950",
  checkbox: "border-violet-600/80 bg-violet-100/90 text-violet-800 dark:bg-violet-200/90 dark:text-violet-950",
};

const fieldLabelToneMap = {
  signature: "bg-blue-600 text-white",
  text: "bg-emerald-600 text-white",
  date: "bg-amber-500 text-black",
  checkbox: "bg-violet-600 text-white",
};

function DocumentSetupDock({
  document,
  onFieldsChange,
  onRoleConfigsChange,
  fullHeight = false,
}: {
  document: DocumentRecord;
  onFieldsChange?: (documentId: string, fields: Field[]) => void;
  onRoleConfigsChange?: (documentId: string, roleConfigs: RoleConfig[]) => void;
  fullHeight?: boolean;
}) {
  const [fields, setFields] = useState<Field[]>(document.fields || []);
  const [roleConfigs, setRoleConfigs] = useState<RoleConfig[]>(
    normalizeRoleConfigs(document.roleConfigs || [...DEFAULT_ROLE_CONFIGS]),
  );
  const [selectedType, setSelectedType] = useState<FieldToolType>("select");
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(
    document.fields?.[0]?.id || null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [zoom, setZoom] = useState(72);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [fitMode, setFitMode] = useState<"width" | "page">("width");
  const viewerRef = useRef<HTMLDivElement>(null);

  const selectedField = fields.find((field) => field.id === selectedFieldId);
  const fieldCounts = useMemo(
    () => ({
      signature: fields.filter((field) => field.type === "signature").length,
      text: fields.filter((field) => field.type === "text").length,
      date: fields.filter((field) => field.type === "date").length,
      checkbox: fields.filter((field) => field.type === "checkbox").length,
    }),
    [fields],
  );

  async function addField(page: number, point: { x: number; y: number }) {
    if (selectedType === "select") return;

    const defaults = fieldDefaults[selectedType];
    const draft = clampField({
      type: selectedType,
      page,
      x: point.x,
      y: point.y,
      width: defaults.width,
      height: defaults.height,
      required: true,
      assigneeRole: UNASSIGNED_ROLE,
    });

    const res = await fetch(`/api/documents/${document.id}`, {
      method: "POST",
      body: JSON.stringify({
        ...draft,
        assigneeRole: draft.assigneeRole,
      }),
    });
    const data = await res.json();
    const field = { ...draft, id: data.id } as Field;
    updateLocalFields([...fields, field]);
    setSelectedFieldId(field.id);
    toast.success(`${selectedType} field placed`);
  }

  function updateLocalFields(nextFields: Field[]) {
    setFields(nextFields);
    onFieldsChange?.(document.id, nextFields);
  }

  async function persistField(fieldId: string, updates: Partial<Field>) {
    const nextFields = fields.map((field) => {
      if (field.id !== fieldId) return field;
      return clampField({
        ...field,
        ...updates,
      }) as Field;
    });
    updateLocalFields(nextFields);
    setSelectedFieldId(fieldId);

    const field = nextFields.find((item) => item.id === fieldId);
    if (!field) return;

    setIsSaving(true);
    await fetch(`/api/documents/${document.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        documentId: document.id,
        fieldId,
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
        required: field.required,
        assigneeRole: field.assigneeRole,
      }),
    });
    setIsSaving(false);
  }

  async function persistRoleConfigs(nextRoleConfigs: RoleConfig[]) {
    const normalizedRoleConfigs = normalizeRoleConfigs(nextRoleConfigs);
    const roleNames = new Set(normalizedRoleConfigs.map((role) => role.name));
    const nextFields = fields.map((field) =>
      !field.assigneeRole || roleNames.has(field.assigneeRole)
        ? field
        : { ...field, assigneeRole: UNASSIGNED_ROLE },
    );

    setRoleConfigs(normalizedRoleConfigs);
    updateLocalFields(nextFields);
    onRoleConfigsChange?.(document.id, normalizedRoleConfigs);

    if (
      selectedFieldId &&
      !roleNames.has(
        nextFields.find((field) => field.id === selectedFieldId)?.assigneeRole || "",
      )
    ) {
      setSelectedFieldId(selectedFieldId);
    }

    setIsSaving(true);
    await Promise.all([
      fetch(`/api/documents/${document.id}`, {
        method: "PUT",
        body: JSON.stringify({
          roleConfigs: normalizedRoleConfigs,
        }),
      }),
      ...nextFields
        .filter((field, index) => field.assigneeRole !== fields[index]?.assigneeRole)
        .map((field) =>
          fetch(`/api/documents/${document.id}`, {
            method: "PATCH",
            body: JSON.stringify({
              documentId: document.id,
              fieldId: field.id,
              x: field.x,
              y: field.y,
              width: field.width,
              height: field.height,
              required: field.required,
              assigneeRole: field.assigneeRole,
            }),
          }),
        ),
    ]);
    setIsSaving(false);
  }

  async function deleteField(fieldId: string) {
    await fetch(`/api/documents/${document.id}`, {
      method: "DELETE",
      body: JSON.stringify({ fieldId }),
    });
    const nextFields = fields.filter((field) => field.id !== fieldId);
    updateLocalFields(nextFields);
    if (selectedFieldId === fieldId)
      setSelectedFieldId(nextFields[0]?.id || null);
    toast.success("Field removed");
  }

  return (
    <div
      className={cn(
        "grid min-h-0 overflow-hidden border border-border bg-card lg:grid-cols-[220px_minmax(0,1fr)_300px]",
        fullHeight ? "h-full" : "h-130",
      )}
    >
      <aside className="min-h-0 border-b border-border bg-background p-3 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col gap-3 sm:flex-row sm:items-end lg:flex-col lg:items-stretch">
          <div className="sm:w-44 lg:w-auto">
            <h3 className="font-mono text-[10px] font-semibold uppercase tracking-widest">
              Add Field
            </h3>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              Select a field type, then click the PDF to place it.
            </p>
          </div>
          <FieldPalette
            selectedType={selectedType}
            fieldCounts={fieldCounts}
            onSelectType={setSelectedType}
          />
        </div>
      </aside>

      <section className="grid min-h-107.5 grid-rows-[auto_minmax(0,1fr)_auto] lg:min-h-0">
        <EditorToolbar zoom={zoom} onZoomChange={setZoom} isSaving={isSaving} />
        <div ref={viewerRef} className="sleek-grid min-h-0 overflow-auto bg-zinc-100 p-3 dark:bg-[#121214] sm:p-6">
          <PdfCanvasViewer
            fileUrl={document.fileUrl}
            maxPageWidth={fitMode === "width" ? 1600 : Math.max(320, zoom * 8)}
            className="mx-auto w-full max-w-190"
            pageClassName="relative border-t-8 border-zinc-300 bg-white shadow-xl ring-1 ring-black/10 dark:border-[#3f3f46] dark:shadow-2xl"
            onPageClick={addField}
            onDocumentLoad={(nextPageCount) => setPageCount(nextPageCount)}
            onVisiblePageChange={(pageIndex) => setCurrentPage(pageIndex)}
            renderOverlay={(pageIndex, metrics) =>
              fields
                .filter((field) => field.page === pageIndex)
                .map((field, index) => {
                  const Icon = fieldIconMap[field.type];

                  return (
                    <Rnd
                      key={field.id}
                      bounds="parent"
                      cancel=".field-delete-button"
                      size={{
                        width: (field.width / 100) * metrics.width,
                        height: (field.height / 100) * metrics.height,
                      }}
                      position={{
                        x: (field.x / 100) * metrics.width,
                        y: (field.y / 100) * metrics.height,
                      }}
                      onClick={(event: MouseEvent) => {
                        event.stopPropagation();
                        setSelectedFieldId(field.id);
                      }}
                      onMouseDown={(event) => {
                        event.stopPropagation();
                        setSelectedFieldId(field.id);
                      }}
                      onDragStop={(_, data) => {
                        persistField(field.id, {
                          x: (data.x / metrics.width) * 100,
                          y: (data.y / metrics.height) * 100,
                        });
                      }}
                      onResizeStop={(_, __, ref, ___, position) => {
                        persistField(field.id, {
                          x: (position.x / metrics.width) * 100,
                          y: (position.y / metrics.height) * 100,
                          width: (ref.offsetWidth / metrics.width) * 100,
                          height: (ref.offsetHeight / metrics.height) * 100,
                        });
                      }}
                      className={cn(
                        "group flex items-center justify-center border border-dashed shadow-sm backdrop-blur-sm outline outline-0 outline-offset-2 transition-[box-shadow,background-color,outline-color]",
                        fieldToneMap[field.type],
                        selectedFieldId === field.id && "border-solid outline-2 outline-primary ring-2 ring-primary/20",
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none absolute -top-5 left-0 whitespace-nowrap px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider shadow-sm",
                          fieldLabelToneMap[field.type],
                        )}
                      >
                        {field.type} · {field.assigneeRole || "Unassigned"}
                      </span>
                      <span className="pointer-events-none flex h-full w-full items-center justify-center">
                        <Icon className="h-[45%] max-h-5 min-h-3 w-[45%] max-w-5 min-w-3 stroke-[2.3]" />
                      </span>
                      <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center bg-primary font-mono text-[10px] text-primary-foreground">
                        {index + 1}
                      </span>
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteField(field.id);
                        }}
                        onMouseDown={(event) => {
                          event.stopPropagation();
                        }}
                        className="field-delete-button absolute -left-2 -top-2 z-10 hidden size-5 items-center justify-center border border-border bg-background text-destructive shadow-sm group-hover:flex"
                      >
                        <Trash2Icon className="size-3" />
                      </button>
                    </Rnd>
                  );
                })
            }
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border bg-card px-3 py-2 sm:gap-4 sm:px-4">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={currentPage <= 0}
            onClick={() => {
              const previousPage = Math.max(0, currentPage - 1);
              viewerRef.current
                ?.querySelector(`[data-pdf-page="${previousPage}"]`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <ChevronLeftIcon />
          </Button>
          <span className="border border-border bg-background px-3 py-1 font-mono text-xs">
            {Math.min(currentPage + 1, Math.max(pageCount, 1))}
          </span>
          <span className="font-mono text-xs text-muted-foreground">/ {Math.max(pageCount, 1)}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={pageCount === 0 || currentPage >= pageCount - 1}
            onClick={() => {
              const nextPage = Math.min(pageCount - 1, currentPage + 1);
              viewerRef.current
                ?.querySelector(`[data-pdf-page="${nextPage}"]`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <ChevronRightIcon />
          </Button>
          <Select
            value={fitMode}
            onChange={(event) => setFitMode(event.target.value as "width" | "page")}
            className="h-8 w-32"
          >
            <option value="width">Fit Width</option>
            <option value="page">Fit Page</option>
          </Select>
        </div>
      </section>

      <aside className="flex min-h-[220px] flex-col border-t border-border bg-card p-3 lg:min-h-0 lg:border-l lg:border-t-0">
        <h3 className="mb-4 font-mono text-[10px] font-semibold uppercase tracking-widest">
          Field Inspector
        </h3>
        <FieldInspector
          selectedField={selectedField}
          roleConfigs={roleConfigs}
          onUpdate={persistField}
          onRoleConfigsChange={persistRoleConfigs}
          onDelete={deleteField}
        />
      </aside>
    </div>
  );
}

function EditorToolbar({
  zoom,
  onZoomChange,
  isSaving,
}: {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  isSaving: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-3 py-2">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onZoomChange(Math.max(58, zoom - 6))}
        >
          <ZoomOutIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onZoomChange(Math.min(104, zoom + 6))}
        >
          <ZoomInIcon />
        </Button>
        <Select
          value={`${zoom}`}
          onChange={(event) => onZoomChange(Number(event.target.value))}
          className="h-7 w-20"
        >
          <option value="58">58%</option>
          <option value="72">72%</option>
          <option value="86">86%</option>
          <option value="100">100%</option>
        </Select>
      </div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {isSaving ? "saving..." : "autosaved"}
      </div>
    </div>
  );
}

export { DocumentSetupDock };
