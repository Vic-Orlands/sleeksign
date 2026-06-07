"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  Download,
  Loader2,
  PenLine,
  Type,
} from "lucide-react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { PdfCanvasViewer } from "@/components/pdf/PdfCanvasViewer";
import { SignatureMaker } from "@/components/signature/SignatureMaker";
import { SignatureValue } from "@/components/signature/SignatureValue";
import { Field, valueIsComplete } from "@/lib/field-utils";

type SignatureRecord = {
  fieldId: string;
  value: string;
};

type SessionRecord = {
  id: string;
  status: "pending" | "completed";
  signerName?: string | null;
  signerEmail?: string | null;
  signerRole?: string | null;
  document: {
    name: string;
    fileUrl: string;
    signerRoles?: string[];
    fields: Field[];
  };
  signatures?: SignatureRecord[];
};

const fieldIcons = {
  signature: PenLine,
  text: Type,
  date: Calendar,
  checkbox: CheckSquare,
};

const emptyFieldTones = {
  signature:
    "border-blue-500/70 bg-blue-50/95 text-zinc-950 shadow-[0_0_0_4px_rgba(59,130,246,0.08)] hover:bg-blue-100/90 dark:bg-blue-200/90 dark:text-zinc-950 dark:hover:bg-blue-300/90",
  text: "border-emerald-500/70 bg-emerald-50/95 text-zinc-950 shadow-[0_0_0_4px_rgba(16,185,129,0.08)] hover:bg-emerald-100/90 dark:bg-emerald-200/90 dark:text-zinc-950 dark:hover:bg-emerald-300/90",
  date: "border-amber-500/70 bg-amber-50/95 text-zinc-950 shadow-[0_0_0_4px_rgba(245,158,11,0.1)] hover:bg-amber-100/90 dark:bg-amber-200/90 dark:text-zinc-950 dark:hover:bg-amber-300/90",
  checkbox:
    "border-violet-500/70 bg-violet-50/95 text-zinc-950 shadow-[0_0_0_4px_rgba(139,92,246,0.08)] hover:bg-violet-100/90 dark:bg-violet-200/90 dark:text-zinc-950 dark:hover:bg-violet-300/90",
};

const completedFieldTones = {
  signature:
    "border-blue-600 bg-blue-50/95 text-zinc-950 dark:border-blue-400 dark:bg-blue-200/90 dark:text-zinc-950",
  text: "border-emerald-600 bg-emerald-50/95 text-zinc-950 dark:border-emerald-400 dark:bg-emerald-200/90 dark:text-zinc-950",
  date: "border-amber-600 bg-amber-50/95 text-zinc-950 dark:border-amber-400 dark:bg-amber-200/90 dark:text-zinc-950",
  checkbox:
    "border-violet-600 bg-violet-50/95 text-zinc-950 dark:border-violet-400 dark:bg-violet-200/90 dark:text-zinc-950",
};

export default function SignerPortal() {
  const { id } = useParams<{ id: string }>();
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [isMakerOpen, setIsMakerOpen] = useState(false);
  const [finalPdfUrl, setFinalPdfUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sessions?sessionId=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setSession(data);
        setSignatures(
          Object.fromEntries(
            data.signatures?.map((item: SignatureRecord) => [
              item.fieldId,
              item.value,
            ]) || [],
          ),
        );
      })
      .catch((error) =>
        setLoadError(error.message || "Failed to load document"),
      )
      .finally(() => setIsLoading(false));
  }, [id]);

  const fields: Field[] = useMemo(
    () =>
      (session?.document?.fields || []).filter((field) =>
        session?.signerRole ? field.assigneeRole === session.signerRole : true,
      ),
    [session],
  );
  const requiredFields = useMemo(
    () => fields.filter((field) => field.required),
    [fields],
  );
  const requiredCount = requiredFields.length;
  const completedCount = requiredFields.filter((field) => {
    return valueIsComplete(signatures[field.id]);
  }).length;
  const allFieldsSigned = requiredFields.every((field) =>
    valueIsComplete(signatures[field.id]),
  );

  const nextField = useMemo(
    () =>
      requiredFields.find((field) => !valueIsComplete(signatures[field.id])),
    [requiredFields, signatures],
  );

  async function handleFieldClick(field: Field) {
    if (session?.status === "completed") return;

    if (field.type === "date") {
      await updateSignature(field.id, format(new Date(), "yyyy-MM-dd"));
      return;
    }

    if (field.type === "checkbox") {
      await updateSignature(
        field.id,
        signatures[field.id] === "true" ? "false" : "true",
      );
      return;
    }

    setSelectedField(field);
    setIsMakerOpen(true);
  }

  async function updateSignature(fieldId: string, value: string) {
    setSignatures((current) => ({ ...current, [fieldId]: value }));
    await fetch("/api/sessions", {
      method: "PATCH",
      body: JSON.stringify({ sessionId: id, fieldId, value }),
    });
    toast.success("Field saved");
  }

  async function finalize() {
    setIsFinalizing(true);
    try {
      const res = await fetch("/api/finalize", {
        method: "POST",
        body: JSON.stringify({ sessionId: id }),
      });
      if (!res.ok) throw new Error("Finalize failed");
      const data = await res.json();
      setFinalPdfUrl(data.url);
      setSession((current) =>
        current ? { ...current, status: "completed" } : current,
      );
      toast.success("Document finalized");
    } catch {
      toast.error("Failed to finalize document");
    } finally {
      setIsFinalizing(false);
    }
  }

  function scrollToNextField() {
    if (!nextField) return;
    document
      .querySelector(`[data-field-id="${nextField.id}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (loadError || !session) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <AlertCircle className="size-12 text-destructive" />
        <h1 className="text-xl font-semibold">Unable to open this document</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {loadError || "Session not found"}
        </p>
      </div>
    );
  }

  if (session.status === "completed" && finalPdfUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] p-6">
        <div className="w-full max-w-md border border-border bg-background p-8 text-center shadow-xl">
          <CheckCircle2 className="mx-auto size-14 text-emerald-400" />
          <h1 className="mt-5 font-mono text-xs font-semibold uppercase tracking-widest">
            Document completed
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your signed PDF and completion certificate are ready.
          </p>
          <Button
            className="mt-6 w-full gap-2"
            onClick={() => window.open(finalPdfUrl, "_blank")}
          >
            <Download className="size-4" />
            Download signed PDF
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[(--paper)]">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-cursive">SleekSign</h1>
            <Badge
              variant="outline"
              className="rounded-none font-mono text-[9px] uppercase tracking-widest"
            >
              Signing
            </Badge>
            {session.signerRole ? (
              <Badge
                variant="outline"
                className="rounded-none font-mono text-[9px] uppercase tracking-widest"
              >
                {session.signerRole}
              </Badge>
            ) : null}
          </div>
          <p className="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {session.document?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {!allFieldsSigned ? (
            <Button
              variant="outline"
              onClick={scrollToNextField}
              className="hidden gap-2 md:flex"
            >
              Next field
              <ChevronDown className="size-4" />
            </Button>
          ) : null}
          <Button
            disabled={!allFieldsSigned || isFinalizing}
            loading={isFinalizing}
            loadingText="Completing..."
            onClick={finalize}
            className="gap-2"
          >
            <Check className="size-4" />
            {allFieldsSigned
              ? "Complete"
              : `${completedCount}/${requiredCount} complete`}
          </Button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_280px]">
        <section className="sleek-grid min-h-0 overflow-auto bg-zinc-100 px-6 py-8 dark:bg-[#121214] md:px-10">
          <PdfCanvasViewer
            fileUrl={session.document.fileUrl}
            className="mx-auto w-full max-w-[840px]"
            pageClassName="relative border-t-8 border-zinc-300 bg-white shadow-xl ring-1 ring-black/10 dark:border-[#3f3f46] dark:shadow-2xl"
            renderOverlay={(pageIndex, metrics) =>
              fields
                .filter((field) => field.page === pageIndex)
                .map((field) => {
                  const value = signatures[field.id];
                  const isComplete = valueIsComplete(value);
                  const Icon = fieldIcons[field.type];

                  return (
                    <button
                      key={field.id}
                      data-field-id={field.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleFieldClick(field);
                      }}
                      style={{
                        left: `${(field.x / 100) * metrics.width}px`,
                        top: `${(field.y / 100) * metrics.height}px`,
                        width: `${(field.width / 100) * metrics.width}px`,
                        height: `${(field.height / 100) * metrics.height}px`,
                      }}
                      className={`absolute flex items-center justify-center border text-center transition ${
                        isComplete
                          ? completedFieldTones[field.type]
                          : emptyFieldTones[field.type]
                      }`}
                    >
                      {isComplete ? (
                        field.type === "checkbox" ? (
                          <Check className="size-4" />
                        ) : field.type === "signature" ? (
                          <SignatureValue
                            value={value}
                            className="h-full w-full px-2 py-1"
                          />
                        ) : (
                          <span className="truncate px-2 text-xs font-semibold">
                            {value}
                          </span>
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
          <h2 className="font-mono text-[10px] font-semibold uppercase tracking-widest">
            Required fields
          </h2>
          <div className="mt-4 space-y-2">
            {fields.map((field, index) => {
              const complete =
                !field.required || valueIsComplete(signatures[field.id]);
              const Icon = fieldIcons[field.type];
              return (
                <button
                  key={field.id}
                  onClick={() =>
                    document
                      .querySelector(`[data-field-id="${field.id}"]`)
                      ?.scrollIntoView({ behavior: "smooth", block: "center" })
                  }
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
                    <Check className="size-4 text-emerald-600" />
                  ) : (
                    <span className="size-2 bg-amber-500" />
                  )}
                </button>
              );
            })}
          </div>
        </aside>
      </main>

      <SignatureMaker
        isOpen={isMakerOpen}
        onClose={() => setIsMakerOpen(false)}
        onConfirm={async (value) => {
          if (!selectedField) return;
          await updateSignature(selectedField.id, value);
          setIsMakerOpen(false);
        }}
        type={selectedField?.type === "text" ? "text" : "signature"}
        defaultValue={
          signatures[selectedField?.id || ""] ||
          (selectedField?.type === "signature" ? session.signerName || "" : "")
        }
        textSuggestions={[
          ...(session.signerName
            ? [{ label: "Full name", value: session.signerName }]
            : []),
          ...(session.signerEmail
            ? [{ label: "Email address", value: session.signerEmail }]
            : []),
        ]}
      />
    </div>
  );
}
