
import { CveEntry } from '../types';
import { toProxyUrl } from './proxy';

const NVD_API_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
const CISA_KEV_GITHUB_MAIN = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';

// Proxy order: Backend proxy (Task 101 & 102) - direct fetch workarounds removed
const PROXIES = [
    (url: string) => toProxyUrl(url),
];

// Helper to fetch with proxy rotation
const fetchJsonWithProxy = async (targetUrl: string): Promise<any> => {
    for (const proxyGen of PROXIES) {
        try {
            const proxyEndpoint = proxyGen(targetUrl);
            const res = await fetch(proxyEndpoint);

            if (res.ok) {
                const text = await res.text();
                // Basic validation
                if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
                    return JSON.parse(text);
                }
            }
        } catch (e) {
            // continue
        }
    }
    throw new Error("Failed to fetch data from all proxies");
};

// Helper to transform NVD JSON format to our internal CveEntry format
const transformNvdCve = (cveItem: any): CveEntry => {
    const cve = cveItem.cve || cveItem; // Sometimes wrapped in 'cve' property in NVD 2.0
    const metrics = cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV30?.[0] || cve.metrics?.cvssMetricV2?.[0] || {};
    const cvssData = metrics.cvssData || {};

    // Determine severity
    let severity = 'UNKNOWN';
    if (cvssData.baseSeverity) severity = cvssData.baseSeverity;
    else if (metrics.baseSeverity) severity = metrics.baseSeverity; // V2

    // Check for exploit reference
    const hasExploit = cve.references?.some((r: any) =>
        r.tags?.some((t: string) => t.toLowerCase() === 'exploit')
    ) || false;

    // Extract CPEs
    const configurations = cve.configurations?.flatMap((c: any) => c.nodes?.flatMap((n: any) => n.cpeMatch?.map((m: any) => m.criteria))) || [];

    // Extract Vendor/Product from CPE
    let vendor = 'Unknown';
    let product = 'Unknown';

    if (configurations.length > 0) {
        // Try to find a valid CPE string
        // Format: cpe:2.3:a:vendor:product:version...
        const cpe = configurations[0];
        if (cpe && cpe.startsWith('cpe:2.3:')) {
            const parts = cpe.split(':');
            if (parts.length >= 5) {
                // Formatting: capitalize and replace underscores
                vendor = parts[3].charAt(0).toUpperCase() + parts[3].slice(1).replace(/_/g, ' ');
                product = parts[4].charAt(0).toUpperCase() + parts[4].slice(1).replace(/_/g, ' ');
            }
        }
    }

    return {
        id: cve.id,
        sourceIdentifier: cve.sourceIdentifier || 'NVD',
        published: cve.published,
        lastModified: cve.lastModified,
        status: cve.vulnStatus || 'Unknown',
        description: cve.descriptions?.find((d: any) => d.lang === 'en')?.value || 'No description available',
        cvssScore: cvssData.baseScore || 0,
        severity: severity,
        vectorString: cvssData.vectorString || '',
        weaknesses: cve.weaknesses?.map((w: any) => w.description?.[0]?.value).filter(Boolean) || [],
        references: cve.references?.map((r: any) => ({ url: r.url, tags: r.tags || [] })) || [],
        configurations: configurations,
        vendor: vendor,
        product: product,
        cweCategory: 'Unknown',
        hasExploit: hasExploit,
        isKev: false,
        tags: hasExploit ? ['Exploit Available'] : [],
        vector: {
            AV: cvssData.attackVector || cvssData.accessVector,
            AC: cvssData.attackComplexity || cvssData.accessComplexity,
            PR: cvssData.privilegesRequired || cvssData.authentication,
            UI: cvssData.userInteraction || (typeof cvssData.userInteractionRequired === 'boolean' ? (cvssData.userInteractionRequired ? 'Required' : 'None') : cvssData.userInteractionRequired),
            S: cvssData.scope,
            C: cvssData.confidentialityImpact,
            I: cvssData.integrityImpact,
            A: cvssData.availabilityImpact
        }
    };
};

export const parseNvdCve = async (file: File): Promise<CveEntry[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const json = JSON.parse(text);
                const cves: CveEntry[] = [];

                const vulnerabilities = json.vulnerabilities || [];

                for (const item of vulnerabilities) {
                    cves.push(transformNvdCve(item));
                }
                resolve(cves);
            } catch (err) {
                console.error("NVD Parse Error", err);
                reject(new Error("Invalid NVD CVE JSON"));
            }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsText(file);
    });
};

export const fetchCveUpdates = async (lastUpdate?: Date): Promise<CveEntry[]> => {
    const cves: CveEntry[] = [];
    const seenIds = new Set<string>();
    const kevEntries: CveEntry[] = [];

    // Fetch CISA KEV and recent NVD in parallel (NVD gives real CVSS and severity).
    const kevTask = (async () => {
        try {
            const kevData = await fetchJsonWithProxy(CISA_KEV_GITHUB_MAIN);
            return kevData?.vulnerabilities || [];
        } catch (e) {
            console.warn("Failed to fetch CISA KEV", e);
            return [];
        }
    })();

    const nvdPage = async (startIndex: number): Promise<any[]> => {
        const params = new URLSearchParams();
        params.append('resultsPerPage', '500');
        params.append('startIndex', String(startIndex));
        const end = new Date();
        const start = lastUpdate ? lastUpdate : new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
        const fmt = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, '');
        if (lastUpdate) {
            params.append('lastModStartDate', fmt(start));
            params.append('lastModEndDate', fmt(end));
        } else {
            params.append('pubStartDate', fmt(start));
            params.append('pubEndDate', fmt(end));
        }
        try {
            const data = await Promise.race([
                fetchJsonWithProxy(`${NVD_API_URL}?${params.toString()}`),
                new Promise<never>((_, reject) => setTimeout(() => reject(new Error('NVD timeout')), 20000)),
            ]);
            return data?.vulnerabilities || [];
        } catch (e) {
            console.warn("Failed to fetch NVD data", e);
            return [];
        }
    };

    const [kevRaw, nvdA, nvdB] = await Promise.all([kevTask, nvdPage(0), nvdPage(500)]);

    const nvdById = new Map<string, CveEntry>();
    for (const item of [...nvdA, ...nvdB]) {
        const entry = transformNvdCve(item);
        if (entry.id) nvdById.set(entry.id, entry);
    }

    kevRaw.forEach((vuln: any) => {
        if (lastUpdate && new Date(vuln.dateAdded) <= lastUpdate) return;
        const nvd = nvdById.get(vuln.cveID);
        // Severity and CVSS come from NVD when we have them; KEV alone carries no score,
        // so do not invent one.
        const entry: CveEntry = {
            ...(nvd || {
                id: vuln.cveID,
                sourceIdentifier: 'CISA',
                published: vuln.dateAdded,
                lastModified: vuln.dateAdded,
                status: 'Active',
                description: vuln.shortDescription,
                cvssScore: 0,
                severity: 'UNKNOWN',
                vectorString: '',
                weaknesses: [],
                references: [],
                configurations: [vuln.product],
                vendor: vuln.vendorProject,
                product: vuln.product,
                cweCategory: 'Unknown',
                vector: {},
            }),
            hasExploit: true,
            isKev: true,
            tags: ['KEV', 'Exploited'],
        } as CveEntry;
        entry.references = [
            ...(entry.references || []),
            { url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog', tags: ['CISA KEV'] },
        ];
        kevEntries.push(entry);
        cves.push(entry);
        seenIds.add(vuln.cveID);
    });

    nvdById.forEach((entry, id) => {
        if (!seenIds.has(id)) {
            cves.push(entry);
            seenIds.add(id);
        }
    });

    return cves;
};
