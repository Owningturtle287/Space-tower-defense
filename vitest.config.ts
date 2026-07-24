import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/game/tests/**/*.test.ts'],
    coverage: {
      reporter: ['text'],
    },
  },
});
