import { globalIgnores } from 'eslint/config';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility';
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting';

// Inward-only layers (docs/conventions.md, Architecture): each layer lists what it may not import.
// A layer may always import from itself (`self`), so its own alias is left out of the outer
// layers; `components/ui/` names its sibling folders instead, because a gitignore-style negation
// cannot re-include a folder whose parent is excluded.
const OUTER_LAYERS = ['@/pages/**', '@/components/**'];
const LAYER_RULES = [
  {
    name: 'app/layers-lib',
    files: ['src/lib/**'],
    self: '@/lib/**',
    forbidden: [
      'vue',
      'vue-router',
      'pinia',
      '@/domain/**',
      '@/services/**',
      '@/stores/**',
      '@/composables/**',
    ],
    message: 'lib/ holds platform helpers with no app imports.',
  },
  {
    name: 'app/layers-domain',
    files: ['src/domain/**'],
    self: '@/domain/**',
    forbidden: ['vue', 'vue-router', 'pinia', '@/services/**', '@/stores/**', '@/composables/**'],
    message: 'domain/ is pure TypeScript: no Vue, Pinia or service imports.',
  },
  {
    name: 'app/layers-services',
    files: ['src/services/**'],
    self: '@/services/**',
    forbidden: ['vue', 'pinia', '@/stores/**', '@/composables/**'],
    message: 'services/ depends on domain/ only.',
  },
  {
    name: 'app/layers-stores',
    files: ['src/stores/**'],
    self: '@/stores/**',
    forbidden: ['@/composables/**'],
    message: 'stores/ depend on domain/ and services/ only.',
  },
  {
    name: 'app/layers-composables',
    files: ['src/composables/**'],
    self: '@/composables/**',
    forbidden: ['@/services/http/**'],
    message:
      'composables/ reach shared data through stores/ and route-local data through endpoints.',
  },
  {
    name: 'app/layers-components',
    files: ['src/components/**'],
    self: '@/components/**',
    forbidden: ['@/services/**', '@/pages/**'],
    message: 'A component never fetches and never imports a page.',
  },
  {
    name: 'app/layers-ui',
    files: ['src/components/ui/**'],
    self: '@/components/**',
    forbidden: [
      '@/services/**',
      '@/stores/**',
      '@/domain/**',
      '@/pages/**',
      '@/components/show/**',
      '@/components/search/**',
      '@/components/app/**',
    ],
    message: 'components/ui/ sees no domain types and no store.',
  },
];

const layerConfigs = LAYER_RULES.map(({ name, files, self, forbidden, message }) => ({
  name,
  files,
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [...new Set([...forbidden, ...OUTER_LAYERS.filter((p) => p !== self)])],
            message,
          },
        ],
      },
    ],
  },
}));

export default defineConfigWithVueTs(
  { name: 'app/files', files: ['**/*.{ts,mts,tsx,vue}'] },
  globalIgnores(['dist/**', 'coverage/**', 'node_modules/**']),
  pluginVue.configs['flat/recommended'],
  ...pluginVueA11y.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    name: 'app/rules',
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      // `as const` is exempt; everything else narrows through a type guard or a schema.
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],
      'vue/component-api-style': ['error', ['script-setup']],
      'vue/define-props-declaration': ['error', 'type-based'],
      'vue/define-emits-declaration': ['error', 'type-literal'],
      'vue/require-typed-ref': 'error',
      'vue/no-v-html': 'error',
    },
  },
  {
    // A DTO never leaves services/: schemas and mappers are imported only inside that folder.
    name: 'app/dto-boundary',
    files: ['src/**'],
    ignores: ['src/services/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/services/*/schema', '@/services/*/mappers'],
              message: 'DTOs stay inside services/; import the endpoint function instead.',
            },
          ],
        },
      ],
    },
  },
  ...layerConfigs,
  {
    // Readability rules the `readable-code` skill relies on. Layout-only rules that Prettier
    // already decides are left to Prettier (see `skipFormatting` below).
    name: 'app/readability',
    rules: {
      curly: ['error', 'all'],
      eqeqeq: ['error', 'always'],
      'max-depth': ['error', 3],
      'max-params': ['error', 3],
      'no-nested-ternary': 'error',
      'no-lonely-if': 'error',
      'prefer-template': 'error',
      'object-shorthand': ['error', 'always'],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
      'vue/define-macros-order': [
        'error',
        {
          order: ['defineOptions', 'defineModel', 'defineProps', 'defineEmits', 'defineSlots'],
          defineExposeLast: true,
        },
      ],
      'vue/define-props-destructuring': ['error', { destructure: 'always' }],
      'vue/require-macro-variable-name': 'error',
      'vue/padding-line-between-blocks': ['error', 'always'],
      // Static attributes before bound ones, so the reader sees the fixed contract first.
      'vue/attributes-order': [
        'error',
        {
          order: [
            'DEFINITION',
            'LIST_RENDERING',
            'CONDITIONALS',
            'RENDER_MODIFIERS',
            'GLOBAL',
            ['UNIQUE', 'SLOT'],
            'TWO_WAY_BINDING',
            'OTHER_DIRECTIVES',
            'ATTR_STATIC',
            'ATTR_DYNAMIC',
            'ATTR_SHORTHAND_BOOL',
            'EVENTS',
            'CONTENT',
          ],
        },
      ],
      'vue/html-self-closing': [
        'error',
        {
          html: { void: 'always', normal: 'any', component: 'always' },
          svg: 'always',
          math: 'always',
        },
      ],
      'vue/no-useless-mustaches': 'error',
      'vue/no-useless-v-bind': 'error',
      'vue/no-unused-refs': 'error',
      'vue/prefer-true-attribute-shorthand': 'error',
      'vue/prefer-separate-static-class': 'error',
    },
  },
  {
    // Specs may use `!` on values a previous assertion has already proven present, and a cast
    // to feed a deliberately wrong value into a guard (`'x' as never` for `assertNever`).
    name: 'app/tests',
    files: ['tests/**'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/consistent-type-assertions': 'off',
    },
  },
  {
    // The single sanitising component is the only place `v-html` is allowed (see DECISIONS.md).
    name: 'app/sanitised-summary',
    files: ['src/components/show/ShowSummary.vue'],
    rules: { 'vue/no-v-html': 'off' },
  },
  skipFormatting,
);
