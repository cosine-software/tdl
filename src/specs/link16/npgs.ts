/**
 * Link 16 Spec Database — NPG Definitions
 *
 * Network Participation Groups define the logical grouping
 * of information exchange within a Link 16 network.
 *
 * Reference: MIL-STD-6016 Table 3-I
 */

export interface NPGDefinition {
  id: string;
  name: string;
  number: number;
  description: string;
  validMessages: string[];
  specRef: string;
}

export const LINK16_NPGS: NPGDefinition[] = [
  {
    id: 'NPG_A',
    name: 'Initial Entry',
    number: 0,
    description:
      'Used for net entry, PPLI (Precise Participant Location and Identification), ' +
      'and initial position reporting. All terminals must subscribe to this NPG.',
    validMessages: ['J0/0', 'J0/1', 'J0/2', 'J0/3', 'J0/4', 'J0/5', 'J0/6', 'J0/7',
                    'J1/0', 'J1/1', 'J1/2', 'J1/3', 'J1/4', 'J1/5', 'J1/6',
                    'J2/0', 'J2/2', 'J2/3', 'J2/5'],
    specRef: 'MIL-STD-6016 Table 3-I',
  },
  {
    id: 'NPG_B',
    name: 'Net Management',
    number: 1,
    description:
      'Used for network management messages including net control, crypto sync, ' +
      'and MIDS terminal management.',
    validMessages: ['J0/0', 'J0/1', 'J0/2', 'J0/3', 'J0/4', 'J0/5', 'J0/6', 'J0/7',
                    'J1/0', 'J1/1', 'J1/2', 'J1/3', 'J1/4', 'J1/5', 'J1/6'],
    specRef: 'MIL-STD-6016 Table 3-I',
  },
  {
    id: 'NPG_2',
    name: 'Indirect PPLI',
    number: 2,
    description:
      'Precise Participant Location and Identification (indirect/relayed). ' +
      'Used when direct PPLI is not available or for extended range.',
    validMessages: ['J2/2', 'J2/3', 'J2/5'],
    specRef: 'MIL-STD-6016 Table 3-I',
  },
  {
    id: 'NPG_3',
    name: 'PPLI / Status',
    number: 3,
    description:
      'Direct PPLI and status reporting. Carries platform position, ' +
      'identification, and capability information.',
    validMessages: ['J2/0', 'J2/2', 'J2/3', 'J2/5', 'J3/0', 'J3/1'],
    specRef: 'MIL-STD-6016 Table 3-I',
  },
  {
    id: 'NPG_4',
    name: 'Mission Management',
    number: 4,
    description:
      'Used for mission assignment, coordination, and status reporting.',
    validMessages: ['J9/0', 'J10/2', 'J10/5', 'J13/2', 'J13/5'],
    specRef: 'MIL-STD-6016 Table 3-I',
  },
  {
    id: 'NPG_5',
    name: 'Electronic Warfare (EW)',
    number: 5,
    description:
      'Used for electronic warfare reporting and coordination. ' +
      'Carries emitter location and parametric data.',
    validMessages: ['J12/0', 'J12/2', 'J12/6'],
    specRef: 'MIL-STD-6016 Table 3-I',
  },
  {
    id: 'NPG_6',
    name: 'Fighter-to-Fighter',
    number: 6,
    description:
      'Dedicated for fighter-to-fighter coordination including ' +
      'weapons coordination, targeting, and engagement status.',
    validMessages: ['J7/0', 'J7/1', 'J7/2', 'J7/3', 'J7/6', 'J7/7'],
    specRef: 'MIL-STD-6016 Table 3-I',
  },
  {
    id: 'NPG_7',
    name: 'Surveillance',
    number: 7,
    description:
      'Primary surveillance reporting group. Used for dissemination ' +
      'of surveillance track data from surveillance sources.',
    validMessages: ['J3/0', 'J3/1', 'J3/2', 'J3/3', 'J3/4', 'J3/5', 'J3/6', 'J3/7'],
    specRef: 'MIL-STD-6016 Table 3-I',
  },
  {
    id: 'NPG_8',
    name: 'Platform Type Reporting',
    number: 8,
    description:
      'Used for detailed platform type identification and classification.',
    validMessages: ['J2/0', 'J2/2', 'J2/3', 'J2/5'],
    specRef: 'MIL-STD-6016 Table 3-I',
  },
  {
    id: 'NPG_9',
    name: 'Track Management',
    number: 9,
    description:
      'Track management and correlation. Used for reporting tracks to ' +
      'all network participants for common operational picture.',
    validMessages: [
      'J3/0', 'J3/1', 'J3/2', 'J3/3', 'J3/4', 'J3/5', 'J3/6', 'J3/7',
      'J13/2', 'J13/5',
    ],
    specRef: 'MIL-STD-6016 Table 3-I',
  },
  {
    id: 'NPG_14',
    name: 'Electronic Warfare Primary',
    number: 14,
    description:
      'Primary electronic warfare group for detailed EW data exchange ' +
      'including emitter parameters, jammer coordination, and EW targeting.',
    validMessages: ['J12/0', 'J12/2', 'J12/6'],
    specRef: 'MIL-STD-6016 Table 3-I',
  },
  {
    id: 'NPG_15',
    name: 'Weapons Coordination',
    number: 15,
    description:
      'Weapons coordination and engagement reporting. Used for fire control ' +
      'quality track data and weapons orders.',
    validMessages: ['J7/0', 'J7/1', 'J7/2', 'J7/3', 'J7/6', 'J7/7',
                    'J10/2', 'J10/5'],
    specRef: 'MIL-STD-6016 Table 3-I',
  },
  {
    id: 'NPG_16',
    name: 'Voice',
    number: 16,
    description:
      'Voice communication group. Used for digitised voice exchange ' +
      'within the Link 16 network.',
    validMessages: ['J28/0', 'J28/2'],
    specRef: 'MIL-STD-6016 Table 3-I',
  },
  {
    id: 'NPG_27',
    name: 'Joint ISR',
    number: 27,
    description:
      'Joint Intelligence, Surveillance and Reconnaissance. ' +
      'Used for ISR mission coordination and reporting.',
    validMessages: ['J13/2', 'J13/5', 'J14/0', 'J14/2'],
    specRef: 'MIL-STD-6016 Table 3-I',
  },
];

/**
 * Look up an NPG by its ID (e.g. "NPG_9").
 */
export function findNPG(id: string): NPGDefinition | undefined {
  return LINK16_NPGS.find((n) => n.id === id);
}

/**
 * Get all valid NPG IDs.
 */
export function allNPGIds(): string[] {
  return LINK16_NPGS.map((n) => n.id);
}
