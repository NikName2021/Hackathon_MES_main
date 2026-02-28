import { useAuthStore } from "@/store/auth";

export const authToken = {
  get: () => useAuthStore.getState().token,
  set: (token: string) => useAuthStore.getState().setToken(token),
  clear: () => useAuthStore.getState().clearToken(),
};