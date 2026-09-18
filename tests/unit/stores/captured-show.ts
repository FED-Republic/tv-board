/** The captured show both store harnesses build their made-up pages from. */

import pageZeroPayload from '../../resources/shows-page-0.2026-09-16.json';

export type ShowPayload = (typeof pageZeroPayload)[number];

/** A captured show, so a made-up page carries every field the schema asks for. */
function firstCapturedShow(): ShowPayload {
  const [first] = pageZeroPayload;

  if (first === undefined) {
    throw new Error('The captured page 0 holds no show to build a page from.');
  }

  return first;
}

export const TEMPLATE_PAYLOAD: ShowPayload = firstCapturedShow();
