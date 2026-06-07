"use client";

import type { CSSProperties } from "react";
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
import { useParams, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PdfCanvasViewer } from "@/components/pdf/PdfCanvasViewer";
import { SignatureMaker } from "@/components/signature/SignatureMaker";
import { SignatureValue } from "@/components/signature/SignatureValue";
import { ThemeToggle } from "@/components/theme-toggle";
import { valueIsComplete, type Field } from "@/lib/field-utils";

type PacketContext = {
  packetId: string;
  mode: string;
  status: string;
  requireOtp?: boolean;
  roleName: string;
  copyId?: string | null;
  signerName?: string | null;
  signerEmail?: string | null;
  branding?: {
    logoUrl?: string | null;
    primaryColor?: string;
    secondaryColor?: string;
    neutralColor?: string;
    accentColor?: string;
    senderName?: string;
  };
  document: {
    id: string;
    name: string;
    fileUrl: string;
    roleConfigs?: Array<{ name: string; scope: "shared" | "private" }>;
    signerRoles?: string[];
    fields: Field[];
  };
  fields: Field[];
  values: Record<string, string>;
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

export default function PacketSignerPortal() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const roleName = searchParams.get("role") || "";
  const copyId = searchParams.get("copyId") || "";
  const savedSigner = getSavedSigner();
  const savedSignerEmail = savedSigner.signerEmail;
  const [context, setContext] = useState<PacketContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [isMakerOpen, setIsMakerOpen] = useState(false);
  const [finalPdfUrl, setFinalPdfUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [completionMessage, setCompletionMessage] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpEmail, setOtpEmail] = useState(savedSigner.signerEmail || "");
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    fetch(
      `/api/public-packets/${id}/context?role=${encodeURIComponent(roleName)}${
        copyId ? `&copyId=${encodeURIComponent(copyId)}` : ""
      }`,
    )
      .then(async (res) => ({ status: res.status, body: await res.json() }))
      .then((data) => {
        if (data.status === 403 && data.body?.verificationRequired) {
          setOtpRequired(true);
          setOtpEmail(data.body.recipientEmail || savedSignerEmail || "");
          return;
        }

        if (data.body.error) throw new Error(data.body.error);
        setContext(data.body);
        setValues(data.body.values || {});
        setOtpRequired(false);
      })
      .catch((error) =>
        setLoadError(error.message || "Failed to load document"),
      )
      .finally(() => setIsLoading(false));
  }, [copyId, id, roleName, savedSignerEmail]);

  async function sendOtpCode() {
    if (!otpEmail.trim()) {
      toast.error("Enter the recipient email first");
      return;
    }

    setOtpBusy(true);
    try {
      const res = await fetch(`/api/public-packets/${id}/otp`, {
        method: "POST",
        body: JSON.stringify({
          action: "send",
          roleName,
          copyId: copyId || null,
          recipientEmail: otpEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to send code");
      setOtpSent(true);
      toast.success("Verification code sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send code");
    } finally {
      setOtpBusy(false);
    }
  }

  async function verifyOtpCode() {
    if (!otpCode.trim()) {
      toast.error("Enter the verification code");
      return;
    }

    setOtpBusy(true);
    try {
      const res = await fetch(`/api/public-packets/${id}/otp`, {
        method: "POST",
        body: JSON.stringify({
          action: "verify",
          roleName,
          copyId: copyId || null,
          code: otpCode.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      setOtpRequired(false);
      setOtpEmail(data.email || otpEmail);
      setLoadError(null);
      const next = await fetch(
        `/api/public-packets/${id}/context?role=${encodeURIComponent(roleName)}${
          copyId ? `&copyId=${encodeURIComponent(copyId)}` : ""
        }`,
      );
      const nextData = await next.json();
      if (!next.ok) throw new Error(nextData.error || "Unable to open document");
      setContext(nextData);
      setValues(nextData.values || {});
      toast.success("Identity verified");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to verify code");
    } finally {
      setOtpBusy(false);
    }
  }

  const fields = useMemo(() => context?.fields || [], [context?.fields]);
  const requiredFields = useMemo(
    () => fields.filter((field) => field.required),
    [fields],
  );
  const requiredCount = requiredFields.length;
  const completedCount = requiredFields.filter((field) =>
    valueIsComplete(values[field.id]),
  ).length;
  const allFieldsSigned = requiredFields.every((field) =>
    valueIsComplete(values[field.id]),
  );
  const nextField = useMemo(
    () => requiredFields.find((field) => !valueIsComplete(values[field.id])),
    [requiredFields, values],
  );

  async function handleFieldClick(field: Field) {
    if (field.type === "date") {
      await updateValue(field.id, format(new Date(), "yyyy-MM-dd"));
      return;
    }

    if (field.type === "checkbox") {
      await updateValue(field.id, values[field.id] === "true" ? "false" : "true");
      return;
    }

    setSelectedField(field);
    setIsMakerOpen(true);
  }

  async function updateValue(fieldId: string, value: string) {
    setValues((current) => ({ ...current, [fieldId]: value }));
    await fetch(`/api/public-packets/${id}/context`, {
      method: "PATCH",
      body: JSON.stringify({
        fieldId,
        roleName,
        copyId: copyId || null,
        value,
        signerName: context?.signerName || savedSigner.signerName || null,
        signerEmail: context?.signerEmail || savedSigner.signerEmail || null,
      }),
    });
    toast.success("Field saved");
  }

  async function completeSigning() {
    setIsFinalizing(true);
    setCompletionMessage("");
    try {
      const res = await fetch(`/api/public-packets/${id}/context`, {
        method: "POST",
        body: JSON.stringify({
          roleName,
          copyId: copyId || null,
          signerName: context?.signerName || savedSigner.signerName || null,
          signerEmail: context?.signerEmail || savedSigner.signerEmail || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Completion failed");
      }

      if (data.url) {
        setFinalPdfUrl(data.url);
      }

      if (data.message) {
        setCompletionMessage(data.message);
      }

      toast.success(
        data.status === "completed"
          ? "Signing completed"
          : "Your part has been saved",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Completion failed");
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

  if (loadError || !context) {
    if (otpRequired) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] p-6">
          <div className="w-full max-w-md border border-border bg-background p-8 shadow-xl">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-orange-500">
              Signer verification
            </p>
            <h1 className="mt-3 text-2xl font-semibold">Verify before viewing</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter or confirm the recipient email, then use the 6-digit code we send before accessing this document.
            </p>
            <div className="mt-6 space-y-3">
              <input
                value={otpEmail}
                onChange={(event) => setOtpEmail(event.target.value)}
                placeholder="Recipient email"
                className="w-full border border-border bg-background px-3 py-2 text-sm outline-none"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={otpBusy}
                  onClick={sendOtpCode}
                >
                  {otpBusy ? "Sending..." : otpSent ? "Resend code" : "Send code"}
                </Button>
              </div>
              <input
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                placeholder="6-digit code"
                className="w-full border border-border bg-background px-3 py-2 text-sm outline-none"
              />
              <Button type="button" className="w-full" disabled={otpBusy} onClick={verifyOtpCode}>
                {otpBusy ? "Verifying..." : "Verify and continue"}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <AlertCircle className="size-12 text-destructive" />
        <h1 className="text-xl font-semibold">Unable to open this document</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {loadError || "Packet not found"}
        </p>
      </div>
    );
  }

  if (finalPdfUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--paper)] p-6">
        <div className="w-full max-w-md border border-border bg-background p-8 text-center shadow-xl">
          <CheckCircle2 className="mx-auto size-14 text-emerald-400" />
          <h1 className="mt-5 font-mono text-xs font-semibold uppercase tracking-widest">
            Signing completed
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your finalized PDF is ready for download.
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
    <div
      className="flex h-screen flex-col bg-[var(--paper)]"
      style={
        context.branding
          ? ({
              ["--paper" as string]: context.branding.neutralColor || "#f7f5f1",
            } as CSSProperties)
          : undefined
      }
    >
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-cursive">
              {context.branding?.senderName || "SleekSign"}
            </h1>
            <Badge
              variant="outline"
              className="rounded-none font-mono text-[9px] uppercase tracking-widest"
            >
              {context.mode}
            </Badge>
            <Badge
              variant="outline"
              className="rounded-none font-mono text-[9px] uppercase tracking-widest"
            >
              {roleName}
            </Badge>
          </div>
          <p className="truncate font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {context.document.name}
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
            loadingText={
              context.mode === "collaborative"
                ? "Completing my part..."
                : "Completing..."
            }
            onClick={completeSigning}
            className="gap-2"
          >
            <Check className="size-4" />
            {allFieldsSigned
              ? context.mode === "collaborative"
                ? "Complete my part"
                : "Complete"
              : `${completedCount}/${requiredCount} complete`}
          </Button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_280px]">
        <section className="sleek-grid min-h-0 overflow-auto bg-zinc-100 px-6 py-8 dark:bg-[#121214] md:px-10">
          <PdfCanvasViewer
            fileUrl={context.document.fileUrl}
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
          <h3 className="font-mono text-[10px] font-semibold uppercase tracking-widest">
            Your fields
          </h3>
          <div className="mt-4 space-y-2">
            {fields.map((field, index) => {
              const complete = valueIsComplete(values[field.id]);
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
          {completionMessage ? (
            <div className="mt-4 border border-border bg-background p-3 text-sm text-muted-foreground">
              {completionMessage}
            </div>
          ) : null}
        </aside>
      </main>

      {selectedField ? (
        <SignatureMaker
          isOpen={isMakerOpen}
          onClose={() => setIsMakerOpen(false)}
          onConfirm={async (value) => {
            await updateValue(selectedField.id, value);
            setIsMakerOpen(false);
          }}
          defaultValue={
            values[selectedField.id] ||
            (selectedField.type === "signature"
              ? context.signerName || savedSigner.signerName || ""
              : "")
          }
          type={selectedField.type === "text" ? "text" : "signature"}
          textSuggestions={[
            ...(context.signerName || savedSigner.signerName
              ? [
                  {
                    label: "Full name",
                    value: context.signerName || savedSigner.signerName || "",
                  },
                ]
              : []),
            ...(context.signerEmail || savedSigner.signerEmail
              ? [
                  {
                    label: "Email address",
                    value: context.signerEmail || savedSigner.signerEmail || "",
                  },
                ]
              : []),
          ]}
        />
      ) : null}
    </div>
  );
}

function getSavedSigner() {
  if (typeof window === "undefined") {
    return { signerName: "", signerEmail: "" };
  }

  try {
    const raw = localStorage.getItem("sleeksign:last-signer");
    if (!raw) return { signerName: "", signerEmail: "" };

    const parsed = JSON.parse(raw) as {
      signerName?: string;
      signerEmail?: string;
    };

    return {
      signerName: parsed.signerName || "",
      signerEmail: parsed.signerEmail || "",
    };
  } catch {
    return { signerName: "", signerEmail: "" };
  }
}
