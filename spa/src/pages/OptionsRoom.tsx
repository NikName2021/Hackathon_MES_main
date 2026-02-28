import { addPlayers, registerImage, registerParams } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PATHS } from "@/config/paths";
import { RoomCanvasEditor } from "@/components/RoomCanvasEditor";
import { useCanvasObjects } from "@/store/canvas";
import {
  setOptionHasWaterNearby,
  setOptionTemperature,
  setOptionTime,
  setOptionWind,
  useOptionHasWaterNearby,
  useOptionTemperature,
  useOptionTime,
  useOptionWind,
} from "@/store/option";
import { useRoomId } from "@/store/room";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

type Step = "params" | "image" | "final";

export const OptionsRoomPage = () => {
  const wind = useOptionWind();
  const temperature = useOptionTemperature();
  const time = useOptionTime();
  const hasWaterNearby = useOptionHasWaterNearby();
  const objects = useCanvasObjects();
  const roomId = useRoomId();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("params");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const containerWidthClass = step === "image" ? "max-w-5xl" : "max-w-2xl";
  const fieldClassName =
    "h-12 rounded-xl border-white/20 bg-white/95 text-base text-slate-900 placeholder:text-slate-500";

  async function handleParamsSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!roomId) {
      setError("Не найден идентификатор комнаты.");
      return;
    }
    if (wind === "" || temperature === "" || !time) {
      setError("Заполните скорость ветра, температуру и время.");
      return;
    }
    if (Number(wind) <= 0) {
      setError("Скорость ветра должна быть положительной.");
      return;
    }
    try {
      setLoading(true);
      console.log(roomId, hasWaterNearby, Number(wind), Number(temperature), time);
      await registerParams(
        roomId,
        hasWaterNearby,
        Number(wind),
        Number(temperature),
        time,
      );
      setStep("image");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Ошибка отправки");
    } finally {
      setLoading(false);
    }
  }

  async function handleImageSubmit() {
    setError("");
    if (!roomId) {
      setError("Не найден идентификатор комнаты.");
      return;
    }
    if (objects.length === 0) {
      setError("Добавьте объекты на карту.");
      return;
    }
    try {
      setLoading(true);
      console.log(roomId, objects);
      await registerImage(roomId, objects);
      setStep("final");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRoom() {
    setError("");
    try {
      setLoading(true);
      if (roomId) {
        addPlayers(roomId);
        navigate(`${PATHS.ROOM}/${roomId}`);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Ошибка создания");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <div
          className={`w-full ${containerWidthClass} rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-10`}
        >
          <div className="text-xs uppercase tracking-[0.3em] text-orange-300/80">
            Параметры комнаты
          </div>
          <h1 className="mt-3 text-2xl font-semibold">Настройка условий</h1>

          {step === "params" && (
            <form onSubmit={handleParamsSubmit}>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-white/70">
                    Скорость ветра (м/с)
                  </label>
                  <Input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={wind}
                    onChange={(event) =>
                      setOptionWind(
                        event.target.value === ""
                          ? ""
                          : Number(event.target.value),
                      )
                    }
                    placeholder="Например, 12"
                    className={fieldClassName}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-white/70">
                    Температура (°C)
                  </label>
                  <Input
                    type="number"
                    value={temperature}
                    onChange={(event) =>
                      setOptionTemperature(
                        event.target.value === ""
                          ? ""
                          : Number(event.target.value),
                      )
                    }
                    placeholder="Например, 24"
                    className={fieldClassName}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-white/70">Время</label>
                  <Input
                    type="time"
                    value={time}
                    onChange={(event) => setOptionTime(event.target.value)}
                    className={fieldClassName}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-white/70">
                    Рядом есть вода
                  </label>
                  <div className="flex h-12 items-center gap-3 rounded-xl border border-white/20 bg-white/95 px-4 text-slate-900">
                    <input
                      type="checkbox"
                      checked={hasWaterNearby}
                      onChange={(event) =>
                        setOptionHasWaterNearby(event.target.checked)
                      }
                      className="h-4 w-4 accent-orange-400"
                    />
                    <span className="text-sm text-slate-500">
                      {hasWaterNearby ? "Да" : "Нет"}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-4 text-sm text-red-200">{error}</div>
              )}

              <Button
                type="submit"
                size="lg"
                className="mt-8 h-12 w-full bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-base text-white shadow-lg shadow-orange-500/30 hover:from-red-500 hover:via-orange-500 hover:to-amber-400"
                disabled={loading}
              >
                {loading ? "Сохраняем..." : "Далее"}
              </Button>
            </form>
          )}

          {step === "image" && (
            <div>
              <RoomCanvasEditor />

              {error && (
                <div className="mt-4 text-sm text-red-200">{error}</div>
              )}

              <Button
                type="button"
                size="lg"
                onClick={handleImageSubmit}
                className="mt-8 h-12 w-full bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-base text-white shadow-lg shadow-orange-500/30 hover:from-red-500 hover:via-orange-500 hover:to-amber-400"
                disabled={loading}
              >
                {loading ? "Загружаем..." : "Далее"}
              </Button>
            </div>
          )}

          {step === "final" && (
            <div className="mt-6">
              {error && (
                <div className="mt-4 text-sm text-red-200">{error}</div>
              )}
              <Button
                type="button"
                size="lg"
                onClick={handleCreateRoom}
                className="mt-2 h-12 w-full bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-base text-white shadow-lg shadow-orange-500/30 hover:from-red-500 hover:via-orange-500 hover:to-amber-400"
                disabled={loading}
              >
                {loading ? "Создаём..." : "Сохранить"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
