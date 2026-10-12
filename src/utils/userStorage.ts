/**
 * User-Scoped Storage Utility (Task 97)
 * Ensures that investigation cases, brand assets, analysis filters,
 * and user API keys are keyed by the active Admin ID in browser storage.
 *
 * Prevents two users on a shared browser from sharing sensitive operational data.
 */

export function getActiveAdminId(): string {
  try {
    const directId = localStorage.getItem('xyberah_active_admin_id');
    if (directId) return directId;

    const rawAdmin = localStorage.getItem('xyberah_current_admin');
    if (rawAdmin) {
      const parsed = JSON.parse(rawAdmin);
      if (parsed?.AdminID) return String(parsed.AdminID);
    }
  } catch {
    // Ignore JSON parse errors
  }
  return 'default';
}

/**
 * Returns a user-keyed localStorage key if an admin is logged in.
 * e.g., 'xyberah_cases' -> 'xyberah_cases_adm_123'
 */
export function getUserStorageKey(baseKey: string, customAdminId?: string): string {
  const adminId = customAdminId || getActiveAdminId();
  if (!adminId || adminId === 'default') {
    return baseKey;
  }
  return `${baseKey}_${adminId}`;
}

export const userStorage = {
  getItem: (baseKey: string): string | null => {
    try {
      const scopedKey = getUserStorageKey(baseKey);
      const scopedVal = localStorage.getItem(scopedKey);
      if (scopedVal !== null) return scopedVal;
      // Fallback check to un-scoped key for seamless backward compatibility if same user
      return localStorage.getItem(baseKey);
    } catch {
      return null;
    }
  },

  setItem: (baseKey: string, value: string): void => {
    try {
      const scopedKey = getUserStorageKey(baseKey);
      localStorage.setItem(scopedKey, value);
    } catch (e) {
      console.warn('[userStorage] Failed to set item:', e);
    }
  },

  removeItem: (baseKey: string): void => {
    try {
      const scopedKey = getUserStorageKey(baseKey);
      localStorage.removeItem(scopedKey);
      localStorage.removeItem(baseKey);
    } catch (e) {
      console.warn('[userStorage] Failed to remove item:', e);
    }
  },
};

/**
 * Purges all user-specific data from browser storage on sign out and session expiry.
 * Clears:
 * - xyberah_* entries (cases, bench, brand assets, filters, cache, settings, demo mode)
 * - user_vt_api_key
 * - authtoken & authtoken_expires
 * - antitode_* entries
 * - all sessionStorage
 */
export function clearAllUserBrowserData(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith('xyberah_') ||
        key.startsWith('antitode_') ||
        key.startsWith('antitode-') ||
        key.startsWith('user_vt_api_key') ||
        key === 'authtoken' ||
        key === 'authtoken_expires'
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.warn('[clearAllUserBrowserData] Error clearing localStorage:', err);
  }

  try {
    sessionStorage.clear();
  } catch (err) {
    console.warn('[clearAllUserBrowserData] Error clearing sessionStorage:', err);
  }
}
