import { setToken } from "@/store/auth";
import axios from "axios";

const API_URL =
  (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";

const api = axios.create({
  baseURL: `${API_URL}api/v1/`,
});

interface User {
  id: number;
  username: string;
}
interface LoginResponse {
  access_token?: string;
  token_type?: string;
  user: User;
}

export async function loginRequest(login: string, password: string) {
  try {
    const { data } = await api.post<LoginResponse>("auth/login", {
      username: login,
      password,
    });
    console.log(data);
    const token = data.access_token;
    setToken(token ? token : "");
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const payload = error.response?.data as
        | { detail?: string }
        | string
        | undefined;
      const message = typeof payload === "string" ? payload : payload?.detail;
      throw new Error(message || "Ошибка входа");
    }
    throw new Error("Ошибка входа");
  }
}

export { API_URL };
