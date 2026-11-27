export const BENIGN_LIFECYCLE_EVENT_TYPES = new Set<string>([
  'session_start',
  'session_end',
  'session_params',
  'session_disconnect',
  'client_info',
  'key_exchange',
  'client_fingerprint',
  'log_closed',
  'connection_closed',
  'disconnect',
  'cowrie.session.connect',
  'cowrie.session.closed',
  'cowrie.session.params',
  'cowrie.client.version',
  'cowrie.client.kex',
  'cowrie.client.hassh',
  'cowrie.client.size',
  'cowrie.log.closed',
]);

export const BENIGN_LIFECYCLE_SCORE_CAP = 10;

export interface LifecyclePayloadContext {
  username?: string | null;
  password?: string | null;
  command?: string | null;
}

export function isBenignLifecycleEvent(
  eventType: string | null | undefined,
  payload?: LifecyclePayloadContext | null
): boolean {
  const normalized = String(eventType || '').trim().toLowerCase();
  if (!normalized) return false;

  const hasOffensiveContext = Boolean(
    String(payload?.command || '').trim() ||
      String(payload?.username || '').trim() ||
      String(payload?.password || '').trim()
  );
  if (hasOffensiveContext) return false;

  return (
    BENIGN_LIFECYCLE_EVENT_TYPES.has(normalized) ||
    normalized.endsWith('.closed') ||
    normalized.endsWith('_disconnect') ||
    normalized.endsWith('.disconnect')
  );
}

/**
 * Prevents benign session close/handshake events from displaying inflated 100/Critical
 * threat scores in UI tables or stats summaries.
 */
export function calibrateEventThreatScore(
  eventType: string | null | undefined,
  rawScore: number | null | undefined,
  payload?: LifecyclePayloadContext | null
): number | undefined {
  if (rawScore === undefined || rawScore === null) return rawScore ?? undefined;
  const numericScore = Number(rawScore);
  if (Number.isNaN(numericScore)) return undefined;

  if (isBenignLifecycleEvent(eventType, payload)) {
    return numericScore > 0 ? Math.min(numericScore, BENIGN_LIFECYCLE_SCORE_CAP) : 0;
  }
  return numericScore;
}
