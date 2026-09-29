// vertical-wheel.ts — shared trackpad/wheel stepping for Inspector value controls.
// Positive steps mean the gesture moved DOWN; negative steps mean UP.

export const VALUE_WHEEL_STEP_PX = 18;

export function normalizeWheelDeltaY(deltaY: number, deltaMode: number): number {
  if (deltaMode === 1) return deltaY * 16;
  if (deltaMode === 2) return deltaY * 120;
  return deltaY;
}

export function takeVerticalWheelSteps(
  accumulated: number,
  deltaY: number,
  deltaMode: number,
): { steps: number; remainder: number } {
  const total = accumulated + normalizeWheelDeltaY(deltaY, deltaMode);
  const rawSteps = Math.trunc(total / VALUE_WHEEL_STEP_PX);
  if (rawSteps === 0) return { steps: 0, remainder: total };

  // Keep a single event from exploding a value when a mouse wheel reports a
  // large delta, while still allowing a trackpad stream to accumulate smoothly.
  const steps = Math.max(-4, Math.min(4, rawSteps));
  return {
    steps,
    remainder: total - steps * VALUE_WHEEL_STEP_PX,
  };
}
