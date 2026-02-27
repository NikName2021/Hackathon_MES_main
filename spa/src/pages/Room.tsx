import { useNavigate, useParams } from "react-router-dom";

import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import type { Role } from "../types/types";

export function RoomPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();

  const role = roomId?.toUpperCase() ?? "";
  const isValidRole = ["ADMIN", "DISPATCHER", "RTP", "NS"].includes(role);
  const roleLabel: Record<Role, string> = {
    ADMIN: "Администратор",
    DISPATCHER: "Диспетчер (Д)",
    RTP: "Руководитель тушения пожара (РТП)",
    NS: "Начальник штаба (НШ)",
  };

  if (!roomId || !isValidRole) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Некорректная роль</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Используйте ссылку вида /room/DISPATCHER, /room/RTP или /room/NS.
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate("/")}>На главную</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Комната #{roomId}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-700">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="font-semibold text-slate-900">Ваша роль</div>
            <div>{roleLabel[role as Role]}</div>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="font-semibold text-slate-900">Статус</div>
            <div>connected: mocked</div>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="font-semibold text-slate-900">PTT status</div>
            <div>(mock) никто не говорит</div>
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button variant="outline" onClick={() => navigate("/")}>
            Выйти
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
