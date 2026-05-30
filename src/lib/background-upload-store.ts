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

    // Create a local blob/object URL for immediate rendering
    const localUrl = URL.createObjectURL(file);

    // Create the background draft record in sessionStorage
    window.sessionStorage.setItem(
      `sleeksign:uploaded-document:${docId}`,
      JSON.stringify({
        id: docId,
        name: file.name,
        fileUrl: localUrl,
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

    // Start XMLHttpRequest for true progress reporting
    const xhr = new XMLHttpRequest();
    this.activeRequests[docId] = xhr;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("workspaceId", workspaceId);
    formData.append("documentId", docId); // server will use this custom document ID!

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
        try {
          const data = JSON.parse(xhr.responseText);
          
          // Update sessionStorage with actual uploaded file details
          window.sessionStorage.setItem(
            `sleeksign:uploaded-document:${docId}`,
            JSON.stringify({
              id: docId,
              name: data.name,
              fileUrl: data.url,
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
        } catch {
          this.handleError(docId, new Error("Invalid response from server"));
        }
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          this.handleError(docId, new Error(data.error || "Upload failed"));
        } catch {
          this.handleError(docId, new Error(`Upload failed (Status: ${xhr.status})`));
        }
      }
    });

    xhr.addEventListener("error", () => {
      delete this.activeRequests[docId];
      this.handleError(docId, new Error("Network error during file upload"));
    });

    xhr.open("POST", "/api/upload");
    xhr.send(formData);
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
