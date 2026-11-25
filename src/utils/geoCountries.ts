/**
 * Global ISO-3166 alpha-2 country geographic centroids [longitude, latitude]
 * and calibrated 2D SVG map projection helpers shared across 2D & 3D threat maps.
 */
export const COUNTRY_COORDS: Record<string, [number, number]> = {
  AD: [1.5, 42.5], AE: [53.8, 23.4], AF: [67.7, 33.9], AG: [-61.8, 17.1], AI: [-63.1, 18.2],
  AL: [20.2, 41.2], AM: [45.0, 40.1], AO: [17.9, -11.2], AQ: [0.0, -75.0], AR: [-63.6, -38.4],
  AS: [-170.1, -14.3], AT: [14.6, 47.5], AU: [133.8, -25.3], AW: [-70.0, 12.5], AX: [19.9, 60.2],
  AZ: [47.6, 40.1], BA: [17.7, 43.9], BB: [-59.5, 13.2], BD: [90.4, 23.7], BE: [4.5, 50.5],
  BF: [-1.6, 12.2], BG: [25.5, 42.7], BH: [50.6, 26.0], BI: [29.9, -3.4], BJ: [2.3, 9.3],
  BL: [-62.8, 17.9], BM: [-64.8, 32.3], BN: [114.7, 4.5], BO: [-63.6, -16.3], BQ: [-68.2, 12.2],
  BR: [-51.9, -14.2], BS: [-77.4, 25.0], BT: [90.4, 27.5], BV: [3.4, -54.4], BW: [24.7, -22.3],
  BY: [27.9, 53.7], BZ: [-88.5, 17.2], CA: [-106.3, 56.1], CC: [96.8, -12.2], CD: [21.8, -4.0],
  CF: [20.9, 6.6], CG: [15.8, -0.2], CH: [8.2, 46.8], CI: [-5.5, 7.5], CK: [-159.8, -21.2],
  CL: [-71.5, -35.7], CM: [12.4, 7.4], CN: [104.1, 35.8], CO: [-74.3, 4.6], CR: [-83.8, 9.7],
  CU: [-77.8, 21.5], CV: [-24.0, 16.0], CW: [-69.0, 12.2], CX: [105.7, -10.5], CY: [33.4, 35.1],
  CZ: [15.5, 49.8], DE: [10.4, 51.1], DJ: [42.6, 11.8], DK: [9.5, 56.3], DM: [-61.4, 15.4],
  DO: [-70.2, 18.7], DZ: [1.7, 28.0], EC: [-78.2, -1.8], EE: [25.0, 58.6], EG: [30.8, 26.8],
  EH: [-12.9, 24.2], ER: [39.8, 15.2], ES: [-3.7, 40.4], ET: [40.5, 9.1], FI: [25.7, 61.9],
  FJ: [179.4, -16.6], FK: [-59.5, -51.8], FM: [150.6, 7.4], FO: [-6.9, 61.9], FR: [2.2, 46.2],
  GA: [11.6, -0.8], GB: [-3.4, 55.3], GD: [-61.7, 12.3], GE: [43.4, 42.3], GF: [-53.1, 3.9],
  GG: [-2.6, 49.5], GH: [-1.0, 7.9], GI: [-5.3, 36.1], GL: [-42.6, 71.7], GM: [-15.3, 13.4],
  GN: [-9.7, 9.9], GP: [-62.1, 16.9], GQ: [10.3, 1.7], GR: [21.8, 39.1], GS: [-36.6, -54.4],
  GT: [-90.2, 15.8], GU: [144.8, 13.4], GW: [-15.2, 11.8], GY: [-58.9, 4.9], HK: [114.1, 22.4],
  HM: [73.5, -53.1], HN: [-86.2, 15.2], HR: [15.2, 45.1], HT: [-72.3, 19.0], HU: [19.5, 47.2],
  ID: [113.9, -0.8], IE: [-8.2, 53.4], IL: [34.9, 31.0], IM: [-4.5, 54.2], IN: [78.9, 20.5],
  IO: [71.9, -6.3], IQ: [43.7, 33.2], IR: [53.6, 32.4], IS: [-19.0, 65.0], IT: [12.5, 41.9],
  JE: [-2.1, 49.2], JM: [-77.3, 18.1], JO: [36.2, 30.6], JP: [138.2, 36.2], KE: [37.9, -0.0],
  KG: [74.8, 41.2], KH: [105.0, 12.6], KI: [-157.4, 1.9], KM: [43.9, -11.9], KN: [-62.8, 17.4],
  KP: [127.5, 40.3], KR: [127.7, 35.9], KW: [47.5, 29.3], KY: [-80.6, 19.5], KZ: [66.9, 48.0],
  LA: [102.5, 19.9], LB: [35.9, 33.9], LC: [-61.0, 13.9], LI: [9.6, 47.2], LK: [80.8, 7.9],
  LR: [-9.4, 6.4], LS: [28.2, -29.6], LT: [23.9, 55.2], LU: [6.1, 49.8], LV: [24.6, 56.9],
  LY: [17.2, 26.3], MA: [-7.1, 31.8], MC: [7.4, 43.7], MD: [28.4, 47.4], ME: [19.4, 42.7],
  MF: [-63.1, 18.1], MG: [46.9, -18.8], MH: [171.2, 7.1], MK: [21.7, 41.6], ML: [-4.0, 17.6],
  MM: [96.0, 21.9], MN: [103.8, 46.9], MO: [113.5, 22.2], MP: [145.4, 17.3], MQ: [-61.0, 14.6],
  MR: [-10.9, 21.0], MS: [-62.2, 16.7], MT: [14.4, 35.9], MU: [57.6, -20.3], MV: [73.2, 3.2],
  MW: [34.3, -13.3], MX: [-102.5, 23.6], MY: [102.0, 4.2], MZ: [35.5, -18.7], NA: [18.5, -23.0],
  NC: [165.6, -20.9], NE: [8.1, 17.6], NF: [168.0, -29.0], NG: [8.7, 9.1], NI: [-85.2, 12.9],
  NL: [5.2, 52.1], NO: [8.5, 60.5], NP: [84.1, 28.4], NR: [166.9, -0.5], NU: [-169.9, -19.1],
  NZ: [174.9, -40.9], OM: [56.0, 21.5], PA: [-80.8, 8.5], PE: [-75.0, -9.2], PF: [-149.4, -17.7],
  PG: [143.9, -6.3], PH: [121.8, 12.9], PK: [69.3, 30.4], PL: [19.1, 51.9], PM: [-56.3, 46.9],
  PN: [-127.4, -24.7], PR: [-66.6, 18.2], PS: [35.2, 31.9], PT: [-8.2, 39.4], PW: [134.6, 7.5],
  PY: [-58.4, -23.4], QA: [51.2, 25.4], RE: [55.5, -21.1], RO: [24.9, 45.9], RS: [21.0, 44.0],
  RU: [105.3, 61.5], RW: [29.9, -1.9], SA: [45.0, 23.8], SB: [160.2, -9.6], SC: [55.5, -4.7],
  SD: [30.2, 12.9], SE: [18.6, 60.1], SG: [103.8, 1.4], SH: [-10.0, -24.1], SI: [15.0, 46.2],
  SJ: [23.7, 77.6], SK: [19.7, 48.7], SL: [-11.8, 8.5], SM: [12.5, 43.9], SN: [-14.5, 14.5],
  SO: [46.2, 5.2], SR: [-56.0, 3.9], SS: [31.3, 6.9], ST: [6.6, 0.2], SV: [-88.9, 13.8],
  SX: [-63.1, 18.0], SY: [39.0, 34.8], SZ: [31.5, -26.5], TC: [-71.8, 21.7], TD: [18.7, 15.5],
  TF: [69.3, -49.3], TG: [0.8, 8.6], TH: [101.0, 15.9], TJ: [71.3, 38.9], TK: [-171.9, -8.9],
  TL: [125.7, -8.9], TM: [59.6, 39.0], TN: [9.5, 33.9], TO: [-175.2, -21.2], TR: [35.2, 38.9],
  TT: [-61.2, 10.7], TV: [177.6, -7.1], TW: [121.0, 23.7], TZ: [34.9, -6.4], UA: [31.1, 48.3],
  UG: [32.3, 1.4], UM: [-177.0, 28.2], US: [-95.7, 37.0], UY: [-55.8, -32.5], UZ: [64.6, 41.4],
  VA: [12.5, 41.9], VC: [-61.3, 13.0], VE: [-66.6, 6.4], VG: [-64.6, 18.4], VI: [-64.9, 18.3],
  VN: [108.2, 14.0], VU: [166.9, -15.4], WF: [-177.2, -13.8], WS: [-172.1, -13.8], XK: [20.9, 42.6],
  YE: [48.5, 15.6], YT: [45.2, -12.8], ZA: [22.9, -30.5], ZM: [27.8, -13.1], ZW: [29.2, -19.0],
};

// Calibrated 2D percentage overrides for the /world-map.svg illustration
const SVG_ANCHOR_LAYOUT: Record<string, { left: number; top: number }> = {
  CN: { left: 70, top: 42 },
  RU: { left: 61, top: 26 },
  US: { left: 19, top: 43 },
  DE: { left: 50, top: 39 },
  NL: { left: 49, top: 36 },
  BR: { left: 30, top: 68 },
  IN: { left: 63, top: 54 },
  VN: { left: 74, top: 55 },
  KR: { left: 79, top: 44 },
  IR: { left: 58, top: 51 },
  KP: { left: 78, top: 41 },
  UA: { left: 54, top: 36 },
  FR: { left: 47, top: 43 },
  JP: { left: 84, top: 43 },
};

const COUNTRY_ALIASES: Record<string, string> = {
  UK: 'GB',
};

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function normalizeCountryCode(countryCode?: string): string {
  const raw = String(countryCode || '').trim().toUpperCase();
  if (!raw) return '';
  return COUNTRY_ALIASES[raw] ?? raw;
}

/**
 * Returns lowercased ISO-3166 alpha-2 code suitable for flagcdn.com only when the string
 * maps to a recognized country; returns null for non-ISO values ('Global', 'Multi', etc.).
 */
export function resolveValidFlagIsoCode(rawCountry?: string): string | null {
  const code = normalizeCountryCode(rawCountry);
  if (!/^[A-Z]{2}$/.test(code) || !COUNTRY_COORDS[code]) {
    return null;
  }
  return code.toLowerCase();
}

/** Projects geographic [longitude, latitude] onto clamped (left%, top%) overlay positions for world-map.svg. */
export function projectLonLatToPercent(lon: number, lat: number): { left: number; top: number } {
  return {
    left: Math.round(clamp(0.2541 * lon + 44.77, 4, 96) * 10) / 10,
    top: Math.round(clamp(-0.5165 * lat + 62.7, 6, 92) * 10) / 10,
  };
}

export interface ResolvedCountryPlotPosition {
  coords: [number, number];
  layout: { left: number; top: number };
}

/**
 * Resolves coordinates & 2D SVG map position for any ISO country globally.
 * Uses direct telemetry lat/lon when valid non-zero numbers exist, otherwise looks up
 * COUNTRY_COORDS so ~240 nations/territories plot instead of being dropped after 14 countries.
 */
export function resolveCountryPlotPosition(
  countryCode?: string,
  lat?: number,
  lon?: number
): ResolvedCountryPlotPosition | null {
  const code = normalizeCountryCode(countryCode);
  const anchor = code ? SVG_ANCHOR_LAYOUT[code] : undefined;
  const centroid = code ? COUNTRY_COORDS[code] : undefined;

  const hasValidGeo =
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    (lat !== 0 || lon !== 0);

  if (hasValidGeo) {
    return {
      coords: [lon as number, lat as number],
      layout: anchor ?? projectLonLatToPercent(lon as number, lat as number),
    };
  }

  if (centroid) {
    return {
      coords: centroid,
      layout: anchor ?? projectLonLatToPercent(centroid[0], centroid[1]),
    };
  }

  return null;
}
