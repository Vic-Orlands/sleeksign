"use client";

export interface BackgroundUpload {
  id: string;
  name: string;
  status: "uploading" | "success" | "error";
  progress: number; // 0 to 100
  error?: string;
  fileUrl: string; // local object URL (blob:)
  result?: {
    id: string;
    name: string;
    url: string;
    fileUrl?: string;
    createdAt?: string;
  };
}

type Subscriber = (uploads: Record<string, BackgroundUpload>) => void;
type BackgroundUploadStoreWindow = Window & {
  __backgroundUploadStore?: BackgroundUploadStore;
};

class BackgroundUploadStore {
  private uploads: Record<string, BackgroundUpload> = {};
  private subscribers = new Set<Subscriber>();
  private activeRequests: Record<string, XMLHttpRequest> = {};

  constructor() {
    // If in browser, try to restore ongoing uploads (or clear them if they were interrupted)
    if (typeof window !== "undefined") {
      // Clear legacy/dangling sessionStorage on load if needed
    }
  }

  getUploads() {
    return this.uploads;
  }

  getUpload(id: string): BackgroundUpload | undefined {
    return this.uploads[id];
  }

  subscribe(subscriber: Subscriber) {
    this.subscribers.add(subscriber);
    // Initial call
    subscriber(this.uploads);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  private notify() {
    this.subscribers.forEach((sub) => sub({ ...this.uploads }));
  }

  startUpload(file: File, workspaceId: string, docId: string) {
    if (typeof window === "undefined") return;

    const localUrl = URL.createObjectURL(file);

    window.sessionStorage.setItem(
      `sleeksign:uploaded-document:${docId}`,
      JSON.stringify({
        id: docId,
        name: file.name,
        fileUrl: localUrl,
        uploadStatus: "pending_upload",
        createdAt: new Date().toISOString(),
        fields: [],
        sessions: [],
        roleConfigs: [],
        signerRoles: [],
      }),
    );

    const uploadItem: BackgroundUpload = {
      id: docId,
      name: file.name,
      status: "uploading",
      progress: 0,
      fileUrl: localUrl,
    };

    this.uploads[docId] = uploadItem;
    this.notify();

    void this.presignAndUpload(file, workspaceId, docId);
  }

  private async presignAndUpload(file: File, workspaceId: string, docId: string) {
    let uploadUrl = "";

    try {
      const presignResponse = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId: docId,
          workspaceId,
          fileName: file.name,
          fileSize: file.size,
          contentType: "application/pdf",
        }),
      });
      const presignData = await presignResponse.json().catch(() => null);

      if (!presignResponse.ok || !presignData?.uploadUrl) {
        throw new Error(presignData?.error || "Upload failed");
      }

      uploadUrl = presignData.uploadUrl;
    } catch (error) {
      this.handleError(docId, error instanceof Error ? error : new Error("Upload failed"));
      return;
    }

    const xhr = new XMLHttpRequest();
    this.activeRequests[docId] = xhr;

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        this.uploads[docId] = {
          ...this.uploads[docId],
          progress: percent,
        };
        this.notify();
      }
    });

    xhr.addEventListener("load", () => {
      delete this.activeRequests[docId];
      if (xhr.status >= 200 && xhr.status < 300) {
        void fetch("/api/uploads/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ documentId: docId }),
        })
          .then(async (response) => {
            const data = await response.json().catch(() => null);
            if (!response.ok) {
              throw new Error(data?.error || "Upload failed");
            }

            window.sessionStorage.setItem(
              `sleeksign:uploaded-document:${docId}`,
              JSON.stringify({
                id: docId,
                name: data.name,
                fileUrl: data.fileUrl || data.url,
                uploadStatus: "ready",
                createdAt: data.createdAt || new Date().toISOString(),
                fields: [],
                sessions: [],
                roleConfigs: [],
                signerRoles: [],
              }),
            );

            this.uploads[docId] = {
              ...this.uploads[docId],
              status: "success",
              progress: 100,
              result: data,
            };
            this.notify();
          })
          .catch((error) => {
            this.handleError(
              docId,
              error instanceof Error ? error : new Error("Upload failed"),
            );
          });
      } else {
        this.handleError(docId, new Error(`Upload failed (Status: ${xhr.status})`));
      }
    });

    xhr.addEventListener("error", () => {
      delete this.activeRequests[docId];
      this.handleError(docId, new Error("Network error during file upload"));
    });

    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", "application/pdf");
    xhr.send(file);
  }

  private handleError(docId: string, error: Error) {
    this.uploads[docId] = {
      ...this.uploads[docId],
      status: "error",
      error: error.message,
    };
    this.notify();
  }

  cancelUpload(docId: string) {
    const xhr = this.activeRequests[docId];
    if (xhr) {
      xhr.abort();
      delete this.activeRequests[docId];
    }
    
    // Revoke object URL
    const upload = this.uploads[docId];
    if (upload && upload.fileUrl.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(upload.fileUrl);
      } catch {
        // ignore
      }
    }

    delete this.uploads[docId];
    this.notify();
  }

  clearUpload(docId: string) {
    this.cancelUpload(docId);
  }
}

// Global instance in browser
let storeInstance: BackgroundUploadStore;
if (typeof window !== "undefined") {
  const win = window as BackgroundUploadStoreWindow;
  if (!win.__backgroundUploadStore) {
    win.__backgroundUploadStore = new BackgroundUploadStore();
  }
  storeInstance = win.__backgroundUploadStore;
} else {
  storeInstance = new BackgroundUploadStore();
}

export const backgroundUploadStore = storeInstance;

// Custom React hook to subscribe to uploads in components
import { useEffect, useState } from "react";

export function useBackgroundUploads() {
  const [uploads, setUploads] = useState<Record<string, BackgroundUpload>>(() =>
    backgroundUploadStore.getUploads()
  );

  useEffect(() => {
    return backgroundUploadStore.subscribe((nextUploads) => {
      setUploads(nextUploads);
    });
  }, []);

  return uploads;
}

export function useBackgroundUpload(docId: string) {
  const uploads = useBackgroundUploads();
  return uploads[docId];
}
