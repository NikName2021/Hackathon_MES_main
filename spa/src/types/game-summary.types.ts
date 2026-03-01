import type { DispatcherDispatchItem } from "@/api";
import type { CanvasObject } from "@/types/canvas.types";
import type { RoomInvite } from "@/types/room.types";

export type GameSummary = {
  roomId: string | null;
  endedAt: string;
  invites: RoomInvite[];
  placedItems: any[];
  zoom: number;
  canvasBackground: string | null;
  canvasObjects: CanvasObject[];
  issues: string[];
  dispatches: DispatcherDispatchItem[];
};
