"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Loader2,
  CheckCircle2,
  Download,
  Calendar,
  CheckSquare,
} from "lucide-react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { SignatureMaker } from "@/components/signature/SignatureMaker";
import { toast } from "sonner";
import { format } from "date-fns";

import "@react-pdf-viewer/core/lib/styles/index.css";

export default function SignerPortal() {
  const { id } = useParams();
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<Record<string, string>>({});
  const [isMakerOpen, setIsMakerOpen] = useState(false);
  const [finalPdfUrl, setFinalPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sessions?sessionId=${id}`)
      .then((res) => res.json())
      .then((data) => {
        setSession(data);
        const initialSigs: any = {};
        data.signatures?.forEach(
          (s: any) => (initialSigs[s.fieldId] = s.value),
        );
        setSignatures(initialSigs);
        setIsLoading(false);
      });
  }, [id]);

  const handleFieldClick = async (field: any) => {
    if (session.status === "completed") return;

    if (field.type === "date") {
      const today = format(new Date(), "yyyy-MM-dd");
      await updateSignature(field.id, today);
      return;
    }

    if (field.type === "checkbox") {
      const newValue = signatures[field.id] === "true" ? "false" : "true";
      await updateSignature(field.id, newValue);
      return;
    }

    setSelectedField(field.id);
    setIsMakerOpen(true);
  };

  const updateSignature = async (fieldId: string, value: string) => {
    setSignatures((prev) => ({ ...prev, [fieldId]: value }));
    await fetch("/api/sessions", {
      method: "PATCH",
      body: JSON.stringify({
        sessionId: id,
        fieldId,
        value,
      }),
    });
    toast.success("Field updated");
  };

  const handleSignatureConfirm = async (value: string) => {
    if (!selectedField) return;
    await updateSignature(selectedField, value);
    setIsMakerOpen(false);
  };

  const finalize = async () => {
    setIsFinalizing(true);
    try {
      const res = await fetch("/api/finalize", {
        method: "POST",
        body: JSON.stringify({ sessionId: id }),
      });
      const data = await res.json();
      setFinalPdfUrl(data.url);
      setSession({ ...session, status: "completed" });
      toast.success("Document finalized successfully!");
    } catch (err) {
      toast.error("Failed to finalize document");
    } finally {
      setIsFinalizing(false);
    }
  };

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  if (session.status === "completed" && finalPdfUrl) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card className="max-w-xl w-full border-4 border-green-600 shadow-[16px_16px_0px_0px_rgba(22,163,74,0.2)]">
          <CardContent className="p-12 text-center space-y-8">
            <CheckCircle2 className="w-20 h-20 text-green-600 mx-auto" />
            <div className="space-y-2">
              <h1 className="text-4xl font-black tracking-tighter uppercase italic">
                Success!
              </h1>
              <p className="text-muted-foreground font-mono uppercase tracking-widest text-xs">
                Your document has been signed and finalized
              </p>
            </div>
            <Button
              className="w-full font-bold h-14 text-lg uppercase tracking-widest bg-green-600 hover:bg-green-700"
              onClick={() => window.open(finalPdfUrl, "_blank")}
            >
              Download Signed PDF <Download className="ml-2 w-5 h-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allSigned = session.document.fields.every(
    (f: any) => signatures[f.id] || f.type === "checkbox",
  ); // Checkbox can be false

  const clickPlugin = (): any => {
    return {
      renderPageLayer: (props: any) => {
        return (
          <div className="absolute inset-0 pointer-events-none">
            {session.document.fields
              .filter((f: any) => f.page === props.pageIndex)
              .map((field: any) => (
                <div
                  key={field.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFieldClick(field);
                  }}
                  style={{
                    position: "absolute",
                    left: field.x,
                    top: field.y,
                    width: field.width,
                    height: field.height,
                    pointerEvents: "auto",
                  }}
                  className={`border-2 cursor-pointer flex items-center justify-center transition-all ${
                    signatures[field.id] && signatures[field.id] !== "false"
                      ? "border-green-500 bg-green-500/10"
                      : "border-primary border-dashed bg-primary/5 hover:bg-primary/10 animate-pulse"
                  }`}
                >
                  {signatures[field.id] && signatures[field.id] !== "false" ? (
                    field.type === "signature" &&
                    signatures[field.id].startsWith("data:image") ? (
                      <img
                        src={signatures[field.id]}
                        alt="Signature"
                        className="max-h-full pointer-events-none"
                      />
                    ) : (
                      <span className="font-bold italic text-primary pointer-events-none">
                        {field.type === "checkbox" ? "✓" : signatures[field.id]}
                      </span>
                    )
                  ) : (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-primary pointer-events-none flex flex-col items-center">
                      {field.type === "signature" && (
                        <Pencil className="w-3 h-3 mb-1" />
                      )}
                      {field.type === "text" && (
                        <Type className="w-3 h-3 mb-1" />
                      )}
                      {field.type === "date" && (
                        <Calendar className="w-3 h-3 mb-1" />
                      )}
                      {field.type === "checkbox" && (
                        <CheckSquare className="w-3 h-3 mb-1" />
                      )}
                      {field.type}
                    </span>
                  )}
                </div>
              ))}
          </div>
        );
      },
    };
  };

  const clickPluginInstance = clickPlugin();

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col">
      <header className="h-20 bg-background border-b border-border px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="space-y-1">
          <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none">
            Sign: {session.document.name}
          </h1>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
            ID: {session.id}
          </p>
        </div>
        <Button
          disabled={!allSigned || isFinalizing}
          onClick={finalize}
          className="font-bold uppercase tracking-widest text-xs px-8 h-12"
        >
          {isFinalizing ? <Loader2 className="animate-spin mr-2" /> : null}
          {allSigned
            ? "Finalize Signature"
            : `${Object.keys(signatures).filter((k) => signatures[k] !== "false").length}/${session.document.fields.length} Fields Completed`}
        </Button>
      </header>

      <main className="flex-1 p-8 flex justify-center overflow-auto">
        <div className="relative">
          <Card className="w-[850px] shadow-2xl border-none">
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
              <Viewer
                fileUrl={session.document.fileUrl}
                plugins={[clickPluginInstance]}
              />
            </Worker>
          </Card>
        </div>
      </main>

      <SignatureMaker
        isOpen={isMakerOpen}
        onClose={() => setIsMakerOpen(false)}
        onConfirm={handleSignatureConfirm}
      />
    </div>
  );
}

const Type = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 7V4h16v3" />
    <path d="M9 20h6" />
    <path d="M12 4v16" />
  </svg>
);

const Pencil = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);
