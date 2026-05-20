import { useState, useCallback } from "react";
import { useAuth } from "./useAuth";
import { getApiUrl } from "@/lib/api";

interface UploadResponse {
  item: {
    id: string;
    title: string;
    fileUrl: string;
    mimeType: string;
  };
  downloadUrl: string;
}

export function useFileUpload() {
  const { token } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = useCallback(
    async (
      file: File,
      categoryId?: string,
      folderId?: string
    ): Promise<UploadResponse> => {
      if (!token) throw new Error("Non authentifié");

      setUploading(true);
      setProgress(0);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", file.name);
        if (categoryId) formData.append("categoryId", categoryId);
        if (folderId) formData.append("folderId", folderId);

        const xhr = new XMLHttpRequest();

        return new Promise((resolve, reject) => {
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const percent = (e.loaded / e.total) * 100;
              setProgress(percent);
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status === 201) {
              try {
                const response = JSON.parse(xhr.responseText) as UploadResponse;
                resolve(response);
              } catch {
                reject(new Error("Réponse serveur invalide"));
              }
            } else {
              reject(new Error(`Erreur ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Erreur réseau"));
          });

          xhr.open("POST", getApiUrl("/files/upload"));
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          xhr.send(formData);
        });
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [token]
  );

  return { upload, uploading, progress };
}
