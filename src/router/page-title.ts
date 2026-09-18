const TITLE_SUFFIX = ' · TV Board';

/** `document.title` for a page: its own name first, the app's last. */
export const pageTitle = (name: string): string => `${name}${TITLE_SUFFIX}`;
