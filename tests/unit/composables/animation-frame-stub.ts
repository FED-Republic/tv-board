import { vi } from 'vitest';

export type AnimationFrameStub = {
  /** Runs every callback still waiting for a frame, in the order they asked for one. */
  readonly runFrame: () => void;
};

/**
 * Replaces `requestAnimationFrame` and `cancelAnimationFrame` with a pair a spec runs by hand:
 * jsdom's own waits on a real timer, which neither a flushed promise nor a spec on fake timers
 * ever reaches. A cancelled callback is dropped, so a spec can prove a frame never ran.
 */
export function installAnimationFrameStub(): AnimationFrameStub {
  let pending = new Map<number, FrameRequestCallback>();
  let lastHandle = 0;

  function runFrame(): void {
    const frame = pending;

    pending = new Map();
    frame.forEach((callback) => callback(0));
  }

  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback): number => {
    lastHandle += 1;
    pending.set(lastHandle, callback);

    return lastHandle;
  });

  vi.stubGlobal('cancelAnimationFrame', (handle: number): void => void pending.delete(handle));

  return { runFrame };
}
