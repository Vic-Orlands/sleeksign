"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  Plus,
  Type,
  Pencil,
  ArrowLeft,
  Send,
  Trash2,
} from "lucide-react";
import { Worker, Viewer, Plugin } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { Rnd } from "react-rnd";
import { toast } from "sonner";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

interface Field {
  id: string;
  type: "signature" | "text";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function DocumentSetup() {
  const { id } = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<any>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<"signature" | "text">(
    "signature",
  );

  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  const handlePageClick = async (pageIndex: number, x: number, y: number) => {
    const width = selectedType === "signature" ? 200 : 150;
    const height = selectedType === "signature" ? 60 : 30;

    const res = await fetch(`/api/documents/${id}`, {
      method: "POST",
      body: JSON.stringify({
        type: selectedType,
        page: pageIndex,
        x,
        y,
        width,
        height,
      }),
    });
    const { id: fieldId } = await res.json();
    setFields([
      ...fields,
      { id: fieldId, type: selectedType, page: pageIndex, x, y, width, height },
    ]);
  };

  const updateField = async (fieldId: string, updates: Partial<Field>) => {
    setFields(fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)));

    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;

    await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        fieldId,
        x: updates.x ?? field.x,
        y: updates.y ?? field.y,
        width: updates.width ?? field.width,
        height: updates.height ?? field.height,
      }),
    });
  };

  const deleteField = async (fieldId: string) => {
    await fetch(`/api/documents/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ fieldId }),
    });
    setFields(fields.filter((f) => f.id !== fieldId));
  };

  const clickPlugin = (): any => {
    return {
      renderPageLayer: (props: any) => {
        return (
          <div
            className="absolute inset-0 z-10 cursor-crosshair"
            onClick={(e) => {
              if (e.target !== e.currentTarget) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              handlePageClick(props.pageIndex, x, y);
            }}
          >
            {fields
              .filter((f) => f.page === props.pageIndex)
              .map((field) => (
                <Rnd
                  key={field.id}
                  size={{ width: field.width, height: field.height }}
                  position={{ x: field.x, y: field.y }}
                  onDragStop={(e, d) => {
                    updateField(field.id, { x: d.x, y: d.y });
                  }}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    updateField(field.id, {
                      width: parseInt(ref.style.width),
                      height: parseInt(ref.style.height),
                      ...position,
                    });
                  }}
                  bounds="parent"
                  onClick={(e: any) => e.stopPropagation()}
                  className="border-2 border-primary bg-primary/10 flex items-center justify-center group z-20"
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary pointer-events-none select-none">
                    {field.type}
                  </span>
                  <button
                    onClick={(e: any) => {
                      e.stopPropagation();
                      deleteField(field.id);
                    }}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30"
                  >
                    ×
                  </button>
                </Rnd>
              ))}
          </div>
        );
      },
    };
  };

  const clickPluginInstance = clickPlugin();

  useEffect(() => {
    fetch(`/api/documents/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setDoc(data);
        setFields(data.fields || []);
        setIsLoading(false);
      });
  }, [id]);

  const createSession = async () => {
    const res = await fetch("/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        documentId: id,
        signerName: "Staff Member", // V1 default
      }),
    });
    const { sessionId } = await res.json();
    router.push(`/hr/share/${sessionId}`);
  };

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <div className="h-screen flex flex-col bg-muted/20">
      <header className="h-20 bg-background border-b border-border px-8 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/hr")}
            className="font-bold uppercase tracking-widest text-xs"
          >
            <ArrowLeft className="mr-2 w-4 h-4" /> Dashboard
          </Button>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic">
            Setup: {doc.name}
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-muted p-1 flex">
            <Button
              variant={selectedType === "signature" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedType("signature")}
              className="font-bold uppercase tracking-widest text-xs"
            >
              <Pencil className="mr-2 w-3 h-3" /> Signature
            </Button>
            <Button
              variant={selectedType === "text" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedType("text")}
              className="font-bold uppercase tracking-widest text-xs"
            >
              <Type className="mr-2 w-3 h-3" /> Text
            </Button>
          </div>
          <Button
            onClick={createSession}
            className="font-bold uppercase tracking-widest text-xs px-8"
          >
            <Send className="mr-2 w-4 h-4" /> Share Link
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex">
        <aside className="w-80 bg-background border-r border-border p-6 space-y-6">
          <h2 className="font-bold uppercase tracking-widest text-xs text-muted-foreground">
            Instructions
          </h2>
          <p className="text-sm font-medium">
            Click to place, drag to move, and use handles to resize.
          </p>
          <div className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-bold uppercase tracking-widest text-xs text-muted-foreground">
              Placed Fields ({fields.length})
            </h2>
            <div className="space-y-2 overflow-auto max-h-[400px]">
              {fields.map((f, i) => (
                <div
                  key={f.id}
                  className="p-3 bg-muted/30 border border-border flex items-center justify-between"
                >
                  <span className="text-xs font-bold uppercase tracking-tight">
                    #{i + 1} {f.type} (P{f.page + 1})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive"
                    onClick={() => deleteField(f.id)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex-1 bg-muted/50 p-8 overflow-auto flex justify-center">
          <Card className="w-[850px] shadow-2xl border-none relative">
            <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
              <Viewer
                fileUrl={doc.fileUrl}
                plugins={[defaultLayoutPluginInstance, clickPluginInstance]}
              />
            </Worker>
          </Card>
        </section>
      </main>
    </div>
  );
}
