import type { RouteRecordRaw } from 'vue-router';

/** A route record that must carry `meta.title`, so every page sets `document.title`. */
export type AppRouteRecord = RouteRecordRaw & {
  readonly meta: { readonly title: string };
};

export const defineRoutes = (routes: readonly AppRouteRecord[]): readonly AppRouteRecord[] =>
  routes;
