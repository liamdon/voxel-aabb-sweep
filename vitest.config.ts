import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.ts'],
    exclude: ['test/**/*.js', 'node_modules/**', 'dist/**', 'dist-test/**']
  }
});
