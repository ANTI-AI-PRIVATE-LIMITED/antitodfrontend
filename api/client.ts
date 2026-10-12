import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { BACKEND_URL, AUTH_CONFIG } from "../config/config";
import { isPublicDemo, DEMO_GUEST_TOKEN } from "../src/utils/demoMode";

// Create axios instance with base configuration
const api: AxiosInstance = axios.create({
  baseURL: BACKEND_URL,
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(AUTH_CONFIG.TOKEN_KEY);

    // Block mutating requests in read-only public demo mode (Task 62)
    const isDemo = token === DEMO_GUEST_TOKEN || isPublicDemo();
    const method = config.method?.toLowerCase() || "get";
    if (isDemo && ["post", "put", "patch", "delete"].includes(method)) {
      const isAuthRoute =
        config.url?.includes("/adminLogin") ||
        config.url?.includes("/adminVerifyOtp") ||
        config.url?.includes("/forgotPassword");
      if (!isAuthRoute) {
        return Promise.reject(
          new axios.AxiosError(
            "Action disabled: The public demo environment is strictly read-only. Connect your own honeypot to manage live infrastructure.",
            "ERR_DEMO_READ_ONLY",
            config
          )
        );
      }
    }

    if (token && config.headers) {
      config.headers[AUTH_CONFIG.TOKEN_HEADER] = token;
    }
    return config;
  },
  (error) => {
    console.error("[API] Request error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor - Handle errors and unauthorized access
api.interceptors.response.use(
  (response) => {
    // Prevent frontend crashes when backend is offline and Vite falls back to index.html
    const contentType = response.headers["content-type"];
    if (
      typeof response.data === "string" &&
      contentType &&
      contentType.includes("text/html")
    ) {
      console.error(
        "[API] Received HTML instead of JSON. Backend is likely down.",
      );
      return Promise.reject(
        new axios.AxiosError(
          "Received HTML instead of JSON (Backend Unreachable)",
          "ERR_INVALID_CONTENT_TYPE",
          response.config,
          response.request,
          response,
        ),
      );
    }

    return response;
  },
  (error: AxiosError) => {
    console.error(
      "[API] Response error:",
      error.response?.status,
      error.config?.url,
    );

    // Handle 401 Unauthorized - Clear token and redirect to login
    if (error.response && error.response.status === 401) {
      if (isPublicDemo()) {
        console.warn("[API] 401 in public demo mode - suppressed redirect");
        return Promise.reject(error);
      }
      console.warn("[API] Unauthorized access - clearing token");
      localStorage.removeItem(AUTH_CONFIG.TOKEN_KEY);
      localStorage.removeItem(AUTH_CONFIG.TOKEN_EXPIRES_KEY);
      window.dispatchEvent(new Event("auth-changed"));

      // Only redirect if not already on login page
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    // Handle 402 Payment Required / Plan Inactive
    if (error.response && error.response.status === 402) {
      const data = error.response.data as any;
      console.warn("[API] 402 Plan inactive:", data);
      window.dispatchEvent(
        new CustomEvent("plan-inactive", {
          detail: {
            status: 402,
            code: data?.code || "PLAN_INACTIVE",
            message:
              data?.message ||
              "Your subscription is inactive. Please renew or upgrade your plan to access live security features.",
            upgradeUrl: data?.upgrade_url || "/settings/billing",
          },
        })
      );
    }

    // Handle 403 Forbidden / Plan Limit / Feature Unavailable
    if (error.response && error.response.status === 403) {
      const data = error.response.data as any;
      console.warn("[API] 403 Forbidden / Limit reached:", data);

      if (data?.code === "PLAN_LIMIT_REACHED") {
        window.dispatchEvent(
          new CustomEvent("plan-limit-reached", {
            detail: {
              status: 403,
              code: "PLAN_LIMIT_REACHED",
              limit: data.limit,
              used: data.used,
              message:
                data.message ||
                `Plan limit reached (${data.used ?? "max"}/${data.limit ?? "max"}). Upgrade to Pro to increase capacity.`,
              upgradeUrl: data.upgrade_url || "/settings/billing",
            },
          })
        );
      } else if (data?.code === "PLAN_FEATURE_UNAVAILABLE") {
        window.dispatchEvent(
          new CustomEvent("plan-feature-unavailable", {
            detail: {
              status: 403,
              code: "PLAN_FEATURE_UNAVAILABLE",
              feature: data.feature,
              message:
                data.message ||
                "This feature is reserved for Pro and Enterprise subscribers. Upgrade your plan to access it.",
              upgradeUrl: data.upgrade_url || "/settings/billing",
            },
          })
        );
      } else {
        window.dispatchEvent(
          new CustomEvent("permission-denied", {
            detail: {
              status: 403,
              code: data?.code,
              message: data?.message || "Access denied. Missing required permission.",
            },
          })
        );
      }
    }

    // Handle 409 Conflict (e.g. duplicate ServerId or taken resource)
    if (error.response && error.response.status === 409) {
      const data = error.response.data as any;
      console.warn("[API] 409 Conflict:", data);
      window.dispatchEvent(
        new CustomEvent("api-conflict", {
          detail: {
            status: 409,
            code: data?.code || "CONFLICT",
            message: data?.message || "Resource already exists. Please choose a different identifier.",
          },
        })
      );
    }

    // Handle 429 Too Many Requests / Account Lockout
    if (error.response && error.response.status === 429) {
      const data = error.response.data as any;
      console.warn("[API] 429 Rate limited / Account locked:", data);
      window.dispatchEvent(
        new CustomEvent("rate-limited", {
          detail: {
            status: 429,
            code: data?.code || "TOO_MANY_REQUESTS",
            message:
              data?.code === "ACCOUNT_LOCKED"
                ? data?.message || "Account temporarily locked. Reset your password to unlock or try again later."
                : data?.message || "Too many requests. Please wait a moment before trying again.",
          },
        })
      );
    }

    // Handle network errors
    if (!error.response) {
      console.error("[API] Network error - server may be unreachable");
    }

    return Promise.reject(error);
  },
);

export default api;

export interface ApiErrorDetail {
  status?: number;
  code?: string;
  message: string;
  limit?: number;
  used?: number;
  upgradeUrl?: string;
}

// Helper function to handle API errors and extract rich descriptions
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{
      message?: string;
      error?: string | { message?: string };
      code?: string;
      limit?: number;
      used?: number;
      upgrade_url?: string;
    }>;

    if (axiosError.response) {
      const status = axiosError.response.status;
      const data = axiosError.response.data;

      // 402 Plan Inactive
      if (status === 402 || data?.code === "PLAN_INACTIVE") {
        return (
          data?.message ||
          "Your subscription is inactive. Please renew or upgrade your plan to continue accessing threat data."
        );
      }

      // 403 Plan Limit Reached
      if (data?.code === "PLAN_LIMIT_REACHED") {
        if (typeof data.used === "number" && typeof data.limit === "number") {
          return `Plan limit reached: ${data.used} of ${data.limit} used. Please upgrade to Pro to increase capacity.`;
        }
        return data?.message || "Plan quota reached. Upgrade your plan to add more resources.";
      }

      // 403 Plan Feature Unavailable
      if (data?.code === "PLAN_FEATURE_UNAVAILABLE") {
        return (
          data?.message ||
          "This feature is not available on your current plan. Please upgrade to Pro to unlock it."
        );
      }

      // 409 Conflict (Duplicate resource)
      if (status === 409) {
        return data?.message || "A resource with this identifier already exists. Please choose another ID.";
      }

      // 429 Account Locked
      if (status === 429 && data?.code === "ACCOUNT_LOCKED") {
        return (
          data?.message ||
          "Account temporarily locked due to too many failed attempts. Please reset your password to unlock."
        );
      }

      if (data) {
        if (typeof data.error === "string") return data.error;
        if (typeof data.error === "object" && data.error?.message) return data.error.message;
        if (data.message) return data.message;
      }
    }

    if (axiosError.message) {
      return axiosError.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown error occurred";
};
