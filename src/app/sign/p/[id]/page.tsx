"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function PublicSignLanding() {
  const { id } = useParams();
  const router = useRouter();
  const [doc, setDoc] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");

  useEffect(() => {
    fetch(`/api/documents/${id}`)
      .then(res => res.json())
      .then(data => {
        setDoc(data);
        setIsLoading(false);
      })
      .catch(err => {
        toast.error("Document not found");
        setIsLoading(false);
      });
  }, [id]);

  const startSigning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName) {
      toast.error("Please enter your name");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        body: JSON.stringify({
          documentId: id,
          signerName,
          signerEmail
        }),
      });
      const data = await res.json();
      if (data.sessionId) {
        router.push(`/sign/${data.sessionId}`);
      }
    } catch (err) {
      toast.error("Failed to initialize signing session");
      setIsCreating(false);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center bg-muted/10"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>;

  if (!doc) return <div className="h-screen flex items-center justify-center">Document not found</div>;

  return (
    <div className="min-h-screen bg-muted/20 flex items-center justify-center p-4 md:p-8 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
      <Card className="max-w-xl w-full border-4 border-primary shadow-[24px_24px_0px_0px_rgba(0,0,0,1)] rounded-none">
        <CardContent className="p-12 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <h1 className="text-4xl font-black tracking-tighter uppercase italic leading-none text-primary">SleekSign.</h1>
              <Badge variant="outline" className="border-2 border-primary font-black uppercase text-[8px] h-5">VERIFIED DOC</Badge>
            </div>
            <div className="bg-muted/50 p-6 border-2 border-border space-y-2 relative overflow-hidden">
              <div className="flex items-center space-x-3 text-muted-foreground mb-1">
                <FileText className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Document to sign</span>
              </div>
              <h2 className="text-2xl font-bold uppercase tracking-tight truncate">{doc.name}</h2>
              <ShieldCheck className="absolute -bottom-2 -right-2 w-16 h-16 opacity-5 text-primary" />
            </div>
          </div>

          <form onSubmit={startSigning} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Your Full Name</Label>
                <Input
                  placeholder="Enter your name to begin..."
                  value={signerName}
                  onChange={e => setSignerName(e.target.value)}
                  required
                  className="border-2 border-border focus:border-primary rounded-none h-14 text-lg font-medium shadow-inner"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-black uppercase text-[10px] tracking-widest text-muted-foreground">Email Address (Optional)</Label>
                <Input
                  placeholder="For your signature record..."
                  type="email"
                  value={signerEmail}
                  onChange={e => setSignerEmail(e.target.value)}
                  className="border-2 border-border focus:border-primary rounded-none h-14 text-lg font-medium shadow-inner"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isCreating}
              className="w-full h-16 font-black uppercase tracking-widest text-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all bg-primary text-primary-foreground"
            >
              {isCreating ? <Loader2 className="animate-spin mr-2" /> : "Start Signing"} <ArrowRight className="ml-2 w-6 h-6" />
            </Button>
          </form>

          <p className="text-[10px] text-muted-foreground font-mono text-center uppercase tracking-tighter leading-relaxed">
            By clicking "Start Signing", you agree to use electronic signatures<br/>
            which are legally binding under the Electronic Signatures Act.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
