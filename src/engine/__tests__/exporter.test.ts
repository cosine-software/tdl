import { describe, it, expect } from 'vitest';
import { exportToJson, exportToXml } from '../exporter';
import { parse } from '../parser';
import type { DocumentNode } from '../types';

function getAst(source: string): DocumentNode {
  return parse(source).ast;
}

// ─── JSON Export ──────────────────────────────────────────────────────────

describe('exportToJson', () => {
  it('exports a Link 16 network with terminals', () => {
    const ast = getAst(`
      network "ALPHA" {
        link: Link16
        classification: SECRET

        terminal "AWACS-1" {
          track_number: 01400
          role: NetControlStation
          subscribes: [NPG_A, NPG_9]
        }
      }
    `);
    const json = JSON.parse(exportToJson(ast));

    expect(json.format).toBe('tdl-config');
    expect(json.version).toBe('1.0');
    expect(json.networks).toHaveLength(1);

    const net = json.networks[0];
    expect(net.name).toBe('ALPHA');
    expect(net.properties.link).toBe('Link16');
    expect(net.properties.classification).toBe('SECRET');
    expect(net.terminals).toHaveLength(1);
    expect(net.terminals[0].name).toBe('AWACS-1');
    expect(net.terminals[0].track_number).toBe(1400);
    expect(net.terminals[0].role).toBe('NetControlStation');
    expect(net.terminals[0].subscribes).toEqual(['NPG_A', 'NPG_9']);
  });

  it('exports nets', () => {
    const ast = getAst(`
      network "BRAVO" {
        link: Link16
        net "SURV" {
          net_number: 1
          npg: NPG_9
          tsdf: 25%
          participants: [T1, T2]
        }
      }
    `);
    const json = JSON.parse(exportToJson(ast));
    const net = json.networks[0].nets[0];
    expect(net.name).toBe('SURV');
    expect(net.net_number).toBe(1);
    expect(net.npg).toBe('NPG_9');
    expect(net.tsdf).toBe(25);
    expect(net.participants).toEqual(['T1', 'T2']);
  });

  it('exports Link 22 subnetworks with members', () => {
    const ast = getAst(`
      network "L22" {
        link: Link22
        subnetwork "SUB-A" {
          operating_mode: NetSlotted
          member "UNIT-1" {
            unit_id: 0x1A3F
            role: Controller
          }
        }
      }
    `);
    const json = JSON.parse(exportToJson(ast));
    const sub = json.networks[0].subnetworks[0];
    expect(sub.name).toBe('SUB-A');
    expect(sub.operating_mode).toBe('NetSlotted');
    expect(sub.members).toHaveLength(1);
    expect(sub.members[0].name).toBe('UNIT-1');
    expect(sub.members[0].unit_id).toBe('0x1A3F');
    expect(sub.members[0].role).toBe('Controller');
  });

  it('exports messages', () => {
    const ast = getAst(`
      network "C" {
        link: Link16
        messages {
          J3/2 { enabled: true, npg: NPG_9 }
        }
      }
    `);
    const json = JSON.parse(exportToJson(ast));
    const msg = json.networks[0].messages[0];
    expect(msg.messageId).toBe('J3/2');
    expect(msg.enabled).toBe(true);
    expect(msg.npg).toBe('NPG_9');
  });

  it('exports filters with conditions', () => {
    const ast = getAst(`
      network "D" {
        link: Link16
        filters {
          inbound {
            accept J3/2
            drop J7/0 where { quality >= 5 }
          }
        }
      }
    `);
    const json = JSON.parse(exportToJson(ast));
    const filters = json.networks[0].filters;
    expect(filters.inbound).toHaveLength(2);
    expect(filters.inbound[0].action).toBe('accept');
    expect(filters.inbound[0].messageId).toBe('J3/2');
    expect(filters.inbound[1].condition.field).toBe('quality');
    expect(filters.inbound[1].condition.operator).toBe('>=');
  });

  it('exports multiple networks', () => {
    const ast = getAst(`
      network "NET1" { link: Link16 }
      network "NET2" { link: Link22 }
    `);
    const json = JSON.parse(exportToJson(ast));
    expect(json.networks).toHaveLength(2);
    expect(json.networks[0].name).toBe('NET1');
    expect(json.networks[1].name).toBe('NET2');
  });
});

// ─── XML Export ───────────────────────────────────────────────────────────

describe('exportToXml', () => {
  it('exports valid XML with network and terminals', () => {
    const ast = getAst(`
      network "ALPHA" {
        link: Link16
        terminal "T1" {
          track_number: 01400
          subscribes: [NPG_A, NPG_9]
        }
      }
    `);
    const xml = exportToXml(ast);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<tdl-config version="1.0">');
    expect(xml).toContain('<network name="ALPHA">');
    expect(xml).toContain('<link>Link16</link>');
    expect(xml).toContain('<terminal name="T1">');
    expect(xml).toContain('<track_number>1400</track_number>');
    expect(xml).toContain('<subscribes>');
    expect(xml).toContain('<item>NPG_A</item>');
    expect(xml).toContain('<item>NPG_9</item>');
    expect(xml).toContain('</tdl-config>');
  });

  it('exports subnetworks and members', () => {
    const ast = getAst(`
      network "L22" {
        link: Link22
        subnetwork "SUB" {
          operating_mode: Contention
          member "M1" {
            unit_id: 0xABCD
            role: Participant
          }
        }
      }
    `);
    const xml = exportToXml(ast);
    expect(xml).toContain('<subnetwork name="SUB">');
    expect(xml).toContain('<operating_mode>Contention</operating_mode>');
    expect(xml).toContain('<member name="M1">');
    expect(xml).toContain('<unit_id>0xABCD</unit_id>');
  });

  it('exports messages', () => {
    const ast = getAst(`
      network "N" {
        link: Link16
        messages {
          J3/2 { enabled: true, npg: NPG_9 }
        }
      }
    `);
    const xml = exportToXml(ast);
    expect(xml).toContain('<message id="J3/2">');
    expect(xml).toContain('<enabled>true</enabled>');
    expect(xml).toContain('<npg>NPG_9</npg>');
  });

  it('exports filters', () => {
    const ast = getAst(`
      network "N" {
        link: Link16
        filters {
          outbound {
            drop J7/0 where { quality >= 5 }
          }
        }
      }
    `);
    const xml = exportToXml(ast);
    expect(xml).toContain('<outbound>');
    expect(xml).toContain('<rule action="drop" message="J7/0">');
    expect(xml).toContain('condition field="quality" operator="&gt;=" value="5"');
  });

  it('escapes special XML characters', () => {
    const ast = getAst(`
      network "A&B <test>" {
        link: Link16
      }
    `);
    const xml = exportToXml(ast);
    expect(xml).toContain('A&amp;B &lt;test&gt;');
  });
});
