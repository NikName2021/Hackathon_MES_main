export type CanvasObjectType = "line" | "rect" | "circle" | "fire";

export type CanvasObjectBase = {
  id: string;
  type: CanvasObjectType;
  color: string;
  rotation: number;
  material?: string;
};

export type CanvasLine = CanvasObjectBase & {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth: number;
};

export type CanvasRect = CanvasObjectBase & {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  strokeWidth: number;
};

export type CanvasCircle = CanvasObjectBase & {
  type: "circle";
  x: number;
  y: number;
  radius: number;
  strokeWidth: number;
};

export type CanvasFire = CanvasObjectBase & {
  type: "fire";
  x: number;
  y: number;
  radius: number;
};

export type CanvasObject = CanvasLine | CanvasRect | CanvasCircle | CanvasFire;
