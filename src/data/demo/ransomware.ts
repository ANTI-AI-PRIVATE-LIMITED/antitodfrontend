import type { RansomWatchPost, RansomWatchGroup } from '../../../types';

export const DEMO_RANSOMWARE_POSTS: RansomWatchPost[] = [
  {
    post_title: 'Global Logistics Corp',
    group_name: 'LockBit 3.0',
    discovered: new Date(Date.now() - 3600000).toISOString(),
    description: 'Claims exfiltration of 540 GB freight manifests, customs invoices, and ERP contractor payroll exports following compromised VPN appliance access.',
    website: 'logistics-freight.example',
    country: 'US',
    activity: 'Data Published',
    screenshot: null,
    source: 'Ransomware.live',
  },
  {
    post_title: 'EuroHealth Systems',
    group_name: 'ALPHV / BlackCat',
    discovered: new Date(Date.now() - 7200000).toISOString(),
    description: 'Extortion listing citing HL7 diagnostic archives and clinic scheduling databases; decryption countdown active with partial sample tree.',
    website: 'eurohealth-clinic.example',
    country: 'DE',
    activity: 'Extortion',
    screenshot: null,
    source: 'Ransomware.live',
  },
  {
    post_title: 'Kyoto Precision Robotics',
    group_name: 'Cl0p',
    discovered: new Date(Date.now() - 21600000).toISOString(),
    description: 'Managed file-transfer zero-day intrusion alleging CAD actuator schematics and supplier contract disclosures queued for torrent release.',
    website: 'kyoto-robotics.example',
    country: 'JP',
    activity: 'Leak Auction',
    screenshot: null,
    source: 'RansomWatch',
  },
  {
    post_title: 'Thames Clearing & Treasury',
    group_name: 'Play',
    discovered: new Date(Date.now() - 43200000).toISOString(),
    description: 'Double-extortion notice referencing quarterly treasury reconciliation sheets and board legal correspondence staged via intermittent encryption.',
    website: 'thames-treasury.example',
    country: 'GB',
    activity: 'Negotiation Window',
    screenshot: null,
    source: 'Ransomware.live',
  },
  {
    post_title: 'Pacific Grid Telemetry Ltd',
    group_name: 'Akira',
    discovered: new Date(Date.now() - 64800000).toISOString(),
    description: 'Alleges backup snapshot tampering on OT historian jump hosts; sample proof bundle mirrors non-routable sandbox mirror.',
    website: 'http://akiraleak9demo6q4p.onion/victims/pacific-grid',
    country: 'CA',
    activity: 'Extortion',
    screenshot: null,
    source: 'RansomWatch',
  },
  {
    post_title: 'Meridian Biopharma SG',
    group_name: 'LockBit 3.0',
    discovered: new Date(Date.now() - 86400000).toISOString(),
    description: 'Trial formulation dossiers and CRO vendor billing exports listed as full-archive magnet download after negotiation breakdown.',
    website: 'meridian-biopharma.example',
    country: 'SG',
    activity: 'Data Published',
    screenshot: null,
    source: 'Ransomware.live',
  },
];

export const DEMO_RANSOMWARE_GROUPS: RansomWatchGroup[] = [
  {
    name: 'LockBit 3.0',
    locations: [
      { slug: 'lbit-mirror-primary', available: true, fqdn: 'lbit3portal7demo4k2x.onion', version: 3 },
      { slug: 'lbit-mirror-backup', available: false, fqdn: 'lbit3backup2demo9n7v.onion', version: 3 },
    ],
    profile: ['lbit3portal7demo4k2x.onion'],
    meta: 'Affiliate RaaS operation utilizing automated Active Directory GPO lateral movement, StealBit exfiltration, and multi-mirror extortion portals.',
  },
  {
    name: 'ALPHV / BlackCat',
    locations: [
      { slug: 'alphv-collection-node', available: true, fqdn: 'alphvleak9demo3p8z.onion', version: 3 },
    ],
    profile: ['alphvleak9demo3p8z.onion'],
    meta: 'Rust-based cross-platform encryptor targeting ESXi hypervisors and Windows domains with searchable victim index dumps.',
  },
  {
    name: 'Cl0p',
    locations: [
      { slug: 'cl0p-leaks-portal', available: true, fqdn: 'cl0pfile7demo6m4q.onion', version: 3 },
    ],
    profile: ['cl0pfile7demo6m4q.onion'],
    meta: 'Financially motivated group specializing in edge MFT / file-transfer zero-day mass exploitation and pure data-theft extortion.',
  },
  {
    name: 'Play',
    locations: [
      { slug: 'play-news-feed', available: true, fqdn: 'playnews4demo8r5n.onion', version: 3 },
    ],
    profile: ['playnews4demo8r5n.onion'],
    meta: 'Targets Internet-facing Exchange/Fortinet edge devices using intermittent encryption and custom AdFind/SystemBC tooling.',
  },
  {
    name: 'Akira',
    locations: [
      { slug: 'akira-retro-portal', available: true, fqdn: 'akira2blog5demo9w3v.onion', version: 3 },
    ],
    profile: ['akira2blog5demo9w3v.onion'],
    meta: 'Opportunistic RaaS entering via unpatched SSL-VPN portals without MFA enforcement, deleting VSS backups prior to encryption.',
  },
];
