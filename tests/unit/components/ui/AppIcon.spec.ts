import { render, screen } from '@testing-library/vue';
import { describe, expect, it } from 'vitest';
import AppIcon from '@/components/ui/AppIcon.vue';
import { TEST_IDS } from '@/testing/test-ids';

const icon = () => screen.getByTestId(TEST_IDS.appIcon);

describe('AppIcon', () => {
  describe('when an icon is rendered', () => {
    it('given a name, when rendered, then the svg is hidden from assistive technology', () => {
      render(AppIcon, { props: { name: 'search' } });

      expect(icon().getAttribute('aria-hidden')).toBe('true');
    });

    it('given a name, when rendered, then the icon name is exposed as data-icon', () => {
      render(AppIcon, { props: { name: 'bookmark' } });

      expect(icon().dataset['icon']).toBe('bookmark');
    });

    it('given a name, when rendered, then the drawing is an svg', () => {
      render(AppIcon, { props: { name: 'heart' } });

      expect(icon().tagName.toLowerCase()).toBe('svg');
    });
  });

  describe('when the filled variant is asked for', () => {
    it('given no filled flag, when rendered, then the outline stays unfilled', () => {
      render(AppIcon, { props: { name: 'heart' } });

      expect(icon().getAttribute('fill')).toBe('none');
    });

    it('given filled, when rendered, then the shape fills with the current colour', () => {
      render(AppIcon, { props: { name: 'heart', filled: true } });

      expect(icon().getAttribute('fill')).toBe('currentColor');
    });
  });
});
