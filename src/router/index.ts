import { createRouter, createWebHistory, type Router, type RouterHistory } from 'vue-router';
import { INSTANT_SCROLL } from '@/lib/scroll-behavior';
import HomePage from '@/pages/HomePage.vue';
import { defineRoutes } from '@/router/define-routes';
import { pageTitle } from '@/router/page-title';

declare module 'vue-router' {
  interface RouteMeta {
    /** Page title. `document.title` is set from it after every navigation. */
    title: string;
  }
}

export const routes = defineRoutes([
  { path: '/', name: 'home', component: HomePage, meta: { title: 'Shows by genre' } },
  {
    path: '/shows/:id',
    name: 'show',
    component: () => import('@/pages/ShowDetailPage.vue'),
    props: true,
    meta: { title: 'Show' },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/pages/SearchPage.vue'),
    meta: { title: 'Search' },
  },
  {
    path: '/bookmarked',
    name: 'bookmarked',
    component: () => import('@/pages/SavedShowsPage.vue'),
    props: { kind: 'bookmarks' },
    meta: { title: 'Bookmarked shows' },
  },
  {
    path: '/liked',
    name: 'liked',
    component: () => import('@/pages/SavedShowsPage.vue'),
    props: { kind: 'likes' },
    meta: { title: 'Liked shows' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: { title: 'Page not found' },
  },
]);

/** The app router; specs pass `createMemoryHistory()` to stay off the real address bar. */
export function createAppRouter(history: RouterHistory): Router {
  const router = createRouter({
    history,
    routes: [...routes],
    scrollBehavior: (to, from, savedPosition) => {
      // Back lands where the reader already was; sliding there is motion they did not ask for.
      if (savedPosition !== null) {
        return { ...savedPosition, behavior: INSTANT_SCROLL };
      }

      // A query change (`?q=`, `?genre=`) stays on the same page, which decides its own scroll.
      if (to.path === from.path) {
        return false;
      }

      return { top: 0 };
    },
  });

  router.afterEach((to) => {
    document.title = pageTitle(to.meta.title);
  });

  return router;
}

export const router = createAppRouter(createWebHistory(import.meta.env.BASE_URL));
