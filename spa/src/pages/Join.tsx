import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export function JoinPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId =
      params.get("roomId") || params.get("room") || params.get("role");
    if (roomId) {
      navigate(`/room/${roomId.toUpperCase()}`, { replace: true });
    }
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Ссылка не распознана</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-slate-600">
          Используйте ссылку вида /room/DISPATCHER, /room/RTP или /room/NS.
          <Button onClick={() => navigate("/")}>Вернуться на главную</Button>
        </CardContent>
      </Card>
    </div>
  );
}
