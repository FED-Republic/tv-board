import '@fontsource/bebas-neue/latin.css';
import '@fontsource-variable/hanken-grotesk';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import './styles/tokens.css';
import './styles/global.css';

// The first navigation resolves lazy routes; mounting after it avoids a flash of the
// empty shell and lets the first `document.title` come from the resolved route.
async function bootstrap(): Promise<void> {
  const app = createApp(App);

  app.use(createPinia());
  app.use(router);
  // Nothing in the app throws on purpose, so anything reaching here is a bug worth surfacing
  // as an uncaught error instead of a silently dead component.
  app.config.errorHandler = reportError;
  router.onError(reportError);

  await router.isReady();

  app.mount('#app');
}

/** A redeploy renames the hashed chunks; a stale tab then needs the new shell, not a blank page. */
function reloadOnStaleChunk(): void {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    window.location.reload();
  });
}

function showStartupFailure(reason: unknown): void {
  const root = document.querySelector('#app');
  const message = document.createElement('p');

  message.textContent = 'TV Board could not start. Reload the page to try again.';
  root?.replaceChildren(message);
  reportError(reason);
}

reloadOnStaleChunk();
bootstrap().catch(showStartupFailure);
