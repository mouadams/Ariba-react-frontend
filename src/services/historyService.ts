import { api } from "./api";

export const historyService = {
  async getHistory() {
    const response = await api.get("/history");
    return response.data;
  },

  async downloadHistory(id: string) {
    const response = await api.get(`/download/${id}`, {
      responseType: "blob",
    });
    return response.data;
  },

  async deleteHistory(id: string | number) {
    const response = await api.delete(`/files/${id}`);
    return response.data;
  },
};
