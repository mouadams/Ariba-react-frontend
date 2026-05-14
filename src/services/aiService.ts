import { api } from "./api";

export const aiService = {
  async detectConfiguration(dfJson: string, fileName: string, cacheBuster: string = "v1") {
    const response = await api.post("/ai/detect-configuration", {
      df_json: dfJson,
      file_name: fileName,
      cache_buster: cacheBuster,
    });
    return response.data;
  },
};
