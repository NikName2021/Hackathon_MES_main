import { Route, Routes } from "react-router-dom";

import { HomePage } from "@/pages/Home";
import { JoinPage } from "@/pages/Join";
import { RoomPage } from "@/pages/Room";
import { PATHS } from "../config/paths";
import { LoginPage } from "@/pages/Login";

export function AppRouter() {
  const navigations = [
    { path: PATHS.ROOT, element: <HomePage /> },
    { path: PATHS.JOIN, element: <JoinPage /> },
    { path: PATHS.ROOM_ID, element: <RoomPage /> },
    { path: PATHS.LOGIN, element: <LoginPage /> },
  ] as const;

  return (
    <Routes>
      {navigations.map(({ path, element }) => (
        <Route key={path} path={path} element={element} />
      ))}
    </Routes>
  );
}