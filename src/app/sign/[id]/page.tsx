"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, Download } from "lucide-react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { SignatureMaker } from "@/components/signature/SignatureMaker";
import { toast } from "sonner";

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

  const handleFieldClick = (fieldId: string) => {
    if (session.status === "completed") return;
    setSelectedField(fieldId);
    setIsMakerOpen(true);
  };

  const handleSignatureConfirm = async (value: string) => {
    if (!selectedField) return;

    setSignatures({ ...signatures, [selectedField]: value });

    await fetch("/api/sessions", {
      method: "PATCH",
      body: JSON.stringify({
        sessionId: id,
        fieldId: selectedField,
        value,
      }),
    });

    toast.success("Field updated");
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

  const allSigned = session.document.fields.every((f: any) => signatures[f.id]);

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
                    handleFieldClick(field.id);
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
                    signatures[field.id]
                      ? "border-green-500 bg-green-500/10"
                      : "border-primary border-dashed bg-primary/5 hover:bg-primary/10 animate-pulse"
                  }`}
                >
                  {signatures[field.id] ? (
                    signatures[field.id].startsWith("data:image") ? (
                      <img
                        src={signatures[field.id]}
                        alt="Signature"
                        className="max-h-full pointer-events-none"
                      />
                    ) : (
                      <span className="font-bold italic text-primary pointer-events-none">
                        {signatures[field.id]}
                      </span>
                    )
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary pointer-events-none">
                      Click to {field.type}
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
        <h1 className="text-2xl font-black tracking-tighter uppercase italic">
          Sign: {session.document.name}
        </h1>
        <Button
          disabled={!allSigned || isFinalizing}
          onClick={finalize}
          className="font-bold uppercase tracking-widest text-xs px-8 h-12"
        >
          {isFinalizing ? <Loader2 className="animate-spin mr-2" /> : null}
          {allSigned
            ? "Complete & Submit"
            : `${Object.keys(signatures).length}/${session.document.fields.length} Fields Completed`}
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
