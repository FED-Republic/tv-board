import { render, type RenderResult, screen } from '@testing-library/vue';
import { beforeEach, describe, expect, it } from 'vitest';
import { h, nextTick } from 'vue';
import DeferredBlock from '@/components/ui/DeferredBlock.vue';
import { TEST_IDS } from '@/testing/test-ids';
import {
  installIntersectionObserverStub,
  type IntersectionObserverStub,
} from '../../composables/intersection-observer-stub';

const BLOCK_SLOTS = {
  placeholder: () => h('p', 'Drama placeholder'),
  default: () => h('p', 'Drama row'),
};

/** The observer only sees the block once the mounted element reaches the template ref. */
async function renderBlock(eager = false): Promise<RenderResult> {
  const block = render(DeferredBlock, { props: { eager }, slots: BLOCK_SLOTS });

  await nextTick();

  return block;
}

const block = (): HTMLElement => screen.getByTestId(TEST_IDS.deferredBlock);

let observer: IntersectionObserverStub;

/** Fires the observer at the block and lets the swapped-in slot render. */
async function comeNear(): Promise<void> {
  observer.intersect(block());
  await nextTick();
}

beforeEach(() => {
  observer = installIntersectionObserverStub();
});

describe('DeferredBlock', () => {
  describe('when the block is still far from the viewport', () => {
    it('given a deferred block, when mounted, then the placeholder stands in', async () => {
      await renderBlock();

      expect(screen.getByText('Drama placeholder')).toBeDefined();
    });

    it('given a deferred block, when mounted, then the content is not rendered yet', async () => {
      await renderBlock();

      expect(screen.queryByText('Drama row')).toBeNull();
    });

    it('given a deferred block, when mounted, then it reports itself as not rendered', async () => {
      await renderBlock();

      expect(block().dataset['rendered']).toBe('false');
    });
  });

  describe('when the block comes near the viewport', () => {
    it('given a deferred block, when it intersects, then the content replaces the placeholder', async () => {
      await renderBlock();

      await comeNear();

      expect(screen.getByText('Drama row')).toBeDefined();
    });

    it('given a deferred block, when it intersects, then the placeholder is gone', async () => {
      await renderBlock();

      await comeNear();

      expect(screen.queryByText('Drama placeholder')).toBeNull();
    });

    it('given a deferred block, when it intersects, then it reports itself as rendered', async () => {
      await renderBlock();

      await comeNear();

      expect(block().dataset['rendered']).toBe('true');
    });

    it('given a block already rendered, when it intersects again, then the content stays', async () => {
      await renderBlock();
      await comeNear();

      await comeNear();

      expect(screen.getByText('Drama row')).toBeDefined();
    });
  });

  describe('when the caller asks for the content at once', () => {
    it('given an eager block, when mounted, then the content renders straight away', async () => {
      await renderBlock(true);

      expect(screen.getByText('Drama row')).toBeDefined();
    });

    it('given an eager block, when mounted, then it reports itself as rendered', async () => {
      await renderBlock(true);

      expect(block().dataset['rendered']).toBe('true');
    });

    it('given an eager block, when mounted, then nothing is observed', async () => {
      await renderBlock(true);

      expect(observer.observed).toEqual([]);
    });
  });

  describe('when the page turns a mounted block eager', () => {
    it('given a deferred block, when its eager prop turns true, then the content replaces the placeholder', async () => {
      const { rerender } = await renderBlock();

      await rerender({ eager: true });

      expect(screen.getByText('Drama row')).toBeDefined();
    });

    it('given a deferred block, when its eager prop turns true, then the placeholder is gone', async () => {
      const { rerender } = await renderBlock();

      await rerender({ eager: true });

      expect(screen.queryByText('Drama placeholder')).toBeNull();
    });

    it('given a deferred block, when its eager prop turns true, then it reports itself as rendered', async () => {
      const { rerender } = await renderBlock();

      await rerender({ eager: true });

      expect(block().dataset['rendered']).toBe('true');
    });
  });
});
