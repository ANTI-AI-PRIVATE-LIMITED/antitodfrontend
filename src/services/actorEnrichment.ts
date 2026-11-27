import type { ActorCampaign, MalpediaActor } from '../../types';

interface SignalRule {
  label: string;
  pattern: RegExp;
}

const COUNTRY_SIGNAL_RULES: SignalRule[] = [
  { label: 'Russia', pattern: /\b(russian?|russia[- ]based|russia[- ]nexus|gru|fsb|svr|unit\s+26165|unit\s+74455|fancy bear|cozy bear|sandworm|turla|gamaredon)\b/i },
  { label: 'North Korea', pattern: /\b(north korean?|dprk|reconnaissance general bureau|lazarus|kimsuky|andariel|hidden cobra|chollima)\b/i },
  { label: 'China', pattern: /\b(chinese|china[- ]based|prc|pla|ministry of state security|mss|apt\s?(?:1|10|27|40|41)|volt typhoon|salt typhoon|hafnium|mustang panda)\b/i },
  { label: 'Iran', pattern: /\b(iranian?|iran[- ]based|irgc|mois|muddywater|oilrig|charming kitten|apt\s?(?:33|34|35|39))\b/i },
  { label: 'Vietnam', pattern: /\b(vietnamese|vietnam[- ]based|apt32|oceanlotus)\b/i },
  { label: 'Belarus', pattern: /\b(belarusian|belarus[- ]based|unc1151|ghostwriter)\b/i },
  { label: 'Pakistan', pattern: /\b(pakistani|pakistan[- ]based|transparent tribe|apt36|sidecopy)\b/i },
  { label: 'India', pattern: /\b(indian[- ]nexus|india[- ]based|sidewinder|patchwork|confucius)\b/i },
  { label: 'South Korea', pattern: /\b(south korean?|south korea[- ]based|darkhotel)\b/i },
  { label: 'Turkey', pattern: /\b(turkish|turkey[- ]based|sea turtle)\b/i },
  { label: 'United States', pattern: /\b(u\.s\.|united states|equation group)\b/i },
];

const MOTIVATION_SIGNAL_RULES: SignalRule[] = [
  { label: 'Financial / Ransomware', pattern: /\b(ransomware|extortion|financial(?:ly)?|banking|payment card|pos malware|swift|cryptocurrenc|heist|carbanak|fin\d+)\b/i },
  { label: 'Destructive / Sabotage', pattern: /\b(wiper|destructive|sabotage|power grid|scada|ics|sandworm)\b/i },
  { label: 'Information Operations', pattern: /\b(disinformation|influence operation|hack-and-leak|election|propaganda|ghostwriter)\b/i },
  { label: 'Espionage', pattern: /\b(espionage|state[- ]sponsored|intelligence collection|cyber[- ]espionage|diplomatic|geopolitical|surveillance|ministry|embassy)\b/i },
  { label: 'Hacktivism', pattern: /\b(hacktivis[tm]|defacement|ideological|protest)\b/i },
];

const SECTOR_SIGNAL_RULES: SignalRule[] = [
  { label: 'Government', pattern: /\b(governments?|ministr(?:y|ies)|embass(?:y|ies)|diplomatic|public sector|municipal|parliament)\b/i },
  { label: 'Defense', pattern: /\b(defense|defence|militar(?:y|ies)|armed forces|aerospace|defense contractors?)\b/i },
  { label: 'Financial', pattern: /\b(financial|banking|banks?|fintech|swift|cryptocurrenc(?:y|ies)|payment|credit unions?|insurers?)\b/i },
  { label: 'Energy', pattern: /\b(energy|oil|gas|power grids?|electric(?:al|ity)?|utilit(?:y|ies)|nuclear|petroleum)\b/i },
  { label: 'Critical Infrastructure', pattern: /\b(critical infrastructure|ics|scada|industrial control|water|pipelines?|rail(?:ways?)?)\b/i },
  { label: 'Telecommunications', pattern: /\b(telecoms?|telecommunications?|isps?|mobile operators?|carriers?)\b/i },
  { label: 'Healthcare', pattern: /\b(healthcare|hospitals?|medical|pharma(?:ceutical)?s?|biotech)\b/i },
  { label: 'Technology', pattern: /\b(technology|software|saas|cloud providers?|managed services?|msps?|it providers?|semiconductors?)\b/i },
  { label: 'Aviation & Aerospace', pattern: /\b(aviation|airlines?|aerospace|satellites?|space)\b/i },
  { label: 'Maritime & Logistics', pattern: /\b(maritime|shipping|logistics|supply chain|freight|ports?)\b/i },
  { label: 'Media & NGOs', pattern: /\b(media|journalists?|news|think tanks?|ngos?|human rights|activists?|dissidents?)\b/i },
  { label: 'Education & Research', pattern: /\b(universit(?:y|ies)|academi[ca]|education|research institutes?)\b/i },
];

function combinedContext(name: string, description: string, aliases: string[] = []): string {
  return [name, ...aliases, description].filter(Boolean).join(' ');
}

function isKnownField(value?: string): boolean {
  if (!value) return false;
  const norm = value.trim().toLowerCase();
  return norm.length > 0 && norm !== 'unknown' && norm !== 'n/a' && norm !== 'unattributed';
}

/** Infers country/nexus attribution from explicit metadata or conservative text signals. */
export function inferActorOrigin(
  name: string,
  description: string,
  aliases: string[] = [],
  explicitCountry?: string,
): string {
  if (isKnownField(explicitCountry)) {
    return explicitCountry!.trim();
  }
  const haystack = combinedContext(name, description, aliases);
  for (const rule of COUNTRY_SIGNAL_RULES) {
    if (rule.pattern.test(haystack)) {
      return rule.label;
    }
  }
  return 'Unattributed';
}

/** Infers primary threat actor motivation from narrative indicators or sophistication score. */
export function inferActorMotivation(
  name: string,
  description: string,
  aliases: string[] = [],
  sophistication?: MalpediaActor['sophistication'],
  explicitMotivation?: string,
): string {
  if (isKnownField(explicitMotivation)) {
    return explicitMotivation!.trim();
  }
  const haystack = combinedContext(name, description, aliases);
  const matches = MOTIVATION_SIGNAL_RULES
    .filter((rule) => rule.pattern.test(haystack))
    .map((rule) => rule.label);

  if (matches.includes('Espionage') && matches.includes('Financial / Ransomware')) {
    return 'Financial / Espionage';
  }
  if (matches.length > 0) {
    return matches[0];
  }
  if (sophistication === 'Critical' || sophistication === 'High') {
    return 'Espionage';
  }
  return 'Undetermined';
}

/** Extracts targeted industry sectors from threat actor descriptions. */
export function extractTargetSectors(description: string): string[] {
  if (!description) return [];
  return SECTOR_SIGNAL_RULES
    .filter((rule) => rule.pattern.test(description))
    .map((rule) => rule.label);
}

/** Normalizes an actor name or alias for cross-feed matching. */
export function normalizeActorKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function uniqueStrings(...groups: Array<string[] | undefined>): string[] {
  const seen = new Map<string, string>();
  for (const group of groups) {
    if (!group) continue;
    for (const raw of group) {
      const cleaned = String(raw || '').trim();
      if (!cleaned) continue;
      const key = cleaned.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, cleaned);
      }
    }
  }
  return Array.from(seen.values());
}

function uniqueCampaigns(...groups: Array<ActorCampaign[] | undefined>): ActorCampaign[] {
  const map = new Map<string, ActorCampaign>();
  for (const group of groups) {
    if (!group) continue;
    for (const c of group) {
      if (!c?.name) continue;
      const key = c.name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, c);
      }
    }
  }
  return Array.from(map.values());
}

/** Returns true when an actor record has real threat context rather than being a bare stub name. */
export function hasSubstantiveIntelligence(actor: MalpediaActor): boolean {
  const desc = (actor.description || '').trim();
  const hasRealDesc = desc.length > 0 && desc.toLowerCase() !== 'no description available';
  const aliasCount = (actor.meta?.synonyms?.length ?? 0) + (actor.synonyms?.length ?? 0);
  const ttpCount = (actor.mitreIds?.length ?? 0) + (actor.ttpDetails?.length ?? 0);
  const toolCount = (actor.malwareFamilies?.length ?? 0) + (actor.tools?.length ?? 0);
  const refCount = actor.meta?.refs?.length ?? 0;
  const campaignCount = actor.campaigns?.length ?? 0;
  return hasRealDesc || ttpCount > 0 || toolCount > 0 || campaignCount > 0 || (aliasCount > 0 && refCount > 0);
}

function profileRichnessRank(actor: MalpediaActor): number {
  const ttpScore = (actor.ttpDetails?.length || actor.mitreIds?.length || 0) * 3;
  const campaignScore = (actor.campaigns?.length || 0) * 4;
  const toolScore = (actor.tools?.length || actor.malwareFamilies?.length || 0) * 2;
  const descScore = actor.description && actor.description.length > 40 ? 15 : 0;
  return ttpScore + campaignScore + toolScore + descScore + (actor.threatScore || 0);
}

function fuseTwoProfiles(primary: MalpediaActor, secondary: MalpediaActor): MalpediaActor {
  const aliases = uniqueStrings(
    primary.meta?.synonyms,
    primary.synonyms,
    secondary.meta?.synonyms,
    secondary.synonyms,
    secondary.value !== primary.value ? [secondary.value] : [],
  ).filter((a) => normalizeActorKey(a) !== normalizeActorKey(primary.value));

  const refs = uniqueStrings(primary.meta?.refs, secondary.meta?.refs);
  const malwareFamilies = uniqueStrings(
    primary.malwareFamilies,
    primary.tools,
    secondary.malwareFamilies,
    secondary.tools,
  );
  const mitreIds = uniqueStrings(primary.mitreIds, secondary.mitreIds).sort();
  const targetSectors = uniqueStrings(primary.targetSectors, secondary.targetSectors);
  const campaigns = uniqueCampaigns(primary.campaigns, secondary.campaigns);

  const primaryDesc = (primary.description || '').trim();
  const secondaryDesc = (secondary.description || '').trim();
  const description =
    primaryDesc.length >= secondaryDesc.length ? primaryDesc : secondaryDesc;

  const country = inferActorOrigin(
    primary.value,
    description,
    aliases,
    isKnownField(primary.meta?.country) ? primary.meta?.country : secondary.meta?.country,
  );

  const motivation = inferActorMotivation(
    primary.value,
    description,
    aliases,
    primary.sophistication,
    primary.motivation || secondary.motivation,
  );

  const ttpDetails = (primary.ttpDetails?.length || 0) >= (secondary.ttpDetails?.length || 0)
    ? primary.ttpDetails
    : secondary.ttpDetails;

  return {
    ...primary,
    description,
    threatScore: Math.max(primary.threatScore || 0, secondary.threatScore || 0),
    meta: {
      country,
      refs,
      synonyms: aliases,
    },
    synonyms: aliases,
    mitreIds,
    ttpDetails,
    malwareFamilies,
    tools: malwareFamilies,
    targetSectors,
    motivation,
    campaigns,
    mitreAttackId: primary.mitreAttackId || primary.mitre_id || secondary.mitreAttackId || secondary.mitre_id,
    mitre_url: primary.mitre_url || secondary.mitre_url,
    firstSeen: primary.firstSeen || secondary.firstSeen,
    lastSeen: primary.lastSeen || secondary.lastSeen,
  };
}

/**
 * Merges MITRE ATT&CK STIX profiles with Malpedia MISP profiles using name & alias normalization,
 * filtering out bare zero-metadata stub rows and ranking rich actor dossiers first.
 */
export function mergeActorProfiles(
  mitreActors: MalpediaActor[],
  malpediaActors: MalpediaActor[],
): MalpediaActor[] {
  const fused: MalpediaActor[] = mitreActors.map((actor) => ({ ...actor }));
  const keyToIndex = new Map<string, number>();

  const registerKeys = (actor: MalpediaActor, idx: number) => {
    const names = [actor.value, ...(actor.meta?.synonyms || []), ...(actor.synonyms || [])];
    for (const candidate of names) {
      const k = normalizeActorKey(candidate);
      if (k && !keyToIndex.has(k)) {
        keyToIndex.set(k, idx);
      }
    }
    const gId = (actor.mitreAttackId || actor.mitre_id || '').trim().toLowerCase();
    if (gId && !keyToIndex.has(gId)) {
      keyToIndex.set(gId, idx);
    }
  };

  fused.forEach((actor, idx) => registerKeys(actor, idx));

  for (const extra of malpediaActors) {
    const candidateKeys = [
      extra.value,
      ...(extra.meta?.synonyms || []),
      ...(extra.synonyms || []),
      extra.mitreAttackId || extra.mitre_id || '',
    ]
      .map(normalizeActorKey)
      .filter(Boolean);

    const matchedIdx = candidateKeys
      .map((k) => keyToIndex.get(k))
      .find((idx): idx is number => idx !== undefined);

    if (matchedIdx !== undefined) {
      fused[matchedIdx] = fuseTwoProfiles(fused[matchedIdx], extra);
      registerKeys(fused[matchedIdx], matchedIdx);
    } else if (hasSubstantiveIntelligence(extra)) {
      const idx = fused.push(fuseTwoProfiles(extra, extra)) - 1;
      registerKeys(fused[idx], idx);
    }
  }

  return fused.sort((a, b) => {
    const rankDiff = profileRichnessRank(b) - profileRichnessRank(a);
    if (rankDiff !== 0) return rankDiff;
    return a.value.localeCompare(b.value);
  });
}

/** Validates an external reference URL before opening in a new tab. */
export function sanitizeExternalUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw.trim());
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    // Reject malformed or non-HTTP(S) schemes such as javascript: or data:
  }
  return null;
}
