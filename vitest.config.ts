/**
 * Vitest configuration.
 *
 * Kept separate from `vite.config.ts` because Vitest 4 no longer augments
 * Vite's `UserConfig` with a `test` key. The Vite config is merged in so the
 * `@/` alias and the React plugin apply to tests as well.
 */

import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      css: false,
      restoreMocks: true,
    },
  }),
)
