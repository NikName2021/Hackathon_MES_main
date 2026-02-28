export type Role = "ADMIN" | "DISPATCHER" | "RTP" | "NS";

export type InviteRole = Exclude<Role, "ADMIN">;

