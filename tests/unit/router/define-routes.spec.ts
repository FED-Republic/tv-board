import { describe, expect, it } from 'vitest';
import { defineComponent, h } from 'vue';
import type { AppRouteRecord } from '@/router/define-routes';
import { defineRoutes } from '@/router/define-routes';

const PageStub = defineComponent({ name: 'PageStub', render: () => h('div') });

const RECORDS: readonly AppRouteRecord[] = [
  { path: '/', name: 'home', component: PageStub, meta: { title: 'Shows by genre' } },
];

describe('defineRoutes', () => {
  describe('when route records are declared', () => {
    it('given titled records, when defined, then the same list comes back', () => {
      expect(defineRoutes(RECORDS)).toBe(RECORDS);
    });

    it('given titled records, when defined, then each title is kept', () => {
      expect(defineRoutes(RECORDS)[0]?.meta.title).toBe('Shows by genre');
    });

    it('given no records, when defined, then the list stays empty', () => {
      expect(defineRoutes([])).toEqual([]);
    });
  });
});
