import { DEMO_CVES } from './vulnerabilities';

export interface DemoCveFeedRecord {
  cve_id: string;
  description: string;
  cvss_score: number;
  published_date: string;
  last_modified_date: string;
}

export const DEMO_CVE_FEEDS: DemoCveFeedRecord[] = DEMO_CVES.map((cve) => ({
  cve_id: cve.id,
  description: cve.description,
  cvss_score: cve.cvssScore,
  published_date: cve.published,
  last_modified_date: cve.lastModified,
}));
