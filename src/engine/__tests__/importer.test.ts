import { describe, it, expect } from 'vitest';
import { importFromJson, importFromCsv, importAuto, detectFormat } from '../importer';
import { exportToJson } from '../exporter';
import { parse } from '../parser';

// ─── Format Detection ─────────────────────────────────────────────────────

describe('detectFormat', () => {
  it('detects JSON objects', () => {
    expect(detectFormat('{"name": "test"}')).toBe('json');
  });

  it('detects JSON arrays', () => {
    expect(detectFormat('[{"name": "test"}]')).toBe('json');
  });

  it('detects XML', () => {
    expect(detectFormat('<?xml version="1.0"?><root/>')).toBe('xml');
  });

  it('detects XML by tag', () => {
    expect(detectFormat('<tdl-config version="1.0"></tdl-config>')).toBe('xml');
  });

  it('detects TDL DSL', () => {
    expect(detectFormat('network "ALPHA" {\n  link: Link16\n}')).toBe('tdl');
  });

  it('detects TDL comments', () => {
    expect(detectFormat('-- A comment\nnetwork "X" {}')).toBe('tdl');
  });

  it('defaults to CSV for tabular data', () => {
    expect(detectFormat('name,track_number,role\nT1,01400,Participant')).toBe('csv');
  });
});

// ─── JSON Import ──────────────────────────────────────────────────────────

describe('importFromJson', () => {
  it('imports our own export format', () => {
    const json = JSON.stringify({
      format: 'tdl-config',
      version: '1.0',
      networks: [
        {
          name: 'ALPHA',
          properties: { link: 'Link16', classification: 'SECRET' },
          terminals: [
            { name: 'T1', track_number: '01400', role: 'NetControlStation', subscribes: ['NPG_A'] },
          ],
          nets: [],
          subnetworks: [],
          messages: [],
          filters: null,
        },
      ],
    });
    const result = importFromJson(json);
    expect(result.warnings).toHaveLength(0);
    expect(result.source).toContain('network "ALPHA"');
    expect(result.source).toContain('Link16');
    expect(result.source).toContain('terminal "T1"');
    expect(result.source).toContain('track_number: 01400');
    expect(result.source).toContain('[NPG_A]');

    // Verify it parses cleanly
    const { diagnostics } = parse(result.source);
    const errors = diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('imports a single network object', () => {
    const json = JSON.stringify({
      name: 'BRAVO',
      link: 'Link16',
      terminals: [{ name: 'T1', role: 'Participant' }],
    });
    const result = importFromJson(json);
    expect(result.source).toContain('network "BRAVO"');
    expect(result.source).toContain('terminal "T1"');
  });

  it('imports an array of networks', () => {
    const json = JSON.stringify([
      { name: 'NET1', link: 'Link16' },
      { name: 'NET2', link: 'Link22' },
    ]);
    const result = importFromJson(json);
    expect(result.source).toContain('network "NET1"');
    expect(result.source).toContain('network "NET2"');
  });

  it('imports subnetworks with members', () => {
    const json = JSON.stringify({
      name: 'L22-NET',
      link: 'Link22',
      subnetworks: [
        {
          name: 'SUB-A',
          operating_mode: 'NetSlotted',
          members: [
            { name: 'UNIT-1', unit_id: '0x1A3F', role: 'Controller' },
          ],
        },
      ],
    });
    const result = importFromJson(json);
    expect(result.source).toContain('subnetwork "SUB-A"');
    expect(result.source).toContain('member "UNIT-1"');
    expect(result.source).toContain('0x1A3F');
  });

  it('imports messages', () => {
    const json = JSON.stringify({
      name: 'MSG-NET',
      link: 'Link16',
      messages: [{ messageId: 'J3/2', enabled: true, npg: 'NPG_9' }],
    });
    const result = importFromJson(json);
    expect(result.source).toContain('messages {');
    expect(result.source).toContain('J3/2');
  });

  it('imports filters', () => {
    const json = JSON.stringify({
      name: 'FILTER-NET',
      link: 'Link16',
      filters: {
        inbound: [
          { action: 'accept', messageId: 'J3/2' },
          { action: 'drop', messageId: 'J7/0', condition: { field: 'quality', operator: '>=', value: '5' } },
        ],
      },
    });
    const result = importFromJson(json);
    expect(result.source).toContain('filters {');
    expect(result.source).toContain('accept J3/2');
    expect(result.source).toContain('drop J7/0 where { quality >= 5 }');
  });

  it('returns warnings for invalid JSON', () => {
    const result = importFromJson('not json');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.source).toBe('');
  });

  it('returns warnings for unrecognised structure', () => {
    const result = importFromJson('"just a string"');
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

// ─── CSV Import ───────────────────────────────────────────────────────────

describe('importFromCsv', () => {
  it('imports a basic terminal list', () => {
    const csv = `name,track_number,platform_type,role
AWACS-1,01400,E3A,NetControlStation
F16-LEAD,02100,F16C,Participant`;

    const result = importFromCsv(csv);
    expect(result.warnings).toHaveLength(0);
    expect(result.source).toContain('network "IMPORTED"');
    expect(result.source).toContain('terminal "AWACS-1"');
    expect(result.source).toContain('track_number: 01400');
    expect(result.source).toContain('platform_type: E3A');
    expect(result.source).toContain('terminal "F16-LEAD"');

    // Should parse cleanly
    const { diagnostics } = parse(result.source);
    const errors = diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('groups terminals by network column', () => {
    const csv = `network,name,track_number,role
ALPHA,T1,01400,NetControlStation
ALPHA,T2,02100,Participant
BRAVO,T3,03200,Participant`;

    const result = importFromCsv(csv);
    expect(result.source).toContain('network "ALPHA"');
    expect(result.source).toContain('network "BRAVO"');
    expect(result.source).toContain('terminal "T1"');
    expect(result.source).toContain('terminal "T3"');
  });

  it('handles array columns (subscribes, transmits)', () => {
    const csv = `name,role,subscribes,transmits
T1,Participant,"NPG_A, NPG_9","NPG_A, NPG_9"`;

    const result = importFromCsv(csv);
    expect(result.source).toContain('[NPG_A, NPG_9]');
  });

  it('handles bracket-wrapped arrays', () => {
    const csv = `name,subscribes
T1,"[NPG_A, NPG_9]"`;

    const result = importFromCsv(csv);
    expect(result.source).toContain('[NPG_A, NPG_9]');
  });

  it('skips blank rows', () => {
    const csv = `name,role
T1,Participant

T2,Participant`;

    const result = importFromCsv(csv);
    expect(result.source).toContain('terminal "T1"');
    expect(result.source).toContain('terminal "T2"');
  });

  it('warns on missing name', () => {
    const csv = `name,role
,Participant`;

    const result = importFromCsv(csv);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('skipped');
  });

  it('rejects CSV without header', () => {
    const result = importFromCsv('');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('rejects CSV without name column', () => {
    const csv = `role,track_number
Participant,01400`;

    const result = importFromCsv(csv);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('name');
  });
});

// ─── Auto Import ──────────────────────────────────────────────────────────

describe('importAuto', () => {
  it('auto-detects and imports JSON', () => {
    const json = JSON.stringify({ name: 'AUTO', link: 'Link16' });
    const result = importAuto(json);
    expect(result.source).toContain('network "AUTO"');
  });

  it('auto-detects and imports CSV', () => {
    const csv = 'name,role\nT1,Participant';
    const result = importAuto(csv);
    expect(result.source).toContain('terminal "T1"');
  });

  it('passes through TDL source unchanged', () => {
    const tdl = 'network "X" {\n  link: Link16\n}';
    const result = importAuto(tdl);
    expect(result.source).toBe(tdl);
    expect(result.warnings).toContain('Content is already in TDL format.');
  });
});

// ─── Round-trip ───────────────────────────────────────────────────────────

describe('round-trip (export then import)', () => {
  it('JSON round-trip preserves structure', () => {
    const original = `network "ROUNDTRIP" {
  link: Link16
  classification: SECRET

  terminal "T1" {
    track_number: 01400
    role: NetControlStation
    subscribes: [NPG_A, NPG_9]
  }

  net "SURV" {
    net_number: 1
    npg: NPG_9
    tsdf: 25%
    participants: [T1]
  }

  messages {
    J3/2 { enabled: true, npg: NPG_9 }
  }
}
`;
    // Parse original → export to JSON → import from JSON → parse again
    const ast1 = parse(original).ast;
    const jsonStr = exportToJson(ast1);
    const imported = importFromJson(jsonStr);

    expect(imported.warnings).toHaveLength(0);
    expect(imported.source).toContain('network "ROUNDTRIP"');
    expect(imported.source).toContain('terminal "T1"');
    expect(imported.source).toContain('net "SURV"');
    expect(imported.source).toContain('J3/2');

    // The re-imported source should parse without errors
    const { diagnostics } = parse(imported.source);
    const errors = diagnostics.filter((d) => d.severity === 'error');
    expect(errors).toHaveLength(0);
  });
});
