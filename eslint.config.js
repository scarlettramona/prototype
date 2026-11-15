// eslint.config.js
// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const eslintConfigPrettier = require('eslint-config-prettier');
const boundaries = require('eslint-plugin-boundaries');

/** Path prefix of the application project, used by the architecture rules below. */
const APP = 'projects/template-application/src';

module.exports = tseslint.config(
  {
    ignores: ['.angular/**', '.nx/**', 'coverage/**', 'dist/**'],
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
      eslintConfigPrettier,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: ['attribute', 'element'],
          prefix: 'app',
          style: 'kebab-case',
        },
      ],

      // Angular best practices
      '@angular-eslint/no-empty-lifecycle-method': 'warn',
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
      '@angular-eslint/prefer-output-readonly': 'warn',
      '@angular-eslint/prefer-signals': 'warn',
      '@angular-eslint/prefer-standalone': 'warn',

      // TypeScript best practices
      '@typescript-eslint/array-type': ['warn'],
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      '@typescript-eslint/consistent-type-assertions': 'warn',
      '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        {
          accessibility: 'no-public',
        },
      ],
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        },
      ],
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-empty-interface': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/no-shadow': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',

      // JavaScript best practices
      // `== null` / `!= null` is the idiomatic nullish check; everything else is strict.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      complexity: ['error', 20],
      curly: 'error',
      'guard-for-in': 'error',
      'max-classes-per-file': ['error', 1],
      // Keep in sync with Prettier's printWidth so the two tools can't disagree.
      'max-len': [
        'warn',
        {
          code: 120,
          comments: 160,
        },
      ],
      'max-lines': ['error', 400],
      'no-bitwise': 'error',
      'no-console': 'off',
      'no-new-wrappers': 'error',
      'no-useless-concat': 'error',
      'no-var': 'error',
      'no-restricted-syntax': 'off',
      'no-shadow': 'error',
      'one-var': ['error', 'never'],
      'prefer-arrow-callback': 'error',
      'prefer-const': 'error',
      'sort-imports': [
        'error',
        {
          ignoreCase: true,
          ignoreDeclarationSort: true,
          allowSeparatedGroups: true,
        },
      ],

      // Security
      'no-eval': 'error',
      'no-implied-eval': 'error',
    },
  },
  // ── Architecture boundaries ────────────────────────────────────────────────
  // Machine-checkable form of the architecture's dependency table. Areas are
  // matched by path; anything a policy does not allow is denied.
  //
  // A feature's route configuration is its own area, so it is selected by file
  // (`*.routes.ts`) within the feature element rather than by folder.
  {
    files: [`${APP}/**/*.ts`],
    plugins: { boundaries },
    settings: {
      // eslint-plugin-boundaries resolves imports through the node resolver,
      // which does not know about .ts by default.
      'import/resolver': { node: { extensions: ['.ts', '.js', '.json'] } },
      'boundaries/include': [`${APP}/**/*.ts`],
      'boundaries/elements': [
        // Most specific first: a file belongs to the first element it matches.
        { type: 'core', pattern: `${APP}/app/core`, partialMatch: false },
        { type: 'layout', pattern: `${APP}/app/layout`, partialMatch: false },
        { type: 'ui', pattern: `${APP}/app/ui`, partialMatch: false },
        {
          type: 'sub-feature',
          pattern: `${APP}/app/feature/*/sub-features/*`,
          capture: ['feature', 'sub'],
          partialMatch: false,
        },
        { type: 'feature', pattern: `${APP}/app/feature/*`, capture: ['feature'], partialMatch: false },
        { type: 'environment', pattern: `${APP}/environments`, partialMatch: false },
        // Bootstrap is last: it only picks up the files sitting directly in src/.
        { type: 'bootstrap', pattern: APP, partialMatch: false },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          message: '{{from.type}} may not depend on {{to.type}} (frontend architecture, dependency table)',
          policies: [
            {
              from: { element: { type: 'bootstrap' } },
              allow: {
                to: { element: { types: { anyOf: ['bootstrap', 'environment', 'core', 'layout'] } } },
              },
            },
            {
              // Bootstrap reaches a first-level feature through its routes file only.
              from: { element: { type: 'bootstrap' } },
              allow: {
                to: { element: { type: 'feature', fileInternalPath: '*.routes.ts' } },
              },
            },
            {
              // The environment object is typed against core's contract.
              from: { element: { type: 'environment' } },
              allow: { to: { element: { type: 'core' } } },
            },
            {
              from: { element: { type: 'core' } },
              allow: { to: { element: { type: 'core' } } },
            },
            {
              from: { element: { type: 'layout' } },
              allow: { to: { element: { types: { anyOf: ['layout', 'core', 'ui'] } } } },
            },
            {
              from: { element: { type: 'ui' } },
              allow: { to: { element: { types: { anyOf: ['ui', 'core'] } } } },
            },
            {
              // Tighter than the area rule: a generic component takes its data
              // through inputs and outputs, so it may not reach into core/.
              from: { element: { type: 'ui', fileInternalPath: 'components/**' } },
              disallow: { to: { element: { type: 'core' } } },
              message:
                'ui/components must not depend on application services or state. Lift the data access into the parent, or move it to ui/patterns.',
            },
            {
              // Feature route configuration.
              from: { element: { type: 'feature', fileInternalPath: '*.routes.ts' } },
              allow: {
                to: {
                  element: [
                    { type: 'core' },
                    // Implementation of the same feature.
                    { type: 'feature', captured: { feature: '{{from.captured.feature}}' } },
                    // Route configuration of a direct sub-feature.
                    {
                      type: 'sub-feature',
                      fileInternalPath: '*.routes.ts',
                      captured: { feature: '{{from.captured.feature}}' },
                    },
                  ],
                },
              },
            },
            {
              // Sub-feature route configuration.
              from: { element: { type: 'sub-feature', fileInternalPath: '*.routes.ts' } },
              allow: {
                to: {
                  element: [
                    { type: 'core' },
                    {
                      type: 'sub-feature',
                      captured: { feature: '{{from.captured.feature}}', sub: '{{from.captured.sub}}' },
                    },
                  ],
                },
              },
            },
            {
              // First-level feature implementation.
              from: { element: { type: 'feature' } },
              allow: {
                to: {
                  element: [
                    { type: 'core' },
                    { type: 'ui' },
                    { type: 'feature', captured: { feature: '{{from.captured.feature}}' } },
                  ],
                },
              },
            },
            {
              // Sub-feature implementation: may read its ancestor, never the reverse.
              from: { element: { type: 'sub-feature' } },
              allow: {
                to: {
                  element: [
                    { type: 'core' },
                    { type: 'ui' },
                    {
                      type: 'sub-feature',
                      captured: { feature: '{{from.captured.feature}}', sub: '{{from.captured.sub}}' },
                    },
                    { type: 'feature', captured: { feature: '{{from.captured.feature}}' } },
                  ],
                },
              },
            },
          ],
        },
      ],
      // Every file under the app must belong to an area, and every local import
      // must resolve to one.
      'boundaries/no-unknown-files': 'error',
      'boundaries/no-unknown-dependencies': 'error',
    },
  },
  {
    // A routes file reaches a sub-feature's routes only through the dynamic
    // import in loadChildren(); a static import would make them eager. The
    // boundaries rules cannot tell the two apart, so this covers the static one.
    files: [`${APP}/app/feature/**/*.routes.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/sub-features/**', './sub-features/**', '../**/sub-features/**'],
              message: 'Reference a sub-feature only through loadChildren() with a dynamic import.',
            },
          ],
        },
      ],
    },
  },
  {
    // The library publishes its own `lib` selector prefix.
    files: ['projects/beta-library/**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'lib', style: 'camelCase' }],
      '@angular-eslint/component-selector': [
        'error',
        { type: ['attribute', 'element'], prefix: 'lib', style: 'kebab-case' },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
    rules: {
      // template best practices
      '@angular-eslint/template/attributes-order': [
        'error',
        {
          alphabetical: true,
          order: [
            'STRUCTURAL_DIRECTIVE', // deprecated, use @if and @for instead
            'TEMPLATE_REFERENCE', // `<input #inputRef>`
            'ATTRIBUTE_BINDING', //`<input required>`, `id="3"`
            'INPUT_BINDING', // `[id]="3"`, `[attr.colspan]="colspan"`,
            'TWO_WAY_BINDING', //`[(id)]="id"`,
            'OUTPUT_BINDING', // `(idChange)="handleChange()"`,
          ],
        },
      ],
      '@angular-eslint/template/button-has-type': 'warn',
      '@angular-eslint/template/cyclomatic-complexity': ['warn', { maxComplexity: 10 }],
      '@angular-eslint/template/eqeqeq': 'error',
      '@angular-eslint/template/prefer-control-flow': 'error',
      '@angular-eslint/template/prefer-ngsrc': 'warn',
      '@angular-eslint/template/prefer-self-closing-tags': 'warn',
      '@angular-eslint/template/use-track-by-function': 'warn',
    },
  },
);
