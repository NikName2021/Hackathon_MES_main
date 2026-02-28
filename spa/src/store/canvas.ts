import { create } from "zustand";
import type { CanvasObject } from "@/types/canvas.types";

type CanvasStateData = {
  backgroundUrl: string | null;
  objects: CanvasObject[];
  selectedId: string | null;
};

type CanvasStateFunc = {
  setBackgroundUrl: (url: string | null) => void;
  addObject: (obj: CanvasObject) => void;
  updateObject: (id: string, patch: Partial<CanvasObject>) => void;
  removeObject: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  clearCanvas: () => void;
};

type CanvasState = CanvasStateData & CanvasStateFunc;

const useCanvasStore = create<CanvasState>(((set) => ({
  backgroundUrl: null,
  objects: [],
  selectedId: null,
  setBackgroundUrl: (url) => set({ backgroundUrl: url }),
  addObject: (obj) =>
    set((state) => ({ objects: [...state.objects, obj] })),
  updateObject: (id, patch) =>
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === id ? ({ ...obj, ...patch } as CanvasObject) : obj
      ),
    })),
  removeObject: (id) =>
    set((state) => ({
      objects: state.objects.filter((obj) => obj.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),
  setSelectedId: (id) => set({ selectedId: id }),
  clearCanvas: () => set({ backgroundUrl: null, objects: [], selectedId: null }),
  })));

export const useCanvasBackgroundUrl = () =>
  useCanvasStore((state) => state.backgroundUrl);
export const useCanvasObjects = () => useCanvasStore((state) => state.objects);
export const useCanvasSelectedId = () =>
  useCanvasStore((state) => state.selectedId);

export const setCanvasBackgroundUrl = (url: string | null) =>
  useCanvasStore.getState().setBackgroundUrl(url);
export const addCanvasObject = (obj: CanvasObject) =>
  useCanvasStore.getState().addObject(obj);
export const updateCanvasObject = (id: string, patch: Partial<CanvasObject>) =>
  useCanvasStore.getState().updateObject(id, patch);
export const removeCanvasObject = (id: string) =>
  useCanvasStore.getState().removeObject(id);
export const setCanvasSelectedId = (id: string | null) =>
  useCanvasStore.getState().setSelectedId(id);
export const clearCanvas = () => useCanvasStore.getState().clearCanvas();
