export const PATHS = {
    ROOT: "/",
    JOIN: "/join",
    JOIN_ID: "/join/:tokenId",
    ROOM: "/room",
    LOGIN: "/login",
    ROOM_ID: "/room/:roomId",
    INVITE: "/invite/:tokenId",
    /** Страницы ролей (после «Готово» в приглашении) */
    ROLE_DISPATCHER: "/dispatcher",
    ROLE_RTP: "/rtp",
    ROLE_HEADQUARTERS: "/headquarters",
    ROLE_COMBAT_SECTION_1: "/combat-section-1",
    ROLE_COMBAT_SECTION_2: "/combat-section-2",
}

/** Роль с бэкенда (рус.) -> путь страницы */
export const ROLE_TO_PATH: Record<string, string> = {
    "Диспетчер": PATHS.ROLE_DISPATCHER,
    "РТП": PATHS.ROLE_RTP,
    "штаб": PATHS.ROLE_HEADQUARTERS,
    "БУ1": PATHS.ROLE_COMBAT_SECTION_1,
    "БУ2": PATHS.ROLE_COMBAT_SECTION_2,
}
