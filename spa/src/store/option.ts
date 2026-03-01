import { create } from "zustand";

import type { OptionsData } from "@/types/options.types";

type OptionsStateData = OptionsData;

type OptionsStateFunc = {
  setWind: (wind: number | "") => void;
  setTemperature: (temperature: number | "") => void;
  setTime: (time: string) => void;
  setAddress: (address: string) => void;
  setHasWaterNearby: (value: boolean) => void;
  setFile: (file: File | null) => void;
  clearOptions: () => void;
};

type OptionsState = OptionsStateData & OptionsStateFunc;

const useOptionsStore = create<OptionsState>((set) => ({
  wind: "",
  temperature: "",
  time: "",
  address: "",
  hasWaterNearby: false,
  file: null,
  setWind: (wind) => set({ wind }),
  setTemperature: (temperature) => set({ temperature }),
  setTime: (time) => set({ time }),
  setAddress: (address) => set({ address }),
  setHasWaterNearby: (value) => set({ hasWaterNearby: value }),
  setFile: (file) => set({ file }),
  clearOptions: () =>
    set({
      wind: "",
      temperature: "",
      time: "",
      address: "",
      hasWaterNearby: false,
      file: null,
    }),
}));

export const useOptionWind = () => useOptionsStore((state) => state.wind);
export const useOptionTemperature = () =>
  useOptionsStore((state) => state.temperature);
export const useOptionTime = () => useOptionsStore((state) => state.time);
export const useOptionAddress = () => useOptionsStore((state) => state.address);
export const useOptionHasWaterNearby = () =>
  useOptionsStore((state) => state.hasWaterNearby);
export const useOptionFile = () => useOptionsStore((state) => state.file);

export const setOptionWind = (wind: number | "") =>
  useOptionsStore.getState().setWind(wind);
export const setOptionTemperature = (temperature: number | "") =>
  useOptionsStore.getState().setTemperature(temperature);
export const setOptionTime = (time: string) =>
  useOptionsStore.getState().setTime(time);
export const setOptionAddress = (address: string) =>
  useOptionsStore.getState().setAddress(address);
export const setOptionHasWaterNearby = (value: boolean) =>
  useOptionsStore.getState().setHasWaterNearby(value);
export const setOptionFile = (file: File | null) =>
  useOptionsStore.getState().setFile(file);
export const clearOptions = () => useOptionsStore.getState().clearOptions();
