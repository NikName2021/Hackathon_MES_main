import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { PATHS } from "@/config/paths";
import { LoginButton } from "@/components/LoginButton";
import { createRoom } from "@/api";

export function HomePage() {
  const navigate = useNavigate();
  const handleCreateRoom = () => {
   createRoom().then(() => navigate(PATHS.OPTIONS))
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="absolute top-4 right-4 z-50">
        <LoginButton onClick={() => navigate(PATHS.LOGIN)} />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-10">
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="h-12 px-8 text-base text-white shadow-lg hover:opacity-95 transition-opacity"
              style={{ background: "linear-gradient(135deg, var(--accent-dark) 0%, var(--accent-light) 100%)", boxShadow: "0 4px 20px var(--accent-muted)" }}
              onClick={handleCreateRoom}
            >
              Создать комнату
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 text-base border-white/40 bg-white/10 text-white hover:bg-white/20"
              asChild
            >
              <Link to={PATHS.JOIN}>Присоединиться к комнате</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
