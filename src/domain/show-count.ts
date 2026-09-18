/** `1 show`, `12 shows`: the count line under a grid heading. */
export const describeShowCount = (count: number): string =>
  count === 1 ? '1 show' : `${count} shows`;

/** A capped row says so: `Top 25 of 84 loaded shows`; an uncapped one is a plain count. */
export function describeRowCount(shown: number, total: number): string {
  if (total <= shown) {
    return describeShowCount(total);
  }

  return `Top ${shown} of ${total} loaded shows`;
}
