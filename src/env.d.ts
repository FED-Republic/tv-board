interface ViteTypeOptions {
  // Makes `import.meta.env` strictly typed: reading an undeclared key is a compile error.
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_TVMAZE_BASE_URL?: string;
  readonly VITE_INDEX_PAGES?: string;
}
