import { create } from "zustand";

import type { InviteRoomResponse } from "@/types/invite.types";

type PlayerStateData = {
  inviteToken: string | null;
  data: InviteRoomResponse | null;
};

type PlayerStateFunc = {
  setPlayerData: (data: InviteRoomResponse, inviteToken: string) => void;
  clearPlayerData: () => void;
};

type PlayerState = PlayerStateData & PlayerStateFunc;

const usePlayerStore = create<PlayerState>((set) => ({
  inviteToken: null,
  data: null,
  setPlayerData: (data, inviteToken) =>
    set({
      inviteToken,
      data,
    }),
  clearPlayerData: () => set({ inviteToken: null, data: null }),
}));

export const usePlayerData = () => usePlayerStore((state) => state.data);
export const useInviteToken = () => usePlayerStore((state) => state.inviteToken);
export const setPlayerData = (data: InviteRoomResponse, inviteToken: string) => {
  if (!data) return;
  usePlayerStore.getState().setPlayerData(data, inviteToken);
};
export const clearPlayerData = () => usePlayerStore.getState().clearPlayerData();
