type UploadDocumentResult = {
  id: string;
  name: string;
  url: string;
  createdAt?: string;
};

function getUploadErrorMessage(data: unknown) {
  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error?: unknown }).error;
    if (typeof message === "string" && message.trim()) return message;
  }

  throw new Error("Upload response did not include an error message");
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
  const presignData: unknown = await presignResponse.json();

  if (!presignResponse.ok) {
    throw new Error(getUploadErrorMessage(presignData));
  }

  if (
    !presignData ||
    typeof presignData !== "object" ||
    typeof (presignData as UploadDocumentResult & { uploadUrl?: string }).id !== "string" ||
    typeof (presignData as UploadDocumentResult & { uploadUrl?: string }).uploadUrl !== "string"
  ) {
    throw new Error("Presign response missing document id or uploadUrl");
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
    throw new Error(`Direct upload failed with status ${uploadResponse.status}`);
  }

  const completeResponse = await fetch("/api/uploads/complete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ documentId: presignedUpload.id }),
  });
  const data: unknown = await completeResponse.json();

  if (!completeResponse.ok) {
    throw new Error(getUploadErrorMessage(data));
  }

  const uploadedDocument = data as UploadDocumentResult & { fileUrl?: string };
  if (!uploadedDocument.fileUrl) {
    throw new Error("Upload completion response missing fileUrl");
  }

  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(
      `sleeksign:uploaded-document:${uploadedDocument.id}`,
      JSON.stringify({
        id: uploadedDocument.id,
        name: uploadedDocument.name,
        fileUrl: uploadedDocument.fileUrl,
        uploadStatus: "ready",
        createdAt: uploadedDocument.createdAt,
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
