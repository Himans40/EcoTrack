/**
 * Stable unique ids for locally created records.
 *
 * `crypto.randomUUID` is available in every browser this project targets, but
 * it is absent in some older jsdom versions and over plain HTTP on a LAN
 * address, so a timestamp-plus-entropy fallback keeps record creation working.
 */
export function createId(prefix = 'rec'): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID()}`
    }
  } catch {
    // Fall through to the manual path below.
  }
  const random = Math.random().toString(36).slice(2, 10)
  return `${prefix}_${Date.now().toString(36)}${random}`
}
