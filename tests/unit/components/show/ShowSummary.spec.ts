import { render, screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import ShowSummary from '@/components/show/ShowSummary.vue';
import { TEST_IDS } from '@/testing/test-ids';

const RICH_SUMMARY = '<p><b>Bold</b> text <a href="x">link</a></p>';

describe('ShowSummary', () => {
  describe('when the summary carries markup', () => {
    it('given allowed markup, when rendered, then the emphasis survives', () => {
      render(ShowSummary, { props: { html: RICH_SUMMARY } });

      expect(screen.getByText('Bold').tagName.toLowerCase()).toBe('b');
    });

    it('given an anchor, when rendered, then no link reaches the page', () => {
      render(ShowSummary, { props: { html: RICH_SUMMARY } });

      expect(screen.queryByRole('link')).toBeNull();
    });

    it('given an anchor, when rendered, then its text is kept', () => {
      render(ShowSummary, { props: { html: RICH_SUMMARY } });

      expect(screen.getByTestId(TEST_IDS.showSummary).textContent).toBe('Bold text link');
    });
  });

  describe('when there is nothing to say', () => {
    it('given a null summary, when rendered, then nothing is rendered', () => {
      render(ShowSummary, { props: { html: null } });

      expect(screen.queryByTestId(TEST_IDS.showSummary)).toBeNull();
    });

    it('given an empty summary, when rendered, then nothing is rendered', () => {
      render(ShowSummary, { props: { html: '   ' } });

      expect(screen.queryByTestId(TEST_IDS.showSummary)).toBeNull();
    });
  });
});
