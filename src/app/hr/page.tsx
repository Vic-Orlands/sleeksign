"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

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
        router.push(`/hr/setup/${data.id}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto space-y-12">
        <header className="flex justify-between items-end">
          <div className="space-y-2">
            <h1 className="text-6xl font-black tracking-tighter uppercase italic">SleekSign.</h1>
            <p className="text-muted-foreground font-mono uppercase tracking-widest text-xs">HR Management Dashboard / v1.0</p>
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card
            className="border-4 border-primary bg-primary text-primary-foreground shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer relative overflow-hidden group"
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <CardContent className="p-12 space-y-6">
              <div className="bg-background text-primary w-16 h-16 flex items-center justify-center">
                {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
              </div>
              <div>
                <h2 className="text-4xl font-black tracking-tighter uppercase">Upload Document</h2>
                <p className="text-primary-foreground/70 font-mono text-sm mt-2 uppercase tracking-wider">PDF files only. Max 10MB.</p>
              </div>
              <input type="file" id="file-upload" className="hidden" accept=".pdf" onChange={handleUpload} />
            </CardContent>
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <FileText size={160} />
            </div>
          </Card>

          <Card className="border-4 border-border shadow-[12px_12px_0px_0px_rgba(0,0,0,0.1)] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,0.1)] transition-all">
            <CardContent className="p-12 space-y-6 flex flex-col justify-between h-full">
              <div className="space-y-6">
                <div className="bg-muted w-16 h-16 flex items-center justify-center">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-4xl font-black tracking-tighter uppercase">Templates</h2>
                  <p className="text-muted-foreground font-mono text-sm mt-2 uppercase tracking-wider">Coming soon in V2.0</p>
                </div>
              </div>
              <Button variant="ghost" className="w-fit p-0 hover:bg-transparent font-bold text-xl uppercase tracking-tighter flex items-center group">
                Browse Templates <ArrowRight className="ml-2 group-hover:translate-x-2 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
