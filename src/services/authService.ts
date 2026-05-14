import { api } from "./api";

export const authService = {
  async login(email: string, password: string) {
    const params = new URLSearchParams();
    params.append("username", email);
    params.append("password", password);

    const response = await api.post("/token", params, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return response.data;
  },

  async register(fullName: string, email: string, password: string, otpCode?: string) {
    const payload: any = {
      full_name: fullName,
      email,
      password,
    };
    if (otpCode) {
      payload.otp_code = otpCode;
    }
    const response = await api.post("/register", payload);
    return response.data;
  },

  async sendOtp(email: string, purpose: string = "registration") {
    const response = await api.post("/send-otp", {
      email,
      purpose,
    });
    return response.data;
  },

  async verifyOtp(email: string, otp_code: string, purpose: string = "registration") {
    const response = await api.post("/verify-otp", {
      email,
      otp_code,
      purpose,
    });
    return response.data;
  },
};
