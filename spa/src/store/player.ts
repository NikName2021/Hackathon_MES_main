import { create } from "zustand";

import type { InviteRoomResponse } from "@/types/invite.types";

const PLAYER_STORAGE_KEY = "mes_player_data";

function getStored(): { inviteToken: string | null; data: InviteRoomResponse | null } {
  if (typeof window === "undefined") return { inviteToken: null, data: null };
  try {
    const raw = localStorage.getItem(PLAYER_STORAGE_KEY);
    if (!raw) return { inviteToken: null, data: null };
    const parsed = JSON.parse(raw) as { inviteToken: string; data: InviteRoomResponse };
    if (parsed?.data?.room_id && parsed?.data?.username) {
      return { inviteToken: parsed.inviteToken ?? null, data: parsed.data };
    }
  } catch {
    /* ignore */
  }
  return { inviteToken: null, data: null };
}

function saveStored(inviteToken: string | null, data: InviteRoomResponse | null) {
  if (typeof window === "undefined") return;
  try {
    if (inviteToken && data) {
      localStorage.setItem(PLAYER_STORAGE_KEY, JSON.stringify({ inviteToken, data }));
    } else {
      localStorage.removeItem(PLAYER_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

type PlayerStateData = {
  inviteToken: string | null;
  data: InviteRoomResponse | null;
};

type PlayerStateFunc = {
  setPlayerData: (data: InviteRoomResponse, inviteToken: string) => void;
  clearPlayerData: () => void;
};

type PlayerState = PlayerStateData & PlayerStateFunc;

const stored = getStored();

const usePlayerStore = create<PlayerState>((set) => ({
  inviteToken: stored.inviteToken,
  data: stored.data,
  setPlayerData: (data, inviteToken) => {
    saveStored(inviteToken, data);
    set({ inviteToken, data });
  },
  clearPlayerData: () => {
    saveStored(null, null);
    set({ inviteToken: null, data: null });
  },
}));

export const usePlayerData = () => usePlayerStore((state) => state.data);
export const useInviteToken = () => usePlayerStore((state) => state.inviteToken);
export const setPlayerData = (data: InviteRoomResponse, inviteToken: string) => {
  if (!data) return;
  usePlayerStore.getState().setPlayerData(data, inviteToken);
};
export const clearPlayerData = () => usePlayerStore.getState().clearPlayerData();
