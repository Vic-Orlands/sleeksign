"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Loader2,
  Type,
  Pencil,
  ArrowLeft,
  Calendar,
  CheckSquare,
  Save,
  Link,
} from "lucide-react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { Rnd } from "react-rnd";
import { toast } from "sonner";

import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

interface Field {
  id: string;
  type: "signature" | "text" | "date" | "checkbox";
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
  const [selectedType, setSelectedType] = useState<Field["type"]>("signature");

  const defaultLayoutPluginInstance = defaultLayoutPlugin();

  const handlePageClick = async (
    pageIndex: number,
    xPercent: number,
    yPercent: number,
  ) => {
    let width = 20;
    let height = 5;

    if (selectedType === "checkbox") {
      width = 4;
      height = 4;
    }

    const res = await fetch(`/api/documents/${id}`, {
      method: "POST",
      body: JSON.stringify({
        type: selectedType,
        page: pageIndex,
        x: xPercent,
        y: yPercent,
        width,
        height,
      }),
    });
    const { id: fieldId } = await res.json();
    setFields([
      ...fields,
      {
        id: fieldId,
        type: selectedType,
        page: pageIndex,
        x: xPercent,
        y: yPercent,
        width,
        height,
      },
    ]);
    toast.success(`${selectedType} field added`);
  };

  const updateField = async (fieldId: string, updates: Partial<Field>) => {
    const updatedFields = fields.map((f) =>
      f.id === fieldId ? { ...f, ...updates } : f,
    );
    setFields(updatedFields);

    const field = updatedFields.find((f) => f.id === fieldId);
    if (!field) return;

    await fetch(`/api/documents/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        fieldId,
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
      }),
    });
  };

  const deleteField = async (fieldId: string) => {
    await fetch(`/api/documents/${id}`, {
      method: "DELETE",
      body: JSON.stringify({ fieldId }),
    });
    setFields(fields.filter((f) => f.id !== fieldId));
    toast.error("Field removed");
  };

  const clickPluginInstance = useMemo(() => {
    return {
      renderPageLayer: (props: any) => {
        // Fallback dimensions if canvasLayer is not ready
        const pWidth = props.pageWidth;
        const pHeight = props.pageHeight;

        return (
          <div
            className="absolute inset-0 z-[100] cursor-crosshair"
            onClick={(e) => {
              if (e.target !== e.currentTarget) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
              const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
              handlePageClick(props.pageIndex, xPercent, yPercent);
            }}
          >
            {fields
              .filter((f) => f.page === props.pageIndex)
              .map((field) => (
                <Rnd
                  key={field.id}
                  size={{
                    width: `${field.width}%`,
                    height: `${field.height}%`,
                  }}
                  position={{
                    x: (field.x / 100) * pWidth,
                    y: (field.y / 100) * pHeight,
                  }}
                  onDragStop={(e, d) => {
                    const xPercent = (d.x / pWidth) * 100;
                    const yPercent = (d.y / pHeight) * 100;
                    updateField(field.id, { x: xPercent, y: yPercent });
                  }}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    const wPercent =
                      (parseFloat(ref.style.width) / pWidth) * 100;
                    const hPercent =
                      (parseFloat(ref.style.height) / pHeight) * 100;
                    const xPercent = (position.x / pWidth) * 100;
                    const yPercent = (position.y / pHeight) * 100;
                    updateField(field.id, {
                      width: wPercent,
                      height: hPercent,
                      x: xPercent,
                      y: yPercent,
                    });
                  }}
                  bounds="parent"
                  onClick={(e: any) => e.stopPropagation()}
                  className="border-2 border-primary bg-primary/10 flex items-center justify-center group z-20 shadow-sm"
                >
                  <span className="text-[9px] font-black uppercase tracking-tighter text-primary pointer-events-none select-none">
                    {field.type}
                  </span>
                  <button
                    onClick={(e: any) => {
                      e.stopPropagation();
                      deleteField(field.id);
                    }}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30"
                  >
                    ×
                  </button>
                </Rnd>
              ))}
          </div>
        );
      },
    };
  }, [fields, selectedType]);

  useEffect(() => {
    fetch(`/api/documents/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setDoc(data);
        setFields(data.fields || []);
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading)
    return (
      <div className="h-screen flex items-center justify-center bg-muted/10">
        <Loader2 className="animate-spin text-primary w-10 h-10" />
      </div>
    );

  return (
    <div className="h-screen flex flex-col bg-muted/20">
      <header className="h-20 bg-background border-b-4 border-primary px-8 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center space-x-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/hr/documents")}
            className="font-bold uppercase tracking-widest text-xs border-2 border-transparent hover:border-primary"
          >
            <ArrowLeft className="mr-2 w-4 h-4" /> Vault
          </Button>
          <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none">
            Setup: {doc.name}
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="bg-muted p-1 flex shadow-inner">
            {(["signature", "text", "date", "checkbox"] as const).map((t) => (
              <Button
                key={t}
                variant={selectedType === t ? "default" : "ghost"}
                size="sm"
                onClick={() => setSelectedType(t)}
                className="font-bold uppercase tracking-widest text-[10px] h-8 px-4"
              >
                {t}
              </Button>
            ))}
          </div>
          <Button
            variant="default"
            onClick={() => {
              const url = `${window.location.origin}/sign/p/${id}`;
              navigator.clipboard.writeText(url);
              toast.success("Public signing link copied!");
            }}
            className="font-black uppercase tracking-widest text-[10px] px-8 h-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
          >
            <Link className="w-3 h-3 mr-2" /> Share Doc
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex">
        <aside className="w-72 bg-background border-r-2 border-border p-6 space-y-6 shrink-0">
          <h2 className="font-black uppercase tracking-widest text-xs text-muted-foreground">
            Placement Engine
          </h2>
          <div className="space-y-4 pt-4 border-t-2 border-border">
            <h2 className="font-black uppercase tracking-widest text-[10px] text-muted-foreground">
              Active Fields ({fields.length})
            </h2>
            <div className="space-y-2 overflow-auto max-h-[500px] pr-2">
              {fields.map((f, i) => (
                <div
                  key={f.id}
                  className="p-3 bg-muted/30 border border-border flex items-center justify-between group hover:border-primary transition-colors"
                >
                  <span className="text-[10px] font-black uppercase tracking-tighter">
                    #{i + 1} {f.type}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 w-5 p-0 text-destructive opacity-0 group-hover:opacity-100"
                    onClick={() => deleteField(f.id)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex-1 bg-muted/50 p-8 overflow-auto flex justify-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
          <div className="w-[800px]">
            <Card className="shadow-[24px_24px_0px_0px_rgba(0,0,0,0.05)] border-none overflow-hidden bg-white">
              <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                <Viewer
                  fileUrl={doc.fileUrl}
                  plugins={[defaultLayoutPluginInstance, clickPluginInstance]}
                />
              </Worker>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
