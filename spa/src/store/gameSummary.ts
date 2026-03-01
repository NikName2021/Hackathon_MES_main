import { create } from "zustand";

import type { GameSummary } from "@/types/game-summary.types";

type GameSummaryStateData = {
  summary: GameSummary | null;
};

type GameSummaryStateFunc = {
  setSummary: (summary: GameSummary) => void;
  clearSummary: () => void;
};

type GameSummaryState = GameSummaryStateData & GameSummaryStateFunc;

const useGameSummaryStore = create<GameSummaryState>((set) => ({
  summary: null,
  setSummary: (summary) => set({ summary }),
  clearSummary: () => set({ summary: null }),
}));

export const useGameSummary = () =>
  useGameSummaryStore((state) => state.summary);

export const setGameSummary = (summary: GameSummary) => {
  if (!summary) return;
  useGameSummaryStore.getState().setSummary(summary);
};

export const clearGameSummary = () =>
  useGameSummaryStore.getState().clearSummary();
