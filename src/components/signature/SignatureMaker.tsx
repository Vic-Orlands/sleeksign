"use client";

import Image from "next/image";
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
} from "@/lib/field-utils";

const SIGNATURE_STYLE_COUNT = 2;
const SIGNATURE_FONT_FACES = [
  {
    family: "SignageSignatureOne",
    url: "/fonts/signature2.ttf",
  },
  {
    family: "SignageSignatureTwo",
    url: "/fonts/signature4.ttf",
  },
] as const;

const signatureFontPromises = new Map<string, Promise<void>>();

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
  const [typedPreviewUrl, setTypedPreviewUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [drawVersion, setDrawVersion] = useState(0);
  const [drawHasContent, setDrawHasContent] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasTypedName = name.trim().length > 0;

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        const vector = decodeSignatureVector(defaultValue);
        setActiveTab(type === "text" ? "text" : "type");
        setTextValue(defaultValue);
        setTypedPreviewUrl(defaultValue.startsWith("data:image") ? defaultValue : "");
        setDrawVersion(0);
        setDrawHasContent(false);
        if (type === "signature") {
          setName(vector?.name || (defaultValue.startsWith("data:image") ? "" : defaultValue));
          if (vector) setFontIndex(vector.fontIndex);
        }
      });
    }
  }, [isOpen, type, defaultValue]);

  useEffect(() => {
    if (activeTab !== "type") return;

    if (!name.trim()) {
      queueMicrotask(() =>
        setTypedPreviewUrl(defaultValue.startsWith("data:image") ? defaultValue : ""),
      );
      return;
    }

    if (name.startsWith("signature-vector:")) {
      const vector = decodeSignatureVector(name);
      if (vector) {
        queueMicrotask(() => {
          setTypedPreviewUrl("");
          setName(vector.name);
        });
      }
      return;
    }

    let cancelled = false;

    const buildPreview = async () => {
      setIsLoading(true);
      try {
        await ensureSignatureFont(fontIndex);
        const previewUrl = createTypedSignatureDataUrl(name, fontIndex);
        if (!cancelled) {
          setTypedPreviewUrl(previewUrl);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setTypedPreviewUrl("");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void buildPreview();

    return () => {
      cancelled = true;
    };
  }, [name, fontIndex, activeTab, defaultValue]);

  const handleConfirm = () => {
    if (activeTab === "text") {
      onConfirm(textValue);
    } else if (activeTab === "type" && typedPreviewUrl) {
      onConfirm(typedPreviewUrl);
    } else if (activeTab === "draw" && sigCanvas.current) {
      if (!sigCanvas.current.isEmpty()) {
        const trimmedCanvas = trimCanvas(sigCanvas.current.getCanvas());
        onConfirm(trimmedCanvas.toDataURL("image/png"));
      }
    }
    onClose();
  };

  const canConfirm =
    activeTab === "text"
      ? textValue.trim().length > 0
      : activeTab === "type"
          ? Boolean(typedPreviewUrl)
          : activeTab === "draw"
            ? drawHasContent
            : true;

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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
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
                      ) : typedPreviewUrl ? (
                        <div className="flex w-full items-center gap-4 px-8">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!hasTypedName || isLoading}
                            onClick={() =>
                              setFontIndex((prev) =>
                                prev > 0 ? prev - 1 : SIGNATURE_STYLE_COUNT - 1,
                              )
                            }
                          >
                            <ChevronLeft />
                          </Button>
                          <div className="flex flex-1 justify-center">
                            <div className="flex min-h-28 w-full max-w-[28rem] items-center justify-center rounded-none border border-zinc-200/80 bg-white/80 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                              {typedPreviewUrl ? (
                                <Image
                                  src={typedPreviewUrl}
                                  alt="Typed signature preview"
                                  className="max-h-full max-w-full"
                                  unoptimized
                                  width={560}
                                  height={160}
                                  style={{ height: "118px" }}
                                />
                              ) : (
                                <div className="flex items-center gap-2 text-sm text-zinc-500">
                                  <Sparkles className="size-4" />
                                  Type a legal name to preview a signature style
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!hasTypedName || isLoading}
                            onClick={() =>
                              setFontIndex((prev) =>
                                prev < SIGNATURE_STYLE_COUNT - 1 ? prev + 1 : 0,
                              )
                            }
                          >
                            <ChevronRight />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex w-full items-center gap-4 px-8">
                          <Button variant="ghost" size="icon" disabled>
                            <ChevronLeft />
                          </Button>
                          <div className="flex flex-1 justify-center">
                            <div className="flex min-h-28 w-full max-w-[28rem] items-center justify-center rounded-none border border-dashed border-zinc-300 bg-white/70 px-4 py-3">
                              <div className="flex items-center gap-2 text-sm text-zinc-500">
                                <Sparkles className="size-4" />
                                Type a legal name to preview a signature style
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" disabled>
                            <ChevronRight />
                          </Button>
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
                      onEnd={() => {
                        setDrawVersion((value) => value + 1);
                        setDrawHasContent(true);
                      }}
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
                    onClick={() => {
                      sigCanvas.current?.clear();
                      setDrawVersion(0);
                      setDrawHasContent(false);
                    }}
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
            disabled={
              isLoading ||
              !canConfirm ||
              (activeTab === "draw" && drawVersion === 0)
            }
          >
            Confirm {type === "text" ? "Entry" : "Signature"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function ensureSignatureFont(fontIndex: number) {
  const font = SIGNATURE_FONT_FACES[fontIndex] || SIGNATURE_FONT_FACES[0];
  if (typeof document === "undefined" || !("fonts" in document)) return;

  const cacheKey = `${font.family}:${font.url}`;
  const existingPromise = signatureFontPromises.get(cacheKey);
  if (existingPromise) {
    await existingPromise;
    return;
  }

  const loadPromise = new FontFace(font.family, `url(${font.url})`)
    .load()
    .then((loadedFont) => {
      document.fonts.add(loadedFont);
    });

  signatureFontPromises.set(cacheKey, loadPromise);
  await loadPromise;
}

function createTypedSignatureDataUrl(name: string, fontIndex: number) {
  const font = SIGNATURE_FONT_FACES[fontIndex] || SIGNATURE_FONT_FACES[0];
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas context unavailable");
  }

  const fontSize = 110;
  context.font = `${fontSize}px "${font.family}"`;
  const metrics = context.measureText(name);
  const horizontalPadding = 40;
  const verticalPadding = 28;
  const width = Math.max(
    Math.ceil(metrics.width + horizontalPadding * 2),
    320,
  );
  const ascent = Math.ceil(
    metrics.actualBoundingBoxAscent || fontSize * 0.7,
  );
  const descent = Math.ceil(
    metrics.actualBoundingBoxDescent || fontSize * 0.25,
  );
  const height = Math.max(ascent + descent + verticalPadding * 2, 160);

  canvas.width = width;
  canvas.height = height;

  const drawContext = canvas.getContext("2d");
  if (!drawContext) {
    throw new Error("Canvas context unavailable");
  }

  drawContext.clearRect(0, 0, width, height);
  drawContext.font = `${fontSize}px "${font.family}"`;
  drawContext.fillStyle = "#111111";
  drawContext.textBaseline = "alphabetic";
  drawContext.fillText(name, horizontalPadding, verticalPadding + ascent);

  return trimCanvas(canvas).toDataURL("image/png");
}

function trimCanvas(sourceCanvas: HTMLCanvasElement) {
  const sourceContext = sourceCanvas.getContext("2d");
  if (!sourceContext) return sourceCanvas;

  const { width, height } = sourceCanvas;
  const imageData = sourceContext.getImageData(0, 0, width, height);
  const { data } = imageData;

  let top = height;
  let left = width;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha === 0) continue;

      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }

  if (right < left || bottom < top) {
    return sourceCanvas;
  }

  const padding = 8;
  const trimmedWidth = right - left + 1;
  const trimmedHeight = bottom - top + 1;
  const targetCanvas = document.createElement("canvas");

  targetCanvas.width = trimmedWidth + padding * 2;
  targetCanvas.height = trimmedHeight + padding * 2;

  const targetContext = targetCanvas.getContext("2d");
  if (!targetContext) return sourceCanvas;

  targetContext.drawImage(
    sourceCanvas,
    left,
    top,
    trimmedWidth,
    trimmedHeight,
    padding,
    padding,
    trimmedWidth,
    trimmedHeight,
  );

  return targetCanvas;
}
