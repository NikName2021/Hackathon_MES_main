import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { getRoomObjects } from "@/api";
import { usePlayerData } from "@/store/player";
import { useRoomId } from "@/store/room";
import { RadioWidget } from "./RadioWidget";

type RolePageLayoutProps = {
  children: ReactNode;
};

/**
 * Обёртка для страниц ролей: рендерит контент и виджет рации внизу справа.
 * room_id и username берутся из данных приглашения (player store).
 */
export function RolePageLayout({ children }: RolePageLayoutProps) {
  const data = usePlayerData();
  const roomId = useRoomId();
  const activeRoomId = data?.room_id ?? roomId;
  const fetchedRoomId = useRef<string | null>(null);

  useEffect(() => {
    if (!activeRoomId) return;
    if (fetchedRoomId.current === activeRoomId) return;
    fetchedRoomId.current = activeRoomId;
    let active = true;

    getRoomObjects(activeRoomId).then(() => {
      if (!active) return;
    })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [activeRoomId]);

  return (
    <>
      {children}
      {data?.room_id && data?.username && (
        <RadioWidget
          roomId={data.room_id}
          identity={data.username}
          isAdmin={false}
        />
      )}
    </>
  );
}
