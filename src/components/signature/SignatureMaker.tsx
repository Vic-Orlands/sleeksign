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
} from "lucide-react";

interface SignatureMakerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (signature: string) => void;
}

export function SignatureMaker({
  isOpen,
  onClose,
  onConfirm,
}: SignatureMakerProps) {
  const [activeTab, setActiveTab] = useState("type");
  const [name, setName] = useState("");
  const [fontIndex, setFontIndex] = useState(0);
  const [svgData, setSvgData] = useState<{
    pathData: string;
    viewBox: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === "type" && name.trim()) {
      const fetchSvg = async () => {
        setIsLoading(true);
        try {
          const res = await fetch("/api/signature-generate", {
            method: "POST",
            body: JSON.stringify({ name, fontIndex }),
          });
          const data = await res.json();
          setSvgData(data);
        } catch (err) {
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSvg();
    }
  }, [name, fontIndex, activeTab]);

  const handleConfirm = () => {
    if (activeTab === "type" && svgData) {
      // In V2, we still use the name as the "signature" for text-based,
      // but the PDF engine will draw it with the sleek font.
      onConfirm(name);
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
      <DialogContent className="max-w-2xl border-none shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-muted/30 border-b border-border">
          <DialogTitle className="text-2xl font-black tracking-tighter uppercase italic">
            Signature Maker
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1">
              <TabsTrigger
                value="type"
                className="font-bold uppercase tracking-widest text-[10px]"
              >
                <Type className="w-3 h-3 mr-2" /> Type
              </TabsTrigger>
              <TabsTrigger
                value="draw"
                className="font-bold uppercase tracking-widest text-[10px]"
              >
                <Pencil className="w-3 h-3 mr-2" /> Draw
              </TabsTrigger>
              <TabsTrigger
                value="upload"
                className="font-bold uppercase tracking-widest text-[10px]"
              >
                <Upload className="w-3 h-3 mr-2" /> Upload
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 h-[350px] flex flex-col justify-center">
            <TabsContent value="type" className="mt-0 space-y-6">
              <Input
                placeholder="Type your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg h-12 border-2 focus-visible:ring-0 focus-visible:border-primary transition-all font-medium"
              />

              <div className="relative group">
                <div className="h-40 flex items-center justify-center border-4 border-primary bg-background relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                  {isLoading ? (
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  ) : svgData ? (
                    <div className="flex items-center space-x-4 w-full px-12">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setFontIndex((prev) => (prev > 0 ? prev - 1 : 3))
                        }
                      >
                        <ChevronLeft />
                      </Button>
                      <div className="flex-1 flex justify-center">
                        <svg
                          viewBox={svgData.viewBox}
                          className="max-h-full max-w-full"
                          style={{ height: "100px" }}
                        >
                          <path
                            d={svgData.pathData}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
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
                    <p className="text-muted-foreground italic font-mono uppercase tracking-widest text-xs">
                      Waiting for input...
                    </p>
                  )}
                </div>
                <div className="absolute -bottom-3 right-4 bg-primary text-primary-foreground px-2 py-1 text-[8px] font-black uppercase tracking-tighter italic">
                  Font Style: {fontIndex + 1}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="draw" className="mt-0">
              <div className="border-4 border-primary bg-white overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
                <SignatureCanvas
                  ref={sigCanvas}
                  penColor="black"
                  velocityFilterWeight={0.7}
                  minWidth={1.5}
                  maxWidth={4}
                  canvasProps={{
                    className: "w-full h-[300px] cursor-crosshair touch-none",
                  }}
                />
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => sigCanvas.current?.clear()}
                  className="p-0 text-[10px] uppercase tracking-widest font-black"
                >
                  Clear Canvas
                </Button>
                <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                  Pressure Sensitive Active
                </p>
              </div>
            </TabsContent>
            <TabsContent value="upload" className="mt-0 text-center space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-4 border-dashed border-primary bg-muted/30 hover:bg-muted/50 transition-all cursor-pointer h-[250px] flex flex-col items-center justify-center space-y-4"
              >
                <div className="bg-primary text-primary-foreground p-4">
                  <Upload className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest">
                    Drop signature image
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono uppercase">
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
          </div>
        </Tabs>

        <div className="p-6 bg-muted/30 border-t border-border flex justify-end space-x-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="font-black uppercase tracking-widest text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="font-black uppercase tracking-widest text-xs px-12 h-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
            disabled={isLoading}
          >
            Confirm Signature
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
