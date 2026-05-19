"use client";

import React, { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SignatureCanvas from "react-signature-canvas";
import {
  Type,
  Pencil,
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlignLeft,
  Sparkles,
  Eraser,
} from "lucide-react";
import {
  decodeSignatureVector,
  encodeSignatureVector,
} from "@/lib/field-utils";

interface SignatureMakerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  type?: "signature" | "text";
  defaultValue?: string;
  textSuggestions?: Array<{ label: string; value: string }>;
}

export function SignatureMaker({
  isOpen,
  onClose,
  onConfirm,
  type = "signature",
  defaultValue = "",
  textSuggestions = [],
}: SignatureMakerProps) {
  const [activeTab, setActiveTab] = useState(type === "text" ? "text" : "type");
  const [name, setName] = useState(defaultValue);
  const [textValue, setTextValue] = useState(defaultValue);
  const [fontIndex, setFontIndex] = useState(0);
  const [svgData, setSvgData] = useState<{
    pathData: string;
    viewBox: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        const vector = decodeSignatureVector(defaultValue);
        setActiveTab(type === "text" ? "text" : "type");
        setTextValue(defaultValue);
        setSvgData(
          vector
            ? {
                pathData: vector.pathData,
                viewBox: vector.viewBox,
              }
            : null,
        );
        if (type === "signature") {
          setName(vector?.name || defaultValue);
          if (vector) setFontIndex(vector.fontIndex);
        }
      });
    }
  }, [isOpen, type, defaultValue]);

  useEffect(() => {
    if (activeTab !== "type") return;

    if (!name.trim()) {
      queueMicrotask(() => setSvgData(null));
      return;
    }

    if (name.startsWith("signature-vector:")) {
      const vector = decodeSignatureVector(name);
      if (vector) {
        queueMicrotask(() => {
          setSvgData({
            pathData: vector.pathData,
            viewBox: vector.viewBox,
          });
          setName(vector.name);
        });
      }
      return;
    }

    if (activeTab === "type" && name.trim()) {
      const fetchSvg = async () => {
        setIsLoading(true);
        try {
          const res = await fetch("/api/signature-generate", {
            method: "POST",
            body: JSON.stringify({ name, fontIndex }),
          });
          if (!res.ok) {
            setSvgData(null);
            return;
          }
          const data = await res.json();
          setSvgData(data);
        } catch (err) {
          console.error(err);
          setSvgData(null);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSvg();
    }
  }, [name, fontIndex, activeTab]);

  const handleConfirm = () => {
    if (activeTab === "text") {
      onConfirm(textValue);
    } else if (activeTab === "type" && svgData) {
      onConfirm(
        encodeSignatureVector({
          kind: "signature-vector",
          name,
          pathData: svgData.pathData,
          viewBox: svgData.viewBox,
          width: Number(svgData.viewBox.split(" ")[2] || 0),
          height: Number(svgData.viewBox.split(" ")[3] || 0),
          fontIndex,
        }),
      );
    } else if (activeTab === "draw" && sigCanvas.current) {
      if (!sigCanvas.current.isEmpty()) {
        onConfirm(sigCanvas.current.getTrimmedCanvas().toDataURL("image/png"));
      }
    }
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onConfirm(reader.result as string);
        onClose();
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[min(calc(100vw-2rem),46rem)] !max-w-none overflow-hidden rounded-none border border-border bg-background p-0 shadow-2xl sm:!w-[46rem]">
        <DialogHeader className="border-b border-border bg-muted/40 p-6">
          <DialogTitle className="font-mono text-xs font-semibold uppercase tracking-widest">
            {type === "text" ? "Input Text" : "Signature Maker"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-3 bg-muted/70">
              {type === "text" ? (
                <TabsTrigger
                  value="text"
                  className="col-span-3 text-xs font-semibold text-foreground hover:text-foreground dark:text-foreground dark:hover:text-foreground data-[active]:text-primary-foreground"
                >
                  <AlignLeft className="w-3 h-3 mr-2" /> Text Input
                </TabsTrigger>
              ) : (
                <>
                  <TabsTrigger
                    value="type"
                    className="text-xs font-semibold text-foreground hover:text-foreground dark:text-foreground dark:hover:text-foreground data-[active]:text-primary-foreground"
                  >
                    <Type className="w-3 h-3 mr-2" /> Type
                  </TabsTrigger>
                  <TabsTrigger
                    value="draw"
                    className="text-xs font-semibold text-foreground hover:text-foreground dark:text-foreground dark:hover:text-foreground data-[active]:text-primary-foreground"
                  >
                    <Pencil className="w-3 h-3 mr-2" /> Draw
                  </TabsTrigger>
                  <TabsTrigger
                    value="upload"
                    className="text-xs font-semibold text-foreground hover:text-foreground dark:text-foreground dark:hover:text-foreground data-[active]:text-primary-foreground"
                  >
                    <Upload className="w-3 h-3 mr-2" /> Upload
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          <div className="flex min-h-95 flex-col justify-center p-6">
            {type === "text" ? (
              <TabsContent value="text" className="mt-0 space-y-4">
                {textSuggestions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="font-mono text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      Use signer detail
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {textSuggestions.map((suggestion) => (
                        <button
                          key={`${suggestion.label}-${suggestion.value}`}
                          type="button"
                          className="border border-border bg-muted/30 p-3 text-left transition-colors hover:bg-muted"
                          onClick={() => setTextValue(suggestion.value)}
                        >
                          <span className="block font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                            {suggestion.label}
                          </span>
                          <span className="mt-1 block truncate text-sm font-medium text-foreground">
                            {suggestion.value}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Enter text for this field
                  </p>
                  <Input
                    placeholder="Enter details..."
                    value={textValue}
                    onChange={(e) => setTextValue(e.target.value)}
                    autoFocus
                    className="h-12 border-border bg-muted/40 text-sm font-medium placeholder:text-sm focus-visible:border-primary focus-visible:ring-primary/20"
                  />
                </div>
              </TabsContent>
            ) : (
              <>
                <TabsContent value="type" className="mt-0 space-y-6">
                  <Input
                    placeholder="Type your name..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-12 border-border bg-muted/40 text-sm font-medium placeholder:text-sm transition-all focus-visible:border-primary focus-visible:ring-primary/20"
                  />

                  <div className="relative group">
                    <div className="relative flex h-44 items-center justify-center overflow-hidden border border-border bg-[linear-gradient(to_bottom,#fff_0%,#fff_62%,#f3f0e8_62%,#f3f0e8_63%,#fff_63%)] text-zinc-900 shadow-sm">
                      {isLoading ? (
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      ) : svgData ? (
                        <div className="flex w-full items-center gap-4 px-8">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setFontIndex((prev) => (prev > 0 ? prev - 1 : 3))
                            }
                          >
                            <ChevronLeft />
                          </Button>
                          <div className="flex flex-1 justify-center text-foreground">
                            <svg
                              viewBox={svgData.viewBox}
                              className="max-h-full max-w-full"
                              style={{ height: "116px" }}
                            >
                              <path
                                d={svgData.pathData}
                                fill="none"
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2.3"
                                className="signature-path"
                              />
                            </svg>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              setFontIndex((prev) => (prev < 3 ? prev + 1 : 0))
                            }
                          >
                            <ChevronRight />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Sparkles className="size-4" />
                          Type a legal name to preview a vector signature
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-3 right-4 border border-border bg-background px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shadow-sm">
                      Style {fontIndex + 1}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="draw" className="mt-0">
                  <div className="relative overflow-hidden border border-border bg-white shadow-sm">
                    <SignatureCanvas
                      ref={sigCanvas}
                      penColor="black"
                      velocityFilterWeight={0.7}
                      minWidth={1.5}
                      maxWidth={4}
                      canvasProps={{
                        className:
                          "w-full h-[300px] cursor-crosshair touch-none",
                      }}
                    />
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground my-4">
                    Smooth pressure-sensitive drawing
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => sigCanvas.current?.clear()}
                    className="p-0 text-xs font-semibold text-red-400"
                  >
                    <Eraser className="w-4 h-4" />
                    Clear Canvas
                  </Button>
                </TabsContent>

                <TabsContent
                  value="upload"
                  className="mt-0 text-center space-y-4"
                >
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-[250px] cursor-pointer flex-col items-center justify-center space-y-4 border border-dashed border-border bg-muted/30 transition-all hover:bg-muted/50"
                  >
                    <div className="bg-primary p-4 text-primary-foreground">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">
                        Upload a signature image
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        PNG or JPG preferred
                      </p>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                  </div>
                </TabsContent>
              </>
            )}
          </div>
        </Tabs>

        <div className="flex justify-end gap-3 border-t border-border bg-muted/30 p-6">
          <Button variant="ghost" onClick={onClose} className="font-semibold">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="h-10 px-8 font-semibold"
            disabled={isLoading}
          >
            Confirm {type === "text" ? "Entry" : "Signature"}
          </Button>
        </div>
      </DialogContent>

      <style jsx global>{`
        .signature-path {
          stroke-dasharray: 1500;
          stroke-dashoffset: 1500;
          animation: draw 2.5s ease-in-out forwards;
        }

        @keyframes draw {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </Dialog>
  );
}
