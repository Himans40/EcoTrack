import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

/**
 * Minimal in-memory `Storage` implementation.
 *
 * Node 26 exposes a native `localStorage` global that is inert unless the
 * runtime is started with `--localstorage-file`, and it shadows the one jsdom
 * would otherwise provide. Rather than pin the suite to a particular Node
 * version, we install this polyfill whenever `window.localStorage` is missing,
 * so the persistence tests behave identically on any Node release.
 */
class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

function ensureLocalStorage(): void {
  if (window.localStorage instanceof MemoryStorage) return

  const storage = new MemoryStorage()
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    writable: true,
    value: storage,
  })
  // Some code paths reach for the bare global rather than `window.*`.
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: storage,
  })
}

/**
 * jsdom does not implement `matchMedia`, which `SettingsContext` consults to
 * resolve the 'system' theme. A minimal stub keeps the provider mountable.
 */
function ensureMatchMedia(): void {
  // Typed as always present on `Window`, but jsdom genuinely omits it, so the
  // check has to be a runtime `typeof` rather than a truthiness test.
  if (typeof window.matchMedia === 'function') return
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  })
}

/**
 * jsdom implements no layout engine and therefore no `ResizeObserver`, which
 * Recharts' `ResponsiveContainer` constructs on mount. A no-op observer lets
 * chart-bearing pages mount; the charts measure 0x0, which is fine because
 * these tests assert on data and structure, not on rendered geometry.
 */
function ensureResizeObserver(): void {
  if (typeof globalThis.ResizeObserver === 'function') return
  class NoopResizeObserver implements ResizeObserver {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: NoopResizeObserver,
  })
}

/**
 * jsdom declares `window.scrollTo` but throws "Not implemented" when it is
 * called. `AppLayout` scrolls to the top on every navigation, so the stub
 * keeps the test output free of noise that is not a real failure.
 */
function ensureScrollTo(): void {
  Object.defineProperty(window, 'scrollTo', {
    configurable: true,
    writable: true,
    value: () => {},
  })
}

beforeEach(() => {
  ensureLocalStorage()
  ensureMatchMedia()
  ensureResizeObserver()
  ensureScrollTo()
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  vi.restoreAllMocks()
})
