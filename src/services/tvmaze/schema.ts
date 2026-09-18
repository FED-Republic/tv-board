import { z } from 'zod';

/**
 * The only definition of TVmaze wire shapes (docs/tvmaze-api.md). Unknown keys are ignored;
 * every field the app reads is listed with its nullability as measured on the live API.
 */

/** A card reads the medium image only; parsing drops `original` with every other key. */
const imageSchema = z.object({
  medium: z.url(),
});

const detailImageSchema = imageSchema.extend({
  original: z.url(),
});

const namedSchema = z.object({
  name: z.string(),
});

const scheduleSchema = z.object({
  time: z.string(),
  days: z.array(z.string()).readonly(),
});

/** The fields a list view reads; the index and search pages parse each item against this. */
export const showListItemSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  genres: z.array(z.string()).readonly(),
  rating: z.object({ average: z.number().nullable() }),
  image: imageSchema.nullable(),
  premiered: z.string().nullable(),
});

/** The full show, for `GET /shows/:id`. */
export const showSchema = showListItemSchema.extend({
  image: detailImageSchema.nullable(),
  summary: z.string().nullable(),
  ended: z.string().nullable(),
  status: z.string(),
  language: z.string().nullable(),
  runtime: z.number().nullable(),
  averageRuntime: z.number().nullable(),
  network: namedSchema.nullable(),
  webChannel: namedSchema.nullable(),
  schedule: scheduleSchema,
  url: z.url(),
});

/** A list body is checked to be an array here; its items are parsed one by one. */
export const listSchema = z.array(z.unknown()).readonly();

export const searchResultSchema = z.object({ score: z.number(), show: z.unknown() });

export type ShowListItemDto = z.infer<typeof showListItemSchema>;
export type ShowDto = z.infer<typeof showSchema>;
