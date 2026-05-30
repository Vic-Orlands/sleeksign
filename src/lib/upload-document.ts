type UploadDocumentResult = {
  id: string;
  name: string;
  url: string;
  createdAt?: string;
};

function getUploadErrorMessage(data: unknown, fallback = "Upload failed") {
  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) return message;
  }

  return fallback;
}

async function uploadDocument(file: File, workspaceId?: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (workspaceId?.trim()) {
    formData.append("workspaceId", workspaceId);
  }

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });
  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getUploadErrorMessage(data));
  }

  if (!data || typeof data !== "object" || typeof (data as UploadDocumentResult).id !== "string") {
    throw new Error("Upload failed");
  }

  if (typeof window !== "undefined") {
    const uploadedDocument = data as UploadDocumentResult;
    window.sessionStorage.setItem(
      `sleeksign:uploaded-document:${uploadedDocument.id}`,
      JSON.stringify({
        id: uploadedDocument.id,
        name: uploadedDocument.name,
        fileUrl: uploadedDocument.url,
        createdAt: uploadedDocument.createdAt || new Date().toISOString(),
        fields: [],
        sessions: [],
        roleConfigs: [],
        signerRoles: [],
      }),
    );
  }

  return data as UploadDocumentResult;
}

export { uploadDocument };
