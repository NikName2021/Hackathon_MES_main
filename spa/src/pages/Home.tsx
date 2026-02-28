import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { PATHS } from "@/config/paths";

export function HomePage() {

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Button
          size="lg"
          className="h-12 px-8 text-base bg-gradient-to-r from-amber-600 via-orange-600 to-rose-500 text-white shadow-lg shadow-orange-500/30 hover:from-amber-500 hover:via-orange-500 hover:to-rose-400"
          asChild
        >
          <Link to={PATHS.ROOM + '/1'}>Создать комнату</Link>
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-12 px-8 text-base border-white/70 bg-white/70 backdrop-blur hover:bg-white"
          asChild
        >
          <Link to={PATHS.JOIN}>Присоединиться к комнате</Link>
        </Button>
      </div>
    </main>
  );
}
