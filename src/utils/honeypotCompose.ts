export interface ComposeServiceNetworkInfo {
  name: string;
  networkMode: string | null;
  hasHostNetwork: boolean;
  hasPorts: boolean;
  hasNetworks: boolean;
  warnings: string[];
}

export interface ComposeNetworkInspection {
  hasServicesSection: boolean;
  serviceCount: number;
  services: ComposeServiceNetworkInfo[];
  servicesWithHostNetwork: string[];
  servicesMissingHostNetwork: string[];
  servicesWithBridgePorts: string[];
  usesHostNetworking: boolean;
  requiresNormalization: boolean;
  warnings: string[];
}

export interface NormalizeComposeResult {
  stackFileContent: string;
  modified: boolean;
  convertedServices: string[];
  removedDirectives: string[];
  warnings: string[];
  inspection: ComposeNetworkInspection;
}

interface ParsedProperty {
  key: string;
  startLine: number;
  endLine: number;
  rawValue: string;
}

interface ParsedServiceBlock {
  name: string;
  headerLine: number;
  endLine: number;
  propIndent: number;
  properties: ParsedProperty[];
}

const getLeadingSpaces = (line: string): number => {
  let count = 0;
  while (count < line.length && (line[count] === ' ' || line[count] === '\t')) {
    count += line[count] === '\t' ? 2 : 1;
  }
  return count;
};

const isBlankOrComment = (line: string): boolean => {
  const trimmed = line.trim();
  return trimmed.length === 0 || trimmed.startsWith('#');
};

const stripYamlInlineComment = (value: string): string => {
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (quote) {
      if (ch === quote && value[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '#' && (i === 0 || /\s/.test(value[i - 1]))) {
      return value.slice(0, i).trim();
    }
  }
  return value.trim();
};

const unquoteScalar = (raw: string): string => {
  const cleaned = stripYamlInlineComment(raw);
  if (
    cleaned.length >= 2 &&
    ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'")))
  ) {
    return cleaned.slice(1, -1).trim();
  }
  return cleaned;
};

const countBracketDelta = (text: string): number => {
  let quote: '"' | "'" | null = null;
  let delta = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === quote && text[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '#') {
      break;
    } else if (ch === '[' || ch === '{') {
      delta++;
    } else if (ch === ']' || ch === '}') {
      delta--;
    }
  }
  return delta;
};

function parseComposeServices(lines: string[]): {
  hasServicesSection: boolean;
  services: ParsedServiceBlock[];
} {
  let servicesHeaderIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (isBlankOrComment(lines[i])) continue;
    if (getLeadingSpaces(lines[i]) === 0 && /^services\s*:(?:\s*(?:#.*)?)?$/.test(lines[i].trim())) {
      servicesHeaderIdx = i;
      break;
    }
  }

  if (servicesHeaderIdx === -1) {
    return { hasServicesSection: false, services: [] };
  }

  let servicesEndIdx = lines.length - 1;
  for (let i = servicesHeaderIdx + 1; i < lines.length; i++) {
    if (isBlankOrComment(lines[i])) continue;
    if (getLeadingSpaces(lines[i]) === 0) {
      servicesEndIdx = i - 1;
      break;
    }
  }

  let serviceIndent: number | null = null;
  for (let i = servicesHeaderIdx + 1; i <= servicesEndIdx; i++) {
    if (isBlankOrComment(lines[i])) continue;
    serviceIndent = getLeadingSpaces(lines[i]);
    break;
  }

  if (serviceIndent === null) {
    return { hasServicesSection: true, services: [] };
  }

  const serviceHeaders: Array<{ name: string; line: number }> = [];
  for (let i = servicesHeaderIdx + 1; i <= servicesEndIdx; i++) {
    if (isBlankOrComment(lines[i]) || getLeadingSpaces(lines[i]) !== serviceIndent) continue;
    const match = /^([A-Za-z0-9._-]+)\s*:(?:\s*(?:#.*)?)?$/.exec(lines[i].trim());
    if (match) serviceHeaders.push({ name: match[1], line: i });
  }

  const services: ParsedServiceBlock[] = [];
  for (let idx = 0; idx < serviceHeaders.length; idx++) {
    const current = serviceHeaders[idx];
    const nextHeaderLine =
      idx + 1 < serviceHeaders.length ? serviceHeaders[idx + 1].line : servicesEndIdx + 1;
    let endLine = nextHeaderLine - 1;
    while (endLine > current.line && isBlankOrComment(lines[endLine])) endLine--;

    let propIndent = serviceIndent + 2;
    for (let i = current.line + 1; i <= endLine; i++) {
      if (isBlankOrComment(lines[i])) continue;
      const ind = getLeadingSpaces(lines[i]);
      if (ind > serviceIndent) {
        propIndent = ind;
        break;
      }
    }

    const properties: ParsedProperty[] = [];
    let i = current.line + 1;
    while (i <= endLine) {
      const line = lines[i];
      if (isBlankOrComment(line) || getLeadingSpaces(line) !== propIndent) {
        i++;
        continue;
      }
      const propMatch = /^([A-Za-z0-9_.-]+)\s*:(.*)$/.exec(line.trim());
      if (!propMatch) {
        i++;
        continue;
      }

      const key = propMatch[1];
      const rawValue = propMatch[2].trim();
      let flowBalance = countBracketDelta(rawValue);
      let blockEnd = i;
      let j = i + 1;

      while (j <= endLine) {
        const nextLine = lines[j];
        if (nextLine.trim().length === 0) {
          j++;
          continue;
        }
        const nextIndent = getLeadingSpaces(nextLine);
        if (flowBalance > 0) {
          flowBalance += countBracketDelta(nextLine);
          blockEnd = j;
          j++;
          continue;
        }
        if (nextLine.trim().startsWith('#')) {
          if (nextIndent > propIndent) {
            blockEnd = j;
            j++;
            continue;
          }
          break;
        }
        const isZeroIndentSequence = nextIndent === propIndent && nextLine.trimStart().startsWith('-');
        if (nextIndent > propIndent || isZeroIndentSequence) {
          flowBalance += countBracketDelta(nextLine);
          blockEnd = j;
          j++;
          continue;
        }
        break;
      }

      properties.push({ key, startLine: i, endLine: blockEnd, rawValue });
      i = blockEnd + 1;
    }

    services.push({
      name: current.name,
      headerLine: current.line,
      endLine,
      propIndent,
      properties,
    });
  }

  return { hasServicesSection: true, services };
}

/** Inspect Docker Compose YAML for host-network usage vs bridge NAT (172.17.0.1 risk). */
export function inspectComposeNetworking(stackFileContent: string): ComposeNetworkInspection {
  const lines = String(stackFileContent || '').replace(/\r\n/g, '\n').split('\n');
  const { hasServicesSection, services } = parseComposeServices(lines);

  const serviceInfos: ComposeServiceNetworkInfo[] = [];
  const servicesWithHostNetwork: string[] = [];
  const servicesMissingHostNetwork: string[] = [];
  const servicesWithBridgePorts: string[] = [];
  const warnings: string[] = [];

  for (const svc of services) {
    const netModeProp = svc.properties.find((p) => p.key === 'network_mode');
    const networkMode = netModeProp ? unquoteScalar(netModeProp.rawValue).toLowerCase() : null;
    const hasHostNetwork = networkMode === 'host';
    const hasPorts = svc.properties.some((p) => p.key === 'ports');
    const hasNetworks = svc.properties.some((p) => p.key === 'networks');
    const svcWarnings: string[] = [];

    if (hasHostNetwork) {
      servicesWithHostNetwork.push(svc.name);
      if (hasPorts) {
        svcWarnings.push(`Service '${svc.name}' defines ports alongside network_mode: host.`);
      }
      if (hasNetworks) {
        svcWarnings.push(`Service '${svc.name}' defines networks alongside network_mode: host.`);
      }
    } else {
      servicesMissingHostNetwork.push(svc.name);
      if (hasPorts) {
        servicesWithBridgePorts.push(svc.name);
        svcWarnings.push(
          `Service '${svc.name}' uses Docker bridge port mapping without network_mode: host; external attacker IPs risk masking behind gateway 172.17.0.1.`
        );
      }
    }

    warnings.push(...svcWarnings);
    serviceInfos.push({
      name: svc.name,
      networkMode,
      hasHostNetwork,
      hasPorts,
      hasNetworks,
      warnings: svcWarnings,
    });
  }

  const requiresNormalization =
    services.length > 0 && serviceInfos.some((s) => !s.hasHostNetwork || s.hasPorts || s.hasNetworks);

  return {
    hasServicesSection,
    serviceCount: services.length,
    services: serviceInfos,
    servicesWithHostNetwork,
    servicesMissingHostNetwork,
    servicesWithBridgePorts,
    usesHostNetworking: services.length > 0 && !requiresNormalization,
    requiresNormalization,
    warnings,
  };
}

/** Upgrade honeypot compose services to `network_mode: host` and strip bridge `ports:`/`networks:`. */
export function ensureHostNetworkingCompose(
  stackFileContent: string,
  options?: { category?: string }
): NormalizeComposeResult {
  const source = String(stackFileContent ?? '');
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const inspectionBefore = inspectComposeNetworking(source);

  if (options?.category && options.category !== 'honeypot') {
    return {
      stackFileContent: source,
      modified: false,
      convertedServices: [],
      removedDirectives: [],
      warnings: [],
      inspection: inspectionBefore,
    };
  }

  const { services } = parseComposeServices(lines);
  if (services.length === 0) {
    return {
      stackFileContent: source,
      modified: false,
      convertedServices: [],
      removedDirectives: [],
      warnings: inspectionBefore.warnings,
      inspection: inspectionBefore,
    };
  }

  const skipLineIndices = new Set<number>();
  const replaceLineMap = new Map<number, string>();
  const insertAfterMap = new Map<number, string[]>();
  const convertedServices: string[] = [];
  const removedDirectives: string[] = [];
  const warnings: string[] = [];

  for (const svc of services) {
    const netModeProp = svc.properties.find((p) => p.key === 'network_mode');
    const netModeValue = netModeProp ? unquoteScalar(netModeProp.rawValue).toLowerCase() : null;
    const portsProps = svc.properties.filter((p) => p.key === 'ports');
    const networksProps = svc.properties.filter((p) => p.key === 'networks');
    if (netModeValue === 'host' && portsProps.length === 0 && networksProps.length === 0) {
      continue;
    }

    convertedServices.push(svc.name);
    const indentStr = ' '.repeat(svc.propIndent);

    if (netModeProp && netModeValue !== 'host') {
      if (netModeValue && netModeValue !== 'bridge' && netModeValue !== 'default') {
        warnings.push(
          `Replaced custom network_mode "${netModeValue}" on service "${svc.name}" with network_mode: host.`
        );
      }
      replaceLineMap.set(netModeProp.startLine, `${indentStr}network_mode: host`);
    } else if (!netModeProp) {
      const containerProp = svc.properties.find((p) => p.key === 'container_name');
      const imageProp = svc.properties.find((p) => p.key === 'image');
      const anchor = containerProp?.endLine ?? imageProp?.endLine ?? svc.headerLine;
      const pending = insertAfterMap.get(anchor) ?? [];
      pending.push(`${indentStr}network_mode: host`);
      insertAfterMap.set(anchor, pending);
    }

    for (const prop of portsProps) {
      removedDirectives.push(`${svc.name}.ports`);
      for (let ln = prop.startLine; ln <= prop.endLine; ln++) skipLineIndices.add(ln);
    }
    for (const prop of networksProps) {
      removedDirectives.push(`${svc.name}.networks`);
      for (let ln = prop.startLine; ln <= prop.endLine; ln++) skipLineIndices.add(ln);
    }
  }

  if (convertedServices.length === 0) {
    return {
      stackFileContent: source,
      modified: false,
      convertedServices: [],
      removedDirectives: [],
      warnings,
      inspection: inspectionBefore,
    };
  }

  const outLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!skipLineIndices.has(i)) {
      outLines.push(replaceLineMap.has(i) ? (replaceLineMap.get(i) as string) : lines[i]);
    }
    const insertions = insertAfterMap.get(i);
    if (insertions) outLines.push(...insertions);
  }

  const nextContent = outLines.join(eol);
  return {
    stackFileContent: nextContent,
    modified: nextContent !== source,
    convertedServices,
    removedDirectives,
    warnings,
    inspection: inspectComposeNetworking(nextContent),
  };
}
