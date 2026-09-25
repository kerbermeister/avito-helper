/** Безопасный доступ к localStorage (на iOS Safari может быть недоступен). */
const safeStorage = {
  get(key: string): string | null {
    try { return localStorage.getItem(key) } catch { return null }
  },
  set(key: string, value: string) {
    try { localStorage.setItem(key, value) } catch { /* ignore */ }
  },
  remove(key: string) {
    try { localStorage.removeItem(key) } catch { /* ignore */ }
  },
}

export function safeGetItem(key: string): string | null {
  return safeStorage.get(key)
}

export function safeSetItem(key: string, value: string) {
  safeStorage.set(key, value)
}

export function safeRemoveItem(key: string) {
  safeStorage.remove(key)
}
