import { flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import type { RouteRecordRaw, Router } from 'vue-router';
import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router';

const RouteStub = defineComponent({ name: 'RouteStub', render: () => h('div') });

/** The app's route names with stub components; the composables only read and write locations. */
const ROUTES: readonly RouteRecordRaw[] = [
  { path: '/', name: 'home', component: RouteStub, meta: { title: 'Shows by genre' } },
  { path: '/shows/:id', name: 'show', component: RouteStub, meta: { title: 'Show' } },
  { path: '/search', name: 'search', component: RouteStub, meta: { title: 'Search' } },
  { path: '/bookmarked', name: 'bookmarked', component: RouteStub, meta: { title: 'Bookmarked' } },
  { path: '/liked', name: 'liked', component: RouteStub, meta: { title: 'Liked' } },
];

/** A memory router already sitting at `startLocation`, ready to mount. */
export async function createTestRouter(startLocation: string): Promise<Router> {
  const router = createRouter({ history: createMemoryHistory(), routes: [...ROUTES] });

  await router.push(startLocation);
  await router.isReady();

  return router;
}

/**
 * A router on jsdom's own history, for code that reads `history.state.back`: a memory history
 * records no such entry. It replaces the start location, so the history does not grow per spec.
 */
export async function createBrowserTestRouter(startLocation: string): Promise<Router> {
  const router = createRouter({ history: createWebHistory(), routes: [...ROUTES] });

  await router.replace(startLocation);
  await router.isReady();

  return router;
}

/** jsdom delivers `popstate` on a task of its own, so a history step needs one to settle. */
export async function whenHistoryStepSettles(step: () => void): Promise<void> {
  const popped = new Promise<void>((resolve) => {
    window.addEventListener('popstate', () => resolve(), { once: true });
  });

  step();
  await popped;
  await flushPromises();
}
