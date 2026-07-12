export interface BackgroundUpload {
  id: string;
  name: string;
  status: "uploading" | "success" | "error";
  progress: number;
  error?: string;
  fileUrl: string;
  result?: {
    id: string;
    name: string;
    url: string;
    fileUrl?: string;
    createdAt?: string;
  };
}

type Subscriber = () => void;
type UploadCallbacks = {
  onSuccess?: (upload: BackgroundUpload) => void;
  onError?: (error: Error) => void;
};
type BackgroundUploadSnapshot = Record<string, BackgroundUpload>;
type BackgroundUploadStoreWindow = Window & {
  __backgroundUploadStore?: BackgroundUploadStore;
};

class BackgroundUploadStore {
  private uploads: BackgroundUploadSnapshot = {};
  private snapshot: BackgroundUploadSnapshot = {};
  private subscribers = new Set<Subscriber>();
  private activeRequests: Record<string, XMLHttpRequest> = {};
  private callbacks: Record<string, UploadCallbacks> = {};

  getUploads(): BackgroundUploadSnapshot {
    return this.snapshot;
  }

  getUpload(id: string): BackgroundUpload | undefined {
    return this.uploads[id];
  }

  subscribe(subscriber: Subscriber) {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  private notify() {
    this.snapshot = { ...this.uploads };
    this.subscribers.forEach((sub) => sub());
  }

  startUpload(
    file: File,
    workspaceId: string,
    docId: string,
    callbacks: UploadCallbacks = {},
  ) {
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
    this.callbacks[docId] = callbacks;
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
      const presignData = await presignResponse.json();

      if (!presignResponse.ok || !presignData?.uploadUrl) {
        throw new Error(presignData?.error || "Presign response missing uploadUrl");
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
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data?.error || "Upload completion failed without an error message");
            }
            if (!data.fileUrl) {
              throw new Error("Upload completion response missing fileUrl");
            }
            if (!data.createdAt) {
              throw new Error("Upload completion response missing createdAt");
            }

            window.sessionStorage.setItem(
              `sleeksign:uploaded-document:${docId}`,
              JSON.stringify({
                id: docId,
                name: data.name,
                fileUrl: data.fileUrl,
                uploadStatus: "ready",
                createdAt: data.createdAt,
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
            this.callbacks[docId]?.onSuccess?.(this.uploads[docId]);
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
    this.callbacks[docId]?.onError?.(error);
  }

  cancelUpload(docId: string) {
    const xhr = this.activeRequests[docId];
    if (xhr) {
      xhr.abort();
      delete this.activeRequests[docId];
    }
    
    const upload = this.uploads[docId];
    if (upload && upload.fileUrl.startsWith("blob:")) {
      URL.revokeObjectURL(upload.fileUrl);
    }

    delete this.uploads[docId];
    delete this.callbacks[docId];
    this.notify();
  }

  clearUpload(docId: string) {
    this.cancelUpload(docId);
  }
}

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
