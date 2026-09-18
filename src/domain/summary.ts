/** Elements a TVmaze summary may keep. Everything else is unwrapped to its text. */
const ALLOWED_TAGS: ReadonlySet<string> = new Set(['p', 'b', 'i', 'em', 'strong', 'br']);

/** Elements removed together with their content. */
const DROPPED_TAGS: ReadonlySet<string> = new Set(['script', 'style']);

/**
 * Reduces summary HTML to the allow-listed elements with no attributes, so it is safe to render
 * through `v-html` in `ShowSummary.vue`, the only component permitted to do so.
 */
export function sanitizeSummary(html: string | null): string {
  if (html === null || html.trim() === '') {
    return '';
  }

  const document = new DOMParser().parseFromString(html, 'text/html');
  const output = document.createElement('div');

  appendSanitizedChildren(document.body, output);

  return output.innerHTML;
}

function appendSanitizedChildren(source: Node, target: Node): void {
  for (const child of Array.from(source.childNodes)) {
    appendSanitized(child, target);
  }
}

function appendSanitized(node: Node, target: Node): void {
  if (node.nodeType === Node.TEXT_NODE) {
    target.appendChild(node.cloneNode());
    return;
  }

  if (!(node instanceof Element)) {
    return;
  }

  const tag = node.tagName.toLowerCase();

  if (DROPPED_TAGS.has(tag)) {
    return;
  }

  if (!ALLOWED_TAGS.has(tag)) {
    appendSanitizedChildren(node, target);
    return;
  }

  const clean = node.ownerDocument.createElement(tag);

  appendSanitizedChildren(node, clean);
  target.appendChild(clean);
}
