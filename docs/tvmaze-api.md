# TVmaze API notes

Base URL `https://api.tvmaze.com` (`VITE_TVMAZE_BASE_URL`). Public, CORS-enabled, no key. Data is
CC BY-SA 4.0: every show page links back to its TVmaze page. Facts marked _measured_ were checked
against the live API on 2026-09-16 and drift as shows are added.

| Endpoint               | Used for   | Notes                                                                                                   |
| ---------------------- | ---------- | ------------------------------------------------------------------------------------------------------- |
| `GET /shows?page=n`    | show index | 250 ids per page, ordered by id; deleted shows leave gaps; `404` past the last page                     |
| `GET /search/shows?q=` | search     | fuzzy (fuzziness 2); returns `{ score, show }[]` with the full show object                              |
| `GET /shows/:id`       | detail     | status, dates, language, runtime, network and schedule; no embeds (the design shows no cast or seasons) |
| `GET /shows/:id`       | saved grid | only for a bookmarked or liked id missing from the local index; result merged into it                   |

## Index size and the loaded slice

- _Measured_: 378 pages (page 378 is `404`); the whole index is about 78,000 shows and roughly
  378 requests, or three minutes at the rate limit. The app never crawls it.
- The dashboard loads the first `VITE_INDEX_PAGES` pages (default 5, so pages 0 to 4). _Measured_ per page: 240, 245,
  242, 243 and 238 shows, so about 1,200 shows and 22 to 28 genres per page. Page 0 holds the
  early, well-known shows (Breaking Bad, Game of Thrones), which is why the slice makes a
  convincing dashboard although it is "the first 1,250 ids", not "the best shows".
- The README states this trade-off.

## Shape facts that drive the code

- `rating.average` is `number | null`. _Measured_ in the loaded slice: 4, 17, 43, 29 and 59 unrated
  shows per page (up to a quarter of a page), so unrated cards are a normal state, never an edge case.
- `image` is `{ medium, original } | null`. _Measured_: only 2 of the 1,208 shows in the loaded
  slice have no poster; the fallback still has to look intentional because search and saved grids
  reach older or obscure shows.
- `image.medium` is 210 × 295 px (5:7), `image.original` is up to 2000 × 3000 px (2:3). There is no
  intermediate size, so cards use `medium` only, at `aspect-ratio: 210 / 295`, and the detail page
  uses `original` at `2 / 3`; each box matches its image so nothing is cropped. A `srcset` between the two would trade a 12 KB image for a 400 KB one.
- `summary` is HTML (`<p>`, `<b>`, sometimes links) and can be `null`. Render it only through the
  sanitising component with an allow-list of `p`, `b`, `i`, `em`, `strong`, `br` and no attributes.
- `genres` may be empty. Unknown genre strings go to an `Other` bucket, never dropped.
- `weight` (0–100) is TVmaze's popularity. The list schema does not read it: it would be stored
  per show in the index cache and the id breaks rating ties just as deterministically.
- `premiered` can be `null`.

## Rate limit and caching

At least 20 calls per 10 s per IP. `429` means back off briefly, not fail: retry with exponential
back-off and jitter, at most 3 attempts. The index and `GET /shows/:id` are edge-cached for
60 minutes, so they rarely hit the limit; search is not cached, which is why search is debounced
and aborted, never fired per keystroke. Background index loading spaces requests about 600 ms
apart.

## Loading strategy

1. Fetch page 0 and render it: one round trip to a usable dashboard.
2. On an idle callback fetch the remaining pages (`VITE_INDEX_PAGES` in total, default 5), about 600 ms apart.
   Merge by id; genre rows are `computed`, so they widen as pages land. Keys are `ShowId`, so a
   card that moves keeps its identity.
3. Abort in-flight requests on unmount or route change. Cache the index in `sessionStorage` with
   a timestamp and reuse it when younger than 24 h.

## Search

Search hits the API rather than filtering the local slice, which is pages 0..N by id and correlates
with nothing the user cares about. Debounce 300 ms, abort the previous request, mirror the query to
`?q=`. A stale response must never overwrite a newer one. Results carry the full show object, so a
result card needs no second request. _Measured_: `breking bad` finds Breaking Bad, `brkng bd`
returns nothing; the fuzziness tolerates typos, not abbreviations. Cached index entries only speed
up rendering a known result; they never decide the result set.
