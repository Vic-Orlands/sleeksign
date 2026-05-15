"use client";

import React, { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SignatureCanvas from "react-signature-canvas";
import { Type, Pencil, Upload, Loader2 } from "lucide-react";

interface SignatureMakerProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (signature: string) => void;
}

export function SignatureMaker({ isOpen, onClose, onConfirm }: SignatureMakerProps) {
  const [activeTab, setActiveTab] = useState("type");
  const [name, setName] = useState("");
  const [svgData, setSvgData] = useState<{ pathData: string; viewBox: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const sigCanvas = useRef<SignatureCanvas>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeTab === "type" && name.trim()) {
      const timer = setTimeout(async () => {
        setIsLoading(true);
        try {
          const res = await fetch("/api/signature-generate", {
            method: "POST",
            body: JSON.stringify({ name }),
          });
          const data = await res.json();
          setSvgData(data);
        } catch (err) {
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [name, activeTab]);

  const handleConfirm = () => {
    if (activeTab === "type" && svgData) {
      // In a real app, we'd maybe convert SVG to image or store path
      // For simplicity in V1, we'll store the name or a dataURL of the SVG
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
          <DialogTitle className="text-2xl font-bold tracking-tight">Create Signature</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1">
              <TabsTrigger value="type" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Type className="w-4 h-4 mr-2" />
                Type
              </TabsTrigger>
              <TabsTrigger value="draw" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Pencil className="w-4 h-4 mr-2" />
                Draw
              </TabsTrigger>
              <TabsTrigger value="upload" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6 h-[300px] flex flex-col justify-center">
            <TabsContent value="type" className="mt-0 space-y-6">
              <Input
                placeholder="Type your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-lg h-12 border-2 focus-visible:ring-0 focus-visible:border-primary transition-all"
              />
              <div className="h-32 flex items-center justify-center border border-dashed border-border bg-muted/10 relative overflow-hidden">
                {isLoading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                ) : svgData ? (
                  <svg
                    viewBox={svgData.viewBox}
                    className="max-h-full max-w-full"
                    style={{ height: "80px" }}
                  >
                    <path
                      d={svgData.pathData}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="signature-path"
                    />
                  </svg>
                ) : (
                  <p className="text-muted-foreground italic">Your signature will appear here</p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="draw" className="mt-0">
              <div className="border border-border bg-white overflow-hidden">
                <SignatureCanvas
                  ref={sigCanvas}
                  penColor="black"
                  canvasProps={{
                    className: "w-full h-[250px] cursor-crosshair",
                  }}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => sigCanvas.current?.clear()}
                className="mt-2 text-xs uppercase tracking-widest font-bold"
              >
                Clear Canvas
              </Button>
            </TabsContent>

            <TabsContent value="upload" className="mt-0 text-center space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/30 transition-all cursor-pointer h-[200px] flex flex-col items-center justify-center space-y-2"
              >
                <Upload className="w-10 h-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload your signature image (PNG, JPG)</p>
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
          <Button variant="outline" onClick={onClose} className="font-bold">Cancel</Button>
          <Button onClick={handleConfirm} className="font-bold px-8" disabled={isLoading}>Confirm Signature</Button>
        </div>
      </DialogContent>

      <style jsx global>{`
        .signature-path {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: draw 2s ease-in-out forwards;
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
