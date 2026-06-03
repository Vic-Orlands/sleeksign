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
  const presignResponse = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileName: file.name,
      fileSize: file.size,
      contentType: "application/pdf",
      workspaceId,
    }),
  });
  const presignData: unknown = await presignResponse.json().catch(() => null);

  if (!presignResponse.ok) {
    throw new Error(getUploadErrorMessage(presignData));
  }

  if (
    !presignData ||
    typeof presignData !== "object" ||
    typeof (presignData as UploadDocumentResult & { uploadUrl?: string }).id !== "string" ||
    typeof (presignData as UploadDocumentResult & { uploadUrl?: string }).uploadUrl !== "string"
  ) {
    throw new Error("Upload failed");
  }

  const presignedUpload = presignData as UploadDocumentResult & {
    uploadUrl: string;
    fileUrl?: string;
  };
  const uploadResponse = await fetch(presignedUpload.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "application/pdf",
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Upload failed");
  }

  const completeResponse = await fetch("/api/uploads/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ documentId: presignedUpload.id }),
  });
  const data: unknown = await completeResponse.json().catch(() => null);

  if (!completeResponse.ok) {
    throw new Error(getUploadErrorMessage(data));
  }

  if (typeof window !== "undefined") {
    const uploadedDocument = data as UploadDocumentResult & { fileUrl?: string };
    window.sessionStorage.setItem(
      `sleeksign:uploaded-document:${uploadedDocument.id}`,
      JSON.stringify({
        id: uploadedDocument.id,
        name: uploadedDocument.name,
        fileUrl: uploadedDocument.fileUrl || uploadedDocument.url,
        uploadStatus: "ready",
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
