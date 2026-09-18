import { fireEvent, render, screen } from '@testing-library/vue';
import { describe, expect, it, vi } from 'vitest';
import AppButton from '@/components/ui/AppButton.vue';
import { TEST_IDS } from '@/testing/test-ids';

const RETRY_SLOT = { default: () => 'Retry' };

describe('AppButton', () => {
  describe('when the button carries a label', () => {
    it('given slot text, when rendered, then the button is named by that text', () => {
      render(AppButton, { slots: RETRY_SLOT });

      expect(screen.getByRole('button', { name: 'Retry' })).toBeDefined();
    });

    it('given no type, when rendered, then the button never submits a form', () => {
      render(AppButton, { slots: RETRY_SLOT });

      expect(screen.getByRole('button').getAttribute('type')).toBe('button');
    });

    it('given no test id from the parent, when rendered, then the default hook is used', () => {
      render(AppButton, { slots: RETRY_SLOT });

      expect(screen.getByRole('button').dataset['testid']).toBe(TEST_IDS.appButton);
    });

    it('given a test id from the parent, when rendered, then it replaces the default hook', () => {
      render(AppButton, { attrs: { 'data-testid': TEST_IDS.errorPanelRetry }, slots: RETRY_SLOT });

      expect(screen.getByRole('button').dataset['testid']).toBe(TEST_IDS.errorPanelRetry);
    });
  });

  describe('when the button is clicked', () => {
    it('given an enabled button, when clicked, then the parent listener runs', async () => {
      const onClick = vi.fn();
      render(AppButton, { attrs: { onClick }, slots: RETRY_SLOT });

      await fireEvent.click(screen.getByRole('button'));

      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
