/** The two kinds of saved show; each is a set of ids the user chose on this device. */
export const SAVED_KINDS = ['bookmarks', 'likes'] as const;

export type SavedKind = (typeof SAVED_KINDS)[number];

const KINDS: ReadonlySet<string> = new Set(SAVED_KINDS);

export function isSavedKind(value: unknown): value is SavedKind {
  return typeof value === 'string' && KINDS.has(value);
}
