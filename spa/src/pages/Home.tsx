import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import type { Role } from "../types/types";

type ViewState = "choice" | "join" | "created";

const ROLES: { code: Role; label: string }[] = [
  { code: "DISPATCHER", label: "Диспетчер (Д)" },
  { code: "RTP", label: "Руководитель тушения пожара (РТП)" },
  { code: "NS", label: "Начальник штаба (НШ)" },
];

const ROLE_SET = new Set<Role>(["ADMIN", "DISPATCHER", "RTP", "NS"]);

export function HomePage() {
  const navigate = useNavigate();
  const origin = window.location.origin;

  const [view, setView] = useState<ViewState>("choice");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    setView("created");
    setError(null);
  };

  const handleJoin = () => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Введите код роли или ссылку.");
      return;
    }

    let value = trimmed;
    if (trimmed.includes("/")) {
      try {
        const url = new URL(trimmed, window.location.origin);
        const parts = url.pathname.split("/").filter(Boolean);
        value = parts[parts.length - 1] ?? "";
      } catch {
        const parts = trimmed.split("/").filter(Boolean);
        value = parts[parts.length - 1] ?? "";
      }
    }

    const role = value.toUpperCase() as Role;
    if (!ROLE_SET.has(role) || role === "ADMIN") {
      setError("Неверный код роли. Используйте DISPATCHER, RTP или NS.");
      return;
    }

    navigate(`/room/${role}`);
  };

  return (
    <Dialog open>
      <DialogContent>
        {view === "choice" && (
          <>
            <DialogHeader>
              <DialogTitle>Старт комнаты</DialogTitle>
              <DialogDescription>
                Создайте новую комнату или присоединитесь по приглашению.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Button onClick={handleCreate}>Создать комнату</Button>
              <Button variant="secondary" onClick={() => setView("join")}>
                Присоединиться к комнате
              </Button>
            </div>
          </>
        )}

        {view === "join" && (
          <>
            <DialogHeader>
              <DialogTitle>Присоединиться</DialogTitle>
              <DialogDescription>
                Введите код роли или ссылку от бэка.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <Input
                placeholder="DISPATCHER / RTP / NS или ссылка"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleJoin();
                  }
                }}
              />
              {error && <div className="text-sm text-red-600">{error}</div>}
              <div className="flex gap-2">
                <Button onClick={handleJoin}>Войти</Button>
                <Button variant="outline" onClick={() => setView("choice")}>
                  Назад
                </Button>
              </div>
            </div>
          </>
        )}

        {view === "created" && (
          <>
            <DialogHeader>
              <DialogTitle>Комната создана</DialogTitle>
              <DialogDescription>
                Пока используем фиксированные роли. Бэк будет отдавать настоящие ссылки.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              {ROLES.map((role) => (
                <div
                  key={role.code}
                  className="rounded-lg border border-slate-200 bg-white/80 p-4"
                >
                  <div className="text-base font-semibold text-slate-900">
                    {role.label}
                  </div>
                  <div className="mt-3 text-xs font-medium text-slate-500">
                    Ссылка
                  </div>
                  <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    {origin}/room/{role.code}
                  </div>
                  <div className="mt-3 text-xs font-medium text-slate-500">
                    Код
                  </div>
                  <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    {role.code}
                  </div>
                </div>
              ))}
              <Button variant="outline" onClick={() => setView("choice")}>
                Создать ещё или присоединиться
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
