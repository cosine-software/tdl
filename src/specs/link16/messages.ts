/**
 * Link 16 Spec Database — J-Series Message Definitions
 *
 * J-messages are the standard message formats used on Link 16.
 * Each message is identified by a functional area (J-number)
 * and sub-type.
 *
 * Reference: MIL-STD-6016 Appendix A
 */

export interface JMessageField {
  name: string;
  description: string;
}

export interface JMessageDefinition {
  id: string;
  name: string;
  functionalArea: string;
  description: string;
  fields: JMessageField[];
  validNPGs: string[];
  specRef: string;
}

export const LINK16_MESSAGES: JMessageDefinition[] = [
  // ─── J0: Network Management ───────────────────────────────────
  {
    id: 'J0/0',
    name: 'Initial Entry',
    functionalArea: 'Network Management',
    description: 'Transmitted by a unit entering the network. Contains initial identification and position data.',
    fields: [
      { name: 'track_number', description: 'Track number of entering unit' },
      { name: 'position', description: 'Initial position (lat/lon)' },
      { name: 'entry_type', description: 'Type of network entry' },
    ],
    validNPGs: ['NPG_A', 'NPG_B'],
    specRef: 'MIL-STD-6016 §A.0.0',
  },
  {
    id: 'J0/3',
    name: 'Net Test',
    functionalArea: 'Network Management',
    description: 'Used for network testing and connectivity verification.',
    fields: [
      { name: 'test_data', description: 'Test pattern data' },
    ],
    validNPGs: ['NPG_A', 'NPG_B'],
    specRef: 'MIL-STD-6016 §A.0.3',
  },

  // ─── J1: Network Management ───────────────────────────────────
  {
    id: 'J1/0',
    name: 'Net Control',
    functionalArea: 'Network Management',
    description: 'Network control message from Net Control Station (NCS). Manages network operations.',
    fields: [
      { name: 'control_type', description: 'Type of control action' },
      { name: 'net_id', description: 'Network identifier' },
    ],
    validNPGs: ['NPG_A', 'NPG_B'],
    specRef: 'MIL-STD-6016 §A.1.0',
  },

  // ─── J2: PPLI ──────────────────────────────────────────────────
  {
    id: 'J2/0',
    name: 'Direct PPLI',
    functionalArea: 'Precise Participant Location and Identification',
    description: 'Direct report of own platform position, identification, and status. The primary PPLI message.',
    fields: [
      { name: 'track_number', description: 'Own track number' },
      { name: 'latitude', description: 'Platform latitude' },
      { name: 'longitude', description: 'Platform longitude' },
      { name: 'altitude', description: 'Platform altitude above MSL' },
      { name: 'speed', description: 'Platform speed' },
      { name: 'heading', description: 'Platform heading (true north)' },
      { name: 'force_tell', description: 'Force identification' },
      { name: 'platform_type', description: 'Platform type code' },
    ],
    validNPGs: ['NPG_A', 'NPG_3', 'NPG_8'],
    specRef: 'MIL-STD-6016 §A.2.0',
  },
  {
    id: 'J2/2',
    name: 'Indirect PPLI',
    functionalArea: 'Precise Participant Location and Identification',
    description: 'Relayed PPLI for units that cannot directly communicate. Forwarded by relay-capable platforms.',
    fields: [
      { name: 'track_number', description: 'Relayed unit track number' },
      { name: 'latitude', description: 'Unit latitude' },
      { name: 'longitude', description: 'Unit longitude' },
      { name: 'altitude', description: 'Unit altitude' },
      { name: 'relay_track_number', description: 'Track number of relay platform' },
    ],
    validNPGs: ['NPG_A', 'NPG_2'],
    specRef: 'MIL-STD-6016 §A.2.2',
  },
  {
    id: 'J2/3',
    name: 'PPLI Platform',
    functionalArea: 'Precise Participant Location and Identification',
    description: 'Additional PPLI information including fuel, weapons status, and mission data.',
    fields: [
      { name: 'track_number', description: 'Own track number' },
      { name: 'fuel_state', description: 'Fuel remaining' },
      { name: 'weapons_state', description: 'Weapons loadout status' },
    ],
    validNPGs: ['NPG_A', 'NPG_2', 'NPG_3'],
    specRef: 'MIL-STD-6016 §A.2.3',
  },
  {
    id: 'J2/5',
    name: 'PPLI IFF/SIF',
    functionalArea: 'Precise Participant Location and Identification',
    description: 'PPLI with IFF/SIF (Identification Friend or Foe) data. Carries Mode 1-5 codes.',
    fields: [
      { name: 'track_number', description: 'Own track number' },
      { name: 'mode_1', description: 'IFF Mode 1 code' },
      { name: 'mode_2', description: 'IFF Mode 2 code' },
      { name: 'mode_3a', description: 'IFF Mode 3/A code' },
    ],
    validNPGs: ['NPG_A', 'NPG_2', 'NPG_3', 'NPG_8'],
    specRef: 'MIL-STD-6016 §A.2.5',
  },

  // ─── J3: Surveillance ──────────────────────────────────────────
  {
    id: 'J3/0',
    name: 'Reference Point',
    functionalArea: 'Surveillance',
    description: 'Reports a reference point (fixed geographic location) used for tactical coordination.',
    fields: [
      { name: 'track_number', description: 'Reference point track number' },
      { name: 'latitude', description: 'Point latitude' },
      { name: 'longitude', description: 'Point longitude' },
      { name: 'name', description: 'Reference point name' },
    ],
    validNPGs: ['NPG_3', 'NPG_7', 'NPG_9'],
    specRef: 'MIL-STD-6016 §A.3.0',
  },
  {
    id: 'J3/2',
    name: 'Air Track',
    functionalArea: 'Surveillance',
    description:
      'Reports an air track — aircraft position, identity, and kinematics. ' +
      'Primary message for building the air picture.',
    fields: [
      { name: 'track_number', description: 'Track number' },
      { name: 'latitude', description: 'Track latitude' },
      { name: 'longitude', description: 'Track longitude' },
      { name: 'altitude', description: 'Track altitude' },
      { name: 'speed', description: 'Track speed' },
      { name: 'heading', description: 'Track heading' },
      { name: 'identity', description: 'Track identity (friendly/hostile/unknown)' },
      { name: 'track_quality', description: 'Quality of track data (0-15)' },
    ],
    validNPGs: ['NPG_7', 'NPG_9'],
    specRef: 'MIL-STD-6016 §A.3.2',
  },
  {
    id: 'J3/3',
    name: 'Surface Track',
    functionalArea: 'Surveillance',
    description: 'Reports a surface (maritime) track including position, course, and speed.',
    fields: [
      { name: 'track_number', description: 'Track number' },
      { name: 'latitude', description: 'Track latitude' },
      { name: 'longitude', description: 'Track longitude' },
      { name: 'course', description: 'Track course' },
      { name: 'speed', description: 'Track speed' },
      { name: 'identity', description: 'Track identity' },
    ],
    validNPGs: ['NPG_7', 'NPG_9'],
    specRef: 'MIL-STD-6016 §A.3.3',
  },
  {
    id: 'J3/4',
    name: 'Subsurface Track',
    functionalArea: 'Surveillance',
    description: 'Reports a subsurface (submarine) track.',
    fields: [
      { name: 'track_number', description: 'Track number' },
      { name: 'latitude', description: 'Track latitude' },
      { name: 'longitude', description: 'Track longitude' },
      { name: 'depth', description: 'Track depth' },
      { name: 'identity', description: 'Track identity' },
    ],
    validNPGs: ['NPG_7', 'NPG_9'],
    specRef: 'MIL-STD-6016 §A.3.4',
  },
  {
    id: 'J3/5',
    name: 'Land Track',
    functionalArea: 'Surveillance',
    description: 'Reports a land (ground) track or point including vehicles and installations.',
    fields: [
      { name: 'track_number', description: 'Track number' },
      { name: 'latitude', description: 'Track latitude' },
      { name: 'longitude', description: 'Track longitude' },
      { name: 'speed', description: 'Track speed' },
      { name: 'heading', description: 'Track heading' },
      { name: 'identity', description: 'Track identity' },
    ],
    validNPGs: ['NPG_7', 'NPG_9'],
    specRef: 'MIL-STD-6016 §A.3.5',
  },
  {
    id: 'J3/6',
    name: 'Space Track',
    functionalArea: 'Surveillance',
    description: 'Reports a space track (satellite, orbital object).',
    fields: [
      { name: 'track_number', description: 'Track number' },
      { name: 'latitude', description: 'Sub-satellite point latitude' },
      { name: 'longitude', description: 'Sub-satellite point longitude' },
      { name: 'altitude', description: 'Orbital altitude' },
    ],
    validNPGs: ['NPG_7', 'NPG_9'],
    specRef: 'MIL-STD-6016 §A.3.6',
  },

  // ─── J7: Weapons Coordination ──────────────────────────────────
  {
    id: 'J7/0',
    name: 'Attack Order',
    functionalArea: 'Weapons Coordination',
    description: 'Orders an attack on a specified target. Contains target designation and weapon assignment.',
    fields: [
      { name: 'target_track_number', description: 'Track number of target' },
      { name: 'attacker_track_number', description: 'Track number of attacker' },
      { name: 'weapon_type', description: 'Type of weapon to employ' },
    ],
    validNPGs: ['NPG_6', 'NPG_15'],
    specRef: 'MIL-STD-6016 §A.7.0',
  },
  {
    id: 'J7/1',
    name: 'Attack Response',
    functionalArea: 'Weapons Coordination',
    description: 'Response to an attack order. Indicates willingness/ability to engage.',
    fields: [
      { name: 'target_track_number', description: 'Track number of target' },
      { name: 'response', description: 'Accept/reject/unable' },
    ],
    validNPGs: ['NPG_6', 'NPG_15'],
    specRef: 'MIL-STD-6016 §A.7.1',
  },
  {
    id: 'J7/2',
    name: 'Attack Acknowledgement',
    functionalArea: 'Weapons Coordination',
    description: 'Acknowledges receipt of attack order and confirms engagement.',
    fields: [
      { name: 'target_track_number', description: 'Track number of target' },
      { name: 'status', description: 'Engagement status' },
    ],
    validNPGs: ['NPG_6', 'NPG_15'],
    specRef: 'MIL-STD-6016 §A.7.2',
  },
  {
    id: 'J7/3',
    name: 'Weapons Free',
    functionalArea: 'Weapons Coordination',
    description: 'Command to weapons free on a target or area.',
    fields: [
      { name: 'target_track_number', description: 'Track number of target' },
      { name: 'engagement_zone', description: 'Zone definition' },
    ],
    validNPGs: ['NPG_6', 'NPG_15'],
    specRef: 'MIL-STD-6016 §A.7.3',
  },

  // ─── J9: Mission Orders ────────────────────────────────────────
  {
    id: 'J9/0',
    name: 'Mission Assignment',
    functionalArea: 'Command',
    description: 'Assigns a mission to a platform or formation. Contains mission parameters and constraints.',
    fields: [
      { name: 'mission_type', description: 'Type of mission' },
      { name: 'assigned_unit', description: 'Track number of assigned unit' },
      { name: 'area', description: 'Mission area definition' },
    ],
    validNPGs: ['NPG_4'],
    specRef: 'MIL-STD-6016 §A.9.0',
  },

  // ─── J10: Management ───────────────────────────────────────────
  {
    id: 'J10/2',
    name: 'Status Report',
    functionalArea: 'Management',
    description: 'Platform status report including operational readiness and capability.',
    fields: [
      { name: 'track_number', description: 'Reporting unit track number' },
      { name: 'status', description: 'Operational status code' },
    ],
    validNPGs: ['NPG_4', 'NPG_15'],
    specRef: 'MIL-STD-6016 §A.10.2',
  },

  // ─── J12: Electronic Warfare ───────────────────────────────────
  {
    id: 'J12/0',
    name: 'EW Control/Coordination',
    functionalArea: 'Electronic Warfare',
    description: 'Electronic warfare coordination message. Controls EW operations and coordination.',
    fields: [
      { name: 'emitter_id', description: 'Emitter identifier' },
      { name: 'action', description: 'EW action to take' },
    ],
    validNPGs: ['NPG_5', 'NPG_14'],
    specRef: 'MIL-STD-6016 §A.12.0',
  },
  {
    id: 'J12/2',
    name: 'Target Sorting',
    functionalArea: 'Electronic Warfare',
    description: 'Prioritised list of EW targets for engagement.',
    fields: [
      { name: 'target_list', description: 'Sorted target list' },
    ],
    validNPGs: ['NPG_5', 'NPG_14'],
    specRef: 'MIL-STD-6016 §A.12.2',
  },
  {
    id: 'J12/6',
    name: 'Parametric Information',
    functionalArea: 'Electronic Warfare',
    description:
      'Reports detailed emitter parametric data including frequency, ' +
      'PRF, pulse width, and scan pattern.',
    fields: [
      { name: 'emitter_id', description: 'Emitter identifier' },
      { name: 'frequency', description: 'Emitter frequency' },
      { name: 'prf', description: 'Pulse repetition frequency' },
      { name: 'pulse_width', description: 'Pulse width' },
      { name: 'latitude', description: 'Emitter latitude' },
      { name: 'longitude', description: 'Emitter longitude' },
    ],
    validNPGs: ['NPG_5', 'NPG_14'],
    specRef: 'MIL-STD-6016 §A.12.6',
  },

  // ─── J13: Information Management ───────────────────────────────
  {
    id: 'J13/2',
    name: 'General Point',
    functionalArea: 'Information Management',
    description: 'Reports a general information point for situational awareness.',
    fields: [
      { name: 'point_id', description: 'Point identifier' },
      { name: 'latitude', description: 'Point latitude' },
      { name: 'longitude', description: 'Point longitude' },
      { name: 'category', description: 'Point category' },
    ],
    validNPGs: ['NPG_4', 'NPG_9', 'NPG_27'],
    specRef: 'MIL-STD-6016 §A.13.2',
  },
  {
    id: 'J13/5',
    name: 'General Area',
    functionalArea: 'Information Management',
    description: 'Reports a general area (polygon or circle) for operational use.',
    fields: [
      { name: 'area_id', description: 'Area identifier' },
      { name: 'area_type', description: 'Area type (circle/polygon)' },
      { name: 'coordinates', description: 'Area coordinates' },
    ],
    validNPGs: ['NPG_4', 'NPG_9', 'NPG_27'],
    specRef: 'MIL-STD-6016 §A.13.5',
  },
];

/**
 * Look up a J-message by its ID (e.g. "J3/2").
 */
export function findJMessage(id: string): JMessageDefinition | undefined {
  return LINK16_MESSAGES.find((m) => m.id === id);
}

/**
 * Get all valid J-message IDs.
 */
export function allJMessageIds(): string[] {
  return LINK16_MESSAGES.map((m) => m.id);
}

/**
 * Get all J-message IDs valid for a given NPG.
 */
export function messagesForNPG(npgId: string): string[] {
  return LINK16_MESSAGES
    .filter((m) => m.validNPGs.includes(npgId))
    .map((m) => m.id);
}
