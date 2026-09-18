import type { z } from 'zod';
import { type ApiError, HttpError, toApiError, ValidationError } from '@/domain/api-error';
import type { Show, ShowDetail, ShowId } from '@/domain/show';
import { httpGetJson } from '@/services/http/client';
import { TVMAZE_BASE_URL } from '@/services/tvmaze/config';
import { mapShow, mapShowDetail } from '@/services/tvmaze/mappers';
import {
  listSchema,
  searchResultSchema,
  showListItemSchema,
  showSchema,
} from '@/services/tvmaze/schema';

/** `GET /shows/:id` requests in flight at once for a batch; TVmaze allows 20 per 10 s. */
export const MAX_CONCURRENT_SHOW_REQUESTS = 4;

const HTTP_NOT_FOUND = 404;

export type ShowBatch = {
  /** The shows TVmaze still has, in request order; a deleted show (`404`) is left out. */
  readonly found: readonly Show[];
  /** The ids TVmaze answered `404` for, so a caller can stop asking for them. */
  readonly deleted: readonly ShowId[];
  /** The first failure other than a deleted show, or `null` when every request settled. */
  readonly failure: ApiError | null;
};

/**
 * One page of the show index, 250 ids per page; `HttpError(404)` past the last page. An item
 * that does not match the schema is dropped, so one odd show never empties the dashboard.
 */
export async function getShowsPage(page: number, signal?: AbortSignal): Promise<readonly Show[]> {
  const items = await fetchParsed(`/shows?page=${page}`, listSchema, signal);

  return parseListItems(items);
}

/** The full show; a schema mismatch is an error here, because the page has nothing else. */
export async function getShow(id: ShowId, signal?: AbortSignal): Promise<ShowDetail> {
  const dto = await fetchParsed(`/shows/${id}`, showSchema, signal);

  return mapShowDetail(dto);
}

/**
 * The shows for `ids`, at most `MAX_CONCURRENT_SHOW_REQUESTS` requests at a time. Every id is
 * tried; the shows that resolved are returned even when another request failed.
 */
export async function getShows(ids: readonly ShowId[], signal?: AbortSignal): Promise<ShowBatch> {
  const queue = [...ids];
  const foundById = new Map<ShowId, Show>();
  const deleted: ShowId[] = [];
  let failure: ApiError | null = null;

  async function drain(): Promise<void> {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      if (signal?.aborted) {
        return;
      }

      const outcome = await fetchOne(id, signal);

      if (outcome instanceof Error) {
        failure ??= outcome;
      } else if (outcome === null) {
        deleted.push(id);
      } else {
        foundById.set(id, outcome);
      }
    }
  }

  const workerCount = Math.min(ids.length, MAX_CONCURRENT_SHOW_REQUESTS);
  const workers = Array.from({ length: workerCount }, drain);

  await Promise.all(workers);

  return { found: ids.flatMap((id) => foundById.get(id) ?? []), deleted, failure };
}

/** Fuzzy name search; results keep TVmaze's relevance order, unreadable items are dropped. */
export async function searchShows(query: string, signal?: AbortSignal): Promise<readonly Show[]> {
  const path = `/search/shows?q=${encodeURIComponent(query)}`;
  const items = await fetchParsed(path, listSchema, signal);
  const shows = items.map((item) => searchResultSchema.safeParse(item).data?.show);

  return parseListItems(shows);
}

/** A resolved show, `null` for one TVmaze no longer has, or the failure as a value. */
async function fetchOne(id: ShowId, signal?: AbortSignal): Promise<Show | null | ApiError> {
  try {
    return await getShow(id, signal);
  } catch (reason) {
    const failure = toApiError(reason);

    return isNotFound(failure) ? null : failure;
  }
}

/**
 * Parses list items one by one and keeps the ones that match. A non-empty list where nothing
 * matches means the shape changed, which is a `ValidationError` like any other.
 */
function parseListItems(items: readonly unknown[]): readonly Show[] {
  const results = items.map((item) => showListItemSchema.safeParse(item));
  const shows = results.flatMap((result) => (result.success ? [mapShow(result.data)] : []));

  if (items.length > 0 && shows.length === 0) {
    const issues = results.flatMap((result) => result.error?.issues.map(describeIssue) ?? []);

    throw new ValidationError(issues);
  }

  return shows;
}

/** Parses each response exactly once; a schema mismatch becomes a `ValidationError`. */
async function fetchParsed<T>(
  path: string,
  schema: z.ZodType<T>,
  signal: AbortSignal | undefined,
): Promise<T> {
  const json = await httpGetJson(`${TVMAZE_BASE_URL}${path}`, { signal });
  const result = schema.safeParse(json);

  if (!result.success) {
    throw new ValidationError(result.error.issues.map(describeIssue));
  }

  return result.data;
}

const isNotFound = (failure: ApiError): boolean =>
  failure instanceof HttpError && failure.status === HTTP_NOT_FOUND;

const describeIssue = (issue: z.core.$ZodIssue): string =>
  `${issue.path.map(String).join('.')}: ${issue.message}`;
