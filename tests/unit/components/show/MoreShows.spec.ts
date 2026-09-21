import { fireEvent, screen } from '@testing-library/vue';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import MoreShows from '@/components/show/MoreShows.vue';
import { LOADED_WHOLE_INDEX_TEXT, type PageReport } from '@/domain/dashboard-copy';
import type { Genre } from '@/domain/genre';
import { TEST_IDS } from '@/testing/test-ids';

const GENRE: Genre = 'Drama';
const SHOW_MORE_LABEL = 'Show more Drama shows';
const LOAD_MORE_LABEL = 'Load more shows from TVmaze';

/** A page that brought the reader shows, four of them in the grid's genre. */
const MIXED_PAGE: PageReport = { loaded: 10, inGenre: 4 };
const MIXED_PAGE_TEXT = 'TVmaze sent 10 more shows. 4 of them are Drama.';

/** The last page TVmaze had, and it brought nothing the index did not already hold. */
const EMPTY_PAGE: PageReport = { loaded: 0, inGenre: 0 };
const EMPTY_PAGE_TEXT = 'No more shows arrived from TVmaze.';
/** The word the invitation to press again is written with; the end note has taken the button. */
const INVITATION_WORDS = 'Load more';

type ControlProps = {
  canShowMore?: boolean;
  hasMorePages?: boolean;
  isAwaitingPage?: boolean;
  pageReport?: PageReport | null;
};

/** In the document itself, so `screen` reaches the control and its report line. */
const mountControl = (props: ControlProps = {}) =>
  mount(MoreShows, { props: { genre: GENRE, ...props }, attachTo: document.body });

const button = (name: string): HTMLElement => screen.getByRole('button', { name });

const endNote = (): HTMLElement => screen.getByTestId(TEST_IDS.moreShowsEnd);

const reportLine = (): HTMLElement => screen.getByTestId(TEST_IDS.moreShowsReport);

const reportText = (): string => reportLine().textContent?.trim() ?? '';

/** A press and the tick the control renders its answer on. */
async function pressMore(name: string): Promise<void> {
  await fireEvent.click(button(name));
  await flushPromises();
}

enableAutoUnmount(afterEach);

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

  describe('when a page has answered the reader', () => {
    it('given no page yet, when rendered, then the report line is the live region', () => {
      mountControl({ hasMorePages: true });

      expect(screen.getByRole('status')).toBe(reportLine());
    });

    it('given no page yet, when rendered, then the report line says nothing', () => {
      mountControl({ hasMorePages: true });

      expect(reportText()).toBe('');
    });

    it('given a page that brought shows, when rendered, then the line reports what it brought', () => {
      mountControl({ hasMorePages: true, pageReport: MIXED_PAGE });

      expect(reportText()).toBe(MIXED_PAGE_TEXT);
    });

    it('given the press that spent the last page, when rendered, then the line still reports it', () => {
      mountControl({ hasMorePages: false, pageReport: MIXED_PAGE });

      expect(reportText()).toBe(MIXED_PAGE_TEXT);
    });

    it('given a page that answered, when the report arrives, then the line reads anew', async () => {
      const control = mountControl({ hasMorePages: true });

      await control.setProps({ pageReport: MIXED_PAGE });

      expect(reportText()).toBe(MIXED_PAGE_TEXT);
    });
  });

  describe('when the last page brought the reader nothing', () => {
    it('given a page left at TVmaze, when rendered, then the line points at the button again', () => {
      mountControl({ hasMorePages: true, pageReport: EMPTY_PAGE });

      expect(reportText()).toBe('No more shows arrived from TVmaze. Load more to try again.');
    });

    it('given the last page, when rendered, then the line reports it without inviting a press', () => {
      mountControl({ hasMorePages: false, pageReport: EMPTY_PAGE });

      expect(reportText()).toBe(EMPTY_PAGE_TEXT);
    });

    it('given the last page, when rendered, then the line names no button the end note removed', () => {
      mountControl({ hasMorePages: false, pageReport: EMPTY_PAGE });

      expect(reportText()).not.toContain(INVITATION_WORDS);
    });

    it('given the last page, when rendered, then the end note stands where the button was', () => {
      mountControl({ hasMorePages: false, pageReport: EMPTY_PAGE });

      expect(endNote().textContent?.trim()).toBe(LOADED_WHOLE_INDEX_TEXT);
    });
  });
});
