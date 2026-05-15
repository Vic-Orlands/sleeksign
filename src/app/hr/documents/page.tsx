"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Loader2,
  Clock,
  CheckCircle2,
  Download,
  Share2,
  Copy,
  Plus,
  ArrowLeft,
  Settings
} from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function HRDocuments() {
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
      .then(res => res.json())
      .then(data => {
        setDocumentsList(data);
        setIsLoadingDocs(false);
      });
  };

  const generateLink = async (docId: string) => {
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          documentId: docId,
          signerName: signerName || "Staff Member",
          signerEmail: signerEmail || ""
        }),
      });
      const data = await res.json();
      if (data.sessionId) {
        toast.success(`Link generated for ${signerName || 'Staff'}`);
        fetchDocs();
        setSignerName("");
        setSignerEmail("");
      }
    } catch (err) {
      toast.error("Failed to generate link");
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col h-screen overflow-hidden">
      <header className="h-20 bg-background border-b-4 border-primary px-8 flex items-center justify-between shadow-md shrink-0">
        <div className="flex items-center space-x-6">
          <Button variant="ghost" onClick={() => router.push('/hr')} className="font-bold uppercase tracking-widest text-xs border-2 border-transparent hover:border-primary">
            <ArrowLeft className="mr-2 w-4 h-4" /> Home
          </Button>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none">Vault.</h1>
        </div>
        <div className="flex items-center space-x-4">
           <Badge variant="outline" className="border-2 border-primary font-black uppercase text-[10px] px-3 py-1">{documentsList.length} Documents</Badge>
        </div>
      </header>

      <main className="flex-1 overflow-auto bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] p-8">
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
          {isLoadingDocs ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <Loader2 className="animate-spin text-primary w-12 h-12" />
              <p className="font-mono uppercase tracking-widest text-xs text-muted-foreground">Accessing secure storage...</p>
            </div>
          ) : documentsList.length === 0 ? (
            <Card className="border-4 border-dashed border-border p-32 text-center bg-background/50">
              <div className="max-w-xs mx-auto space-y-6">
                <FileText className="w-16 h-16 text-muted-foreground mx-auto opacity-20" />
                <p className="text-muted-foreground font-mono uppercase tracking-widest text-sm leading-relaxed">No documents found in your vault. Upload one to get started.</p>
                <Button onClick={() => router.push('/hr')} className="font-black uppercase tracking-widest text-xs px-8">Upload Doc</Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-8">
              {documentsList.map((doc) => (
                <Card key={doc.id} className="border-4 border-primary shadow-[12px_12px_0px_0px_rgba(0,0,0,0.05)] hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,0.05)] transition-all overflow-hidden bg-background">
                  <div className="p-8 border-b-4 border-muted flex items-center justify-between bg-muted/5">
                    <div className="flex items-center space-x-6">
                      <div className="bg-primary text-primary-foreground p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                        <FileText className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="font-black text-3xl uppercase tracking-tighter italic leading-none">{doc.name}</h3>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-2">
                          Vault ID: {doc.id} • Created {format(new Date(doc.createdAt), "PPP")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                       <Button
                        variant="outline"
                        size="sm"
                        className="font-black uppercase text-[10px] h-10 border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all px-6"
                        onClick={() => {
                          const url = `${window.location.origin}/sign/p/${doc.id}`;
                          navigator.clipboard.writeText(url);
                          toast.success("Public Link copied!");
                        }}
                      >
                        <Copy className="w-3 h-3 mr-2" /> Public Link
                      </Button>

                      <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-muted border-2 border-transparent hover:border-border" onClick={() => router.push(`/hr/setup/${doc.id}`)}>
                        <Settings className="w-5 h-5" />
                      </Button>

                      <Dialog>
                        <DialogTrigger>
                          <div className="bg-primary text-primary-foreground font-black uppercase text-[10px] h-10 px-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] flex items-center cursor-pointer transition-all">
                            <Plus className="w-4 h-4 mr-2" /> Invite Signer
                          </div>
                        </DialogTrigger>
                        <DialogContent className="border-4 border-primary rounded-none shadow-[24px_24px_0px_0px_rgba(0,0,0,1)]">
                          <DialogHeader>
                            <DialogTitle className="text-3xl font-black uppercase tracking-tighter italic">Create Invitation</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-6 py-6">
                            <div className="space-y-2">
                              <Label className="font-black uppercase text-[10px] tracking-widest">Signer Full Name</Label>
                              <Input placeholder="John Doe" value={signerName} onChange={e => setSignerName(e.target.value)} className="border-2 border-border focus:border-primary rounded-none h-14 text-lg font-medium shadow-inner" />
                            </div>
                            <div className="space-y-2">
                              <Label className="font-black uppercase text-[10px] tracking-widest">Signer Email</Label>
                              <Input placeholder="john@company.com" value={signerEmail} onChange={e => setSignerEmail(e.target.value)} className="border-2 border-border focus:border-primary rounded-none h-14 text-lg font-medium shadow-inner" />
                            </div>
                            <Button onClick={() => generateLink(doc.id)} className="w-full h-16 font-black uppercase tracking-widest text-xl shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all mt-4">
                              Generate Link
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <div className="p-8 bg-background">
                     <div className="flex items-center justify-between mb-8 border-b-2 border-border pb-4">
                        <span className="text-[12px] font-black uppercase tracking-widest flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-primary" />
                          Live Activity Log
                        </span>
                        <Badge variant="secondary" className="font-mono text-[10px] border-2 border-border">{doc.sessions?.length || 0} Total Sessions</Badge>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {doc.sessions?.length === 0 ? (
                         <p className="col-span-2 text-xs italic text-muted-foreground text-center py-8 bg-muted/10 border-2 border-dashed border-border uppercase tracking-widest">No active signing sessions found.</p>
                       ) : (
                         doc.sessions.map((session: any) => (
                           <div key={session.id} className="flex items-center justify-between p-5 border-2 border-border hover:border-primary transition-all group bg-muted/5 relative shadow-sm">
                             <div className="flex items-center space-x-4">
                               <div className={`w-3 h-3 rounded-full ${session.status === 'completed' ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]' : 'bg-amber-500 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.6)]'}`} />
                               <div>
                                 <p className="text-sm font-black uppercase tracking-tight leading-none">{session.signerName || 'Anonymous Staff'}</p>
                                 <p className="text-[9px] font-mono text-muted-foreground mt-2 lowercase opacity-50 truncate max-w-[150px]">{session.id}</p>
                               </div>
                             </div>
                             <div className="flex items-center space-x-3">
                                <Badge variant={session.status === 'completed' ? 'default' : 'outline'} className={`text-[9px] font-black uppercase h-5 px-2 border-2 ${session.status === 'completed' ? 'bg-green-600 border-green-600' : 'border-current opacity-70'}`}>
                                  {session.status}
                                </Badge>
                                <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-muted border-2 border-transparent hover:border-border" onClick={() => router.push(`/hr/share/${session.id}`)}>
                                  <Share2 className="w-5 h-5" />
                                </Button>
                                {session.status === 'completed' && (
                                  <Button variant="default" size="icon" className="h-10 w-10 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-green-600 hover:bg-green-700 text-white" onClick={() => window.open(`/api/download/${session.id}`, '_blank')}>
                                    <Download className="w-5 h-5" />
                                  </Button>
                                )}
                             </div>
                           </div>
                         ))
                       )}
                     </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
