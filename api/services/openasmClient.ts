import api from '../client';

export type TargetType = 'DOMAIN' | 'CIDR' | 'IP';

export type AsmRiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface AsmRiskFactor {
  code: string;
  label: string;
  weight: number;
  detail?: string;
}

export interface AsmRiskAssessment {
  entityType?: 'ip' | 'domain' | 'cidr';
  entityValue?: string;
  threatScore: number;
  riskLevel: AsmRiskLevel;
  reputation?: 'safe' | 'suspicious' | 'malicious';
  factors: AsmRiskFactor[];
  openPorts?: number[];
  cves?: string[];
  attackSurface?: {
    exposedServices?: number;
    vulnCount?: number;
    criticalVulns?: number;
    highVulns?: number;
    tlsIssues?: number;
    dnsHygieneNotes?: string[];
  };
  enrichment?: Record<string, unknown>;
  assessedAt?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  targetCount?: number;
  memberCount?: number;
  role?: string;
}

export interface Target {
  id: string;
  value: string;
  type: TargetType;
  workspaceId?: string;
  status?: 'pending' | 'scanning' | 'completed' | 'failed' | string;
  scanSchedule?: string | null;
  lastDiscoveredAt?: string;
  lastScanAt?: string | null;
  riskScore?: number | null;
  riskLevel?: AsmRiskLevel | null;
  lastError?: string | null;
  createdAt?: string;
  updatedAt?: string;
  assessment?: AsmRiskAssessment | null;
  [key: string]: unknown;
}

export interface TargetRiskResponse {
  target: Target;
  assessment: AsmRiskAssessment | null;
}

export interface Asset {
  id: string;
  type: string;
  value: string;
  workspaceId?: string;
  targetId?: string;
  ipAddress?: string;
  hostname?: string;
  ports?: number[];
  services?: unknown[];
  techs?: unknown[];
  technologies?: unknown[];
  tags?: string[];
  tls?: unknown[];
  geo?: Record<string, unknown>;
  sources?: string[];
  enabled?: boolean;
  riskScore?: number | null;
  riskLevel?: AsmRiskLevel | null;
  lastSeenAt?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface Vulnerability {
  id: string;
  title: string;
  severity: string;
  cve?: string;
  cvss?: number;
  status?: string;
  source?: string;
  description?: string;
  remediation?: string;
  workspaceId?: string;
  targetId?: string;
  assetId?: string;
  dismissReason?: string;
  dismissComment?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total?: number;
  page?: number;
  limit?: number;
  pageCount?: number;
  hasNextPage?: boolean;
}

/** When the API only returns `data`, `total`, `page`, `limit` (1-based page), derive `pageCount` and `hasNextPage`. */
export function normalizePaginatedResponse<T>(raw: PaginatedResponse<T> | null | undefined): PaginatedResponse<T> {
  if (!raw) {
    return { data: [] as T[], total: 0, page: 1, limit: 10, pageCount: 1, hasNextPage: false };
  }
  const total = Number(raw.total ?? 0);
  const limit = Math.max(1, Number(raw.limit ?? 10));
  const page = Math.max(1, Number(raw.page ?? 1));
  const pageCount =
    raw.pageCount !== undefined && raw.pageCount !== null
      ? Math.max(1, Number(raw.pageCount))
      : total === 0
        ? 1
        : Math.max(1, Math.ceil(total / limit));
  const hasNextPage =
    raw.hasNextPage !== undefined && raw.hasNextPage !== null
      ? Boolean(raw.hasNextPage)
      : total > 0 && page * limit < total;

  return {
    ...raw,
    data: raw.data ?? [],
    total,
    page,
    limit,
    pageCount,
    hasNextPage,
  };
}

export interface WorkspaceQueryParams {
  page?: number;
  limit?: number;
  isArchived?: boolean;
}

export interface TargetQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  value?: string;
  type?: TargetType | '';
  status?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
}

/** Facet keys may be repeated in query string (e.g. multiple tlsHosts=). */
export type AsmFacetParam = string | string[];

export interface AssetQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  value?: string;
  type?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
  targetIds?: string;
  ipAddresses?: AsmFacetParam;
  ports?: AsmFacetParam;
  techs?: AsmFacetParam;
  statusCodes?: AsmFacetParam;
  hosts?: AsmFacetParam;
  tlsHosts?: AsmFacetParam;
  [key: string]: unknown;
}

export type AssetGroupTab = 'all' | 'ip' | 'port' | 'tech' | 'status-code' | 'host' | 'tls';

export interface BulkCreateTargetItem {
  value: string;
  type?: TargetType;
}

export interface BulkCreateTargetsResponse {
  created?: Target[];
  skipped?: Array<{ value: string; reason?: string; limit?: number; id?: string }>;
  requestedCount?: number;
  createdCount?: number;
  skippedCount?: number;
  [key: string]: unknown;
}

export interface VulnerabilityQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  severity?: string;
  status?: string;
  targetIds?: string;
  assetId?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
  workspaceId?: string;
  createdFrom?: string;
  createdTo?: string;
}

export interface AssetGroupCreateResponse {
  id?: string;
  name?: string;
  [key: string]: unknown;
}

export interface SeverityStat {
  severity: string;
  count: number;
}

export interface AsmWorkerTool {
  id?: string;
  name?: string;
  description?: string;
  version?: string;
  logoUrl?: string;
  category?: string;
  [key: string]: unknown;
}

export interface AsmWorker {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  lastSeenAt?: string;
  currentJobsCount?: number;
  type?: string;
  scope?: string;
  tools?: AsmWorkerTool[];
  [key: string]: unknown;
}

export interface WorkerQueryParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
  workspaceId?: string;
}

export interface OpenAsmHealthResponse {
  status?: string;
  upstream?: Record<string, unknown>;
  session?: Record<string, unknown>;
  workspace?: Record<string, unknown>;
}

export interface OpenAsmApiError extends Error {
  response?: {
    status?: number;
    data?: {
      error?: string;
      code?: string;
      reason?: string;
      limit?: number;
      detail?: string;
      issues?: { field?: string; message?: string }[];
      message?: string | string[];
    };
  };
}

export interface TlsAsset {
  host?: string;
  sni?: string;
  subject_dn?: string;
  subject_cn?: string;
  issuer_dn?: string;
  subject_an?: string[];
  not_after?: string;
  not_before?: string;
  tls_version?: string;
  cipher?: string;
  tls_connection?: string;
  [key: string]: unknown;
}

export interface StatisticsTimelinePoint {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  assets?: number;
  targets?: number;
  vuls?: number;
  criticalVuls?: number;
  highVuls?: number;
  mediumVuls?: number;
  lowVuls?: number;
  infoVuls?: number;
  techs?: number;
  ports?: number;
  services?: number;
  score?: number | string;
  workspace?: { id?: string };
  [key: string]: unknown;
}

export interface IssuesTimelinePoint {
  date?: string;
  time?: string;
  count?: number;
  total?: number;
  [key: string]: unknown;
}

export interface AssetLocation {
  query?: string;
  status?: string;
  continent?: string;
  country?: string;
  countryCode?: string;
  lat?: number;
  lon?: number;
  isp?: string;
  org?: string;
  as?: string;
  asname?: string;
  [key: string]: unknown;
}

class OpenAsmClient {
  /**
   * Primary route prefix for native customer-scoped ASM scanning (Task 99).
   * Uses /AsmScanRoutes so requests are scoped to the authenticated customer account
   * and support native risk scoring, Shodan/Censys/OSINT scanning, and re-scans.
   */
  private readonly base = '/AsmScanRoutes';

  private withWorkspaceHeader(workspaceId?: string) {
    if (!workspaceId) return {};
    return { headers: { 'X-Workspace-Id': workspaceId } };
  }

  private normalizeSortOrder<T extends { sortOrder?: string }>(params?: T): T | undefined {
    if (!params?.sortOrder) return params;
    return { ...params, sortOrder: params.sortOrder.toUpperCase() };
  }

  private cleanParams<T extends object>(params?: T): T | undefined {
    if (!params) return params;
    const cleaned = Object.fromEntries(
      Object.entries(params as Record<string, unknown>).filter(([, v]) => v !== '' && v !== undefined && v !== null),
    ) as T;
    return cleaned;
  }

  /** Flatten params for ASM: omit empties; arrays become repeated keys in the query string. */
  private prepareAsmAssetParams(params?: AssetQueryParams): Record<string, string | number | string[]> | undefined {
    const normalized = this.normalizeSortOrder(params) as AssetQueryParams | undefined;
    if (!normalized) return undefined;
    const out: Record<string, string | number | string[]> = {};
    for (const [k, v] of Object.entries(normalized as Record<string, unknown>)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        const arr = v.map(String).map((s) => s.trim()).filter(Boolean);
        if (arr.length) out[k] = arr;
      } else if (typeof v === 'string') {
        if (v.trim() === '' && k !== 'value' && k !== 'search') continue;
        out[k] = v;
      } else if (typeof v === 'number' && !Number.isNaN(v)) {
        out[k] = v;
      }
    }
    return Object.keys(out).length ? out : undefined;
  }

  private serializeAsmAssetParams(params: Record<string, unknown>): string {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      if (Array.isArray(v)) {
        for (const item of v) {
          if (item !== undefined && item !== null && String(item).trim() !== '') sp.append(k, String(item));
        }
      } else if (v !== '') {
        sp.append(k, String(v));
      }
    }
    return sp.toString();
  }

  private assetGetConfig(params?: AssetQueryParams) {
    const prepared = this.prepareAsmAssetParams(params) ?? {};
    return {
      params: prepared,
      paramsSerializer: (p: Record<string, unknown>) => this.serializeAsmAssetParams(p),
    };
  }

  async getActiveWorkspace() {
    const response = await api.get<{ workspaceId: string }>(`${this.base}/active-workspace`);
    return response.data;
  }

  async getMetadata() {
    const response = await api.get<Record<string, unknown>>(`${this.base}/metadata`);
    return response.data;
  }

  async listWorkspaces(params?: WorkspaceQueryParams) {
    const response = await api.get<PaginatedResponse<Workspace>>(`${this.base}/workspaces`, { params });
    return normalizePaginatedResponse(response.data);
  }

  async createWorkspace(body: { name: string; description?: string }) {
    const response = await api.post<Workspace>(`${this.base}/workspaces`, body);
    return response.data;
  }

  async getWorkspaceById(id: string) {
    const response = await api.get<Workspace>(`${this.base}/workspaces/${encodeURIComponent(id)}`);
    return response.data;
  }

  async listTargets(
    params?: TargetQueryParams,
    workspaceId?: string,
  ) {
    const normalized = this.cleanParams(this.normalizeSortOrder(params));
    const response = await api.get<PaginatedResponse<Target>>(`${this.base}/targets`, {
      params: normalized,
      ...(workspaceId ? this.withWorkspaceHeader(workspaceId) : {}),
    });
    return normalizePaginatedResponse(response.data);
  }

  async createTarget(body: { value: string; type?: TargetType }, workspaceId?: string) {
    const response = await api.post<Target>(
      `${this.base}/targets`,
      body,
      workspaceId ? this.withWorkspaceHeader(workspaceId) : undefined,
    );
    return response.data;
  }

  async createTargetsBulk(body: { targets: BulkCreateTargetItem[] }, workspaceId?: string) {
    const response = await api.post<BulkCreateTargetsResponse>(
      `${this.base}/targets/bulk`,
      body,
      workspaceId ? this.withWorkspaceHeader(workspaceId) : undefined,
    );
    return response.data;
  }

  /**
   * Submit a target and run scan + assessment synchronously (Task 42 & 99).
   */
  async submitAndAssess(body: { value: string; type?: TargetType }, workspaceId?: string) {
    const response = await api.post<TargetRiskResponse>(
      `${this.base}/targets/submit-and-assess`,
      body,
      workspaceId ? this.withWorkspaceHeader(workspaceId) : undefined,
    );
    return response.data;
  }

  async getTargetById(id: string, workspaceId?: string) {
    const response = await api.get<Target>(`${this.base}/targets/${encodeURIComponent(id)}`, {
      ...(workspaceId ? this.withWorkspaceHeader(workspaceId) : {}),
    });
    return response.data;
  }

  /**
   * Get the risk assessment breakdown for a target (threat score, risk level, factors, attack surface).
   */
  async getTargetRisk(id: string, workspaceId?: string) {
    const response = await api.get<TargetRiskResponse>(
      `${this.base}/targets/${encodeURIComponent(id)}/risk`,
      workspaceId ? this.withWorkspaceHeader(workspaceId) : undefined,
    );
    return response.data;
  }

  async triggerVulnerabilityScan(targetId: string, workspaceId?: string) {
    const response = await api.post<{ message?: string }>(
      `${this.base}/vulnerabilities/scan`,
      { targetId },
      workspaceId ? this.withWorkspaceHeader(workspaceId) : undefined,
    );
    return response.data;
  }

  async updateTarget(id: string, body: { scanSchedule?: string }, workspaceId?: string) {
    const response = await api.patch<Target>(
      `${this.base}/targets/${encodeURIComponent(id)}`,
      body,
      workspaceId ? this.withWorkspaceHeader(workspaceId) : undefined,
    );
    return response.data;
  }

  /**
   * Queue a rescan for a target. May return 429 RESCAN_TOO_SOON if scanned within the 10-minute cooldown window.
   */
  async rescanTarget(id: string, workspaceId?: string) {
    const response = await api.post<{ message?: string; targetId?: string; code?: string }>(
      `${this.base}/targets/${encodeURIComponent(id)}/re-scan`,
      {},
      workspaceId ? this.withWorkspaceHeader(workspaceId) : undefined,
    );
    return response.data;
  }

  async deleteTargetFromWorkspace(id: string, workspaceId: string) {
    const response = await api.delete<{ message?: string }>(
      `${this.base}/targets/${encodeURIComponent(id)}/workspace/${encodeURIComponent(workspaceId)}`,
      this.withWorkspaceHeader(workspaceId),
    );
    return response.data;
  }

  async listAssets(
    params?: AssetQueryParams,
    workspaceId?: string,
  ) {
    const { params: p, paramsSerializer } = this.assetGetConfig(params);
    const response = await api.get<PaginatedResponse<Asset>>(`${this.base}/assets`, {
      params: p,
      paramsSerializer,
      ...(workspaceId ? this.withWorkspaceHeader(workspaceId) : {}),
    });
    return normalizePaginatedResponse(response.data);
  }

  async listAssetsByGroup(
    group: AssetGroupTab,
    params?: AssetQueryParams,
    workspaceId?: string,
  ) {
    const path = group === 'all' ? `${this.base}/assets` : `${this.base}/assets/${group}`;
    const { params: p, paramsSerializer } = this.assetGetConfig(params);
    const response = await api.get<PaginatedResponse<Asset>>(path, {
      params: p,
      paramsSerializer,
      ...(workspaceId ? this.withWorkspaceHeader(workspaceId) : {}),
    });
    return normalizePaginatedResponse(response.data);
  }

  async exportAssetServices(
    params?: AssetQueryParams,
    workspaceId?: string,
  ) {
    const headers: Record<string, string> = {
      Accept: 'text/csv,application/vnd.ms-excel,text/plain',
    };
    if (workspaceId) {
      Object.assign(headers, this.withWorkspaceHeader(workspaceId).headers as Record<string, string>);
    }
    const { params: p, paramsSerializer } = this.assetGetConfig(params);
    const response = await api.get<Blob>(`${this.base}/assets/services/export`, {
      params: p,
      paramsSerializer,
      responseType: 'blob',
      headers,
    });
    return response;
  }

  async getAssetById(id: string, workspaceId?: string) {
    const response = await api.get<Asset>(
      `${this.base}/assets/${encodeURIComponent(id)}`,
      workspaceId ? this.withWorkspaceHeader(workspaceId) : undefined,
    );
    return response.data;
  }

  async updateAsset(id: string, body: { tags?: string[] }, workspaceId?: string) {
    const response = await api.patch<Asset>(
      `${this.base}/assets/${encodeURIComponent(id)}`,
      body,
      workspaceId ? this.withWorkspaceHeader(workspaceId) : undefined,
    );
    return response.data;
  }

  async switchAsset(body: { assetId: string; enabled: boolean }, workspaceId?: string) {
    const response = await api.post<{ message?: string }>(
      `${this.base}/assets/switch`,
      body,
      workspaceId ? this.withWorkspaceHeader(workspaceId) : undefined,
    );
    return response.data;
  }

  async generateAssetTags(body: { domain: string }, workspaceId?: string) {
    const response = await api.post<{ tags?: string[] }>(
      `${this.base}/ai-assistant/generate-tags`,
      body,
      workspaceId ? this.withWorkspaceHeader(workspaceId) : undefined,
    );
    return response.data;
  }

  async createAssetGroup(body: { name: string }, workspaceId?: string) {
    const response = await api.post<AssetGroupCreateResponse>(
      `${this.base}/asset-group`,
      body,
      workspaceId ? this.withWorkspaceHeader(workspaceId) : undefined,
    );
    return response.data;
  }

  async listWorkers(params?: WorkerQueryParams, workspaceId?: string) {
    const response = await api.get<PaginatedResponse<AsmWorker>>(`${this.base}/workers`, {
      params: this.cleanParams(this.normalizeSortOrder(params)),
      ...(workspaceId ? this.withWorkspaceHeader(workspaceId) : {}),
    });
    return normalizePaginatedResponse(response.data);
  }

  async listVulnerabilities(
    params?: VulnerabilityQueryParams,
    workspaceId?: string,
  ) {
    const response = await api.get<PaginatedResponse<Vulnerability>>(`${this.base}/vulnerabilities`, {
      params: this.cleanParams(this.normalizeSortOrder(params)),
      ...(workspaceId ? this.withWorkspaceHeader(workspaceId) : {}),
    });
    return normalizePaginatedResponse(response.data);
  }

  async getVulnerabilityStatistics(workspaceId?: string, params?: { targetIds?: string }) {
    const response = await api.get<{ data: SeverityStat[] }>(
      `${this.base}/vulnerabilities/statistics`,
      {
        params: this.cleanParams({ workspaceId, ...params }),
        ...(workspaceId ? this.withWorkspaceHeader(workspaceId) : {}),
      },
    );
    return response.data;
  }

  async getVulnerabilityById(id: string, workspaceId?: string) {
    const response = await api.get<Vulnerability>(
      `${this.base}/vulnerabilities/${encodeURIComponent(id)}`,
      workspaceId ? this.withWorkspaceHeader(workspaceId) : undefined,
    );
    return response.data;
  }

  async dismissVulnerabilities(
    body: { ids: string[]; reason: string; comment?: string },
    workspaceId?: string,
  ) {
    const response = await api.post<Record<string, unknown>>(
      `${this.base}/vulnerabilities/dismiss`,
      body,
      workspaceId ? this.withWorkspaceHeader(workspaceId) : undefined,
    );
    return response.data;
  }

  async reopenVulnerabilities(body: { ids: string[] }, workspaceId?: string) {
    const response = await api.post<Record<string, unknown>>(
      `${this.base}/vulnerabilities/reopen`,
      body,
      workspaceId ? this.withWorkspaceHeader(workspaceId) : undefined,
    );
    return response.data;
  }

  async getStatistics(workspaceId?: string) {
    const response = await api.get<Record<string, unknown>>(`${this.base}/statistics`, {
      params: workspaceId ? { workspaceId } : undefined,
      ...(workspaceId ? this.withWorkspaceHeader(workspaceId) : {}),
    });
    return response.data;
  }

  async getStatisticsTimeline(workspaceId?: string) {
    const response = await api.get<{ data: StatisticsTimelinePoint[]; total?: number }>(
      `${this.base}/statistics/timeline`,
      {
        params: workspaceId ? { workspaceId } : undefined,
        ...(workspaceId ? this.withWorkspaceHeader(workspaceId) : {}),
      },
    );
    return response.data;
  }

  async getIssuesTimeline(workspaceId?: string) {
    const response = await api.get<{ data: IssuesTimelinePoint[]; total?: number }>(
      `${this.base}/statistics/issues-timeline`,
      {
        params: workspaceId ? { workspaceId } : undefined,
        ...(workspaceId ? this.withWorkspaceHeader(workspaceId) : {}),
      },
    );
    return response.data;
  }

  async getAssetLocations(workspaceId?: string) {
    const response = await api.get<AssetLocation[]>(
      `${this.base}/statistics/asset-locations`,
      {
        params: workspaceId ? { workspaceId } : undefined,
        ...(workspaceId ? this.withWorkspaceHeader(workspaceId) : {}),
      },
    );
    return response.data;
  }

  async getTlsAssets(
    params: AssetQueryParams,
    workspaceId?: string,
  ) {
    const { params: p, paramsSerializer } = this.assetGetConfig(params);
    const response = await api.get<PaginatedResponse<TlsAsset>>(`${this.base}/assets/tls`, {
      params: p,
      paramsSerializer,
      ...(workspaceId ? this.withWorkspaceHeader(workspaceId) : {}),
    });
    return normalizePaginatedResponse(response.data);
  }

  async getTopAssetsVulnerabilities(workspaceId?: string) {
    const response = await api.get<Record<string, unknown>[]>(
      `${this.base}/statistics/top-assets-vulnerabilities`,
      {
        params: workspaceId ? { workspaceId } : undefined,
        ...(workspaceId ? this.withWorkspaceHeader(workspaceId) : {}),
      },
    );
    return response.data;
  }

  async getTopTagsAssets(workspaceId?: string) {
    const response = await api.get<Record<string, unknown>[]>(
      `${this.base}/statistics/top-tags-assets`,
      {
        params: workspaceId ? { workspaceId } : undefined,
        ...(workspaceId ? this.withWorkspaceHeader(workspaceId) : {}),
      },
    );
    return response.data;
  }

  async getVulnerabilitiesStatistics(workspaceId?: string) {
    const response = await api.get<{ data: { severity: string; count: number }[] }>(
      `${this.base}/vulnerabilities/statistics`,
      {
        params: workspaceId ? { workspaceId } : undefined,
        ...(workspaceId ? this.withWorkspaceHeader(workspaceId) : {}),
      },
    );
    return response.data;
  }

  async getHealth() {
    const response = await api.get<OpenAsmHealthResponse>(`${this.base}/health`);
    return response.data;
  }

  async bootstrap() {
    const response = await api.post<{ success: boolean; activeWorkspaceId: string; bootstrappedAt: string }>(
      `${this.base}/bootstrap`,
      {},
    );
    return response.data;
  }
}

export const openasm = new OpenAsmClient();
export const asmScanClient = openasm;
