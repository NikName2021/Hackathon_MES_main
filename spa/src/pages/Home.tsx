import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { PATHS } from "@/config/paths";
import { LoginButton } from "@/components/LoginButton";

export function HomePage() {
  const navigate = useNavigate();
  const handleCreateRoom = () => {
   navigate(PATHS.OPTIONS)
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
              className="h-12 px-8 text-base bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-white shadow-lg shadow-orange-500/30 hover:from-red-500 hover:via-orange-500 hover:to-amber-400"
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
