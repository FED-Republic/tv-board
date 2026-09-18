import { fireEvent, render, screen } from '@testing-library/vue';
import { h } from 'vue';
import ScrollRow from '@/components/ui/ScrollRow.vue';

export type RowItem = {
  readonly id: number;
  readonly name: string;
};

export const ITEMS: readonly RowItem[] = [
  { id: 169, name: 'Breaking Bad' },
  { id: 180, name: 'Firefly' },
  { id: 82, name: 'Game of Thrones' },
];

/** One more show than `ITEMS`, for the case where a row keeps filling after its first paint. */
export const GROWN_ITEMS: readonly RowItem[] = [...ITEMS, { id: 77, name: 'Lost' }];

export const ROW_WIDTH_PX = 300;
export const CONTENT_WIDTH_PX = 1_200;
/** A page is one viewport of cards, so 1200 px of cards in a 300 px row make four. */
export const PAGE_COUNT = 4;

/** The same cards once the loading tile has left the list: one viewport less of content. */
export const CONTENT_WIDTH_WITHOUT_SPINNER_PX = 900;
export const PAGE_COUNT_WITHOUT_SPINNER = 3;

type GrowableRow = {
  readonly rerender: (props: Record<string, unknown>) => Promise<void>;
};

const isRowItem = (value: unknown): value is RowItem =>
  typeof value === 'object' && value !== null && 'id' in value;

/** `render` erases the row's generic, so the key reader takes the widened item type. */
export const keyOf = (item: unknown): PropertyKey => (isRowItem(item) ? item.id : '');

const ROW_SLOTS = {
  heading: () => h('h2', 'Drama'),
  item: (props: { item: RowItem }) => h('a', { href: `/shows/${props.item.id}` }, props.item.name),
};

export const renderRow = (filling = false): unknown =>
  render(ScrollRow, {
    props: { items: ITEMS, itemKey: keyOf, label: 'Drama', filling },
    slots: ROW_SLOTS,
  });

/** The same row, keeping the handle a growth case needs to hand it more items. */
export const renderGrowableRow = (): GrowableRow =>
  render(ScrollRow, { props: { items: ITEMS, itemKey: keyOf, label: 'Drama' }, slots: ROW_SLOTS });

/** A row still filling, so its list carries the loading tile until `filling` flips back. */
export const renderFillingRow = (): GrowableRow =>
  render(ScrollRow, {
    props: { items: ITEMS, itemKey: keyOf, label: 'Drama', filling: true },
    slots: ROW_SLOTS,
  });

export const renderRowWithTools = (toolLabel: string): unknown =>
  render(ScrollRow, {
    props: { items: ITEMS, itemKey: keyOf, label: 'Drama' },
    slots: { ...ROW_SLOTS, tools: () => h('button', { type: 'button' }, toolLabel) },
  });

/** The scroller carries its own name, so it never collides with the section around it. */
export const scroller = (): HTMLElement => screen.getByRole('group', { name: 'Drama row' });

/** jsdom reports every box as zero; the row specs are the one place that supplies the metrics. */
export function giveRowOverflow(row: HTMLElement, contentWidthPx = CONTENT_WIDTH_PX): void {
  Object.defineProperty(row, 'clientWidth', { configurable: true, value: ROW_WIDTH_PX });
  Object.defineProperty(row, 'scrollWidth', { configurable: true, value: contentWidthPx });
}

/** Gives the row its metrics and lets it measure itself, exactly as a real scroll does. */
export async function measureOverflowingRow(): Promise<HTMLElement> {
  const row = scroller();

  giveRowOverflow(row);
  await fireEvent.scroll(row);

  return row;
}
