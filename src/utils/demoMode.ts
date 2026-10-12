import { AUTH_CONFIG } from '../../config/config';

export const DEMO_GUEST_TOKEN = 'demo-guest-token';

export interface DemoAdminIdentity {
  AdminID: string;
  AdminEmail: string;
  CustomerID: string;
  isDemo: boolean;
}

export const DEMO_ADMIN_PROFILE: DemoAdminIdentity = {
  AdminID: 'demo-guest-user',
  AdminEmail: 'demo@xyberah.com',
  CustomerID: 'demo-sandbox',
  isDemo: true,
};

export const DEMO_READONLY_PERMISSIONS: string[] = [
  'dashboard.view',
  'honeypot.logs.view',
  'threat_map.view',
  'infrastructure.servers.view',
  'infrastructure.shippers.view',
  'threat_intel.view',
  'threat_intel.export.csv',
  'asm.view',
  'iocs.view',
  'demo.readonly',
];

/**
 * Checks whether the current user session is in public read-only demo mode (Task 62).
 * True if:
 * 1. URL search param ?demo=true is present
 * 2. Active token is DEMO_GUEST_TOKEN
 * 3. SessionStorage has 'xyberah_demo_mode' === 'true'
 * 4. VITE_PUBLIC_DEMO env variable is set to 'true'
 */
export function isPublicDemo(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    // 1. Explicit query param
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('demo') === 'true') {
      return true;
    }

    // 2. Active token matches demo token
    const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);
    if (token === DEMO_GUEST_TOKEN) {
      return true;
    }

    // 3. Explicit session flag
    if (sessionStorage.getItem('xyberah_demo_mode') === 'true') {
      return true;
    }

    // 4. Build-time / environment flag
    if ((import.meta as any)?.env?.VITE_PUBLIC_DEMO === 'true') {
      return true;
    }
  } catch {
    // Safe fallback if storage is restricted
  }

  return false;
}

/**
 * Safely enters public read-only demo mode.
 * Stores demo guest token and metadata, dispatches auth events, and redirects to dashboard.
 */
export function enterDemoMode(): void {
  try {
    sessionStorage.setItem('xyberah_demo_mode', 'true');
    localStorage.setItem(AUTH_CONFIG.TOKEN_KEY, DEMO_GUEST_TOKEN);
    // 24 hour session for demo exploration
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    localStorage.setItem(AUTH_CONFIG.TOKEN_EXPIRES_KEY, expiry);
    localStorage.setItem(
      'admin-meta',
      JSON.stringify({
        admin: DEMO_ADMIN_PROFILE,
        permissions: DEMO_READONLY_PERMISSIONS,
        groups: [{ GroupID: 'demo-viewers', GroupName: 'Public Demo Visitors (Read Only)' }],
      })
    );
  } catch (err) {
    console.warn('[DemoMode] Storage failed when entering demo mode:', err);
  }

  window.dispatchEvent(new Event('auth-changed'));
  window.location.href = '/dashboard';
}

/**
 * Safely exits demo mode and returns to login screen.
 */
export function exitDemoMode(): void {
  try {
    sessionStorage.removeItem('xyberah_demo_mode');
    localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
    localStorage.removeItem(AUTH_CONFIG.TOKEN_EXPIRES_KEY);
    localStorage.removeItem('admin-meta');
  } catch (err) {
    console.warn('[DemoMode] Storage failed when exiting demo mode:', err);
  }

  window.dispatchEvent(new Event('auth-changed'));
  window.location.href = '/login';
}
