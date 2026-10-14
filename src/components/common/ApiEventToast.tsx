import React, { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  Lock,
  Clock,
  Sparkles,
  X,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

export interface ApiToastItem {
  id: string;
  type: 'plan' | 'permission' | 'conflict' | 'rate-limit';
  severity: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  upgradeUrl?: string;
  timestamp: number;
}

interface ApiEventToastProps {
  onNavigate?: (view: string) => void;
}

export const ApiEventToast: React.FC<ApiEventToastProps> = ({ onNavigate }) => {
  const [toasts, setToasts] = useState<ApiToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ApiToastItem, 'id' | 'timestamp'>) => {
    const id = `api-toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newToast: ApiToastItem = {
      ...toast,
      id,
      timestamp: Date.now(),
    };

    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);

    // Auto dismiss after 8 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 8000);
  }, []);

  useEffect(() => {
    const handlePlanInactive = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      addToast({
        type: 'plan',
        severity: 'error',
        title: 'Plan Inactive',
        message: detail.message || 'Your subscription is inactive. Please renew or upgrade your plan.',
        upgradeUrl: detail.upgradeUrl || '/settings',
      });
    };

    const handlePlanLimit = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      addToast({
        type: 'plan',
        severity: 'warning',
        title: 'Plan Limit Reached',
        message: detail.message || 'Capacity limit reached for your current plan.',
        upgradeUrl: detail.upgradeUrl || '/settings',
      });
    };

    const handlePlanFeature = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      addToast({
        type: 'plan',
        severity: 'warning',
        title: 'Feature Unavailable',
        message: detail.message || 'This feature is reserved for higher tier subscriptions.',
        upgradeUrl: detail.upgradeUrl || '/settings',
      });
    };

    const handlePermissionDenied = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      addToast({
        type: 'permission',
        severity: 'error',
        title: 'Permission Denied (403)',
        message: detail.message || 'Access denied. You do not have sufficient role privileges.',
      });
    };

    const handleConflict = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      addToast({
        type: 'conflict',
        severity: 'warning',
        title: 'Resource Conflict (409)',
        message: detail.message || 'A resource with this identifier already exists.',
      });
    };

    const handleRateLimited = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      addToast({
        type: 'rate-limit',
        severity: 'warning',
        title: 'Rate Limited (429)',
        message: detail.message || 'Too many requests. Please wait a moment before trying again.',
      });
    };

    window.addEventListener('plan-inactive', handlePlanInactive);
    window.addEventListener('plan-limit-reached', handlePlanLimit);
    window.addEventListener('plan-feature-unavailable', handlePlanFeature);
    window.addEventListener('permission-denied', handlePermissionDenied);
    window.addEventListener('api-conflict', handleConflict);
    window.addEventListener('rate-limited', handleRateLimited);

    return () => {
      window.removeEventListener('plan-inactive', handlePlanInactive);
      window.removeEventListener('plan-limit-reached', handlePlanLimit);
      window.removeEventListener('plan-feature-unavailable', handlePlanFeature);
      window.removeEventListener('permission-denied', handlePermissionDenied);
      window.removeEventListener('api-conflict', handleConflict);
      window.removeEventListener('rate-limited', handleRateLimited);
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  const handleUpgradeClick = (upgradeUrl?: string) => {
    if (onNavigate) {
      onNavigate('settings');
    } else if (upgradeUrl) {
      window.location.href = upgradeUrl;
    }
  };

  return (
    <div
      role="region"
      aria-label="API Notifications"
      className="fixed bottom-6 right-6 z-[10000] flex flex-col gap-3 max-w-md w-full pointer-events-none px-4"
    >
      {toasts.map((toast) => {
        const isPlanError = toast.type === 'plan';
        const borderColor =
          toast.severity === 'error'
            ? 'rgba(239, 68, 68, 0.45)'
            : toast.severity === 'warning'
            ? 'rgba(245, 158, 11, 0.45)'
            : 'rgba(59, 130, 246, 0.45)';

        const bgGlow =
          toast.severity === 'error'
            ? 'rgba(239, 68, 68, 0.08)'
            : toast.severity === 'warning'
            ? 'rgba(245, 158, 11, 0.08)'
            : 'rgba(59, 130, 246, 0.08)';

        return (
          <div
            key={toast.id}
            data-testid="api-event-toast"
            className="pointer-events-auto rounded-xl p-4 backdrop-blur-xl border shadow-2xl transition-all duration-300 animate-slide-in-up"
            style={{
              backgroundColor: '#0f1319ee',
              borderColor,
              boxShadow: `0 8px 30px ${bgGlow}, 0 2px 8px rgba(0, 0, 0, 0.5)`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="p-2 rounded-lg shrink-0 mt-0.5"
                style={{
                  backgroundColor:
                    toast.severity === 'error'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : toast.severity === 'warning'
                      ? 'rgba(245, 158, 11, 0.15)'
                      : 'rgba(59, 130, 246, 0.15)',
                  color:
                    toast.severity === 'error'
                      ? '#ef4444'
                      : toast.severity === 'warning'
                      ? '#f59e0b'
                      : '#3b82f6',
                }}
              >
                {toast.type === 'permission' ? (
                  <Lock size={18} />
                ) : toast.type === 'rate-limit' ? (
                  <Clock size={18} />
                ) : toast.type === 'plan' ? (
                  <Sparkles size={18} />
                ) : (
                  <AlertTriangle size={18} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="text-sm font-semibold text-neutral-100 truncate">
                    {toast.title}
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeToast(toast.id)}
                    className="text-neutral-400 hover:text-neutral-200 transition-colors p-1"
                    aria-label="Close notification"
                  >
                    <X size={14} />
                  </button>
                </div>

                <p className="text-xs text-neutral-300 leading-relaxed break-words mb-2.5">
                  {toast.message}
                </p>

                {isPlanError && (
                  <div className="flex items-center gap-2 pt-1 border-t border-neutral-800/80">
                    <button
                      type="button"
                      data-testid="toast-upgrade-btn"
                      onClick={() => handleUpgradeClick(toast.upgradeUrl)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-sm transition-all"
                    >
                      <Sparkles size={12} />
                      Upgrade Plan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(
                          new CustomEvent('open-plan-upgrade', {
                            detail: { upgradeUrl: toast.upgradeUrl, message: toast.message },
                          })
                        );
                        removeToast(toast.id);
                      }}
                      className="text-xs text-neutral-400 hover:text-neutral-200 underline transition-colors px-1.5 py-1"
                    >
                      View details
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ApiEventToast;
