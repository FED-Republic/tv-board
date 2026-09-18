# Claude Design brief: TV Genre Dashboard

Prototype produced from this brief: `ShowBoard.dc.html`
(https://claude.ai/design/p/1b44ce73-3731-4df7-b10d-6d5a0c862cd6). Token values and card
measurements extracted from it belong in `src/styles/tokens.css` and the component tokens.

The prototype export does not live in the repository; the share link above is the reference.
Screens in it: Dashboard with staged loading, Search results, Bookmarked and Liked grids, Show
detail, plus States, Components and Tokens reference pages. The prototype added bookmarks and likes
(card toggles, detail buttons, two grid screens, ids in `localStorage`) beyond the brief below; they
are kept as a feature, see `DECISIONS.md` and the `saved` store in `docs/conventions.md`.

Paste everything below the line into Claude Design. Edit the bracketed parts first if you want a
different direction.

---

## Context

Design the interface for a TV show dashboard built on the public TVmaze API. It is a portfolio piece,
so the design has to read as considered and professional, not as a demo: simple yet eye-catching.

I am building it in Vue 3 with hand-written CSS — no component library, no Tailwind. So everything you
design has to be implementable in plain CSS by one developer. That is a real constraint, not a
preference.

## The product

Someone opens the app to browse television by genre and decide what to watch next. Shows are grouped
into horizontal rows — Drama, Comedy, Science-Fiction, Crime, Sport and around twenty more — sorted by
rating within each row. They can search by name, and open any show for details.

The content is posters, titles, ratings, genres and a paragraph of summary text. Posters are 2:3
portrait images and they are the visual heart of the product. Real examples of the data:

- _Breaking Bad_ — Drama, Crime, Thriller — rating 9.3
- _Game of Thrones_ — Drama, Adventure, Fantasy — rating 8.9
- _Fleabag_ — Drama, Comedy — rating 8.4
- _Chernobyl_ — Drama, History — rating 9.0
- Up to a quarter of a page has **no rating at all**, and a few shows (2 of about 1,200 in the loaded
  slice; more in search and saved grids) have **no poster**. Those are not edge cases to hide; they
  appear in every row and must look intentional.

Audience: general viewers on a phone or a laptop. Primary job: scan a lot of posters quickly, and be
able to tell at a glance which ones are highly rated.

## What to produce

1. **Dashboard** — desktop (1440px) and phone (390px). Header with search, three genre rows visible.
2. **Show detail** — desktop and phone. Poster, title, rating, genre chips, summary, back navigation,
   link out to TVmaze.
3. **Search results** — phone only is enough.
4. **The states**, at phone width: loading skeletons for a row, a row error with retry, an empty search
   result, and a card with no poster and no rating.
5. **A token block** in OKLCH I can paste into `tokens.css`: background, surface, text, muted text,
   accent, accent-hover, rating colour, focus ring, three radii, one shadow, a type scale using
   `clamp()`, and two durations.

## Hard constraints

- **Dark theme as the default**, with a light theme that works from the same semantic token names via
  `light-dark()`. Both must pass WCAG 2.2 AA.
- Genre rows scroll horizontally with `scroll-snap`. On phones the next card must be **partly visible**
  at the row edge — that peek is the only cue that the row scrolls, so the card width has to be chosen
  with it in mind.
- Scroll arrows exist on pointer devices only. Design them; they never appear on touch.
- Posters are always 2:3. Space is reserved before they load, so skeletons must match card geometry
  exactly. (Implementation note, added after the design: the poster the cards actually load is
  TVmaze's `medium` image at 210 × 295 px, so the built card uses `aspect-ratio: 210 / 295`; see
  `docs/tvmaze-api.md`.)
- Every control is at least 44×44px. Focus rings are visible and designed, not a browser default.
- Motion is minimal and must be removable entirely under `prefers-reduced-motion` without the design
  falling apart.
- One accent colour. Derived states (hover, muted, disabled) come from it via `color-mix()`, so pick an
  accent that survives being lightened and darkened.
- The rating is the one piece of data that needs to be readable at a glance across a row of twelve
  cards. Solve that properly — it is the most interesting problem in this brief.

## Where to spend boldness

Pick one element to be memorable and keep everything else quiet: the rating treatment, the row
headings, the detail page's poster-to-text relationship, or the search interaction. One of them, not
four.

## Avoid

- **Anything that reads as a Netflix clone.** The horizontal-rows pattern is fixed;
  differentiate through typography, spacing rhythm and the rating treatment instead.
- Near-black background with a single acid-green or vermilion accent.
- Warm cream background with a high-contrast serif and a terracotta accent.
- Identical rounded cards with the same radius and the same soft grey shadow on every element.
- Tracked-out all-caps eyebrow labels above headings; meta strings joined with middle dots; arrows
  appended to button text; a monospace face used only for small data labels.
- Gradient washes used as decoration rather than as information.
- Hover transitions on every card and fade-up entrances on every section.

## Copy

Write the interface copy as part of the design — row headings, the search placeholder, the empty state,
the error state, the missing-poster fallback. Plain sentence case, active voice. The error says what
went wrong and what to do; the empty state invites an action. No apologies.

## Output

Show me the screens, then give me:

- the token block, ready to paste;
- the card and row measurements (card width range, gap, peek amount, row padding);
- a short note — no more than 150 words — on what the one bold element is and why the rest stays quiet.

Before you start, give me a one-paragraph plan of the direction you intend to take, and tell me which
part of it you had to revise because your first instinct was the generic default.
