
import { RansomWatchPost, RansomWatchGroup } from '../types';
import { API_ENDPOINTS } from '../config/config';
import api from '../api/client';
import { isPublicDemo } from '../src/utils/demoMode';
import { DEMO_RANSOMWARE_POSTS, DEMO_RANSOMWARE_GROUPS } from '../src/data/demo/ransomware';

const mapLiveVictims = (json: any): RansomWatchPost[] => {
    const items = json.victims || (Array.isArray(json) ? json : []);
    
    // Drop test and probe entries injected into the leak site feed (e.g. "zzq-test", "probe-<hex>").
    const isTestEntry = (v: any) => /^(zzq-|probe-[0-9a-f]{8,}|test$)/i.test(String(v.victim || v.post_title || '').trim());
    return items.filter((v: any) => !isTestEntry(v)).map((v: any) => ({
        post_title: v.victim || v.post_title,
        group_name: v.group || v.group_name,
        discovered: v.discovered,
        description: v.description,
        website: v.website,
        country: v.country,
        activity: v.activity,
        screenshot: v.screenshot,
        source: 'Ransomware.live'
    }));
};

const fetchRansomwareLive = async (): Promise<RansomWatchPost[]> => {
    try {
        const res = await api.get<any>(API_ENDPOINTS.PROXY_RANSOMWARE_LIVE);
        if (res.data) {
            return mapLiveVictims(res.data);
        }
    } catch (err: any) {
        const status = err.response?.status;
        if (status === 502) {
            console.warn('[Ransomware.live Proxy] 502 PROVIDER_ERROR: Upstream Ransomware.live feed unreachable');
        } else if (status === 503) {
            console.warn('[Ransomware.live Proxy] 503 PROVIDER_NOT_CONFIGURED: RANSOMWARE_LIVE_API_KEY is not configured on backend');
        } else if (status === 429) {
            console.warn('[Ransomware.live Proxy] 429 PROXY_RATE_LIMITED: Ransomware.live proxy rate limit exceeded');
        } else {
            console.warn('[Ransomware.live Proxy] Error fetching live ransomware data:', err.message);
        }
    }
    return [];
};

export const fetchRansomwarePosts = async (): Promise<RansomWatchPost[]> => {
    // Demo mode: prospect sandbox
    if (isPublicDemo()) return DEMO_RANSOMWARE_POSTS;

    // Authenticated mode: strictly query backend proxy API
    try {
        const liveData = await fetchRansomwareLive();
        return Array.isArray(liveData) ? liveData : [];
    } catch (e) {
        console.warn("[Ransomware] Failed to fetch backend ransomware data", e);
        return [];
    }
};

export const fetchRansomwareGroups = async (): Promise<RansomWatchGroup[]> => {
    // Demo mode: prospect sandbox
    if (isPublicDemo()) return DEMO_RANSOMWARE_GROUPS;

    // Authenticated mode: only backend data if provided, otherwise clean empty state
    return [];
};


