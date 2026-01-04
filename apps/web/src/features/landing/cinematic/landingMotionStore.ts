import { create } from "zustand";

type LandingMotionState = {
  /** 0..1 progress for the main pinned stage (ZipPinnedStage). */
  stageProgress: number;
  /** 0..3 for the current step index in the pinned stage. */
  stageStep: number;
  setStageProgress: (progress: number, step: number) => void;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

export const useLandingMotionStore = create<LandingMotionState>((set) => ({
  stageProgress: 0,
  stageStep: 0,
  setStageProgress: (progress, step) =>
    set({
      stageProgress: clamp01(progress),
      stageStep: Math.max(0, Math.min(3, Math.floor(step))),
    }),
}));
