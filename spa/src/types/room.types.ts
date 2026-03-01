export type RoomInvite = {
  role: string;
  invite_token: string;
  url: string;
};

export type RoomData = {
  invites: RoomInvite[];
};

export type roomId = {
  room_id: string
}