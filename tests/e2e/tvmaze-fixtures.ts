import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Page } from '@playwright/test';

const RESOURCES = resolve(process.cwd(), 'tests/resources');
const API_PATTERN = 'https://api.tvmaze.com/**';
/** The dashboard loads five pages; each answers with the captured page 0 (ids merge by id). */
const INDEX_PAGES = new Set(['0', '1', '2', '3', '4']);
const NOT_FOUND_BODY = { name: 'Not Found', status: 404 };

const readJson = (file: string): string => readFileSync(resolve(RESOURCES, file), 'utf8');

const showsPageZero = readJson('shows-page-0.2026-09-16.json');
const breakingBad = readJson('show-169.2026-09-16.json');
const fleabagResults = readJson('search-fleabag.2026-09-16.json');

/**
 * Answers every TVmaze request from the captured payloads, so the smoke suite never depends on
 * the live API: the index pages, show 169 and the "fleabag" search exist; anything else is a 404.
 */
export async function serveTvmazeFixtures(page: Page): Promise<void> {
  await page.route(API_PATTERN, async (route) => {
    const url = new URL(route.request().url());
    const body = fixtureFor(url);

    if (body === null) {
      await route.fulfill({ status: 404, json: NOT_FOUND_BODY });
      return;
    }

    await route.fulfill({ status: 200, contentType: 'application/json', body });
  });
}

function fixtureFor(url: URL): string | null {
  if (url.pathname === '/shows' && INDEX_PAGES.has(url.searchParams.get('page') ?? '')) {
    return showsPageZero;
  }

  if (url.pathname === '/shows/169') {
    return breakingBad;
  }

  if (url.pathname === '/search/shows' && url.searchParams.get('q') === 'fleabag') {
    return fleabagResults;
  }

  return null;
}
