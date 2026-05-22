"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  PenLine,
  Type,
  XIcon,
} from "lucide-react";

import { PdfCanvasViewer } from "@/components/pdf/PdfCanvasViewer";
import { SignatureValue } from "@/components/signature/SignatureValue";
import type { DocumentRecord } from "@/components/hr/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Field } from "@/lib/field-utils";
import { valueIsComplete } from "@/lib/field-utils";

const fieldIcons = {
  signature: PenLine,
  text: Type,
  date: Calendar,
  checkbox: CheckSquare,
};

const emptyFieldTones = {
  signature: "border-blue-500/70 bg-blue-50/95 text-zinc-950 shadow-[0_0_0_4px_rgba(59,130,246,0.08)] hover:bg-blue-100/90 dark:bg-blue-200/90 dark:text-zinc-950 dark:hover:bg-blue-300/90",
  text: "border-emerald-500/70 bg-emerald-50/95 text-zinc-950 shadow-[0_0_0_4px_rgba(16,185,129,0.08)] hover:bg-emerald-100/90 dark:bg-emerald-200/90 dark:text-zinc-950 dark:hover:bg-emerald-300/90",
  date: "border-amber-500/70 bg-amber-50/95 text-zinc-950 shadow-[0_0_0_4px_rgba(245,158,11,0.1)] hover:bg-amber-100/90 dark:bg-amber-200/90 dark:text-zinc-950 dark:hover:bg-amber-300/90",
  checkbox: "border-violet-500/70 bg-violet-50/95 text-zinc-950 shadow-[0_0_0_4px_rgba(139,92,246,0.08)] hover:bg-violet-100/90 dark:bg-violet-200/90 dark:text-zinc-950 dark:hover:bg-violet-300/90",
};

const completedFieldTones = {
  signature: "border-blue-600 bg-blue-50/95 text-zinc-950 dark:border-blue-400 dark:bg-blue-200/90 dark:text-zinc-950",
  text: "border-emerald-600 bg-emerald-50/95 text-zinc-950 dark:border-emerald-400 dark:bg-emerald-200/90 dark:text-zinc-950",
  date: "border-amber-600 bg-amber-50/95 text-zinc-950 dark:border-amber-400 dark:bg-amber-200/90 dark:text-zinc-950",
  checkbox: "border-violet-600 bg-violet-50/95 text-zinc-950 dark:border-violet-400 dark:bg-violet-200/90 dark:text-zinc-950",
};

type PreviewValueMap = Record<string, string>;

function DocumentReviewPanel({
  document,
  onClose,
}: {
  document: DocumentRecord;
  onClose: () => void;
}) {
  const fields = useMemo(() => document.fields || [], [document.fields]);
  const [values, setValues] = useState<PreviewValueMap>({});
  const requiredFields = fields.filter((field) => field.required);
  const completedCount = requiredFields.filter((field) => valueIsComplete(values[field.id])).length;
  const allFieldsComplete = requiredFields.every((field) => valueIsComplete(values[field.id]));
  const nextField = requiredFields.find((field) => !valueIsComplete(values[field.id]));

  function fillPreviewValue(field: Field) {
    setValues((current) => {
      if (field.type === "checkbox") {
        return { ...current, [field.id]: current[field.id] === "true" ? "false" : "true" };
      }

      if (field.type === "date") {
        return { ...current, [field.id]: format(new Date(), "yyyy-MM-dd") };
      }

      if (field.type === "signature") {
        return { ...current, [field.id]: "Alex Morgan" };
      }

      return { ...current, [field.id]: "Preview response" };
    });
  }

  function scrollToField(field?: Field) {
    if (!field) return;
    window.setTimeout(() => {
      documentRoot()
        ?.querySelector(`[data-review-field-id="${field.id}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  return (
    <div className="grid h-full grid-rows-[auto_minmax(0,1fr)] bg-[var(--paper)]">
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-border bg-background px-5 py-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center bg-primary font-mono text-[10px] font-bold text-primary-foreground">S</span>
            <h2 className="font-mono text-xs font-semibold uppercase tracking-widest">Signer Review</h2>
            <Badge variant="outline" className="rounded-none font-mono text-[9px] uppercase tracking-widest">
              Preview
            </Badge>
          </div>
          <p className="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{document.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {!allFieldsComplete ? (
            <Button variant="outline" onClick={() => scrollToField(nextField)} className="hidden gap-2 md:flex">
              Next field
              <ChevronDown className="size-4" />
            </Button>
          ) : null}
          <Button disabled={!allFieldsComplete} className="gap-2">
            <Check className="size-4" />
            {allFieldsComplete ? "Ready" : `${completedCount}/${requiredFields.length} complete`}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <XIcon />
          </Button>
        </div>
      </header>

      <main className="grid min-h-0 md:grid-cols-[minmax(0,1fr)_280px]">
        <section className="sleek-grid min-h-0 overflow-auto bg-zinc-100 px-6 py-8 dark:bg-[#121214] md:px-10">
          <PdfCanvasViewer
            fileUrl={document.fileUrl}
            className="mx-auto w-full max-w-[840px]"
            pageClassName="relative border-t-8 border-zinc-300 bg-white shadow-xl ring-1 ring-black/10 dark:border-[#3f3f46] dark:shadow-2xl"
            renderOverlay={(pageIndex, metrics) =>
              fields
                .filter((field) => field.page === pageIndex)
                .map((field) => {
                  const value = values[field.id];
                  const isComplete = valueIsComplete(value);
                  const Icon = fieldIcons[field.type];

                  return (
                    <button
                      key={field.id}
                      data-review-field-id={field.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        fillPreviewValue(field);
                      }}
                      style={{
                        left: `${(field.x / 100) * metrics.width}px`,
                        top: `${(field.y / 100) * metrics.height}px`,
                        width: `${(field.width / 100) * metrics.width}px`,
                        height: `${(field.height / 100) * metrics.height}px`,
                      }}
                      className={`absolute flex items-center justify-center border text-center transition ${
                        isComplete ? completedFieldTones[field.type] : emptyFieldTones[field.type]
                      }`}
                    >
                      {isComplete ? (
                        field.type === "checkbox" ? (
                          <Check className="size-4" />
                        ) : field.type === "signature" ? (
                          <SignatureValue value={value} className="h-full w-full px-2 py-1" />
                        ) : (
                          <span className="truncate px-2 text-xs font-semibold">{value}</span>
                        )
                      ) : (
                        <span className="flex items-center gap-1 px-1 font-mono text-[10px] font-semibold uppercase tracking-wider">
                          <Icon className="size-3" />
                          {field.type}
                        </span>
                      )}
                    </button>
                  );
                })
            }
          />
        </section>

        <aside className="hidden min-h-0 border-l border-border bg-card p-5 md:block">
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-widest">Required fields</h3>
          <div className="mt-4 space-y-2">
            {fields.map((field, index) => {
              const complete = !field.required || valueIsComplete(values[field.id]);
              const Icon = fieldIcons[field.type];

              return (
                <button
                  key={field.id}
                  onClick={() => scrollToField(field)}
                  className="flex w-full items-center justify-between border border-border bg-background px-3 py-2 text-left font-mono text-[10px] uppercase tracking-widest hover:bg-muted/50"
                >
                  <span className="flex items-center gap-2 capitalize">
                    <Icon className="size-4 text-muted-foreground" />
                    {index + 1}. {field.type}
                    {!field.required ? (
                      <span className="border border-border px-1 py-0.5 text-[9px] uppercase tracking-widest text-muted-foreground">
                        Optional
                      </span>
                    ) : null}
                  </span>
                  {complete ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : (
                    <span className="size-2 bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>
        </aside>
      </main>
    </div>
  );
}

function documentRoot() {
  return typeof document === "undefined" ? null : document;
}

export { DocumentReviewPanel };
