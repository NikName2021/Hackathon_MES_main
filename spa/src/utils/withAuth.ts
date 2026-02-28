import type { AxiosRequestConfig } from "axios";
import { authToken } from "./authToken";

export function withAuth(config: AxiosRequestConfig) {
  const token = authToken.get();
  if (token) {
    config.headers = {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
}
