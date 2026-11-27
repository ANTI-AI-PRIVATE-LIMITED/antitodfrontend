import { describe, expect, it } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import { processMitreBundle } from '../../services/mitre';
import { processMalpediaMispJson } from '../../services/malpedia';
import {
  extractTargetSectors,
  hasSubstantiveIntelligence,
  inferActorMotivation,
  inferActorOrigin,
  mergeActorProfiles,
  sanitizeExternalUrl,
} from '../services/actorEnrichment';
import { VISIBLE_NAV_ITEMS, viewStatus, ALL_NAV_ITEMS } from '../data/navigation';
import { DEMO_ACTORS } from '../data/demo/actors';

const ROOT = path.resolve(import.meta.dir, '../..');

function readRel(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('QA-029: Enriched Threat Actor Profiles & Navigation Visibility', () => {
  it('restores Threat Actors visibility in sidebar and Command Palette navigation', () => {
    const actorItem = ALL_NAV_ITEMS.find((item) => item.id === 'actors');
    expect(actorItem).toBeDefined();
    expect(viewStatus(actorItem!)).toBe('live');
    expect(VISIBLE_NAV_ITEMS.some((item) => item.id === 'actors')).toBe(true);
  });

  it('extracts STIX intrusion-set, TTPs, malware/tools, campaigns, timestamps, and attribution from MITRE bundle', () => {
    const mockStixBundle = {
      type: 'bundle',
      objects: [
        {
          type: 'intrusion-set',
          id: 'intrusion-set--apt28',
          name: 'APT28',
          description:
            'APT28 is a threat group attributed to Russia GRU Unit 26165 that conducts espionage against government and defense ministries.',
          aliases: ['Fancy Bear', 'Sofacy'],
          created: '2017-05-31T21:30:00.000Z',
          modified: '2025-11-12T10:00:00.000Z',
          external_references: [
            {
              source_name: 'mitre-attack',
              external_id: 'G0007',
              url: 'https://attack.mitre.org/groups/G0007',
            },
            {
              source_name: 'FireEye',
              url: 'https://example.com/apt28-report',
            },
          ],
        },
        {
          type: 'attack-pattern',
          id: 'attack-pattern--phish',
          name: 'Phishing',
          description: 'Send spearphishing messages to gain access.',
          kill_chain_phases: [{ kill_chain_name: 'mitre-attack', phase_name: 'initial-access' }],
          external_references: [{ source_name: 'mitre-attack', external_id: 'T1566' }],
        },
        {
          type: 'malware',
          id: 'malware--xagent',
          name: 'X-Agent',
        },
        {
          type: 'tool',
          id: 'tool--responder',
          name: 'Responder',
        },
        {
          type: 'campaign',
          id: 'campaign--c0026',
          name: 'C0026 Diplomatic Phishing',
          first_seen: '2023-01-15T00:00:00.000Z',
          last_seen: '2024-06-20T00:00:00.000Z',
          description: 'Credential harvesting campaign.',
        },
        {
          type: 'relationship',
          relationship_type: 'uses',
          source_ref: 'intrusion-set--apt28',
          target_ref: 'attack-pattern--phish',
        },
        {
          type: 'relationship',
          relationship_type: 'uses',
          source_ref: 'intrusion-set--apt28',
          target_ref: 'malware--xagent',
        },
        {
          type: 'relationship',
          relationship_type: 'uses',
          source_ref: 'intrusion-set--apt28',
          target_ref: 'tool--responder',
        },
        {
          type: 'relationship',
          relationship_type: 'attributed-to',
          source_ref: 'campaign--c0026',
          target_ref: 'intrusion-set--apt28',
        },
        {
          type: 'intrusion-set',
          id: 'intrusion-set--revoked',
          name: 'DeprecatedGroup',
          revoked: true,
        },
      ],
    };

    const actors = processMitreBundle(mockStixBundle);
    expect(actors.length).toBe(1);

    const apt28 = actors[0];
    expect(apt28.value).toBe('APT28');
    expect(apt28.mitreAttackId).toBe('G0007');
    expect(apt28.mitre_url).toBe('https://attack.mitre.org/groups/G0007');
    expect(apt28.meta.country).toBe('Russia');
    expect(apt28.motivation).toBe('Espionage');
    expect(apt28.targetSectors).toContain('Government');
    expect(apt28.targetSectors).toContain('Defense');
    expect(apt28.tools).toEqual(['Responder', 'X-Agent']);
    expect(apt28.mitreIds).toEqual(['T1566']);
    expect(apt28.ttpDetails?.[0]).toEqual({
      id: 'T1566',
      name: 'Phishing',
      tactic: 'Initial Access',
      description: 'Send spearphishing messages to gain access.',
    });
    expect(apt28.campaigns?.length).toBe(1);
    expect(apt28.campaigns?.[0].name).toBe('C0026 Diplomatic Phishing');
    expect(apt28.firstSeen).toBe('2017-05-31T21:30:00.000Z');
  });

  it('merges MITRE and Malpedia datasets by alias while dropping bare zero-metadata stub names', () => {
    const mitre = processMitreBundle({
      type: 'bundle',
      objects: [
        {
          type: 'intrusion-set',
          id: 'intrusion-set--lazarus',
          name: 'Lazarus Group',
          description: 'North Korean state-sponsored financial and espionage operations.',
          aliases: ['Hidden Cobra'],
          external_references: [{ source_name: 'mitre-attack', external_id: 'G0032' }],
        },
      ],
    });

    const malpedia = processMalpediaMispJson({
      values: [
        {
          uuid: 'mal-1',
          value: 'Hidden Cobra',
          description: 'North Korean DPRK unit targeting banking and cryptocurrency entities using T1059.',
          meta: {
            synonyms: ['Guardians of Peace'],
            refs: ['https://malpedia.example/lazarus'],
          },
        },
        {
          uuid: 'mal-bare',
          value: 'Empty Name Only Actor',
          description: '',
          meta: { synonyms: [], refs: [] },
        },
      ],
    });

    const merged = mergeActorProfiles(mitre, malpedia);
    expect(merged.length).toBe(1);
    expect(merged[0].value).toBe('Lazarus Group');
    expect(merged[0].meta.country).toBe('North Korea');
    expect(merged[0].meta.synonyms).toContain('Hidden Cobra');
    expect(merged[0].meta.synonyms).toContain('Guardians of Peace');
    expect(merged[0].meta.refs).toContain('https://malpedia.example/lazarus');
    expect(merged[0].mitreIds).toContain('T1059');
    expect(hasSubstantiveIntelligence({
      value: 'Empty',
      description: '',
      uuid: 'empty',
      sophistication: 'Low',
      meta: { refs: [], synonyms: [] },
    })).toBe(false);
  });

  it('validates origin/motivation/sector helpers, URL sanitization, and DEMO_ACTORS completeness', () => {
    expect(inferActorOrigin('MuddyWater', 'Iranian MOIS espionage targeting telecoms')).toBe('Iran');
    expect(inferActorOrigin('SomeGroup', 'Generic threat note')).toBe('Unattributed');
    expect(inferActorMotivation('FIN7', 'Financially motivated ransomware gang')).toBe('Financial / Ransomware');
    expect(extractTargetSectors('Targeted energy grids, hospitals, and banks.')).toEqual([
      'Financial',
      'Energy',
      'Healthcare',
    ]);
    expect(sanitizeExternalUrl('https://attack.mitre.org/groups/G0007/')).toBe('https://attack.mitre.org/groups/G0007/');
    expect(sanitizeExternalUrl('javascript:alert(1)')).toBeNull();

    for (const demo of DEMO_ACTORS) {
      expect(demo.meta?.country && demo.meta.country !== 'Unknown').toBe(true);
      expect((demo.ttpDetails?.length ?? 0) > 0).toBe(true);
      expect((demo.tools?.length ?? 0) > 0).toBe(true);
    }
  });

  it('removes static hardcoded tooling arrays and no-op dossier stubs from ActorsPage and wires fused loader', () => {
    const actorsPage = readRel('src/pages/ActorsPage.tsx');
    const dataProvider = readRel('src/services/dataProvider.ts');

    expect(actorsPage).not.toContain('Cobalt Strike');
    expect(actorsPage).not.toContain('Powershell Empire');
    expect(actorsPage).toContain('selectedActor.tools');
    expect(actorsPage).toContain('selectedActor.ttpDetails');
    expect(actorsPage).toContain('selectedActor.campaigns');
    expect(actorsPage).toContain('Export Dossier');
    expect(actorsPage).toContain('window.open(');

    expect(dataProvider).toContain('fetchMitreFromSource()');
    expect(dataProvider).toContain('mergeActorProfiles');
  });
});
