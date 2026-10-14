import api from '../client';

export type AsmConnectorType =
  | 'webhook'
  | 'splunk_hec'
  | 'elastic'
  | 'sentinel'
  | 'generic_siem'
  | 'soar'
  | 'taxii';

export type AsmConnectorFormat = 'json' | 'stix' | 'cef' | 'csv';

export interface AsmConnector {
  id: string;
  name: string;
  type: AsmConnectorType;
  format: AsmConnectorFormat;
  endpointUrl: string;
  authHeader?: string | null;
  /** Write-only flag: indicates if an auth token is set on server. Token is never returned. */
  hasAuthToken: boolean;
  /** Write-only flag: indicates if a password is set on server. Password is never returned. */
  hasPassword: boolean;
  /** Write-only flag: indicates if an HMAC signing secret is set on server. Secret is never returned. */
  hasSecret: boolean;
  username?: string | null;
  enabled: boolean;
  includeAsm: boolean;
  includeHoneypot: boolean;
  minRiskLevel: string;
  lastPushAt?: string | null;
  lastPushStatus?: string | null;
  lastPushError?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateConnectorInput {
  name: string;
  type: AsmConnectorType;
  format?: AsmConnectorFormat;
  endpointUrl: string;
  authHeader?: string;
  authToken?: string;
  username?: string;
  password?: string;
  secret?: string;
  enabled?: boolean;
  includeAsm?: boolean;
  includeHoneypot?: boolean;
  minRiskLevel?: string;
}

export type UpdateConnectorInput = Partial<CreateConnectorInput>;

export interface PushConnectorResult {
  ok: boolean;
  status: number;
  indicatorCount: number;
  message: string;
}

export interface IntelIndicator {
  type: string;
  value: string;
  riskLevel: string;
  threatScore: number;
  source: string;
  title?: string;
  metadata?: Record<string, unknown>;
}

export interface IntelFeedPreview {
  indicatorCount: number;
  contentType: string;
  indicators: IntelIndicator[];
}

export interface SoarAlert {
  id: string;
  severity: string;
  score: number;
  indicator: string;
  indicatorType: string;
  title?: string;
  source: string;
  metadata?: Record<string, unknown>;
}

export interface SoarAlertsResponse {
  generatedAt: string;
  minRiskLevel: string;
  count: number;
  alerts: SoarAlert[];
}

export interface IntegrationsHealthResponse {
  status: string;
  connectors: AsmConnectorType[];
  formats: AsmConnectorFormat[];
}

class IntegrationsService {
  private readonly base = '/IntegrationsRoutes';

  /**
   * List all configured SIEM/SOAR connectors for the active customer account.
   * Requires integrations.connectors.view or integrations.module.access.
   */
  async listConnectors(): Promise<{ data: AsmConnector[]; total: number }> {
    const response = await api.get<{ data: AsmConnector[]; total: number }>(`${this.base}/connectors`);
    return response.data;
  }

  /**
   * Create a new connector.
   * Requires integrations.connectors.manage.
   * Endpoint URL must be a public HTTPS address.
   */
  async createConnector(input: CreateConnectorInput): Promise<AsmConnector> {
    const response = await api.post<AsmConnector>(`${this.base}/connectors`, input);
    return response.data;
  }

  /**
   * Update an existing connector.
   * Requires integrations.connectors.manage.
   */
  async updateConnector(id: string, input: UpdateConnectorInput): Promise<AsmConnector> {
    const response = await api.patch<AsmConnector>(`${this.base}/connectors/${encodeURIComponent(id)}`, input);
    return response.data;
  }

  /**
   * Delete a connector.
   * Requires integrations.connectors.manage.
   */
  async deleteConnector(id: string): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`${this.base}/connectors/${encodeURIComponent(id)}`);
    return response.data;
  }

  /**
   * Trigger an on-demand intel push to the remote endpoint.
   * Requires integrations.connectors.push.
   */
  async pushConnector(id: string): Promise<PushConnectorResult> {
    const response = await api.post<PushConnectorResult>(`${this.base}/connectors/${encodeURIComponent(id)}/push`, {});
    return response.data;
  }

  /**
   * Preview or poll the unified threat intelligence feed.
   * Requires integrations.feed.view.
   */
  async previewFeed(params?: {
    includeAsm?: boolean;
    includeHoneypot?: boolean;
    minRiskLevel?: string;
    format?: AsmConnectorFormat;
  }): Promise<IntelFeedPreview> {
    const response = await api.get<IntelFeedPreview>(`${this.base}/feed`, { params });
    return response.data;
  }

  /**
   * Pull high-risk SOAR-friendly alert indicators.
   * Requires integrations.soar.view.
   */
  async getSoarAlerts(params?: { minRiskLevel?: string }): Promise<SoarAlertsResponse> {
    const response = await api.get<SoarAlertsResponse>(`${this.base}/soar/alerts`, { params });
    return response.data;
  }

  /**
   * Get integrations health and supported connectors/formats.
   */
  async getHealth(): Promise<IntegrationsHealthResponse> {
    const response = await api.get<IntegrationsHealthResponse>(`${this.base}/health`);
    return response.data;
  }
}

export const integrationsService = new IntegrationsService();
