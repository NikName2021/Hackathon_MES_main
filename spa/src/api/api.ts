import axios from "axios";
import { withAuth } from "@/utils/withAuth";
import { setToken } from "@/store/auth";
import { setRoomData, setRoomId } from "@/store/room";
import { setCanvasObjects } from "@/store/canvas";
import { setPlayerData } from "@/store/player";
import type { RoomData, roomId } from "@/types/room.types";
import type { InviteRoomResponse } from "@/types/invite.types";
import type { CanvasObject } from "@/types/canvas.types";

const API_URL = (import.meta.env.VITE_API_URL as string)?.trim() || "";

// На сервере: если API на другом хосте — задайте VITE_API_URL при сборке. Если SPA и API на одном домене — оставьте пустым (нужен прокси /api → бэкенд).
const base = API_URL ? `${API_URL.replace(/\/$/, "")}/api/v1` : "/api/v1";
export const api = axios.create({
  baseURL: base.endsWith("/") ? base : `${base}/`,
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

export async function addPlayers(room_id: string) {
  try {
    const { data } = await apiAuth.get<RoomData>(`room/add_users/${room_id}`);
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

export async function createRoom() {
  try {
    const { data } = await apiAuth.get<roomId>("room/create-room");
    setRoomId(data.room_id);
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
    const accessToken =
      data.tokens?.access_token ??
      (data as unknown as { access_token?: { access_token?: string } })
        .access_token?.access_token;
    if (accessToken) {
      setToken(accessToken);
    }
    console.log(data);
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

export async function registerParams(
  room_id: string,
  serviceability_water: boolean,
  wind: number,
  temperature: number,
  time: string,
) {
  try {
    await apiAuth.post("room_params/room-params", {
      room_id,
      serviceability_water,
      wind,
      temperature,
      time,
    });
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

export async function registerImage(room_id: string, objects: CanvasObject[]) {
  try {
    await apiAuth.post(`room_params/${room_id}/objects`, { room_id, objects });
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


interface CanvasObjectResponse {
  objects: CanvasObject[]
  room_id: string
}
export async function getRoomObjects(room_id: string) {
  try {
    const { data } = await apiAuth.get<CanvasObjectResponse>(`room_params/${room_id}/objects`);
    const objects = Array.isArray(data.objects) ? data.objects : [];
    const normalized = objects
      .filter((obj): obj is CanvasObject => Boolean(obj && obj.type))
      .map((obj) => {
        const rotation = (obj as { rotation?: number }).rotation ?? 0;
        const color = (obj as { color?: string }).color ?? "#F97316";
        if (obj.type === "line") {
          return {
            ...obj,
            x1: Number(obj.x1) || 0,
            y1: Number(obj.y1) || 0,
            x2: Number(obj.x2) || 0,
            y2: Number(obj.y2) || 0,
            strokeWidth: Number(obj.strokeWidth) || 2,
            rotation,
            color,
          } as CanvasObject;
        }
        if (obj.type === "rect") {
          return {
            ...obj,
            x: Number(obj.x) || 0,
            y: Number(obj.y) || 0,
            width: Math.abs(Number(obj.width) || 0),
            height: Math.abs(Number(obj.height) || 0),
            strokeWidth: Number(obj.strokeWidth) || 2,
            rotation,
            color,
          } as CanvasObject;
        }
        if (obj.type === "circle") {
          return {
            ...obj,
            x: Number(obj.x) || 0,
            y: Number(obj.y) || 0,
            radius: Math.abs(Number(obj.radius) || 0),
            strokeWidth: Number(obj.strokeWidth) || 2,
            rotation,
            color,
          } as CanvasObject;
        }
        if (obj.type === "fire") {
          return {
            ...obj,
            x: Number(obj.x) || 0,
            y: Number(obj.y) || 0,
            radius: Math.abs(Number(obj.radius) || 8),
            rotation,
            color: (obj as { color?: string }).color ?? "#EF4444",
          } as CanvasObject;
        }
        return null;
      })
      .filter(Boolean) as CanvasObject[];
    setCanvasObjects(normalized);
    return normalized;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const payload = error.response?.data as
        | { detail?: string }
        | string
        | undefined;
      const message = typeof payload === "string" ? payload : payload?.detail;
      throw new Error(message)
    }
    throw new Error("неизвестная ошибка");
  }
}

export interface RoomStateResponse {
  room_id: string;
  state: { timer_started_at?: string };
}

export async function getRoomState(room_id: string): Promise<RoomStateResponse> {
  const { data } = await apiAuth.get<RoomStateResponse>(`room/${room_id}/state`);
  return data;
}

/** Таймер комнаты — без авторизации, для отображения у всех участников */
export interface RoomTimerResponse {
  room_id: string;
  timer_started_at: string | null;
}

export async function getRoomTimer(room_id: string): Promise<RoomTimerResponse> {
  const { data } = await api.get<RoomTimerResponse>(`room/${room_id}/timer`);
  return data;
}

/** Состояние симуляции: таймер и высылка техники диспетчером */
export interface DispatcherDispatchItem {
  vehicleId: string;
  vehicleName: string;
  count: number;
  etaMinutes: number;
  sentAt: string;
}

export interface SimulationStateResponse {
  room_id: string;
  timer_started_at: string | null;
  dispatcher_dispatches: DispatcherDispatchItem[];
  headquarters_created?: boolean;
  combat_sections_added?: number;
}

export async function getSimulationState(
  room_id: string
): Promise<SimulationStateResponse> {
  const { data } = await api.get<SimulationStateResponse>(
    `room/${room_id}/simulation-state`
  );
  return data;
}

export async function postRtpCreateHeadquarters(
  room_id: string
): Promise<{ ok: boolean; headquarters_created: boolean }> {
  const { data } = await api.post<{ ok: boolean; headquarters_created: boolean }>(
    `room/${room_id}/rtp-create-headquarters`
  );
  return data;
}

export async function postHeadquartersAddCombatSection(
  room_id: string
): Promise<{ ok: boolean; combat_sections_added: number }> {
  const { data } = await api.post<{ ok: boolean; combat_sections_added: number }>(
    `room/${room_id}/headquarters-add-combat-section`
  );
  return data;
}

export async function postDispatcherDispatch(
  room_id: string,
  payload: {
    vehicleId: string;
    vehicleName: string;
    count: number;
    etaMinutes: number;
  }
): Promise<{ ok: boolean; sent_at: string }> {
  const { data } = await api.post<{ ok: boolean; sent_at: string }>(
    `room/${room_id}/dispatcher-dispatch`,
    payload
  );
  return data;
}

/** Протокол действий диспетчера */
export interface DispatcherActionItem {
  id: number;
  room_id: string;
  user_id: number;
  call_sign: string;
  action: string;
  date: string;
  updated_at?: string;
}

export async function createDispatcherAction(payload: {
  room_id: string;
  user_id: number;
  call_sign: string;
  action: string;
  date: string;
}): Promise<DispatcherActionItem> {
  const { data } = await apiAuth.post<DispatcherActionItem>(
    "dispatcher-actions/",
    payload
  );
  return data;
}

export async function getDispatcherActionsByRoom(
  room_id: string
): Promise<DispatcherActionItem[]> {
  try {
    const { data } = await apiAuth.get<DispatcherActionItem[]>(
      `dispatcher-actions/room/${room_id}`
    );
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return [];
    }
    throw err;
  }
}

