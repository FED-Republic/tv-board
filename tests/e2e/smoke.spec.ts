import { expect, type Locator, type Page, test } from '@playwright/test';
import { TEST_IDS } from '@/testing/test-ids';
import { serveTvmazeFixtures } from './tvmaze-fixtures';

/** The dashboard fills about sixteen rows, so a walk down it never needs more steps. */
const MOUNT_STEP_LIMIT = 25;
const WAITING_BLOCK = '[data-rendered="false"]';
const EXPAND_ROW_NAME = /row as a grid$/;

const blocksStillWaiting = (page: Page): Locator =>
  page.getByTestId(TEST_IDS.deferredBlock).and(page.locator(WAITING_BLOCK));

/**
 * Walks down the dashboard until no row is left waiting: a row below the fold only mounts once
 * the reader nears it, and every row that mounts makes the page taller, so an offset recorded
 * before they are all there is an offset the page can no longer reach.
 */
async function mountEveryRow(page: Page): Promise<void> {
  for (let step = 0; step < MOUNT_STEP_LIMIT; step += 1) {
    const waitingCount = await blocksStillWaiting(page).count();

    if (waitingCount === 0) {
      break;
    }

    await blocksStillWaiting(page).first().scrollIntoViewIfNeeded();
    await expect.poll(() => blocksStillWaiting(page).count()).toBeLessThan(waitingCount);
  }

  await expect(blocksStillWaiting(page)).toHaveCount(0);
}

/**
 * The expand button of the row the walk down left at the bottom, held by name rather than by
 * position: one more row mounting below would make "the last button" another one by the time
 * Playwright clicks, and it scrolls whatever it clicks into view first.
 */
async function lastExpandButton(page: Page): Promise<Locator> {
  const lastRow = page.getByRole('button', { name: EXPAND_ROW_NAME }).last();
  const label = await lastRow.getAttribute('aria-label');

  if (label === null) {
    throw new Error('every expand button should carry the name of its row');
  }

  return page.getByRole('button', { name: label, exact: true });
}

const pageOffset = (page: Page): Promise<number> => page.evaluate(() => window.scrollY);

test.beforeEach(async ({ page }) => {
  await serveTvmazeFixtures(page);
});

test.describe('dashboard', () => {
  test('given the first index page, when the dashboard loads, then genre rows render with cards and no console output', async ({
    page,
  }) => {
    const consoleMessages: string[] = [];

    page.on('console', (message) => consoleMessages.push(message.text()));

    await page.goto('/');

    const dramaRow = page.getByRole('region', { name: 'Drama' });

    await expect(dramaRow).toBeVisible();
    await expect(dramaRow.getByRole('link').first()).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();
    expect(consoleMessages).toEqual([]);
  });

  test('given a row far down the dashboard, when its grid is opened and closed, then the page is back where it was', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('region', { name: 'Drama' })).toBeVisible();
    await mountEveryRow(page);
    const expandRow = await lastExpandButton(page);
    await expandRow.scrollIntoViewIfNeeded();
    // Playwright scrolls a control into view before clicking it; a button already fully in the
    // viewport means the click itself leaves the offset alone.
    await expect(expandRow).toBeInViewport({ ratio: 1 });
    const offsetBeforeTheGrid = await pageOffset(page);

    await expandRow.click();
    await page.getByRole('button', { name: /^Close .* grid$/ }).click();

    await expect.poll(() => pageOffset(page)).toBe(offsetBeforeTheGrid);
  });
});

test.describe('search', () => {
  test('given a title typed in the header, when the query lands in the URL, then results show', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('searchbox', { name: 'Search shows by title' }).fill('fleabag');

    await expect(page).toHaveURL(/\/search\?q=fleabag/);
    await expect(page.getByRole('link', { name: /Fleabag/ }).first()).toBeVisible();
  });
});

test.describe('bookmarks', () => {
  test('given a bookmarked show, when the page reloads, then the bookmark is still on and listed', async ({
    page,
  }) => {
    await page.goto('/shows/169');

    const bookmark = page.getByRole('button', { name: 'Bookmark' });

    await bookmark.click();
    await expect(bookmark).toHaveAttribute('aria-pressed', 'true');

    await page.reload();

    await expect(page.getByRole('button', { name: 'Bookmark' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.getByRole('link', { name: 'Bookmarked' }).click();

    await expect(page.getByRole('link', { name: /Breaking Bad/ })).toBeVisible();
  });
});
