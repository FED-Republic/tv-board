import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPageScheduler } from '@/stores/shows-scheduler';

const PAGE_SPACING_MS = 600;
const PAST_EVERY_TIMER_MS = 5_000;

/** The jsdom shim runs an idle callback on a timer, so one tick covers both paths. */
const NEXT_TICK_MS = 0;

beforeEach(() => vi.useFakeTimers());

afterEach(() => vi.useRealTimers());

describe('createPageScheduler', () => {
  describe('when the browser has idle callbacks', () => {
    it('given a run scheduled when idle, when nothing has ticked yet, then it has not run', () => {
      const run = vi.fn();
      const scheduler = createPageScheduler();

      scheduler.whenIdle(run);

      expect(run).not.toHaveBeenCalled();
    });

    it('given a run scheduled when idle, when the browser goes idle, then it runs once', async () => {
      const run = vi.fn();
      const scheduler = createPageScheduler();

      scheduler.whenIdle(run);
      await vi.advanceTimersByTimeAsync(NEXT_TICK_MS);

      expect(run).toHaveBeenCalledTimes(1);
    });

    it('given a run scheduled when idle, when it is cancelled first, then it never runs', async () => {
      const run = vi.fn();
      const scheduler = createPageScheduler();

      scheduler.whenIdle(run);
      scheduler.cancel();
      await vi.advanceTimersByTimeAsync(PAST_EVERY_TIMER_MS);

      expect(run).not.toHaveBeenCalled();
    });
  });

  describe('when the browser has no idle callbacks', () => {
    it('given no requestIdleCallback, when the next tick comes, then the run still happens', async () => {
      vi.stubGlobal('requestIdleCallback', undefined);
      const run = vi.fn();
      const scheduler = createPageScheduler();

      scheduler.whenIdle(run);
      await vi.advanceTimersByTimeAsync(NEXT_TICK_MS);

      expect(run).toHaveBeenCalledTimes(1);
    });

    it('given no requestIdleCallback, when the fallback is cancelled, then the run never happens', async () => {
      vi.stubGlobal('requestIdleCallback', undefined);
      const run = vi.fn();
      const scheduler = createPageScheduler();

      scheduler.whenIdle(run);
      scheduler.cancel();
      await vi.advanceTimersByTimeAsync(PAST_EVERY_TIMER_MS);

      expect(run).not.toHaveBeenCalled();
    });
  });

  describe('when a run is scheduled after a delay', () => {
    it('given a 600 ms delay, when one millisecond is still missing, then it has not run', async () => {
      const run = vi.fn();
      const scheduler = createPageScheduler();

      scheduler.after(PAGE_SPACING_MS, run);
      await vi.advanceTimersByTimeAsync(PAGE_SPACING_MS - 1);

      expect(run).not.toHaveBeenCalled();
    });

    it('given a 600 ms delay, when it has elapsed, then it runs once', async () => {
      const run = vi.fn();
      const scheduler = createPageScheduler();

      scheduler.after(PAGE_SPACING_MS, run);
      await vi.advanceTimersByTimeAsync(PAGE_SPACING_MS);

      expect(run).toHaveBeenCalledTimes(1);
    });

    it('given a pending delay, when it is cancelled, then the run never happens', async () => {
      const run = vi.fn();
      const scheduler = createPageScheduler();

      scheduler.after(PAGE_SPACING_MS, run);
      scheduler.cancel();
      await vi.advanceTimersByTimeAsync(PAST_EVERY_TIMER_MS);

      expect(run).not.toHaveBeenCalled();
    });
  });

  describe('when a second run is scheduled over a pending one', () => {
    it('given two idle runs, when the browser goes idle, then only the second one runs', async () => {
      const first = vi.fn();
      const second = vi.fn();
      const scheduler = createPageScheduler();

      scheduler.whenIdle(first);
      scheduler.whenIdle(second);
      await vi.advanceTimersByTimeAsync(PAST_EVERY_TIMER_MS);

      expect(first).not.toHaveBeenCalled();
      expect(second).toHaveBeenCalledTimes(1);
    });

    it('given a delayed run over a pending idle one, when the delay elapses, then only the delayed one runs', async () => {
      const idleRun = vi.fn();
      const delayedRun = vi.fn();
      const scheduler = createPageScheduler();

      scheduler.whenIdle(idleRun);
      scheduler.after(PAGE_SPACING_MS, delayedRun);
      await vi.advanceTimersByTimeAsync(PAST_EVERY_TIMER_MS);

      expect(idleRun).not.toHaveBeenCalled();
      expect(delayedRun).toHaveBeenCalledTimes(1);
    });

    it('given an idle run over a pending delayed one, when the tick comes, then only the idle one runs', async () => {
      const delayedRun = vi.fn();
      const idleRun = vi.fn();
      const scheduler = createPageScheduler();

      scheduler.after(PAGE_SPACING_MS, delayedRun);
      scheduler.whenIdle(idleRun);
      await vi.advanceTimersByTimeAsync(PAST_EVERY_TIMER_MS);

      expect(delayedRun).not.toHaveBeenCalled();
      expect(idleRun).toHaveBeenCalledTimes(1);
    });
  });

  describe('when there is nothing pending', () => {
    it('given a fresh scheduler, when cancel is called, then no timer is left behind', () => {
      const scheduler = createPageScheduler();

      scheduler.cancel();

      expect(vi.getTimerCount()).toBe(0);
    });

    it('given a run that already happened, when cancel is called, then it does not run again', async () => {
      const run = vi.fn();
      const scheduler = createPageScheduler();

      scheduler.whenIdle(run);
      await vi.advanceTimersByTimeAsync(NEXT_TICK_MS);
      scheduler.cancel();

      expect(run).toHaveBeenCalledTimes(1);
    });
  });
});
