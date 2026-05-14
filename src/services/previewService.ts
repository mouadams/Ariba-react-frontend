import { api } from "./api";

export const previewService = {
  async getPreview(files: File[]) {
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));

    const response = await api.post("/preview", formData);

    return response.data;
  },
};
