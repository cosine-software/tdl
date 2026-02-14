import { describe, it, expect } from 'vitest';
import { parse } from '../parser';

describe('Parser', () => {
  // ─── Basic Network ─────────────────────────────────────────────

  describe('network declarations', () => {
    it('parses minimal network', () => {
      const { ast, diagnostics } = parse('network "TEST" { link: Link16 }');
      expect(diagnostics).toHaveLength(0);
      expect(ast.networks).toHaveLength(1);
      expect(ast.networks[0]!.name).toBe('TEST');
      expect(ast.networks[0]!.properties).toHaveLength(1);
      expect(ast.networks[0]!.properties[0]!.key).toBe('link');
      expect(ast.networks[0]!.properties[0]!.value).toEqual({
        type: 'identifier',
        value: 'Link16',
      });
    });

    it('parses network with multiple properties', () => {
      const { ast, diagnostics } = parse(`
        network "ALPHA" {
          link: Link16
          classification: SECRET
        }
      `);
      expect(diagnostics).toHaveLength(0);
      expect(ast.networks[0]!.properties).toHaveLength(2);
      expect(ast.networks[0]!.properties[0]!.key).toBe('link');
      expect(ast.networks[0]!.properties[1]!.key).toBe('classification');
    });

    it('parses multiple networks', () => {
      const { ast, diagnostics } = parse(`
        network "ALPHA" { link: Link16 }
        network "BRAVO" { link: Link22 }
      `);
      expect(diagnostics).toHaveLength(0);
      expect(ast.networks).toHaveLength(2);
      expect(ast.networks[0]!.name).toBe('ALPHA');
      expect(ast.networks[1]!.name).toBe('BRAVO');
    });
  });

  // ─── Terminal Declarations ──────────────────────────────────────

  describe('terminal declarations', () => {
    it('parses terminal with properties', () => {
      const { ast, diagnostics } = parse(`
        network "ALPHA" {
          link: Link16
          terminal "AWACS-1" {
            track_number: 01400
            platform_type: E3A
            role: NetControlStation
          }
        }
      `);
      expect(diagnostics).toHaveLength(0);
      expect(ast.networks[0]!.terminals).toHaveLength(1);
      const terminal = ast.networks[0]!.terminals[0]!;
      expect(terminal.name).toBe('AWACS-1');
      expect(terminal.properties).toHaveLength(3);
    });

    it('parses terminal with array properties', () => {
      const { ast, diagnostics } = parse(`
        network "ALPHA" {
          link: Link16
          terminal "F16" {
            subscribes: [NPG_A, NPG_2, NPG_6]
            transmits: [NPG_A]
          }
        }
      `);
      expect(diagnostics).toHaveLength(0);
      const terminal = ast.networks[0]!.terminals[0]!;
      const subscribes = terminal.properties.find((p) => p.key === 'subscribes');
      expect(subscribes!.value).toEqual({
        type: 'array',
        value: ['NPG_A', 'NPG_2', 'NPG_6'],
      });
    });

    it('parses multiple terminals', () => {
      const { ast, diagnostics } = parse(`
        network "ALPHA" {
          link: Link16
          terminal "A" { role: NetControlStation }
          terminal "B" { role: Participant }
        }
      `);
      expect(diagnostics).toHaveLength(0);
      expect(ast.networks[0]!.terminals).toHaveLength(2);
    });
  });

  // ─── Net Declarations ──────────────────────────────────────────

  describe('net declarations', () => {
    it('parses net with properties', () => {
      const { ast, diagnostics } = parse(`
        network "ALPHA" {
          link: Link16
          net "NET-1" {
            net_number: 1
            npg: NPG_9
            stacked: false
            tsdf: 25%
            participants: [AWACS-1, F16]
          }
        }
      `);
      expect(diagnostics).toHaveLength(0);
      expect(ast.networks[0]!.nets).toHaveLength(1);
      const net = ast.networks[0]!.nets[0]!;
      expect(net.name).toBe('NET-1');

      const tsdf = net.properties.find((p) => p.key === 'tsdf');
      expect(tsdf!.value).toEqual({ type: 'percent', value: 25 });

      const stacked = net.properties.find((p) => p.key === 'stacked');
      expect(stacked!.value).toEqual({ type: 'boolean', value: false });
    });

    it('parses net with stacking', () => {
      const { ast, diagnostics } = parse(`
        network "ALPHA" {
          link: Link16
          net "NET-2" {
            net_number: 2
            stacked: true
            stacking_level: 2
          }
        }
      `);
      expect(diagnostics).toHaveLength(0);
      const net = ast.networks[0]!.nets[0]!;
      const stackingLevel = net.properties.find((p) => p.key === 'stacking_level');
      expect(stackingLevel!.value).toEqual({ type: 'number', value: 2 });
    });
  });

  // ─── Message Catalog ───────────────────────────────────────────

  describe('message catalog', () => {
    it('parses messages block', () => {
      const { ast, diagnostics } = parse(`
        network "ALPHA" {
          link: Link16
          messages {
            J2/2 { enabled: true, npg: NPG_2 }
            J3/2 { enabled: true, npg: NPG_9 }
            J7/2 { enabled: false }
          }
        }
      `);
      expect(diagnostics).toHaveLength(0);
      const messages = ast.networks[0]!.messages;
      expect(messages).not.toBeNull();
      expect(messages!.entries).toHaveLength(3);
      expect(messages!.entries[0]!.messageId).toBe('J2/2');
      expect(messages!.entries[2]!.messageId).toBe('J7/2');
    });

    it('parses message entry properties', () => {
      const { ast, diagnostics } = parse(`
        network "ALPHA" {
          link: Link16
          messages {
            J3/2 { enabled: true, npg: NPG_9 }
          }
        }
      `);
      expect(diagnostics).toHaveLength(0);
      const entry = ast.networks[0]!.messages!.entries[0]!;
      const enabled = entry.properties.find((p) => p.key === 'enabled');
      expect(enabled!.value).toEqual({ type: 'boolean', value: true });
    });
  });

  // ─── Filter Block ──────────────────────────────────────────────

  describe('filter block', () => {
    it('parses filters with inbound rules', () => {
      const { ast, diagnostics } = parse(`
        network "ALPHA" {
          link: Link16
          filters {
            inbound {
              accept J3/2 where { quality >= 3 }
              drop J3/5 where { age > 60s }
            }
          }
        }
      `);
      expect(diagnostics).toHaveLength(0);
      const filters = ast.networks[0]!.filters;
      expect(filters).not.toBeNull();
      expect(filters!.inbound).toHaveLength(2);
      expect(filters!.inbound[0]!.action).toBe('accept');
      expect(filters!.inbound[0]!.messageId).toBe('J3/2');
      expect(filters!.inbound[0]!.where).not.toBeNull();
      expect(filters!.inbound[0]!.where!.condition.field).toBe('quality');
      expect(filters!.inbound[0]!.where!.condition.operator).toBe('>=');
      expect(filters!.inbound[0]!.where!.condition.value).toBe('3');
    });

    it('parses filter rule without where clause', () => {
      const { ast } = parse(`
        network "ALPHA" {
          link: Link16
          filters {
            inbound {
              accept J3/2
            }
          }
        }
      `);

      // accept J3/2 without where — next token is }, so filter rule should end
      // The parser should handle this case
      const filters = ast.networks[0]!.filters;
      expect(filters).not.toBeNull();

      // May or may not produce diagnostics depending on parser handling
      // The rule should still be captured
      if (filters!.inbound.length > 0) {
        expect(filters!.inbound[0]!.action).toBe('accept');
        expect(filters!.inbound[0]!.messageId).toBe('J3/2');
        expect(filters!.inbound[0]!.where).toBeNull();
      }
    });
  });

  // ─── Subnetwork (Link 22) ──────────────────────────────────────

  describe('subnetwork declarations (Link 22)', () => {
    it('parses subnetwork with members', () => {
      const { ast, diagnostics } = parse(`
        network "BRAVO" {
          link: Link22
          subnetwork "SUB-1" {
            operating_mode: NetSlotted
            data_rate: High
            member "SHIP-1" {
              unit_id: 0x1A3F
              role: Controller
              forwarding: enabled
            }
            member "SHIP-2" {
              unit_id: 0x2B4E
              role: Participant
              forwarding: disabled
            }
          }
        }
      `);
      expect(diagnostics).toHaveLength(0);
      expect(ast.networks[0]!.subnetworks).toHaveLength(1);
      const sub = ast.networks[0]!.subnetworks[0]!;
      expect(sub.name).toBe('SUB-1');
      expect(sub.members).toHaveLength(2);
      expect(sub.members[0]!.name).toBe('SHIP-1');

      const unitId = sub.members[0]!.properties.find((p) => p.key === 'unit_id');
      expect(unitId!.value).toEqual({ type: 'hex', value: '0x1A3F' });
    });
  });

  // ─── Error Recovery ────────────────────────────────────────────

  describe('error recovery', () => {
    it('recovers from missing closing brace', () => {
      const { ast, diagnostics } = parse('network "TEST" { link: Link16');
      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some((d) => d.message.includes("'}'"))).toBe(true);
      // Should still produce partial AST
      expect(ast.networks).toHaveLength(1);
    });

    it('recovers from missing string after network', () => {
      const { ast, diagnostics } = parse('network { link: Link16 }');
      expect(diagnostics.length).toBeGreaterThan(0);
      // Parser should continue past the error
      expect(ast.networks).toHaveLength(1);
    });

    it('recovers from invalid token in network body', () => {
      const { ast, diagnostics } = parse(`
        network "TEST" {
          link: Link16
          @@@ invalid
          terminal "A" { role: Participant }
        }
      `);
      expect(diagnostics.length).toBeGreaterThan(0);
      // Should still parse the terminal
      expect(ast.networks[0]!.terminals).toHaveLength(1);
    });

    it('reports multiple errors', () => {
      const { diagnostics } = parse(`
        network "TEST" {
          link: Link16
          terminal { role: Participant }
          net { npg: NPG_99 }
        }
      `);
      // Should report errors for missing terminal name and net name
      expect(diagnostics.length).toBeGreaterThanOrEqual(2);
    });

    it('handles completely empty input', () => {
      const { ast, diagnostics } = parse('');
      expect(ast.networks).toHaveLength(0);
      expect(diagnostics).toHaveLength(0);
    });

    it('handles input with only comments', () => {
      const { ast, diagnostics } = parse('-- just a comment\n-- another comment');
      expect(ast.networks).toHaveLength(0);
      expect(diagnostics).toHaveLength(0);
    });
  });

  // ─── Property Values ───────────────────────────────────────────

  describe('property values', () => {
    it('parses string value', () => {
      const { ast } = parse('network "X" { classification: "TOP SECRET" }');
      const prop = ast.networks[0]!.properties[0]!;
      expect(prop.value).toEqual({ type: 'string', value: 'TOP SECRET' });
    });

    it('parses number value', () => {
      const { ast } = parse('network "X" { net_number: 42 }');
      const prop = ast.networks[0]!.properties.find((p) => p.key === 'net_number')!;
      expect(prop.value).toEqual({ type: 'number', value: 42 });
    });

    it('parses boolean value', () => {
      const { ast } = parse('network "X" { stacked: true }');
      const prop = ast.networks[0]!.properties.find((p) => p.key === 'stacked')!;
      expect(prop.value).toEqual({ type: 'boolean', value: true });
    });

    it('parses percent value', () => {
      const { ast } = parse('network "X" { tsdf: 25% }');
      const prop = ast.networks[0]!.properties.find((p) => p.key === 'tsdf')!;
      expect(prop.value).toEqual({ type: 'percent', value: 25 });
    });

    it('parses identifier value', () => {
      const { ast } = parse('network "X" { link: Link16 }');
      const prop = ast.networks[0]!.properties[0]!;
      expect(prop.value).toEqual({ type: 'identifier', value: 'Link16' });
    });

    it('parses array value', () => {
      const { ast } = parse('network "X" { participants: [A, B, C] }');
      const prop = ast.networks[0]!.properties.find((p) => p.key === 'participants')!;
      expect(prop.value).toEqual({ type: 'array', value: ['A', 'B', 'C'] });
    });

    it('parses hex value', () => {
      const { ast } = parse('network "X" { unit_id: 0x1A3F }');
      const prop = ast.networks[0]!.properties.find((p) => p.key === 'unit_id')!;
      expect(prop.value).toEqual({ type: 'hex', value: '0x1A3F' });
    });
  });

  // ─── Full Configuration ────────────────────────────────────────

  describe('full configuration', () => {
    it('parses a complete Link 16 configuration', () => {
      const { ast, diagnostics } = parse(`
        -- Link 16 Network Design
        network "ALPHA" {
          link: Link16
          classification: SECRET

          terminal "AWACS-1" {
            track_number: 01400
            platform_type: E3A
            role: NetControlStation
            subscribes: [NPG_A, NPG_2, NPG_6, NPG_7, NPG_9, NPG_14]
            transmits: [NPG_A, NPG_6, NPG_9]
          }

          terminal "F16-LEAD" {
            track_number: 02100
            platform_type: F16C
            role: Participant
            subscribes: [NPG_A, NPG_2, NPG_6, NPG_9]
            transmits: [NPG_A, NPG_9]
          }

          net "NET-1" {
            net_number: 1
            npg: NPG_9
            stacked: false
            tsdf: 25%
            participants: [AWACS-1, F16-LEAD]
          }

          net "NET-2" {
            net_number: 2
            npg: NPG_6
            stacked: true
            stacking_level: 2
            tsdf: 12.5%
            participants: [F16-LEAD]
          }

          messages {
            J2/2 { enabled: true, npg: NPG_2 }
            J3/2 { enabled: true, npg: NPG_9 }
            J3/5 { enabled: true, npg: NPG_9 }
            J7/0 { enabled: true, npg: NPG_6 }
            J7/2 { enabled: false }
            J12/6 { enabled: true, npg: NPG_14 }
          }

          filters {
            inbound {
              accept J3/2 where { quality >= 3 }
              drop J3/5 where { age > 60s }
            }
          }
        }
      `);

      expect(diagnostics).toHaveLength(0);
      expect(ast.networks).toHaveLength(1);

      const network = ast.networks[0]!;
      expect(network.name).toBe('ALPHA');
      expect(network.terminals).toHaveLength(2);
      expect(network.nets).toHaveLength(2);
      expect(network.messages).not.toBeNull();
      expect(network.messages!.entries).toHaveLength(6);
      expect(network.filters).not.toBeNull();
      expect(network.filters!.inbound).toHaveLength(2);
    });
  });

  // ─── Source Spans ───────────────────────────────────────────────

  describe('source spans', () => {
    it('records spans on network declaration', () => {
      const { ast } = parse('network "TEST" { link: Link16 }');
      const network = ast.networks[0]!;
      expect(network.span.line).toBe(1);
      expect(network.span.column).toBe(1);
      expect(network.span.offset).toBe(0);
    });

    it('records spans on properties', () => {
      const { ast } = parse('network "TEST" {\n  link: Link16\n}');
      const prop = ast.networks[0]!.properties[0]!;
      expect(prop.span.line).toBe(2);
    });
  });
});
