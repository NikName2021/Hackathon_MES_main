import type { FC } from "react";

export interface SchemeCanvasProps {
  placedItems: unknown[];
  onPlace?: (item: unknown) => void;
  onMove?: (id: string, x: number, y: number) => void;
  onRemove?: (id: string) => void;
  onScaleChange?: (id: string, scale: number) => void;
  onRotationChange?: (id: string, rotation: number) => void;
  readOnly?: boolean;
  zoom?: number;
  /** id комнаты для отображения слоя распространения огня */
  roomId?: string | null;
  /** показывать слой распространения огня (по умолчанию true; у диспетчера false) */
  showFireSpread?: boolean;
}

declare const SchemeCanvas: FC<SchemeCanvasProps>;
export default SchemeCanvas;
