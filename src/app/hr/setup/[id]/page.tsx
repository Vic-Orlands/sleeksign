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
  Send,
  Calendar,
  CheckSquare,
  Save,
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

  const handlePageClick = async (pageIndex: number, x: number, y: number) => {
    let width = 200;
    let height = 60;

    if (selectedType === "text") {
      width = 150;
      height = 30;
    }
    if (selectedType === "date") {
      width = 120;
      height = 30;
    }
    if (selectedType === "checkbox") {
      width = 30;
      height = 30;
    }

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

  const saveAsTemplate = async () => {
    await fetch(`/api/documents/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        name: doc.name + " (Template)",
        isTemplate: true,
      }),
    });
    toast.success("Saved as template!");
  };

  const clickPluginInstance = useMemo(() => {
    return {
      renderPageLayer: (props: any) => {
        return (
          <div
            className="absolute inset-0 z-[100] cursor-crosshair"
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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary pointer-events-none select-none flex items-center">
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

  const createSession = async () => {
    const res = await fetch("/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        documentId: id,
        signerName: "Staff Member",
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
      <header className="h-20 bg-background border-b border-border px-8 flex items-center justify-between shadow-sm sticky top-0 z-50">
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
          <div className="bg-muted p-1 flex shadow-inner">
            <Button
              variant={selectedType === "signature" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedType("signature")}
              className="font-bold uppercase tracking-widest text-[10px] h-8"
            >
              Signature
            </Button>
            <Button
              variant={selectedType === "text" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedType("text")}
              className="font-bold uppercase tracking-widest text-[10px] h-8"
            >
              Text
            </Button>
            <Button
              variant={selectedType === "date" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedType("date")}
              className="font-bold uppercase tracking-widest text-[10px] h-8"
            >
              Date
            </Button>
            <Button
              variant={selectedType === "checkbox" ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedType("checkbox")}
              className="font-bold uppercase tracking-widest text-[10px] h-8"
            >
              Checkbox
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={saveAsTemplate}
            className="font-bold uppercase tracking-widest text-[10px] h-8 border-2"
          >
            Save Template
          </Button>
          <Button
            onClick={createSession}
            className="font-bold uppercase tracking-widest text-[10px] px-8 h-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
          >
            Generate Link
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex">
        <aside className="w-80 bg-background border-r border-border p-6 space-y-6">
          <h2 className="font-bold uppercase tracking-widest text-xs text-muted-foreground">
            Instructions
          </h2>
          <div className="space-y-2 text-sm font-medium">
            <p className="flex items-center">
              <span className="w-4 h-4 bg-muted flex items-center justify-center text-[10px] mr-2">
                1
              </span>{" "}
              Select a tool above
            </p>
            <p className="flex items-center">
              <span className="w-4 h-4 bg-muted flex items-center justify-center text-[10px] mr-2">
                2
              </span>{" "}
              Click on PDF to place
            </p>
            <p className="flex items-center">
              <span className="w-4 h-4 bg-muted flex items-center justify-center text-[10px] mr-2">
                3
              </span>{" "}
              Drag/Resize boxes
            </p>
          </div>
          <div className="space-y-4 pt-4 border-t border-border">
            <h2 className="font-bold uppercase tracking-widest text-xs text-muted-foreground">
              Fields ({fields.length})
            </h2>
            <div className="space-y-2 overflow-auto max-h-[400px] pr-2">
              {fields.map((f, i) => (
                <div
                  key={f.id}
                  className="p-3 bg-muted/30 border border-border flex items-center justify-between group hover:bg-muted transition-colors"
                >
                  <span className="text-[10px] font-black uppercase tracking-tight">
                    #{i + 1} {f.type} (P{f.page + 1})
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive opacity-0 group-hover:opacity-100"
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
          <Card className="w-[850px] shadow-2xl border-none relative overflow-hidden">
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
