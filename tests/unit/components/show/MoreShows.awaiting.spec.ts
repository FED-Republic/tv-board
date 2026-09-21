import { fireEvent, screen } from '@testing-library/vue';
import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import MoreShows from '@/components/show/MoreShows.vue';
import type { Genre } from '@/domain/genre';
import { TEST_IDS } from '@/testing/test-ids';

const GENRE: Genre = 'Drama';
const LOAD_MORE_LABEL = 'Load more shows from TVmaze';

type ControlProps = {
  canShowMore?: boolean;
  hasMorePages?: boolean;
  isAwaitingPage?: boolean;
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

const button = (): HTMLElement => screen.getByRole('button', { name: LOAD_MORE_LABEL });

const endNote = (): HTMLElement => screen.getByTestId(TEST_IDS.moreShowsEnd);

/** The wait ends; `afterwards` is what the page left behind, such as no page left to ask for. */
async function endWait(control: Control, afterwards: ControlProps = {}): Promise<void> {
  await control.setProps({ isAwaitingPage: false, ...afterwards });
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
  describe('when the page the reader asked for is on its way', () => {
    it('given a page on its way, when rendered, then the button reports the wait', () => {
      mountControl({ hasMorePages: true, isAwaitingPage: true });

      expect(button().getAttribute('aria-busy')).toBe('true');
    });

    it('given a page on its way, when rendered, then the button reports itself disabled', () => {
      mountControl({ hasMorePages: true, isAwaitingPage: true });

      expect(button().getAttribute('aria-disabled')).toBe('true');
    });

    it('given a page on its way, when rendered, then the button keeps its place in the tab order', () => {
      mountControl({ hasMorePages: true, isAwaitingPage: true });

      expect(button().hasAttribute('disabled')).toBe(false);
    });

    it('given a page on its way, when the button is pressed, then no second page is asked for', async () => {
      const control = mountControl({ hasMorePages: true, isAwaitingPage: true });

      await fireEvent.click(button());

      expect(control.emitted('more')).toBeUndefined();
    });
  });

  describe('when no page the reader asked for is on its way', () => {
    it('given a background page nobody asked for, when rendered, then the button reports no wait', () => {
      mountControl({ hasMorePages: true });

      expect(button().getAttribute('aria-busy')).toBe('false');
    });

    it('given a background page nobody asked for, when rendered, then the button is not disabled', () => {
      mountControl({ hasMorePages: true });

      expect(button().getAttribute('aria-disabled')).toBe('false');
    });

    it('given no wait, when the button is pressed, then more is emitted once', async () => {
      const control = mountControl({ hasMorePages: true });

      await fireEvent.click(button());

      expect(control.emitted('more')).toHaveLength(1);
    });
  });

  describe('when the page the reader waited for spends the last page', () => {
    it('given a wait, when the button goes with the page, then the end note takes focus', async () => {
      const control = mountControl({ hasMorePages: true, isAwaitingPage: true });

      await endWait(control, { hasMorePages: false });

      expect(document.activeElement).toBe(endNote());
    });

    it('given a wait, when the reader has moved focus on, then focus stays where they put it', async () => {
      const control = mountControl({ hasMorePages: true, isAwaitingPage: true });
      const chosenControl = focusAnotherControl();

      await endWait(control, { hasMorePages: false });

      expect(document.activeElement).toBe(chosenControl);
    });

    it('given a wait that leaves a page at TVmaze, when it ends, then focus stays where it was', async () => {
      const control = mountControl({ hasMorePages: true, isAwaitingPage: true });

      await endWait(control);

      expect(document.activeElement).toBe(document.body);
    });

    it('given no wait, when the index ends under the reader, then focus stays where it was', async () => {
      const control = mountControl({ hasMorePages: true });

      await control.setProps({ hasMorePages: false });
      await flushPromises();

      expect(document.activeElement).toBe(document.body);
    });
  });
});
