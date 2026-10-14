import api from '../client';
import { API_ENDPOINTS } from '../../config/config';

export interface BillingResourceUsage {
    used: number;
    limit: number;
    percent?: number;
}

export interface BillingPlanInfo {
    id: string;
    label: string;
    priceUsdPerMonth?: number;
    status: 'trial' | 'active' | 'past_due' | 'cancelled';
    active: boolean;
    paidUntil?: string;
    daysLeft?: number;
}

export interface BillingWarning {
    code: 'PLAN_INACTIVE' | 'PAYMENT_FAILED' | 'EXPIRING_SOON' | 'SERVERS_NEAR_LIMIT' | 'USERS_NEAR_LIMIT' | string;
    message: string;
}

export interface BillingUpgradeInfo {
    available: boolean;
    nextPlan?: string;
    priceUsdPerMonth?: number;
    message?: string;
    contact?: string;
}

export interface BillingUsageResponse {
    platform?: boolean;
    customer?: {
        CustomerID: string;
        Name: string;
    };
    plan?: BillingPlanInfo;
    usage?: {
        servers?: BillingResourceUsage;
        users?: BillingResourceUsage;
    };
    retentionDays?: number;
    exportFormats?: string[];
    warnings?: BillingWarning[];
    upgrade?: BillingUpgradeInfo;
}

export interface BillingPlanCard {
    id: string;
    label: string;
    priceUsdPerMonth: number;
    serversLimit: number;
    usersLimit: number;
    retentionDays: number;
    exportFormats: string[];
    current?: boolean;
}

export interface BillingHistoryItem {
    type: string;
    label: string;
    at: string;
    amount?: number;
}

export const billingService = {
    /**
     * Get current customer's plan, usage quotas, and expiration details.
     * Returns { platform: true } if called by platform staff.
     */
    async getUsage(): Promise<BillingUsageResponse> {
        try {
            const response = await api.get<BillingUsageResponse>(API_ENDPOINTS.BILLING_USAGE);
            return response.data;
        } catch (error) {
            console.warn('[billingService] getUsage request failed:', error);
            throw error;
        }
    },

    /**
     * Get available billing plans catalog.
     */
    async getPlans(): Promise<{ plans: BillingPlanCard[] }> {
        const response = await api.get<{ plans: BillingPlanCard[] }>(API_ENDPOINTS.BILLING_PLANS);
        return response.data;
    },

    /**
     * Get customer's billing event history.
     */
    async getHistory(): Promise<{ history: BillingHistoryItem[] }> {
        const response = await api.get<{ history: BillingHistoryItem[] }>(API_ENDPOINTS.BILLING_HISTORY);
        return response.data;
    },
};
