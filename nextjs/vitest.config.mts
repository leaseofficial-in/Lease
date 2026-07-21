import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    // Mirror the tsconfig "@/*" path alias so tests import the same way app code does.
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    // Pure logic only for now. Component tests would need jsdom + testing-library;
    // add that environment when the first component test lands.
    environment: 'node',
    include: ['{lib,data,app,components}/**/*.{test,spec}.{ts,tsx}'],
  },
})
