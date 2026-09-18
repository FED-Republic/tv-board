import { render, screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import ShowFacts from '@/components/show/ShowFacts.vue';
import { TEST_IDS } from '@/testing/test-ids';
import { aShowDetail } from '../builders';

const descriptionFor = (term: string): string | undefined =>
  screen.getByText(term).nextElementSibling?.textContent ?? undefined;

describe('ShowFacts', () => {
  describe('when every fact is known', () => {
    it('given a complete show, when rendered, then the facts form a description list', () => {
      render(ShowFacts, { props: { show: aShowDetail() } });

      expect(screen.getByTestId(TEST_IDS.showFacts).tagName.toLowerCase()).toBe('dl');
    });

    it('given a complete show, when rendered, then Status is a term', () => {
      render(ShowFacts, { props: { show: aShowDetail({ status: 'Ended' }) } });

      expect(screen.getByText('Status').tagName.toLowerCase()).toBe('dt');
    });

    it('given a complete show, when rendered, then Status describes the state', () => {
      render(ShowFacts, { props: { show: aShowDetail({ status: 'Ended' }) } });

      expect(descriptionFor('Status')).toBe('Ended');
    });

    it('given a runtime, when rendered, then Runtime carries the unit', () => {
      render(ShowFacts, { props: { show: aShowDetail({ runtimeMinutes: 60 }) } });

      expect(descriptionFor('Runtime')).toBe('60 min');
    });
  });

  describe('when a fact is unknown', () => {
    it('given no runtime, when rendered, then no Runtime term is shown', () => {
      render(ShowFacts, { props: { show: aShowDetail({ runtimeMinutes: null }) } });

      expect(screen.queryByText('Runtime')).toBeNull();
    });
  });
});
