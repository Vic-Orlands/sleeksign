"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, ArrowRight, Loader2, Vault } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function HRDashboard() {
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.id) {
        toast.success("Document uploaded to vault!");
        router.push(`/hr/setup/${data.id}`);
      }
    } catch (err) {
      console.error(err);
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex justify-between items-end border-b-8 border-primary pb-8">
          <div className="space-y-2">
            <h1 className="text-8xl font-black tracking-tighter uppercase italic leading-none text-primary">
              SleekSign.
            </h1>
            <p className="text-muted-foreground font-mono uppercase tracking-widest text-[10px]">
              Administrative Command Center / v2.2
            </p>
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Main Action: Upload */}
          <Card
            className="border-8 border-primary bg-primary text-primary-foreground shadow-[24px_24px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-8px] hover:translate-y-[-8px] hover:shadow-[32px_32px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer relative overflow-hidden group h-[400px]"
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <CardContent className="p-16 h-full flex flex-col justify-center space-y-8">
              <div className="bg-background text-primary w-24 h-24 flex items-center justify-center shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)]">
                {isUploading ? (
                  <Loader2 className="w-12 h-12 animate-spin" />
                ) : (
                  <Upload className="w-12 h-12" />
                )}
              </div>
              <div>
                <h2 className="text-6xl font-black tracking-tighter uppercase leading-none">
                  New Document
                </h2>
                <p className="text-primary-foreground/70 font-mono text-sm mt-6 uppercase tracking-[0.2em] font-bold">
                  PDF Format • 10MB Limit
                </p>
              </div>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf"
                onChange={handleUpload}
              />
            </CardContent>
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <FileText size={300} />
            </div>
          </Card>

          {/* Navigation: Vault */}
          <Card
            className="border-8 border-border bg-background shadow-[24px_24px_0px_0px_rgba(0,0,0,0.05)] hover:border-primary hover:shadow-[24px_24px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-8px] hover:translate-y-[-8px] transition-all cursor-pointer flex flex-col justify-center h-[400px] group"
            onClick={() => router.push("/hr/documents")}
          >
            <CardContent className="p-16 space-y-8">
              <div className="bg-muted w-24 h-24 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Vault className="w-12 h-12" />
              </div>
              <div className="space-y-4">
                <h2 className="text-6xl font-black tracking-tighter uppercase leading-none">
                  The Vault
                </h2>
                <p className="text-muted-foreground font-mono text-sm uppercase tracking-[0.2em] font-bold">
                  Manage Docs & Activity Log
                </p>
              </div>
              <Button
                variant="ghost"
                className="w-fit p-0 hover:bg-transparent font-black text-2xl uppercase tracking-tighter flex items-center group-hover:text-primary"
              >
                Open Storage{" "}
                <ArrowRight className="ml-4 w-8 h-8 group-hover:translate-x-4 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
