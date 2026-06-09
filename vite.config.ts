import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      include: ['src/logic/**', 'src/state/**'],
      thresholds: { lines: 70, functions: 70, branches: 70 },
    },
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
