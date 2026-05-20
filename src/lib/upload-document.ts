type UploadDocumentResult = {
  id: string;
  name: string;
  url: string;
};

function getUploadErrorMessage(data: unknown, fallback = "Upload failed") {
  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) return message;
  }

  return fallback;
}

async function uploadDocument(file: File, workspaceId: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("workspaceId", workspaceId);

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

  return data as UploadDocumentResult;
}

export { uploadDocument };
