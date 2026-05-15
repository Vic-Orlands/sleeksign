"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  ArrowRight,
  Loader2,
  Clock,
  CheckCircle2,
  Download,
  Share2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function HRDashboard() {
  const [isUploading, setIsUploading] = useState(false);
  const [documentsList, setDocumentsList] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/documents")
      .then((res) => res.json())
      .then((data) => {
        setDocumentsList(data);
        setIsLoadingDocs(false);
      });
  }, []);

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
      <div className="max-w-6xl mx-auto space-y-12">
        <header className="flex justify-between items-end">
          <div className="space-y-2">
            <h1 className="text-6xl font-black tracking-tighter uppercase italic">
              SleekSign.
            </h1>
            <p className="text-muted-foreground font-mono uppercase tracking-widest text-xs">
              HR Management Dashboard / v2.0
            </p>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Section */}
          <Card
            className="border-4 border-primary bg-primary text-primary-foreground shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer relative overflow-hidden group h-full"
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            <CardContent className="p-12 space-y-6">
              <div className="bg-background text-primary w-16 h-16 flex items-center justify-center">
                {isUploading ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8" />
                )}
              </div>
              <div>
                <h2 className="text-4xl font-black tracking-tighter uppercase">
                  Upload New
                </h2>
                <p className="text-primary-foreground/70 font-mono text-sm mt-2 uppercase tracking-wider">
                  PDF files only. Max 10MB.
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
          </Card>

          {/* Recent Documents Table */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-tight">
                Active Documents
              </h2>
              <Badge variant="outline" className="font-mono">
                {documentsList.length} total
              </Badge>
            </div>

            {isLoadingDocs ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {documentsList.length === 0 ? (
                  <Card className="border-2 border-dashed border-border p-12 text-center">
                    <p className="text-muted-foreground font-mono uppercase tracking-widest text-sm">
                      No documents found. Upload one to start.
                    </p>
                  </Card>
                ) : (
                  documentsList.map((doc) => (
                    <Card
                      key={doc.id}
                      className="border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)] transition-all overflow-hidden group"
                    >
                      <div className="p-6 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="bg-muted p-3">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg leading-none">
                              {doc.name}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 font-mono uppercase">
                              Created{" "}
                              {format(new Date(doc.createdAt), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3">
                          <div className="text-right mr-4 hidden sm:block">
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                              Sessions
                            </p>
                            <p className="text-lg font-black leading-none">
                              {doc.sessions?.length || 0}
                            </p>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            className="font-bold uppercase tracking-widest text-[10px]"
                            onClick={() => router.push(`/hr/setup/${doc.id}`)}
                          >
                            Edit Fields
                          </Button>

                          {doc.sessions?.[0] && (
                            <Button
                              variant="default"
                              size="sm"
                              className="font-bold uppercase tracking-widest text-[10px]"
                              onClick={() =>
                                router.push(`/hr/share/${doc.sessions[0].id}`)
                              }
                            >
                              Share Link
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Detailed status list for sessions */}
                      {doc.sessions && doc.sessions.length > 0 && (
                        <div className="bg-muted/30 border-t border-border px-6 py-4 space-y-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
                            Signer Activity
                          </p>
                          {doc.sessions.map((session: any) => (
                            <div
                              key={session.id}
                              className="flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center space-x-2">
                                {session.status === "completed" ? (
                                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                                ) : (
                                  <Clock className="w-3 h-3 text-amber-500" />
                                )}
                                <span className="font-medium">
                                  {session.signerName || "Pending Signer"}
                                </span>
                                <span className="text-muted-foreground italic">
                                  ({session.id.slice(0, 8)}...)
                                </span>
                              </div>
                              <div className="flex items-center space-x-4">
                                <Badge
                                  variant={
                                    session.status === "completed"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="text-[9px] uppercase font-bold py-0 h-4"
                                >
                                  {session.status}
                                </Badge>
                                {session.status === "completed" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() =>
                                      window.open(
                                        `/api/download/${session.id}`,
                                        "_blank",
                                      )
                                    }
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
