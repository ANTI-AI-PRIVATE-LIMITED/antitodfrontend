/**
 * Network address validation utilities for infrastructure registration forms.
 */

const IPV4_SEGMENT = /^(?:0|[1-9]\d{0,2})$/;
const HEX_GROUP = /^[0-9a-fA-F]{1,4}$/;

/**
 * Validates strict dotted-quad IPv4 format (`0-255` per octet, no leading zeros).
 */
export function isValidIPv4(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const parts = trimmed.split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => IPV4_SEGMENT.test(part) && Number(part) <= 255);
}

/**
 * Validates standard, `::`-compressed, loopback (`::1`), and IPv4-mapped IPv6 addresses.
 */
export function isValidIPv6(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes('%') || trimmed.includes('[') || trimmed.includes(']')) {
    return false;
  }

  const doubleColonParts = trimmed.split('::');
  if (doubleColonParts.length > 2) return false;

  const hasCompression = doubleColonParts.length === 2;
  const parseSide = (side: string, allowTrailingIpv4: boolean): number | null => {
    if (!side) return 0;
    const groups = side.split(':');
    let count = 0;

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const isLast = i === groups.length - 1;
      if (!group) return null;

      if (group.includes('.')) {
        if (!allowTrailingIpv4 || !isLast || !isValidIPv4(group)) return null;
        count += 2;
      } else if (HEX_GROUP.test(group)) {
        count += 1;
      } else {
        return null;
      }
    }
    return count;
  };

  if (!hasCompression) {
    const count = parseSide(trimmed, true);
    return count === 8;
  }

  const leftCount = parseSide(doubleColonParts[0], false);
  const rightCount = parseSide(doubleColonParts[1], true);
  if (leftCount === null || rightCount === null) return false;

  // Compression ('::') must replace at least one 16-bit group (total < 8 before expansion).
  return leftCount + rightCount < 8;
}

/**
 * Returns true if the input is a valid IPv4 or IPv6 literal address.
 */
export function isValidIpAddress(value: string): boolean {
  return isValidIPv4(value) || isValidIPv6(value);
}

/**
 * Validates shipper AllowedIp values, matching backend ShipperAuth.middleware.ts
 * (IPv4, IPv6 including ::1, or exact lowercase 'localhost').
 */
export function isValidAllowedIp(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed === 'localhost') return true;
  return isValidIpAddress(trimmed);
}
