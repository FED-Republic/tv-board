import { mount } from '@vue/test-utils';
import type { Plugin } from 'vue';
import { defineComponent, h } from 'vue';

export type SetupHarness<T> = {
  readonly result: T;
  readonly unmount: () => void;
};

/**
 * Runs a composable inside a mounted host component, so lifecycle hooks, `useRoute` and
 * `onScopeDispose` behave as they do in the app. `unmount` disposes the effect scope.
 */
export function withSetup<T>(compose: () => T, plugins: readonly Plugin[] = []): SetupHarness<T> {
  const results: T[] = [];

  const host = defineComponent({
    name: 'ComposableHost',
    setup() {
      results.push(compose());

      return () => h('div');
    },
  });

  const wrapper = mount(host, { global: { plugins: [...plugins] } });
  const result = results[0];

  if (result === undefined) {
    throw new Error('withSetup: the host component never ran setup');
  }

  return { result, unmount: () => wrapper.unmount() };
}
