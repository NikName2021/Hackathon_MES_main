export type RoomParamsResponse = {
  room_id: string;
  serviceability_water: boolean | "ok" | "partial" | "fail";
  wind: number;
  temperature: number;
  time: string;
};
