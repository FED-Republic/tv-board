const DEFAULT_BASE_URL = 'https://api.tvmaze.com';
const DEFAULT_INDEX_PAGE_COUNT = 5;

export const TVMAZE_BASE_URL: string = readBaseUrl(import.meta.env.VITE_TVMAZE_BASE_URL);

/** How many pages of the show index the dashboard loads, page 0 first. */
export const INDEX_PAGE_COUNT: number = readPageCount(import.meta.env.VITE_INDEX_PAGES);

function readBaseUrl(raw: string | undefined): string {
  if (raw === undefined || raw === '') {
    return DEFAULT_BASE_URL;
  }

  return raw.replace(/\/+$/, '');
}

function readPageCount(raw: string | undefined): number {
  const parsed = Number(raw);
  const isValid = Number.isInteger(parsed) && parsed > 0;

  return isValid ? parsed : DEFAULT_INDEX_PAGE_COUNT;
}
