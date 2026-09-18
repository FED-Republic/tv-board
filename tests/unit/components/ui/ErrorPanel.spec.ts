import { fireEvent, render, screen, within } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import ErrorPanel from '@/components/ui/ErrorPanel.vue';

const PROPS = { title: 'Nothing loaded', body: 'The shows service did not answer.' };

const renderPanel = () => render(ErrorPanel, { props: PROPS });

describe('ErrorPanel', () => {
  describe('when a failure is shown', () => {
    it('given a title and a body, when rendered, then both sit inside one alert', () => {
      renderPanel();

      const alert = screen.getByRole('alert');

      expect(within(alert).queryByText(PROPS.title)).not.toBeNull();
      expect(within(alert).queryByText(PROPS.body)).not.toBeNull();
    });

    it('given a failure, when rendered, then the action reads Retry', () => {
      renderPanel();

      expect(screen.getByRole('button', { name: 'Retry' })).toBeDefined();
    });
  });

  describe('when the reader asks for another attempt', () => {
    it('given an idle panel, when the action is clicked, then retry is emitted once', async () => {
      const { emitted } = renderPanel();

      await fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

      expect(emitted()['retry']).toHaveLength(1);
    });
  });
});
