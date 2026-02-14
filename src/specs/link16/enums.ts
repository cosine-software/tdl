/**
 * Link 16 Spec Database — Enumerations
 *
 * Standard enumeration values used in Link 16 configurations.
 */

export interface EnumDefinition {
  id: string;
  name: string;
  description: string;
  specRef?: string;
}

// ─── Platform Roles ──────────────────────────────────────────────────

export const LINK16_ROLES: EnumDefinition[] = [
  {
    id: 'NetControlStation',
    name: 'Net Control Station (NCS)',
    description:
      'The primary controller of a Link 16 network. Responsible for network timing, ' +
      'crypto synchronisation, and overall network management. Each network must have exactly one NCS.',
    specRef: 'MIL-STD-6016 §3.2.1',
  },
  {
    id: 'Participant',
    name: 'Participant',
    description:
      'A standard network participant that can send and receive messages on assigned NPGs. ' +
      'The most common terminal role.',
    specRef: 'MIL-STD-6016 §3.2.2',
  },
  {
    id: 'ForwardTell',
    name: 'Forward Tell',
    description:
      'A participant that can relay (forward tell) messages between networks or network segments. ' +
      'Used for extending network reach.',
    specRef: 'MIL-STD-6016 §3.2.3',
  },
  {
    id: 'Relay',
    name: 'Relay',
    description:
      'A terminal operating in relay mode, forwarding messages between units that cannot directly ' +
      'communicate due to range or terrain limitations.',
    specRef: 'MIL-STD-6016 §3.2.4',
  },
];

// ─── Platform Types ──────────────────────────────────────────────────

export const LINK16_PLATFORM_TYPES: EnumDefinition[] = [
  // Air platforms
  { id: 'E3A', name: 'E-3A Sentry (AWACS)', description: 'Airborne Warning and Control System' },
  { id: 'E3B', name: 'E-3B Sentry (AWACS)', description: 'Upgraded AWACS variant' },
  { id: 'E3D', name: 'E-3D Sentry (UK)', description: 'RAF AWACS variant' },
  { id: 'E2C', name: 'E-2C Hawkeye', description: 'Carrier-based AEW aircraft' },
  { id: 'E2D', name: 'E-2D Advanced Hawkeye', description: 'Advanced carrier-based AEW' },
  { id: 'E7A', name: 'E-7A Wedgetail', description: 'AEW&C aircraft (Boeing 737 based)' },
  { id: 'F16C', name: 'F-16C Fighting Falcon', description: 'Multirole fighter (Block 50/52)' },
  { id: 'F16D', name: 'F-16D Fighting Falcon', description: 'Two-seat multirole fighter' },
  { id: 'F15C', name: 'F-15C Eagle', description: 'Air superiority fighter' },
  { id: 'F15E', name: 'F-15E Strike Eagle', description: 'Dual-role fighter' },
  { id: 'F18C', name: 'F/A-18C Hornet', description: 'Carrier-based multirole fighter' },
  { id: 'F18E', name: 'F/A-18E Super Hornet', description: 'Carrier-based multirole fighter' },
  { id: 'F18F', name: 'F/A-18F Super Hornet', description: 'Two-seat carrier-based fighter' },
  { id: 'F35A', name: 'F-35A Lightning II', description: 'CTOL stealth fighter (USAF)' },
  { id: 'F35B', name: 'F-35B Lightning II', description: 'STOVL stealth fighter (USMC/RAF)' },
  { id: 'F35C', name: 'F-35C Lightning II', description: 'CV stealth fighter (USN)' },
  { id: 'EF2000', name: 'Eurofighter Typhoon', description: 'Multirole fighter' },
  { id: 'RAFALE', name: 'Dassault Rafale', description: 'Multirole fighter' },
  { id: 'TORNADO', name: 'Panavia Tornado', description: 'Multirole combat aircraft' },
  { id: 'P8A', name: 'P-8A Poseidon', description: 'Maritime patrol aircraft' },
  { id: 'MQ9', name: 'MQ-9 Reaper', description: 'Unmanned aerial vehicle (MALE)' },
  { id: 'RQ4', name: 'RQ-4 Global Hawk', description: 'High-altitude unmanned ISR' },

  // Naval platforms
  { id: 'DDG', name: 'Guided Missile Destroyer', description: 'Aegis-equipped destroyer' },
  { id: 'CG', name: 'Guided Missile Cruiser', description: 'Aegis-equipped cruiser' },
  { id: 'CVN', name: 'Aircraft Carrier (Nuclear)', description: 'Nuclear-powered carrier' },
  { id: 'FFG', name: 'Guided Missile Frigate', description: 'Multi-mission frigate' },
  { id: 'LPD', name: 'Amphibious Transport Dock', description: 'Amphibious warfare ship' },

  // Ground platforms
  { id: 'PATRIOT', name: 'Patriot Battery', description: 'Air defence missile system' },
  { id: 'THAAD', name: 'THAAD Battery', description: 'Terminal High Altitude Area Defense' },
  { id: 'SHORAD', name: 'SHORAD', description: 'Short Range Air Defence system' },
  { id: 'GCS', name: 'Ground Control Station', description: 'Ground-based C2 station' },
  { id: 'AOC', name: 'Air Operations Center', description: 'Combined Air Operations Center' },
];

// ─── Classification Levels ───────────────────────────────────────────

export const CLASSIFICATION_LEVELS: EnumDefinition[] = [
  { id: 'UNCLASSIFIED', name: 'Unclassified', description: 'No classification markings required' },
  { id: 'CONFIDENTIAL', name: 'Confidential', description: 'Confidential classification level' },
  { id: 'SECRET', name: 'Secret', description: 'Secret classification level' },
  { id: 'TOP_SECRET', name: 'Top Secret', description: 'Top Secret classification level' },
];

// ─── Link 22 Specific ────────────────────────────────────────────────

export const LINK22_OPERATING_MODES: EnumDefinition[] = [
  {
    id: 'NetSlotted',
    name: 'Net Slotted',
    description: 'TDMA-based operation with pre-allocated time slots. Provides guaranteed access.',
    specRef: 'STANAG 5522 §5.2',
  },
  {
    id: 'Contention',
    name: 'Contention',
    description: 'CSMA-based operation where terminals contend for access. Higher throughput but less deterministic.',
    specRef: 'STANAG 5522 §5.3',
  },
  {
    id: 'Hybrid',
    name: 'Hybrid',
    description: 'Combination of net-slotted and contention modes for optimal performance.',
    specRef: 'STANAG 5522 §5.4',
  },
];

export const LINK22_DATA_RATES: EnumDefinition[] = [
  {
    id: 'Low',
    name: 'Low Rate',
    description: 'Low data rate for reduced bandwidth environments.',
    specRef: 'STANAG 5522 §6.1',
  },
  {
    id: 'Medium',
    name: 'Medium Rate',
    description: 'Standard data rate for typical operations.',
    specRef: 'STANAG 5522 §6.1',
  },
  {
    id: 'High',
    name: 'High Rate',
    description: 'High data rate for maximum throughput.',
    specRef: 'STANAG 5522 §6.1',
  },
];

export const LINK22_ROLES: EnumDefinition[] = [
  {
    id: 'Controller',
    name: 'Controller',
    description: 'Controls the Link 22 subnetwork. Manages timing and access.',
    specRef: 'STANAG 5522 §4.2',
  },
  {
    id: 'Participant',
    name: 'Participant',
    description: 'Standard member of a Link 22 subnetwork.',
    specRef: 'STANAG 5522 §4.3',
  },
];

// ─── Lookup Helpers ──────────────────────────────────────────────────

export function findRole(id: string): EnumDefinition | undefined {
  return [...LINK16_ROLES, ...LINK22_ROLES].find((r) => r.id === id);
}

export function findPlatformType(id: string): EnumDefinition | undefined {
  return LINK16_PLATFORM_TYPES.find((p) => p.id === id);
}

export function allRoleIds(): string[] {
  return [...LINK16_ROLES, ...LINK22_ROLES].map((r) => r.id);
}

export function allPlatformTypeIds(): string[] {
  return LINK16_PLATFORM_TYPES.map((p) => p.id);
}
