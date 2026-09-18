export type PageScheduler = {
  /** Runs once the browser is idle, or on the next tick where idle callbacks do not exist. */
  readonly whenIdle: (run: () => void) => void;
  readonly after: (delayMs: number, run: () => void) => void;
  readonly cancel: () => void;
};

/**
 * The timers behind the background page loop, held in one place so `cancel` is complete. Only
 * one run is ever pending: scheduling again replaces the previous one.
 */
export function createPageScheduler(): PageScheduler {
  let idleHandle: number | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function whenIdle(run: () => void): void {
    cancel();

    if (typeof requestIdleCallback !== 'function') {
      after(0, run);
      return;
    }

    idleHandle = requestIdleCallback(() => {
      idleHandle = null;
      run();
    });
  }

  function after(delayMs: number, run: () => void): void {
    cancel();
    timer = setTimeout(() => {
      timer = null;
      run();
    }, delayMs);
  }

  function cancel(): void {
    if (idleHandle !== null) {
      cancelIdleCallback(idleHandle);
      idleHandle = null;
    }

    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return { whenIdle, after, cancel };
}
