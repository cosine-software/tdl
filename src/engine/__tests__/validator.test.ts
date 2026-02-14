import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { validate } from '../validator';
import type {} from '../types';

function parseAndValidate(source: string) {
  const { ast, diagnostics: parseErrors } = parse(source);
  const validationErrors = validate(ast);
  return { ast, parseErrors, validationErrors, allErrors: [...parseErrors, ...validationErrors] };
}

describe('Validator', () => {
  // ─── NCS Required ──────────────────────────────────────────────

  describe('ncs-required', () => {
    it('flags network missing NCS', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: Participant }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'ncs-required')).toBe(true);
    });

    it('passes with exactly one NCS', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation }
          terminal "B" { role: Participant }
        }
      `);
      expect(validationErrors.filter((d) => d.rule === 'ncs-required')).toHaveLength(0);
    });

    it('flags multiple NCS terminals', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation }
          terminal "B" { role: NetControlStation }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'ncs-required')).toBe(true);
    });
  });

  // ─── TSDF Budget ──────────────────────────────────────────────

  describe('total-tsdf-budget', () => {
    it('flags TSDF exceeding 100%', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation }
          net "A" { net_number: 1, npg: NPG_9, tsdf: 60% }
          net "B" { net_number: 2, npg: NPG_6, tsdf: 50% }
        }
      `);
      const tsdfError = validationErrors.find((d) => d.rule === 'total-tsdf-budget');
      expect(tsdfError).toBeDefined();
      expect(tsdfError!.severity).toBe('error');
      expect(tsdfError!.message).toContain('110%');
    });

    it('warns when TSDF is close to 100%', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation }
          net "A" { net_number: 1, npg: NPG_9, tsdf: 50% }
          net "B" { net_number: 2, npg: NPG_6, tsdf: 45% }
        }
      `);
      const tsdfWarning = validationErrors.find(
        (d) => d.rule === 'total-tsdf-budget' && d.severity === 'warning',
      );
      expect(tsdfWarning).toBeDefined();
    });

    it('passes with reasonable TSDF', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation }
          net "A" { net_number: 1, npg: NPG_9, tsdf: 25% }
          net "B" { net_number: 2, npg: NPG_6, tsdf: 25% }
        }
      `);
      expect(validationErrors.filter((d) => d.rule === 'total-tsdf-budget')).toHaveLength(0);
    });
  });

  // ─── Track Number Uniqueness ───────────────────────────────────

  describe('track-number-uniqueness', () => {
    it('flags duplicate track numbers', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { track_number: 01400, role: NetControlStation }
          terminal "B" { track_number: 01400, role: Participant }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'track-number-uniqueness')).toBe(true);
    });

    it('passes with unique track numbers', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { track_number: 01400, role: NetControlStation }
          terminal "B" { track_number: 02100, role: Participant }
        }
      `);
      expect(validationErrors.filter((d) => d.rule === 'track-number-uniqueness')).toHaveLength(0);
    });
  });

  // ─── Net Number Uniqueness ─────────────────────────────────────

  describe('net-number-uniqueness', () => {
    it('flags duplicate net numbers', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation }
          net "A" { net_number: 1 }
          net "B" { net_number: 1 }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'net-number-uniqueness')).toBe(true);
    });
  });

  // ─── Stacking Consistency ──────────────────────────────────────

  describe('stacking-consistency', () => {
    it('flags stacked net without stacking_level', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation }
          net "A" { net_number: 1, stacked: true }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'stacking-consistency')).toBe(true);
    });

    it('flags invalid stacking level', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation }
          net "A" { net_number: 1, stacked: true, stacking_level: 3 }
        }
      `);
      const error = validationErrors.find((d) => d.rule === 'stacking-consistency');
      expect(error).toBeDefined();
      expect(error!.message).toContain('3');
    });

    it('passes with valid stacking', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation }
          net "A" { net_number: 1, stacked: true, stacking_level: 2 }
        }
      `);
      expect(validationErrors.filter((d) => d.rule === 'stacking-consistency')).toHaveLength(0);
    });

    it('warns about stacking_level without stacked: true', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation }
          net "A" { net_number: 1, stacked: false, stacking_level: 2 }
        }
      `);
      expect(
        validationErrors.some(
          (d) => d.rule === 'stacking-consistency' && d.severity === 'warning',
        ),
      ).toBe(true);
    });
  });

  // ─── Message-NPG Match ────────────────────────────────────────

  describe('message-npg-match', () => {
    it('flags message assigned to wrong NPG', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation }
          messages {
            J3/2 { enabled: true, npg: NPG_6 }
          }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'message-npg-match')).toBe(true);
    });

    it('passes with correct message-NPG assignment', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation }
          messages {
            J3/2 { enabled: true, npg: NPG_9 }
          }
        }
      `);
      expect(validationErrors.filter((d) => d.rule === 'message-npg-match')).toHaveLength(0);
    });
  });

  // ─── NPG References ──────────────────────────────────────────

  describe('valid-npg-reference', () => {
    it('flags unknown NPG in subscribes', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" {
            role: NetControlStation
            subscribes: [NPG_A, NPG_99]
          }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'valid-npg-reference')).toBe(true);
    });
  });

  // ─── J-Message References ─────────────────────────────────────

  describe('valid-j-message-reference', () => {
    it('flags unknown J-message', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation }
          messages {
            J99/9 { enabled: true }
          }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'valid-j-message-reference')).toBe(true);
    });
  });

  // ─── Participant References ────────────────────────────────────

  describe('participant-reference', () => {
    it('flags unknown terminal in participants', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation }
          net "NET-1" {
            net_number: 1
            participants: [A, GHOST]
          }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'participant-reference')).toBe(true);
    });

    it('passes with valid participant references', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "AWACS" { role: NetControlStation }
          terminal "F16" { role: Participant }
          net "NET-1" {
            net_number: 1
            participants: [AWACS, F16]
          }
        }
      `);
      expect(validationErrors.filter((d) => d.rule === 'participant-reference')).toHaveLength(0);
    });
  });

  // ─── NPG Subscriber Coverage ──────────────────────────────────

  describe('npg-subscriber-coverage', () => {
    it('warns when transmitting to NPG with no subscribers', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" {
            role: NetControlStation
            subscribes: [NPG_A]
            transmits: [NPG_A, NPG_9]
          }
          terminal "B" {
            role: Participant
            subscribes: [NPG_A]
            transmits: [NPG_A]
          }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'npg-subscriber-coverage')).toBe(true);
    });
  });

  // ─── Link 22 Rules ────────────────────────────────────────────

  describe('link22-forwarding', () => {
    it('flags subnetwork with no forwarding-enabled member', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link22
          subnetwork "SUB-1" {
            member "A" { role: Controller, forwarding: disabled }
            member "B" { role: Participant, forwarding: disabled }
          }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'link22-forwarding')).toBe(true);
    });

    it('passes with at least one forwarding member', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link22
          subnetwork "SUB-1" {
            member "A" { role: Controller, forwarding: enabled }
            member "B" { role: Participant, forwarding: disabled }
          }
        }
      `);
      expect(validationErrors.filter((d) => d.rule === 'link22-forwarding')).toHaveLength(0);
    });
  });

  describe('link22-controller-required', () => {
    it('flags subnetwork without controller', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link22
          subnetwork "SUB-1" {
            member "A" { role: Participant, forwarding: enabled }
          }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'link22-controller-required')).toBe(true);
    });
  });

  // ─── Valid Link Type ───────────────────────────────────────────

  describe('valid-link-type', () => {
    it('flags unknown link type', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" { link: Link99 }
      `);
      expect(validationErrors.some((d) => d.rule === 'valid-link-type')).toBe(true);
    });
  });

  // ─── Classification ──────────────────────────────────────────

  describe('valid-classification', () => {
    it('flags invalid classification', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          classification: MEGA_SECRET
          terminal "A" { role: NetControlStation }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'valid-classification')).toBe(true);
    });

    it('passes with valid classification', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          classification: SECRET
          terminal "A" { role: NetControlStation }
        }
      `);
      expect(validationErrors.filter((d) => d.rule === 'valid-classification')).toHaveLength(0);
    });
  });

  // ─── Role Validation ──────────────────────────────────────────

  describe('valid-role', () => {
    it('flags invalid Link 16 role', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: Admiral }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'valid-role')).toBe(true);
    });

    it('passes with valid Link 16 role', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation }
        }
      `);
      expect(validationErrors.filter((d) => d.rule === 'valid-role')).toHaveLength(0);
    });

    it('flags invalid Link 22 role', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link22
          subnetwork "S" {
            member "A" { role: Admiral, unit_id: 0xABCD, forwarding: enabled }
          }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'valid-role')).toBe(true);
    });

    it('passes with valid Link 22 role', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link22
          subnetwork "S" {
            member "A" { role: Controller, unit_id: 0xABCD, forwarding: enabled }
          }
        }
      `);
      expect(validationErrors.filter((d) => d.rule === 'valid-role')).toHaveLength(0);
    });
  });

  // ─── Platform Type Validation ─────────────────────────────────

  describe('valid-platform-type', () => {
    it('warns on unknown platform type', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation, platform_type: DEATHSTAR }
        }
      `);
      const warning = validationErrors.find((d) => d.rule === 'valid-platform-type');
      expect(warning).toBeDefined();
      expect(warning!.severity).toBe('warning');
    });

    it('passes with valid platform type', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation, platform_type: E3A }
        }
      `);
      expect(validationErrors.filter((d) => d.rule === 'valid-platform-type')).toHaveLength(0);
    });
  });

  // ─── Track Number Range ───────────────────────────────────────

  describe('valid-track-number', () => {
    it('flags track number out of range', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation, track_number: 99999 }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'valid-track-number')).toBe(true);
    });

    it('passes with valid track number', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation, track_number: 01400 }
        }
      `);
      expect(validationErrors.filter((d) => d.rule === 'valid-track-number')).toHaveLength(0);
    });
  });

  // ─── Net Number Range ─────────────────────────────────────────

  describe('valid-net-number', () => {
    it('flags net number out of range', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation }
          net "A" { net_number: 200 }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'valid-net-number')).toBe(true);
    });

    it('passes with valid net number', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation }
          net "A" { net_number: 1 }
        }
      `);
      expect(validationErrors.filter((d) => d.rule === 'valid-net-number')).toHaveLength(0);
    });
  });

  // ─── TSDF Range ───────────────────────────────────────────────

  describe('valid-tsdf', () => {
    it('flags TSDF out of range', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation }
          net "A" { net_number: 1, tsdf: 150% }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'valid-tsdf')).toBe(true);
    });
  });

  // ─── Operating Mode Validation ────────────────────────────────

  describe('valid-operating-mode', () => {
    it('flags invalid operating mode', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link22
          subnetwork "S" {
            operating_mode: Turbo
            member "A" { role: Controller, unit_id: 0xABCD, forwarding: enabled }
          }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'valid-operating-mode')).toBe(true);
    });

    it('passes with valid operating mode', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link22
          subnetwork "S" {
            operating_mode: NetSlotted
            member "A" { role: Controller, unit_id: 0xABCD, forwarding: enabled }
          }
        }
      `);
      expect(validationErrors.filter((d) => d.rule === 'valid-operating-mode')).toHaveLength(0);
    });
  });

  // ─── Data Rate Validation ─────────────────────────────────────

  describe('valid-data-rate', () => {
    it('flags invalid data rate', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link22
          subnetwork "S" {
            data_rate: Ludicrous
            member "A" { role: Controller, unit_id: 0xABCD, forwarding: enabled }
          }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'valid-data-rate')).toBe(true);
    });

    it('passes with valid data rate', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link22
          subnetwork "S" {
            data_rate: High
            member "A" { role: Controller, unit_id: 0xABCD, forwarding: enabled }
          }
        }
      `);
      expect(validationErrors.filter((d) => d.rule === 'valid-data-rate')).toHaveLength(0);
    });
  });

  // ─── Unit ID Validation ───────────────────────────────────────

  describe('valid-unit-id', () => {
    it('flags non-hex unit_id', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link22
          subnetwork "S" {
            member "A" { role: Controller, unit_id: 12345, forwarding: enabled }
          }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'valid-unit-id')).toBe(true);
    });

    it('passes with hex unit_id', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link22
          subnetwork "S" {
            member "A" { role: Controller, unit_id: 0x1A3F, forwarding: enabled }
          }
        }
      `);
      expect(validationErrors.filter((d) => d.rule === 'valid-unit-id')).toHaveLength(0);
    });
  });

  // ─── Forwarding Validation ────────────────────────────────────

  describe('valid-forwarding', () => {
    it('flags invalid forwarding value', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link22
          subnetwork "S" {
            member "A" { role: Controller, unit_id: 0xABCD, forwarding: maybe }
          }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'valid-forwarding')).toBe(true);
    });
  });

  // ─── Required Properties ──────────────────────────────────────

  describe('required-property', () => {
    it('warns when terminal has no role', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { track_number: 01400 }
        }
      `);
      expect(
        validationErrors.some((d) => d.rule === 'required-property' && d.message.includes('role')),
      ).toBe(true);
    });

    it('warns when member has no unit_id', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link22
          subnetwork "S" {
            member "A" { role: Controller, forwarding: enabled }
          }
        }
      `);
      expect(
        validationErrors.some((d) => d.rule === 'required-property' && d.message.includes('unit_id')),
      ).toBe(true);
    });

    it('warns when net has no net_number', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link16
          terminal "A" { role: NetControlStation }
          net "A" { npg: NPG_9 }
        }
      `);
      expect(
        validationErrors.some((d) => d.rule === 'required-property' && d.message.includes('net_number')),
      ).toBe(true);
    });
  });

  // ─── Unit ID Uniqueness ────────────────────────────────────────

  describe('unit-id-uniqueness', () => {
    it('warns on duplicate unit_id across different members', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link22
          subnetwork "S" {
            member "A" { role: Controller, unit_id: 0xABCD, forwarding: enabled }
            member "B" { role: Participant, unit_id: 0xABCD, forwarding: disabled }
          }
        }
      `);
      expect(validationErrors.some((d) => d.rule === 'unit-id-uniqueness')).toBe(true);
    });

    it('allows same member name with same unit_id in different subnetworks', () => {
      const { validationErrors } = parseAndValidate(`
        network "X" {
          link: Link22
          subnetwork "S1" {
            member "A" { role: Controller, unit_id: 0xABCD, forwarding: enabled }
          }
          subnetwork "S2" {
            member "A" { role: Controller, unit_id: 0xABCD, forwarding: enabled }
          }
        }
      `);
      expect(validationErrors.filter((d) => d.rule === 'unit-id-uniqueness')).toHaveLength(0);
    });
  });

  // ─── Full Valid Config ─────────────────────────────────────────

  describe('full valid configuration', () => {
    it('produces no validation errors for a well-formed config', () => {
      const { allErrors } = parseAndValidate(`
        network "ALPHA" {
          link: Link16
          classification: SECRET

          terminal "AWACS-1" {
            track_number: 01400
            platform_type: E3A
            role: NetControlStation
            subscribes: [NPG_A, NPG_2, NPG_6, NPG_9]
            transmits: [NPG_A, NPG_9]
          }

          terminal "F16-LEAD" {
            track_number: 02100
            platform_type: F16C
            role: Participant
            subscribes: [NPG_A, NPG_6, NPG_9]
            transmits: [NPG_A, NPG_9]
          }

          net "NET-1" {
            net_number: 1
            npg: NPG_9
            stacked: false
            tsdf: 25%
            participants: [AWACS-1, F16-LEAD]
          }

          messages {
            J3/2 { enabled: true, npg: NPG_9 }
            J7/0 { enabled: true, npg: NPG_6 }
          }
        }
      `);
      expect(allErrors).toHaveLength(0);
    });
  });
});
