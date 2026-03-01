import { Route, Routes } from "react-router-dom";

import { RolePageLayout } from "@/components/RolePageLayout";
import { HomePage } from "@/pages/Home";
import { JoinPage } from "@/pages/Join";
import { RoomPage } from "@/pages/Room";
import { PATHS } from "../config/paths";
import { LoginPage } from "@/pages/Login";
import { InvitePage } from "@/pages/Invite";
import { OptionsRoomPage } from "@/pages/OptionsRoom";
import { GameResultPage } from "@/pages/GameResult";
import DispatcherRole from "@/roles/pages/Dispatcher";
import RTPRole from "@/roles/pages/RTP";
import HeadquartersRole from "@/roles/pages/Headquarters";
import CombatSection1Role from "@/roles/pages/CombatSection1";
import CombatSection2Role from "@/roles/pages/CombatSection2";

export function AppRouter() {
  const navigations = [
    { path: PATHS.ROOT, element: <HomePage /> },
    { path: PATHS.JOIN, element: <JoinPage /> },
    { path: PATHS.JOIN_ID, element: <JoinPage /> },
    { path: PATHS.ROOM_ID, element: <RoomPage /> },
    { path: PATHS.LOGIN, element: <LoginPage /> },
    { path: PATHS.INVITE, element: <InvitePage /> },
    { path: PATHS.JOIN_ID, element: <JoinPage /> },
    { path: PATHS.OPTIONS, element: <OptionsRoomPage /> },
    { path: PATHS.RESULT, element: <GameResultPage /> },
    { path: PATHS.ROLE_DISPATCHER, element: <RolePageLayout><DispatcherRole /></RolePageLayout> },
    { path: PATHS.ROLE_RTP, element: <RolePageLayout><RTPRole /></RolePageLayout> },
    { path: PATHS.ROLE_HEADQUARTERS, element: <RolePageLayout><HeadquartersRole /></RolePageLayout> },
    { path: PATHS.ROLE_COMBAT_SECTION_1, element: <RolePageLayout><CombatSection1Role /></RolePageLayout> },
    { path: PATHS.ROLE_COMBAT_SECTION_2, element: <RolePageLayout><CombatSection2Role /></RolePageLayout> },
  ] as const;

  return (
    <Routes>
      {navigations.map(({ path, element }) => (
        <Route key={path} path={path} element={element} />
      ))}
    </Routes>
  );
}
