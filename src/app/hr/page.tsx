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
  Copy,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function HRDashboard() {
  const [isUploading, setIsUploading] = useState(false);
  const [documentsList, setDocumentsList] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = () => {
    setIsLoadingDocs(true);
    fetch("/api/documents")
      .then((res) => res.json())
      .then((data) => {
        setDocumentsList(data);
        setIsLoadingDocs(false);
      });
  };

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
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const generateLink = async (docId: string) => {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          documentId: docId,
          signerName: signerName || "Staff Member",
          signerEmail: signerEmail || "",
        }),
      });
      const data = await res.json();
      if (data.sessionId) {
        toast.success(`Link generated for ${signerName || "Staff"}`);
        fetchDocs();
        setSignerName("");
        setSignerEmail("");
      }
    } catch (err) {
      toast.error("Failed to generate link");
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
              HR Management Dashboard / v2.1
            </p>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-8">
            <Card
              className="border-4 border-primary bg-primary text-primary-foreground shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer relative overflow-hidden group"
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
                  <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">
                    Upload Document
                  </h2>
                  <p className="text-primary-foreground/70 font-mono text-xs mt-4 uppercase tracking-widest">
                    PDF ONLY • MAX 10MB
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

            <Card className="border-4 border-border shadow-[12px_12px_0px_0px_rgba(0,0,0,0.1)] p-8 space-y-6">
              <h3 className="text-xl font-black uppercase tracking-tight">
                Quick Tips
              </h3>
              <ul className="space-y-4 font-medium text-sm text-muted-foreground">
                <li className="flex items-start">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-primary shrink-0" />{" "}
                  Set up fields once, then generate infinite unique links.
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-primary shrink-0" />{" "}
                  Concurrent signing: All staff can sign at the same time.
                </li>
                <li className="flex items-start">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-primary shrink-0" />{" "}
                  Audit trails are automatically appended to completed PDFs.
                </li>
              </ul>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-tight">
                Active Documents
              </h2>
              <Badge
                variant="secondary"
                className="font-mono border-2 border-border"
              >
                {documentsList.length}
              </Badge>
            </div>

            {isLoadingDocs ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {documentsList.length === 0 ? (
                  <Card className="border-4 border-dashed border-border p-20 text-center">
                    <p className="text-muted-foreground font-mono uppercase tracking-widest text-sm">
                      Vault is empty.
                    </p>
                  </Card>
                ) : (
                  documentsList.map((doc) => (
                    <Card
                      key={doc.id}
                      className="border-4 border-border shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,0.05)] transition-all overflow-hidden bg-background"
                    >
                      <div className="p-6 border-b-2 border-border flex items-center justify-between bg-muted/10">
                        <div className="flex items-center space-x-4">
                          <div className="bg-primary text-primary-foreground p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="font-black text-xl uppercase tracking-tighter italic">
                              {doc.name}
                            </h3>
                            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-1">
                              ID: {doc.id.slice(0, 12)}... •{" "}
                              {format(new Date(doc.createdAt), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="font-black uppercase text-[10px] h-8 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                            onClick={() => {
                              const url = `${window.location.origin}/sign/p/${doc.id}`;
                              navigator.clipboard.writeText(url);
                              toast.success("Public Link copied to clipboard!");
                            }}
                          >
                            <Copy className="w-3 h-3 mr-1" /> Public Link
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="font-black uppercase text-[10px] hover:bg-primary hover:text-primary-foreground transition-all h-8"
                            onClick={() => router.push(`/hr/setup/${doc.id}`)}
                          >
                            Edit Fields
                          </Button>

                          <Dialog>
                            <DialogTrigger>
                              <div className="bg-primary text-primary-foreground font-black uppercase text-[10px] h-8 px-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] flex items-center cursor-pointer">
                                <Plus className="w-3 h-3 mr-1" /> New Signer
                              </div>
                            </DialogTrigger>

                            <DialogContent className="border-4 border-primary rounded-none shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
                              <DialogHeader>
                                <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic">
                                  Generate Signing Link
                                </DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label className="font-black uppercase text-[10px] tracking-widest">
                                    Signer Name
                                  </Label>
                                  <Input
                                    placeholder="John Doe"
                                    value={signerName}
                                    onChange={(e) =>
                                      setSignerName(e.target.value)
                                    }
                                    className="border-2 border-border focus:border-primary rounded-none h-12"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="font-black uppercase text-[10px] tracking-widest">
                                    Signer Email (Optional)
                                  </Label>
                                  <Input
                                    placeholder="john@company.com"
                                    value={signerEmail}
                                    onChange={(e) =>
                                      setSignerEmail(e.target.value)
                                    }
                                    className="border-2 border-border focus:border-primary rounded-none h-12"
                                  />
                                </div>
                                <Button
                                  onClick={() => generateLink(doc.id)}
                                  className="w-full h-14 font-black uppercase tracking-widest text-lg shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all mt-4"
                                >
                                  Generate Secure Link
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>

                      <div className="px-6 py-4 bg-background">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Signer Activity
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {doc.sessions?.length || 0} Total Sessions
                          </span>
                        </div>
                        <div className="space-y-3">
                          {doc.sessions?.length === 0 ? (
                            <p className="text-[10px] italic text-muted-foreground text-center py-4">
                              No active signing links yet.
                            </p>
                          ) : (
                            doc.sessions.map((session: any) => (
                              <div
                                key={session.id}
                                className="flex items-center justify-between p-3 border-2 border-border hover:border-primary transition-all group relative"
                              >
                                <div className="flex items-center space-x-3">
                                  <div
                                    className={`w-2 h-2 rounded-full ${session.status === "completed" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]"}`}
                                  />
                                  <div>
                                    <p className="text-xs font-black uppercase tracking-tight leading-none">
                                      {session.signerName || "Pending Staff"}
                                    </p>
                                    <p className="text-[9px] font-mono text-muted-foreground mt-1 lowercase">
                                      {session.id}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Badge
                                    variant={
                                      session.status === "completed"
                                        ? "default"
                                        : "outline"
                                    }
                                    className="text-[8px] font-black uppercase h-4 px-1 border-2 border-current"
                                  >
                                    {session.status}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-muted"
                                    onClick={() =>
                                      router.push(`/hr/share/${session.id}`)
                                    }
                                  >
                                    <Share2 className="w-4 h-4" />
                                  </Button>
                                  {session.status === "completed" && (
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                                      onClick={() =>
                                        window.open(
                                          `/api/download/${session.id}`,
                                          "_blank",
                                        )
                                      }
                                    >
                                      <Download className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
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
