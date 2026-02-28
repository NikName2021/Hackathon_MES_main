import { createRoom } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PATHS } from "@/config/paths";
import {
  setOptionFile,
  setOptionHasWaterNearby,
  setOptionTemperature,
  setOptionTime,
  setOptionWind,
  useOptionFile,
  useOptionHasWaterNearby,
  useOptionTemperature,
  useOptionTime,
  useOptionWind,
} from "@/store/option";
import { useNavigate } from "react-router-dom";

export const OptionsRoomPage = () => {
  const wind = useOptionWind();
  const temperature = useOptionTemperature();
  const time = useOptionTime();
  const hasWaterNearby = useOptionHasWaterNearby();
  const file = useOptionFile();
  const navigate = useNavigate();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setOptionFile(selected);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
        console.log("wind, temperature, time, hasWaterNearby, file")
      const data = await createRoom();
      if (data?.room_id) {
        navigate(`${PATHS.ROOM}/${data.room_id}`);
      }
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-10"
        >
          <div className="text-xs uppercase tracking-[0.3em] text-orange-300/80">
            Параметры комнаты
          </div>
          <h1 className="mt-3 text-2xl font-semibold">Настройка условий</h1>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-xs text-white/70">
                Скорость ветра (м/с)
              </label>
              <Input
                type="number"
                value={wind}
                onChange={(event) =>
                  setOptionWind(
                    event.target.value === "" ? "" : Number(event.target.value),
                  )
                }
                placeholder="Например, 12"
                className="h-12 rounded-xl border-white/20 bg-white/95 text-base text-slate-900 placeholder:text-slate-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-white/70">Температура (°C)</label>
              <Input
                type="number"
                value={temperature}
                onChange={(event) =>
                  setOptionTemperature(
                    event.target.value === "" ? "" : Number(event.target.value),
                  )
                }
                placeholder="Например, 24"
                className="h-12 rounded-xl border-white/20 bg-white/95 text-base text-slate-900 placeholder:text-slate-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-white/70">Время</label>
              <Input
                type="time"
                value={time}
                onChange={(event) => setOptionTime(event.target.value)}
                className="h-12 rounded-xl border-white/20 bg-white/95 text-base text-slate-900 placeholder:text-slate-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs text-white/70">Рядом есть вода</label>
              <div className="flex h-12 items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-4">
                <input
                  type="checkbox"
                  checked={hasWaterNearby}
                  onChange={(event) =>
                    setOptionHasWaterNearby(event.target.checked)
                  }
                  className="h-4 w-4 accent-orange-400"
                />
                <span className="text-sm text-white/80">
                  {hasWaterNearby ? "Да" : "Нет"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <label className="text-xs text-white/70">
              Загрузить файл (png, pdf, svg, jpg)
            </label>
            <Input
              type="file"
              accept=".png,.jpg,.jpeg,.svg,.pdf,image/png,image/jpeg,image/svg+xml,application/pdf"
              onChange={handleFileChange}
              className="h-12 rounded-xl border-white/20 bg-white/95 text-base text-slate-900 file:text-slate-700"
            />
            {file && (
              <div className="text-xs text-white/70">
                Выбран файл: {file.name}
              </div>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="mt-8 h-12 w-full bg-gradient-to-r from-red-600 via-orange-600 to-amber-500 text-base text-white shadow-lg shadow-orange-500/30 hover:from-red-500 hover:via-orange-500 hover:to-amber-400"
          >
            Сохранить
          </Button>
        </form>
      </div>
    </main>
  );
};
