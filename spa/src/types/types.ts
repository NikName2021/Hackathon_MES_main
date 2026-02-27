export type Role = "ADMIN" | "DISPATCHER" | "RTP" | "NS";

export type InviteRole = Exclude<Role, "ADMIN">;

export type Session = {
  roomId: string;
  role: Role;
  userId: string;
};

export type RoomRecord = {
  createdAt: string;
};
