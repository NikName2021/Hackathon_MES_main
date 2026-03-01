import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthStateData = {
  token: string | null;
};

type AuthStateFunc =  {
  setToken: (token: string) => void;
  clearToken: () => void;
};

type AuthState = AuthStateData & AuthStateFunc;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (token) => set({ token }),
      clearToken: () => set({ token: null }),
    }),
    {
      name: "auth-token", 
    }
  )
);

export const useToken = () => useAuthStore((state) => state.token);
export const setToken = (token: string) => {
  if (!token) return;
  useAuthStore.getState().setToken(token)
};
export const clearToken = () => useAuthStore.getState().clearToken();