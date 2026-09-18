import { fireEvent, screen } from '@testing-library/vue';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import MoreShows from '@/components/show/MoreShows.vue';
import { LOADED_WHOLE_INDEX_TEXT } from '@/domain/dashboard-copy';
import type { Genre } from '@/domain/genre';
import { TEST_IDS } from '@/testing/test-ids';

const GENRE: Genre = 'Drama';
const SHOW_MORE_LABEL = 'Show more Drama shows';
const LOAD_MORE_LABEL = 'Load more shows from TVmaze';

type ControlProps = {
  canShowMore?: boolean;
  hasMorePages?: boolean;
  isLoadingMore?: boolean;
  onMore?: () => void;
};

/** The control the reader moved their focus to; removed again so no test inherits that focus. */
let controlElsewhere: HTMLElement | null = null;

/**
 * The control in the document itself, because the focus it moves once TVmaze runs out is the
 * behaviour under test; a detached tree would report `document.activeElement` as the body.
 */
const mountControl = (props: ControlProps = {}) =>
  mount(MoreShows, { props: { genre: GENRE, ...props }, attachTo: document.body });

type Control = ReturnType<typeof mountControl>;

/** A store that takes the press the way `loadMore` does: the page starts before the next tick. */
function mountControlTakingPresses(props: ControlProps = {}): Control {
  const control: Control = mountControl({
    ...props,
    onMore: () => void control.setProps({ isLoadingMore: true }),
  });

  return control;
}

const button = (name: string): HTMLElement => screen.getByRole('button', { name });

const endNote = (): HTMLElement => screen.getByTestId(TEST_IDS.moreShowsEnd);

/** A press and the tick the control waits on before it knows whether the store took it. */
async function pressMore(name: string): Promise<void> {
  await fireEvent.click(button(name));
  await flushPromises();
}

/** The page a press asked for goes on its way. */
const startPage = (control: Control): Promise<void> => control.setProps({ isLoadingMore: true });

/** The page lands; `afterwards` is what it left behind, such as no page left to ask for. */
async function landPage(control: Control, afterwards: ControlProps = {}): Promise<void> {
  await control.setProps({ isLoadingMore: false, ...afterwards });
  await flushPromises();
}

/** The reader moves on while the page loads: another control of the page takes their focus. */
function focusAnotherControl(): HTMLElement {
  const control = document.createElement('button');

  document.body.append(control);
  control.focus();
  controlElsewhere = control;

  return control;
}

enableAutoUnmount(afterEach);

afterEach(() => {
  controlElsewhere?.remove();
  controlElsewhere = null;
});

describe('MoreShows', () => {
  describe('when the app holds shows the grid is not rendering', () => {
    it('given more loaded shows, when rendered, then the button offers them by genre', () => {
      mountControl({ canShowMore: true });

      expect(button(SHOW_MORE_LABEL)).toBeDefined();
    });

    it('given more loaded shows, when the button is pressed, then more is emitted once', async () => {
      const control = mountControl({ canShowMore: true });

      await pressMore(SHOW_MORE_LABEL);

      expect(control.emitted('more')).toHaveLength(1);
    });
  });

  describe('when every loaded show is on screen', () => {
    it('given a page left at TVmaze, when rendered, then the button names its source', () => {
      mountControl({ hasMorePages: true });

      expect(button(LOAD_MORE_LABEL)).toBeDefined();
    });

    it('given a page left at TVmaze, when rendered, then the QA hook is on the button itself', () => {
      mountControl({ hasMorePages: true });

      expect(screen.getByTestId(TEST_IDS.moreShowsButton)).toBe(button(LOAD_MORE_LABEL));
    });

    it('given a page left at TVmaze, when the button is pressed, then more is emitted once', async () => {
      const control = mountControl({ hasMorePages: true });

      await pressMore(LOAD_MORE_LABEL);

      expect(control.emitted('more')).toHaveLength(1);
    });
  });

  describe('when TVmaze has no page left', () => {
    it('given nothing left to load, when rendered, then no button is offered', () => {
      mountControl();

      expect(screen.queryByTestId(TEST_IDS.moreShowsButton)).toBeNull();
    });

    it('given nothing left to load, when rendered, then the note says the whole index is loaded', () => {
      mountControl();

      expect(endNote().textContent?.trim()).toBe(LOADED_WHOLE_INDEX_TEXT);
    });

    it('given nothing left to load, when rendered, then the note is focusable without being a tab stop', () => {
      mountControl();

      expect(endNote().getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('when a page is on its way', () => {
    it('given a background page nobody asked for, when it is in flight, then the button reports no wait', () => {
      mountControl({ hasMorePages: true, isLoadingMore: true });

      expect(button(LOAD_MORE_LABEL).getAttribute('aria-busy')).toBe('false');
    });

    it('given a press the store took, when the page is in flight, then the button reports the wait', async () => {
      mountControlTakingPresses({ hasMorePages: true });

      await pressMore(LOAD_MORE_LABEL);

      expect(button(LOAD_MORE_LABEL).getAttribute('aria-busy')).toBe('true');
    });

    it('given a press the store took, when the page is in flight, then the button stays clickable', async () => {
      mountControlTakingPresses({ hasMorePages: true });

      await pressMore(LOAD_MORE_LABEL);

      expect(button(LOAD_MORE_LABEL).hasAttribute('disabled')).toBe(false);
    });

    it('given a press the store had no page for, when a background page starts later, then the button reports no wait', async () => {
      const control = mountControl({ hasMorePages: true });
      await pressMore(LOAD_MORE_LABEL);

      await startPage(control);

      expect(button(LOAD_MORE_LABEL).getAttribute('aria-busy')).toBe('false');
    });

    it('given a press for loaded shows, when a background page is in flight, then the button reports no wait', async () => {
      const control = mountControl({ canShowMore: true, hasMorePages: true });
      await pressMore(SHOW_MORE_LABEL);

      await startPage(control);

      expect(button(SHOW_MORE_LABEL).getAttribute('aria-busy')).toBe('false');
    });

    it('given a press the store took, when the page lands, then the button reports no wait', async () => {
      const control = mountControlTakingPresses({ hasMorePages: true });
      await pressMore(LOAD_MORE_LABEL);

      await landPage(control);

      expect(button(LOAD_MORE_LABEL).getAttribute('aria-busy')).toBe('false');
    });
  });

  describe('when the press spends the last page', () => {
    it('given a press for a page, when the last page lands, then the button is gone', async () => {
      const control = mountControlTakingPresses({ hasMorePages: true });
      await pressMore(LOAD_MORE_LABEL);

      await landPage(control, { hasMorePages: false });

      expect(screen.queryByTestId(TEST_IDS.moreShowsButton)).toBeNull();
    });

    it('given a press for a page, when the last page lands, then the end note takes focus', async () => {
      const control = mountControlTakingPresses({ hasMorePages: true });
      await pressMore(LOAD_MORE_LABEL);

      await landPage(control, { hasMorePages: false });

      expect(document.activeElement).toBe(endNote());
    });

    it('given a press for a page, when the reader has moved focus on, then focus stays where they put it', async () => {
      const control = mountControlTakingPresses({ hasMorePages: true });
      await pressMore(LOAD_MORE_LABEL);
      const chosenControl = focusAnotherControl();

      await landPage(control, { hasMorePages: false });

      expect(document.activeElement).toBe(chosenControl);
    });

    it('given no press, when the index ends under the reader, then focus stays where it was', async () => {
      const control = mountControl({ hasMorePages: true, isLoadingMore: true });

      await landPage(control, { hasMorePages: false });

      expect(document.activeElement).toBe(document.body);
    });
  });
});
