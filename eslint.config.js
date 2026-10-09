import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    // El backend serverless (api/) corre en Node, no en el navegador: se lintea aparte.
    ignores: ['api/**'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Funciones serverless de Vercel (Node, ESM).
    files: ['api/**/*.js'],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 2022,
      sourceType: 'module',
    },
  },
])
