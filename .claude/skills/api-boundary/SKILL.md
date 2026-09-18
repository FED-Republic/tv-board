---
name: api-boundary
description: Use when adding or changing an HTTP endpoint, a response schema, or a mapper. Enforces the Zod boundary pattern (schema → inferred DTO → mapper → domain model), the typed error set, abort support and fixture-based tests.
---

# API boundary

Pattern: **schema → inferred DTO → mapper → domain model**. Read the _API layer_ section of `docs/conventions.md` and `docs/tvmaze-api.md` first.

```ts
// services/tvmaze/schema.ts — the only definition of the wire shape
export const showSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  genres: z.array(z.string()).readonly(),
  rating: z.object({ average: z.number().nullable() }),
  image: z.object({ medium: z.url(), original: z.url() }).nullable(),
  summary: z.string().nullable(),
});
export type ShowDto = z.infer<typeof showSchema>;

// services/tvmaze/mappers.ts — a DTO never leaves services/
export const mapShow = (dto: ShowDto): Show => ({
  id: toShowId(dto.id), // domain/show.ts: narrows through the `isShowId` type predicate, no cast
  name: dto.name,
  genres: dto.genres,
  rating: dto.rating.average,
  poster: dto.image ? { small: dto.image.medium, large: dto.image.original } : null,
  summaryHtml: dto.summary,
});

// services/tvmaze/endpoints.ts — parse once, return domain
export async function getShow(id: ShowId, signal?: AbortSignal): Promise<Show> {
  const json = await http.get(`/shows/${id}`, { signal });
  return mapShow(showSchema.parse(json));
}
```

Endpoints throw the typed errors (`NetworkError | HttpError | ValidationError | AbortError`). The
store or composable that calls an endpoint is where a throw becomes a value: it catches once and
sets `AsyncState` to `error`, so nothing above the store ever sees an exception.

## Rules

- Never hand-write a DTO interface; always `z.infer`. Arrays are `.readonly()` in the schema so the
  domain collection is `readonly` without a copy.
- Model nullables honestly with `.nullable()`, then decide in the mapper what the domain does with them.
- Parse exactly once per response, in the endpoint function. Wrap `ZodError` into the project's `ValidationError`.
- Endpoints accept an `AbortSignal` and return domain types, never a raw `Response`.
- Schemas and mappers are imported only inside `services/`; lint (`app/dto-boundary`) blocks any
  other import.
- The HTTP client maps failures to `NetworkError | HttpError | ValidationError | AbortError`, retries `429` with back-off and jitter (max 3 attempts), retries `5xx` once, never retries other `4xx`, never logs.
- Tests: a schema test with a real captured payload in `tests/resources/` plus one malformed variant per nullable field; endpoint tests through MSW covering 200, 404, 429-then-success, network error and abort.
