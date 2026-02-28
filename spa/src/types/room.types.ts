export type RoomInvite = {
  role: string;
  invite_token: string;
  url: string;
};

export type RoomData = {
  room_id: string;
  invites: RoomInvite[];
};
