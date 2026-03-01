export type InviteAccessToken = {
  access_token: string;
  token_type: string;
  user: unknown | null;
};

export type InviteRoomResponse = {
  message: string;
  user_id: number;
  username: string;
  role: string;
  room_id: string;
  tokens: InviteAccessToken;
  token_type: string;
};
