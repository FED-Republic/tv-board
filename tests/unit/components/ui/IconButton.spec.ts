import { fireEvent, render, screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import IconButton from '@/components/ui/IconButton.vue';
import { TEST_IDS } from '@/testing/test-ids';

const BACK_LABEL = 'Scroll Drama back';

const renderButton = (disabled = false) =>
  render(IconButton, { props: { label: BACK_LABEL, icon: 'chevron-left', disabled } });

const button = (): HTMLElement => screen.getByRole('button', { name: BACK_LABEL });

const icon = (): HTMLElement => screen.getByTestId(TEST_IDS.appIcon);

describe('IconButton', () => {
  describe('when the button is rendered', () => {
    it('given a label, when rendered, then the button carries it as its name', () => {
      renderButton();

      expect(button()).toBeDefined();
    });

    it('given an icon button, when rendered, then it never submits a form', () => {
      renderButton();

      expect(button().getAttribute('type')).toBe('button');
    });

    it('given the chevron-left icon, when rendered, then that icon is drawn inside', () => {
      renderButton();

      expect(icon().dataset['icon']).toBe('chevron-left');
    });
  });

  describe('when the action is unavailable', () => {
    it('given disabled, when rendered, then the button cannot be pressed', () => {
      renderButton(true);

      expect(button().hasAttribute('disabled')).toBe(true);
    });

    it('given no disabled flag, when rendered, then the button stays pressable', () => {
      renderButton();

      expect(button().hasAttribute('disabled')).toBe(false);
    });
  });

  describe('when the parent tags the button', () => {
    it('given a fallthrough data-testid, when rendered, then it lands on the button itself', () => {
      render(IconButton, {
        props: { label: BACK_LABEL, icon: 'chevron-left' },
        attrs: { 'data-testid': TEST_IDS.genreRowExpand },
      });

      expect(screen.getByTestId(TEST_IDS.genreRowExpand).tagName).toBe('BUTTON');
    });
  });

  describe('when the button is pressed', () => {
    it('given a rendered button, when it is clicked, then the click reaches the parent', async () => {
      const { emitted } = renderButton();

      await fireEvent.click(button());

      expect(emitted()['click']).toHaveLength(1);
    });
  });
});
