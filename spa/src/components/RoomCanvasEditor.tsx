import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addCanvasObject,
  removeCanvasObject,
  setCanvasBackgroundUrl,
  setCanvasSelectedId,
  updateCanvasObject,
  useCanvasBackgroundUrl,
  useCanvasObjects,
  useCanvasSelectedId,
} from "@/store/canvas";
import { setOptionFile, useOptionFile } from "@/store/option";
import type {
  CanvasCircle,
  CanvasFire,
  CanvasLine,
  CanvasObject,
  CanvasRect,
} from "@/types/canvas.types";

type Tool = "select" | "line" | "rect" | "circle" | "fire";

const COLORS = ["#F97316", "#EF4444", "#22C55E", "#38BDF8", "#E2E8F0"];
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

export const RoomCanvasEditor = () => {
  const objects = useCanvasObjects();
  const selectedId = useCanvasSelectedId();
  const backgroundUrl = useCanvasBackgroundUrl();
  const file = useOptionFile();

  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState(COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [draft, setDraft] = useState<CanvasObject | null>(null);
  const [drag, setDrag] = useState<{
    id: string;
    startX: number;
    startY: number;
    origin: CanvasObject;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const selectedObject = useMemo(
    () => objects.find((obj) => obj.id === selectedId) ?? null,
    [objects, selectedId]
  );

  const getPoint = (event: React.PointerEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    return { x, y };
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setOptionFile(selected);
    if (selected) {
      const url = URL.createObjectURL(selected);
      setCanvasBackgroundUrl(url);
    }
  };

  const handlePointerDown = (event: React.PointerEvent) => {
    if (tool === "select") return;
    const { x, y } = getPoint(event);
    const id = crypto.randomUUID();

    if (tool === "fire") {
      const fire: CanvasFire = {
        id,
        type: "fire",
        x,
        y,
        radius: 10,
        color: "#EF4444",
      };
      addCanvasObject(fire);
      return;
    }

    if (tool === "line") {
      const line: CanvasLine = {
        id,
        type: "line",
        x1: x,
        y1: y,
        x2: x,
        y2: y,
        strokeWidth,
        color,
      };
      setDraft(line);
      return;
    }

    if (tool === "rect") {
      const rect: CanvasRect = {
        id,
        type: "rect",
        x,
        y,
        width: 0,
        height: 0,
        strokeWidth,
        color,
      };
      setDraft(rect);
      return;
    }

    const circle: CanvasCircle = {
      id,
      type: "circle",
      x,
      y,
      radius: 0,
      strokeWidth,
      color,
    };
    setDraft(circle);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!draft) {
      if (!drag) return;
      const { x, y } = getPoint(event);
      const dx = x - drag.startX;
      const dy = y - drag.startY;

      if (drag.origin.type === "line") {
        updateCanvasObject(drag.id, {
          x1: drag.origin.x1 + dx,
          y1: drag.origin.y1 + dy,
          x2: drag.origin.x2 + dx,
          y2: drag.origin.y2 + dy,
        });
      } else {
        updateCanvasObject(drag.id, {
          x: (drag.origin as CanvasRect).x + dx,
          y: (drag.origin as CanvasRect).y + dy,
        });
      }
      return;
    }

    const { x, y } = getPoint(event);
    if (draft.type === "line") {
      setDraft({ ...draft, x2: x, y2: y });
    } else if (draft.type === "rect") {
      setDraft({ ...draft, width: x - draft.x, height: y - draft.y });
    } else if (draft.type === "circle") {
      const radius = Math.hypot(x - draft.x, y - draft.y);
      setDraft({ ...draft, radius });
    }
  };

  const handlePointerUp = () => {
    if (drag) {
      setDrag(null);
      return;
    }
    if (!draft) return;

    if (draft.type === "rect") {
      const width = Math.abs(draft.width);
      const height = Math.abs(draft.height);
      const x = draft.width < 0 ? draft.x + draft.width : draft.x;
      const y = draft.height < 0 ? draft.y + draft.height : draft.y;
      addCanvasObject({ ...draft, x, y, width, height });
    } else {
      addCanvasObject(draft);
    }
    setDraft(null);
  };

  const handleSelect = (event: React.PointerEvent, obj: CanvasObject) => {
    event.stopPropagation();
    setCanvasSelectedId(obj.id);
    if (tool !== "select") return;
    const { x, y } = getPoint(event);
    setDrag({ id: obj.id, startX: x, startY: y, origin: obj });
  };

  const renderObject = (obj: CanvasObject) => {
    if (obj.type === "line") {
      return (
        <line
          key={obj.id}
          x1={obj.x1}
          y1={obj.y1}
          x2={obj.x2}
          y2={obj.y2}
          stroke={obj.color}
          strokeWidth={obj.strokeWidth}
          onPointerDown={(event) => handleSelect(event, obj)}
        />
      );
    }
    if (obj.type === "rect") {
      return (
        <rect
          key={obj.id}
          x={obj.x}
          y={obj.y}
          width={obj.width}
          height={obj.height}
          fill="none"
          stroke={obj.color}
          strokeWidth={obj.strokeWidth ?? 2}
          onPointerDown={(event) => handleSelect(event, obj)}
        />
      );
    }
    if (obj.type === "circle") {
      return (
        <circle
          key={obj.id}
          cx={obj.x}
          cy={obj.y}
          r={obj.radius}
          fill="none"
          stroke={obj.color}
          strokeWidth={obj.strokeWidth ?? 2}
          onPointerDown={(event) => handleSelect(event, obj)}
        />
      );
    }
    return (
      <circle
        key={obj.id}
        cx={obj.x}
        cy={obj.y}
        r={obj.radius}
        fill={obj.color}
        stroke="#111827"
        strokeWidth={1}
        onPointerDown={(event) => handleSelect(event, obj)}
      />
    );
  };

  return (
    <div className="mt-6 grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["select", "line", "rect", "circle", "fire"] as Tool[]).map(
          (item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTool(item)}
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em] ${
                tool === item
                  ? "border-orange-400 bg-orange-500/20 text-orange-200"
                  : "border-white/20 text-white/70"
              }`}
            >
              {item === "select" && "Выбор"}
              {item === "line" && "Линия"}
              {item === "rect" && "Прямоуг."}
              {item === "circle" && "Круг"}
              {item === "fire" && "Огонь"}
            </button>
          )
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className="h-7 w-7 rounded-full border border-white/30"
            style={{
              backgroundColor: c,
              boxShadow: color === c ? "0 0 0 2px #fff" : "none",
            }}
          />
        ))}
        <div className="flex items-center gap-2 text-xs text-white/70">
          <span>Толщина</span>
          <Input
            type="number"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(event) =>
              setStrokeWidth(
                event.target.value === "" ? 1 : Number(event.target.value)
              )
            }
            className="h-8 w-20 rounded-xl border-white/20 bg-white/95 text-slate-900"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs text-white/70">
          Загрузить файл (png, pdf, svg, jpg)
        </label>
        <Input
          type="file"
          accept=".png,.jpg,.jpeg,.svg,.pdf,image/png,image/jpeg,image/svg+xml,application/pdf"
          onChange={handleImageChange}
          className="h-12 rounded-xl border-white/20 bg-white/95 text-base text-slate-900 file:text-slate-700"
        />
        {file && (
          <div className="text-xs text-white/70">
            Выбран файл: {file.name}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          className="h-[560px] w-full rounded-xl bg-slate-950 sm:h-[680px]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {backgroundUrl && (
            <image
              href={backgroundUrl}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              preserveAspectRatio="none"
            />
          )}
          {objects.map(renderObject)}
          {draft && renderObject(draft)}
        </svg>
      </div>

      {selectedObject && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          <div className="text-xs uppercase tracking-[0.2em] text-orange-300/80">
            Объект
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {selectedObject.type !== "line" && (
              <>
                <Input
                  type="number"
                  value={selectedObject.x}
                  onChange={(event) =>
                    updateCanvasObject(selectedObject.id, {
                      x: Number(event.target.value),
                    })
                  }
                  className="h-10 rounded-xl border-white/20 bg-white/95 text-slate-900"
                />
                <Input
                  type="number"
                  value={selectedObject.y}
                  onChange={(event) =>
                    updateCanvasObject(selectedObject.id, {
                      y: Number(event.target.value),
                    })
                  }
                  className="h-10 rounded-xl border-white/20 bg-white/95 text-slate-900"
                />
              </>
            )}
            {selectedObject.type === "rect" && (
              <>
                <Input
                  type="number"
                  value={selectedObject.width}
                  onChange={(event) =>
                    updateCanvasObject(selectedObject.id, {
                      width: Number(event.target.value),
                    })
                  }
                  className="h-10 rounded-xl border-white/20 bg-white/95 text-slate-900"
                />
                <Input
                  type="number"
                  value={selectedObject.height}
                  onChange={(event) =>
                    updateCanvasObject(selectedObject.id, {
                      height: Number(event.target.value),
                    })
                  }
                  className="h-10 rounded-xl border-white/20 bg-white/95 text-slate-900"
                />
                <Input
                  type="number"
                  value={selectedObject.strokeWidth}
                  onChange={(event) =>
                    updateCanvasObject(selectedObject.id, {
                      strokeWidth: Number(event.target.value),
                    })
                  }
                  className="h-10 rounded-xl border-white/20 bg-white/95 text-slate-900"
                />
              </>
            )}
            {selectedObject.type === "circle" && (
              <>
                <Input
                  type="number"
                  value={selectedObject.radius}
                  onChange={(event) =>
                    updateCanvasObject(selectedObject.id, {
                      radius: Number(event.target.value),
                    })
                  }
                  className="h-10 rounded-xl border-white/20 bg-white/95 text-slate-900"
                />
                <Input
                  type="number"
                  value={selectedObject.strokeWidth}
                  onChange={(event) =>
                    updateCanvasObject(selectedObject.id, {
                      strokeWidth: Number(event.target.value),
                    })
                  }
                  className="h-10 rounded-xl border-white/20 bg-white/95 text-slate-900"
                />
              </>
            )}
            {selectedObject.type === "fire" && (
              <Input
                type="number"
                value={selectedObject.radius}
                onChange={(event) =>
                  updateCanvasObject(selectedObject.id, {
                    radius: Number(event.target.value),
                  })
                }
                className="h-10 rounded-xl border-white/20 bg-white/95 text-slate-900"
              />
            )}
            {selectedObject.type === "line" && (
              <>
                <Input
                  type="number"
                  value={selectedObject.x1}
                  onChange={(event) =>
                    updateCanvasObject(selectedObject.id, {
                      x1: Number(event.target.value),
                    })
                  }
                  className="h-10 rounded-xl border-white/20 bg-white/95 text-slate-900"
                />
                <Input
                  type="number"
                  value={selectedObject.y1}
                  onChange={(event) =>
                    updateCanvasObject(selectedObject.id, {
                      y1: Number(event.target.value),
                    })
                  }
                  className="h-10 rounded-xl border-white/20 bg-white/95 text-slate-900"
                />
                <Input
                  type="number"
                  value={selectedObject.x2}
                  onChange={(event) =>
                    updateCanvasObject(selectedObject.id, {
                      x2: Number(event.target.value),
                    })
                  }
                  className="h-10 rounded-xl border-white/20 bg-white/95 text-slate-900"
                />
                <Input
                  type="number"
                  value={selectedObject.y2}
                  onChange={(event) =>
                    updateCanvasObject(selectedObject.id, {
                      y2: Number(event.target.value),
                    })
                  }
                  className="h-10 rounded-xl border-white/20 bg-white/95 text-slate-900"
                />
                <Input
                  type="number"
                  value={selectedObject.strokeWidth}
                  onChange={(event) =>
                    updateCanvasObject(selectedObject.id, {
                      strokeWidth: Number(event.target.value),
                    })
                  }
                  className="h-10 rounded-xl border-white/20 bg-white/95 text-slate-900"
                />
              </>
            )}
          </div>
          <div className="mt-4 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              onClick={() => setCanvasSelectedId(null)}
            >
              Снять выбор
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20"
              onClick={() => removeCanvasObject(selectedObject.id)}
            >
              Удалить
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};