import axios from "axios";
import { withAuth } from "@/utils/withAuth";
import { setToken } from "@/store/auth";
import { setRoomData } from "@/store/room";
import { setPlayerData } from "@/store/player";
import type { RoomData } from "@/types/room.types";
import type { InviteRoomResponse } from "@/types/invite.types";

const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
});

export const apiAuth = {
  get: <T>(url: string, config = {}) => api.get<T>(url, withAuth(config)),
  post: <T>(url: string, data?: unknown, config = {}) =>
    api.post<T>(url, data, withAuth(config)),
};


interface User {
  id: number;
  username: string;
}
interface UserLoginResponse {
  access_token?: string;
  token_type?: string;
  user: User;
}

export async function loginRequest(login: string, password: string) {
  try {
    const { data } = await api.post<UserLoginResponse>("auth/login", {
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

export async function createRoom() {
  try {
    const { data } = await apiAuth.get<RoomData>("room/create-room");
    setRoomData(data);
    return data;
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

export async function getInviteRoom(inviteToken: string, username: string) {
  try {
    const { data } = await api.get<InviteRoomResponse>("invite/room", {
      params: { invite_token: inviteToken, username },
    });
    setPlayerData(data, inviteToken);
    console.log(data)
    return data;
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
