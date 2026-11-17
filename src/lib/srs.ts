/**
 * SM-2 spaced repetition (SuperMemo-2 style).
 * quality: 0–5 (0–2 = quên, 3–5 = nhớ). Trả về khoảng cách ôn tiếp theo (ngày) và trạng thái mới.
 */
export type SrsState = { easeFactor: number; intervalDays: number; repetitions: number };

export function sm2(state: SrsState, quality: number): SrsState {
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  if (q < 3) {
    return { easeFactor: state.easeFactor, intervalDays: 1, repetitions: 0 };
  }
  const repetitions = state.repetitions + 1;
  let intervalDays: number;
  if (repetitions === 1) intervalDays = 1;
  else if (repetitions === 2) intervalDays = 6;
  else intervalDays = Math.round(state.intervalDays * state.easeFactor);
  const easeFactor = Math.max(1.3, state.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  return { easeFactor: Number(easeFactor.toFixed(2)), intervalDays, repetitions };
}

export function nextReviewAt(from: Date, intervalDays: number): Date {
  return new Date(from.getTime() + intervalDays * 24 * 60 * 60 * 1000);
}
