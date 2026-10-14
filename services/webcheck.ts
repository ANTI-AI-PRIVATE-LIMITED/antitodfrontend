
import { WebCheckResult, CrtShEntry, DnsBlockResult } from '../types';
import { queryDoH, enrichIP, checkRBL, checkDnsBlocking } from './dns';
import { performCrtLookup, checkWaybackAvailability } from './netTools';
import { fetchOtxIndicator } from './otx';

// Task 101: Removed public relays (ThingProxy, AllOrigins, CORSProxy, VercelProxy).
// Feeds run through backend allowlisted proxy or direct APIs.

export const performWebCheck = async (input: string, onUpdate?: (result: WebCheckResult) => void): Promise<WebCheckResult> => {
    // 1. Detect Input Type & Normalize
    let target = input.trim();
    let type: 'DOMAIN' | 'IP' | 'URL' = 'DOMAIN';
    let domain = '';
    let url = '';
    
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    const urlRegex = /^https?:\/\//i;

    if (ipRegex.test(target)) {
        type = 'IP';
        domain = target; // For IP, we treat IP as domain for DNS queries
        url = `http://${target}`;
    } else if (urlRegex.test(target)) {
        type = 'URL';
        url = target;
        try {
            domain = new URL(target).hostname;
        } catch (e) { domain = target; }
    } else {
        type = 'DOMAIN';
        domain = target;
        url = `https://${target}`; // Default to HTTPS
    }

    const result: WebCheckResult = {
        target,
        inputType: type,
        dns: { a: [], aaaa: [], mx: [], txt: [], ns: [], cname: [], soa: [] },
        http: { status: 0, statusText: 'Pending...', headers: {}, redirects: [], securityHeaders: [] },
        page: { metaTags: {}, techStack: [], hasRobotsTxt: false, hasSitemap: false },
        timestamp: Date.now(),
        visuals: {
            screenshot: '',
            favicon: ''
        },
        dnsSecurity: []
    };

    // Initial Callback
    if (onUpdate) onUpdate({ ...result });

    // Generate Visual URLs immediately
    result.visuals = {
        screenshot: `https://image.thum.io/get/width/600/crop/800/noanimate/${url}`,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`
    };
    if (onUpdate) onUpdate({ ...result });

    const notify = () => {
        if (onUpdate) onUpdate({ ...result });
    };

    // 2. Parallel Tasks: DNS, HTTP, Robots, DNS Blocking
    const pDns = fetchDnsRecords(domain, result).then(notify);
    const pHttp = fetchHttpInfo(url, result).then(notify);
    const pRobots = fetchRobotsAndSitemap(domain, result).then(notify);
    const pDnsSec = checkDnsFirewall(domain, result).then(notify);

    // 3. Post-Processing for IP info
    let ipToCheck = domain; 
    
    const pIpChain = pDns.then(async () => {
        if (result.dns.a.length > 0) {
            ipToCheck = result.dns.a[0]; 
        } else if (type === 'IP') {
            ipToCheck = target;
        }
        
        if (ipToCheck && !result.ipInfo) {
            const ipData = await enrichIP(ipToCheck);
            if (ipData) {
                result.ipInfo = ipData;
                notify();
            }
        }
        
        // 4. Threat Intelligence Check
        await checkThreatIntelligence(domain, ipToCheck, result);
        notify();
    });

    const pCt = checkCertificateTransparency(domain, result).then(notify);
    const pArchive = checkArchiveHistory(domain, result).then(notify);

    // 5. OTX AlienVault Enrichment
    const pOtx = fetchOtxIndicator(domain).then(otx => {
        if (otx) result.otx = otx;
        notify();
    });

    await Promise.allSettled([pDns, pHttp, pRobots, pDnsSec, pIpChain, pCt, pArchive, pOtx]);

    return result;
};

const fetchDnsRecords = async (domain: string, result: WebCheckResult) => {
    const types = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA'];
    
    const promises = types.map(async (t) => {
        const res = await queryDoH(domain, t);
        if (res?.Answer) {
            const records = res.Answer.map((r: any) => r.data.replace(/"/g, ''));
            switch(t) {
                case 'A': result.dns.a = records; break;
                case 'AAAA': result.dns.aaaa = records; break;
                case 'MX': result.dns.mx = records; break;
                case 'TXT': result.dns.txt = records; break;
                case 'NS': result.dns.ns = records; break;
                case 'CNAME': result.dns.cname = records; break;
                case 'SOA': result.dns.soa = records; break;
            }
        }
    });

    await Promise.all(promises);
};

const fetchHttpInfo = async (_targetUrl: string, result: WebCheckResult) => {
    // Task 101: Tools that fetch a URL the user types cannot work through an allowlist.
    // Labeled 'coming soon' in v1.1. Do not fall back to a direct browser fetch.
    result.http.status = 200;
    result.http.statusText = 'Inspection Coming Soon (v1.1)';
    analyzeSecurityHeaders(result);
};

const analyzeSecurityHeaders = (result: WebCheckResult) => {
    const h = result.http.headers;
    const metaTags = result.page.metaTags; 

    const checks = [
        { name: 'Strict-Transport-Security', key: 'strict-transport-security' },
        { name: 'Content-Security-Policy', key: 'content-security-policy', meta: 'Content-Security-Policy' },
        { name: 'X-Frame-Options', key: 'x-frame-options' },
        { name: 'X-Content-Type-Options', key: 'x-content-type-options' },
        { name: 'Referrer-Policy', key: 'referrer-policy', meta: 'referrer' },
        { name: 'Permissions-Policy', key: 'permissions-policy' }
    ];

    result.http.securityHeaders = checks.map(c => {
        let val = h[c.key];
        if (!val && c.meta) {
            const metaKey = Object.keys(metaTags).find(k => k.toLowerCase() === c.meta?.toLowerCase());
            if (metaKey) val = metaTags[metaKey];
        }

        return {
            name: c.name,
            value: val || 'Missing',
            valid: !!val && val !== 'Missing'
        };
    });
};

const analyzeHtml = (html: string, result: WebCheckResult) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const metas = doc.querySelectorAll('meta');
    
    metas.forEach(meta => {
        const name = meta.getAttribute('name') || meta.getAttribute('property') || meta.getAttribute('http-equiv');
        const content = meta.getAttribute('content');
        if (name && content) {
            result.page.metaTags[name] = content;
        }
    });
    result.page.title = doc.title;

    const techSignatures = [
        { name: 'WordPress', regex: /wp-content|wp-includes/i },
        { name: 'React', regex: /_next|react-dom|react|data-reactid/i },
        { name: 'Vue.js', regex: /vue|v-bind|v-if|data-v-/i },
        { name: 'Angular', regex: /ng-version|angular|ng-app/i },
        { name: 'Bootstrap', regex: /bootstrap/i },
        { name: 'jQuery', regex: /jquery/i },
        { name: 'Cloudflare', regex: /cloudflare|__cf/i },
        { name: 'Google Analytics', regex: /google-analytics|gtag|ua-\d+/i },
        { name: 'Shopify', regex: /shopify/i },
        { name: 'Tailwind CSS', regex: /tailwind/i },
        { name: 'Font Awesome', regex: /font-awesome|fa-/i },
        { name: 'Next.js', regex: /_next\/static/i },
        { name: 'Wix', regex: /wix\.com/i },
        { name: 'Squarespace', regex: /squarespace/i },
        { name: 'Magento', regex: /mage\/cookies|Varien_Form/i },
        { name: 'Drupal', regex: /drupal|sites\/all\/themes/i },
        { name: 'Joomla', regex: /joomla/i }
    ];

    techSignatures.forEach(sig => {
        if (sig.regex.test(html)) {
            result.page.techStack.push(sig.name);
        }
    });

    const server = result.http.headers['server'];
    if (server) {
        result.http.server = server;
        if (server.toLowerCase().includes('nginx')) result.page.techStack.push('Nginx');
        if (server.toLowerCase().includes('apache')) result.page.techStack.push('Apache');
        if (server.toLowerCase().includes('cloudflare')) result.page.techStack.push('Cloudflare');
        if (server.toLowerCase().includes('microsoft-iis')) result.page.techStack.push('IIS');
        if (server.toLowerCase().includes('envoy')) result.page.techStack.push('Envoy');
    }
    if (result.http.headers['x-powered-by']) result.page.techStack.push(result.http.headers['x-powered-by']);

    result.page.techStack = Array.from(new Set(result.page.techStack));
};

const calculateCarbon = (bytes: number, result: WebCheckResult) => {
    const kb = bytes / 1024;
    const g = kb * 0.04; 
    let rating = 'A+';
    if (g > 0.1) rating = 'A';
    if (g > 0.3) rating = 'B';
    if (g > 0.5) rating = 'C';
    if (g > 0.8) rating = 'D';
    if (g > 1.5) rating = 'E';
    if (g > 3.0) rating = 'F';
    result.carbon = { g: parseFloat(g.toFixed(3)), rating };
};

const fetchRobotsAndSitemap = async (_domain: string, _result: WebCheckResult) => {
    // Task 101: Arbitrary target URL fetch disabled for v1 allowlist compliance (coming soon in v1.1)
    return;
};

const checkDnsFirewall = async (domain: string, result: WebCheckResult) => {
    if (result.inputType === 'IP') return;
    try {
        const results = await checkDnsBlocking(domain);
        result.dnsSecurity = results;
    } catch (e) {
        console.warn("DNS Firewall check failed", e);
    }
};

const checkCertificateTransparency = async (domain: string, result: WebCheckResult) => {
    if (result.inputType === 'IP') return; 
    try {
        const entries = await performCrtLookup(domain);
        if (entries.length > 0) {
            const domains = new Set<string>();
            entries.forEach(entry => {
                const names = entry.name_value.split('\n');
                names.forEach(name => {
                    if (name.endsWith(domain) && !name.includes('*')) {
                        domains.add(name);
                    }
                });
            });
            const sorted = entries.sort((a, b) => new Date(b.not_after).getTime() - new Date(a.not_after).getTime());
            result.ct = {
                subdomains: Array.from(domains).sort(),
                total: entries.length,
                latest: sorted[0]
            };
        }
    } catch (e) {
        console.warn("CT Lookup failed", e);
    }
};

const checkArchiveHistory = async (domain: string, result: WebCheckResult) => {
    if (result.inputType === 'IP') return; 
    try {
        const archive = await checkWaybackAvailability(domain);
        if (archive) {
            result.archive = archive;
        }
    } catch (e) {
        console.warn("Archive Lookup failed", e);
    }
};

const checkThreatIntelligence = async (domain: string, ip: string, result: WebCheckResult) => {
    const sources: { name: string; detected: boolean; type: string; reference?: string }[] = [];
    
    if (ip && ip.match(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/)) {
        try {
            const rblResult = await checkRBL(ip);
            if (rblResult.status === 'LISTED') {
                rblResult.listedIn.forEach(list => {
                    sources.push({ name: `DNSBL (${list})`, detected: true, type: 'Spam/Blocklist' });
                });
            } else {
                sources.push({ name: 'Spamhaus/ZEN (DNSBL)', detected: false, type: 'Spam/Blocklist' });
            }
        } catch (e) {
            console.warn("RBL check failed", e);
        }
    }

    // Task 101: URLHaus POST removed (backend route is GET only).
    
    const detectedCount = sources.filter(s => s.detected).length;
    let summary: 'CLEAN' | 'SUSPICIOUS' | 'MALICIOUS' = 'CLEAN';
    if (detectedCount > 0) summary = 'MALICIOUS';

    result.blocklist = { summary, sources };
};

