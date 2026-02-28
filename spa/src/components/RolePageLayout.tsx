import type { ReactNode } from "react";
import { usePlayerData } from "@/store/player";
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
