import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { PATHS } from "@/config/paths";
import { useRoomGameSocket } from "@/hooks/useRoomGameSocket";

type GameEndedOverlayProps = {
  /** roomId для подключения к WebSocket (если gameEnded не передан) */
  roomId?: string | null;
  /** Готовое значение — используется, если передан (из родительского useRoomGameSocket) */
  gameEnded?: boolean;
};

/**
 * Оверлей «Завершение игры» — показывается всем игрокам, когда администратор
 * нажимает «Закончить игру». Подключается к WebSocket комнаты и отображает
 * модальное окно при получении события game_ended.
 */
export function GameEndedOverlay({ roomId, gameEnded: gameEndedProp }: GameEndedOverlayProps) {
  const { gameEnded: gameEndedFromSocket } = useRoomGameSocket(
    gameEndedProp !== undefined ? null : (roomId ?? null)
  );
  const gameEnded = gameEndedProp === true || gameEndedFromSocket === true;
  const navigate = useNavigate();

  if (!gameEnded) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-ended-title"
    >
      <div className="mx-4 max-w-md rounded-2xl border border-white/20 bg-slate-900/95 p-8 text-center shadow-2xl backdrop-blur">
        <h2
          id="game-ended-title"
          className="text-2xl font-bold text-white"
        >
          Игра завершена
        </h2>
        <p className="mt-3 text-white/80">
          Руководитель учебного занятия завершил игру. Спасибо за участие!
        </p>
        <Button
          size="lg"
          className="mt-6 h-11 w-full bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-white shadow-lg shadow-orange-500/30 hover:from-red-500 hover:via-orange-500 hover:to-amber-400"
          onClick={() => navigate(PATHS.RESULT)}
        >
          Перейти к итогам
        </Button>
      </div>
    </div>
  );
}
