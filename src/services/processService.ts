import { api } from "./api";

export const processService = {
  async processFiles(masterFiles: File[], config: any, onProgress?: (progress: number) => void) {
    const formData = new FormData();
    masterFiles.forEach(f => formData.append("master_files", f));
    formData.append("config", JSON.stringify(config));

    const response = await api.post("/process", formData, {
      responseType: "blob",
      validateStatus: () => true, // Don't throw on any HTTP status — we handle it below
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    // If the server returned an error, the blob contains the JSON error body
    if (response.status >= 400) {
      const text = await (response.data as Blob).text();
      let detail = `Server error ${response.status}`;
      try {
        const json = JSON.parse(text);
        detail = json.detail || json.message || text;
      } catch {
        detail = text || detail;
      }
      throw new Error(detail);
    }

    return response.data as Blob;
  },
};
