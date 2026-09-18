# Manual check and Lighthouse

Results of the browser check and the Lighthouse audits on the production build, newest first.
The README links here; the conventions ask for Performance ≥ 90, Accessibility 100 and Best
practices 100 on `/` before submission.

## How to run

```sh
npm run build && npm run preview
npx --yes lighthouse@13.4.1 http://localhost:4173/ --form-factor=mobile --screenEmulation.mobile \
  --throttling-method=simulate --chrome-flags="--headless=new" \
  --output=json --output-path=./tests/reports/mobile.json
npx --yes lighthouse@13.4.1 http://localhost:4173/ --preset=desktop \
  --throttling-method=simulate --chrome-flags="--headless=new" \
  --output=json --output-path=./tests/reports/desktop.json
```

`tests/reports/` is gitignored, so the JSON never reaches Prettier or a commit. Pin the Lighthouse
version to the one in the table you compare against.

Simulated throttling means the trace is recorded unthrottled and Lighthouse models slow 4G with a
4× CPU slowdown on top of it, so the performance score moves by several points between runs. Read
the largest-contentful-paint element and its phase breakdown from the `lcp-breakdown-insight` and
`lcp-discovery-insight` audits in the JSON.

## 2026-09-17 (evening): after the review fixes

Lighthouse 13.4.1, headless Chrome, simulated throttling, production build after the review
fix list (single page gutter, light `Show` model in the index and cache, per-item parsing, the
contrast tokens, one status region, the Playwright suite). Both categories that the conventions
gate at 100 stayed at 100; no accessibility or best-practices audit fails.

| Preset  | Perf | A11y | Best practices | SEO | FCP   | LCP   | TBT   | CLS   |
| ------- | ---- | ---- | -------------- | --- | ----- | ----- | ----- | ----- |
| Mobile  | 83   | 100  | 100            | 100 | 1.7 s | 4.6 s | 50 ms | 0.009 |
| Desktop | 97   | 100  | 100            | 100 | 0.4 s | 0.9 s | 0 ms  | 0.093 |

Mobile sits inside the 3.5–4.9 s LCP spread of the morning runs below; the LCP element and its
cause (poster discovery after the bundle and the first index page) are unchanged, so the
mobile item stays open under _What I would do next_ in the README.

## 2026-09-17: TV Board next to tvmaze.com

Lighthouse 13.4.1, headless Chrome 143, simulated throttling, both sites audited within the same
five minutes. TV Board is the production build with the resource hints added the same day
(`preconnect` to the API and image hosts, `preload as="fetch"` for the first index page).

| Site         | Preset  | Perf | A11y | Best practices | SEO | FCP   | LCP    | TBT    | CLS   |
| ------------ | ------- | ---- | ---- | -------------- | --- | ----- | ------ | ------ | ----- |
| TV Board `/` | Mobile  | 89   | 100  | 100            | 100 | 1.7 s | 3.5 s  | 120 ms | 0.011 |
| TV Board `/` | Desktop | 97   | 100  | 100            | 100 | 0.4 s | 1.0 s  | 0 ms   | 0.077 |
| tvmaze.com   | Mobile  | 60   | 77   | 77             | 100 | 6.2 s | 10.7 s | 10 ms  | 0     |
| tvmaze.com   | Desktop | 94   | 61   | 77             | 100 | 0.8 s | 1.4 s  | 0 ms   | 0.065 |

A performance-only mobile run a few minutes earlier gave TV Board 81 with LCP 4.9 s and tvmaze
59 with LCP 9.7 s; that spread is the simulation, not a code change. Before the resource hints,
the same morning, TV Board mobile scored 80 with LCP 5.2 s. Mobile is one point under the
Performance ≥ 90 gate; the item stays open under _What I would do next_ in the README.

### What the largest contentful paint is

On both sites and both presets the LCP element is a `medium_portrait` poster `<img>` from
`static.tvmaze.com`: the first card in the first row here, "The Voice" on tvmaze. tvmaze uses no
image-exclusion trick: its home page is server-rendered HTML with 30 plain `<img src>` tags, no
`loading="lazy"`, no `data-src`, no `<picture>`, no CSS backgrounds and no `fetchpriority`.

### Why the two sites differ

- **tvmaze on desktop is fast because the poster URL is in the HTML.** Lighthouse marks its LCP
  request as discoverable in the initial document, so the image downloads in the same round trip
  as the stylesheet. That is a server-rendering advantage, not an image technique.
- **tvmaze on mobile is slow because of render-blocking CSS and ad scripts.** Two blocking
  stylesheets (`app.css`, `ad.css`) plus jQuery, Foundation and the ad delivery scripts hold first
  paint to about 6 s under slow 4G; the ad widgets keep loading past 10 s.
- **TV Board's LCP cost is discovery, not the image.** The poster is about 20 KB and loads with
  `fetchpriority="high"` in under 50 ms of resource time. Almost all of its LCP time is "resource
  load delay": the URL is unknown until the shell, the JavaScript bundle, the first index page
  (about 106 KB) and the Vue render have all completed, and Lighthouse flags the request as not
  discoverable in the initial document. The four background index pages then keep the main thread
  busy, which is the total-blocking-time cost the README lists under _What I would do next_.

### What the resource hints changed

`index.html` now preconnects to `api.tvmaze.com` and `static.tvmaze.com` and preloads
`/shows?page=0` as a fetch, but only on `/` when the session cache is empty; any other route, and
every warm reload, would download 106 KB that nothing reads and earn Chrome's unused-preload
warning. Reuse is verified in Chrome 143 on the preview build, not inferred from the waterfall:
on a cold load `performance.getEntriesByType('resource')` holds one entry for the page, with
`initiatorType: 'link'`, and no second `fetch` entry, so the store's request was served from the
preload despite its `Accept: application/json` header; fifteen seconds after load the console is
empty. On a warm reload and on a deep link the preload is absent and no index request is made.
In the Lighthouse trace the page is requested 5 ms after the document; before, it started only
after the bundle had been parsed. Mobile LCP went from 5.2 s to 3.5–4.9 s across runs; desktop
LCP is 1.0 s (no desktop LCP was recorded before the hints, only the score of 96).

## 2026-09-16: first browser check and Lighthouse

Checked on the production build (`npm run build && npm run preview`) against the live TVmaze API,
in Chrome 143 at 390 px and 1440 px, dark and light, keyboard only: skip link, header controls,
row region with arrow keys, Home and End, Enter into the detail page (focus moves to `main`, title
updates), bookmark and like toggles with `aria-pressed`. No console output on any page.

Lighthouse 13.4.1, headless Chrome, simulated throttling, `/`:

| Preset  | Performance | Accessibility | Best practices | SEO |
| ------- | ----------- | ------------- | -------------- | --- |
| Desktop | 96          | 100           | 100            | 100 |
| Mobile  | 70          | 100           | 100            | 100 |

Performance varies by a few points between runs. Mobile loses on largest contentful paint and
total blocking time under the simulated slow 4G and 4× CPU slowdown: five 100 KB index pages are
parsed and rendered while the page is already usable. See _What I would do next_ in the README.
