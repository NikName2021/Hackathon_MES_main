import { create } from "zustand";

import type { RoomData, RoomInvite } from "@/types/room.types";

type RoomStateData = {
  roomId: string | null;
  invites: RoomInvite[];
};

type RoomStateFunc = {
  setRoomData: (data: RoomData) => void;
  clearRoomData: () => void;
};

type RoomState = RoomStateData & RoomStateFunc;

const useRoomStore = create<RoomState>((set) => ({
  roomId: null,
  invites: [],
  setRoomData: (data) =>
    set({
      roomId: data.room_id,
      invites: data.invites,
    }),
  clearRoomData: () => set({ roomId: null, invites: [] }),
}));

export const useRoomId = () => useRoomStore((state) => state.roomId);
export const useRoomInvites = () => useRoomStore((state) => state.invites);
export const setRoomData = (data: RoomData) => {
  if (!data) return;
  useRoomStore.getState().setRoomData(data);
};
export const clearRoomData = () => useRoomStore.getState().clearRoomData();
