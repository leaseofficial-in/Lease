// eslint-config-next 16 ships native flat config — no FlatCompat needed.
import coreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'

const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'android/**',
      'public/**',
      'next-env.d.ts',
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Unused code is dead weight; a leading underscore is the explicit
      // "intentionally unused" marker (destructured rest, ignored callback args).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // `any` defeats the strict tsconfig. Warn rather than error for now — the
      // dashboard has a backlog of them, and failing the build on day one would
      // just get the rule switched off.
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]

export default config
