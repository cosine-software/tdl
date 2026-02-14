import {
  DocumentNode,
  NetworkDeclaration,
  Diagnostic,
  PropertyAssignment,
} from './types';
import { allNPGIds, findJMessage, allJMessageIds } from '../specs/link16';
import {
  allPlatformTypeIds,
  CLASSIFICATION_LEVELS,
  LINK16_ROLES,
  LINK22_ROLES,
  LINK22_OPERATING_MODES,
  LINK22_DATA_RATES,
} from '../specs/link16';

/**
 * Validate a parsed TDL document against domain rules.
 *
 * Three levels:
 *   1. Syntax — handled by the parser
 *   2. Semantic — type/reference checking (this module)
 *   3. Domain — spec-level rules (this module)
 */
export function validate(doc: DocumentNode): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];

  for (const network of doc.networks) {
    validateNetwork(network, diagnostics);
  }

  return diagnostics;
}

function validateNetwork(network: NetworkDeclaration, diag: Diagnostic[]): void {
  const linkType = getPropertyValue(network.properties, 'link');

  if (linkType === 'Link16') {
    validateLink16Network(network, diag);
  } else if (linkType === 'Link22') {
    validateLink22Network(network, diag);
  } else if (linkType) {
    diag.push({
      message: `Unknown link type '${linkType}'. Expected 'Link16' or 'Link22'.`,
      severity: 'error',
      span: network.properties.find((p) => p.key === 'link')!.span,
      rule: 'valid-link-type',
    });
  }

  // Rule: track-number-uniqueness
  validateTrackNumberUniqueness(network, diag);

  // Rule: net-number-uniqueness
  validateNetNumberUniqueness(network, diag);
}

// ─── Link 16 Rules ──────────────────────────────────────────────────

function validateLink16Network(network: NetworkDeclaration, diag: Diagnostic[]): void {
  // Rule: ncs-required
  const ncsTerminals = network.terminals.filter((t) => {
    return getPropertyValue(t.properties, 'role') === 'NetControlStation';
  });

  if (ncsTerminals.length === 0) {
    diag.push({
      message: 'A Link 16 network must have exactly one terminal with role NetControlStation.',
      severity: 'error',
      span: network.span,
      rule: 'ncs-required',
      specRef: 'MIL-STD-6016 §3.2.1',
    });
  } else if (ncsTerminals.length > 1) {
    for (const ncs of ncsTerminals.slice(1)) {
      diag.push({
        message: `Multiple NCS terminals defined. Only one NetControlStation is allowed per network.`,
        severity: 'error',
        span: ncs.span,
        rule: 'ncs-required',
        specRef: 'MIL-STD-6016 §3.2.1',
      });
    }
  }

  // Rule: total-tsdf-budget
  validateTsdfBudget(network, diag);

  // Rule: npg-subscriber-coverage
  validateNpgSubscriberCoverage(network, diag);

  // Rule: ppli-required
  validatePpliRequired(network, diag);

  // Rule: message-npg-match
  validateMessageNpgMatch(network, diag);

  // Rule: stacking-consistency
  validateStackingConsistency(network, diag);

  // Rule: valid-npg-references
  validateNpgReferences(network, diag);

  // Rule: valid-j-message-references
  validateJMessageReferences(network, diag);

  // Rule: participant-references
  validateParticipantReferences(network, diag);

  // Rule: valid property values for Link 16 terminals
  validateLink16TerminalProperties(network, diag);

  // Rule: valid property values for Link 16 nets
  validateLink16NetProperties(network, diag);

  // Rule: valid classification
  validateClassification(network, diag);
}

// ─── TSDF Budget ────────────────────────────────────────────────────

function validateTsdfBudget(network: NetworkDeclaration, diag: Diagnostic[]): void {
  let totalTsdf = 0;
  const netsWithTsdf: { name: string; tsdf: number }[] = [];

  for (const net of network.nets) {
    const tsdfProp = net.properties.find((p) => p.key === 'tsdf');
    if (tsdfProp && tsdfProp.value.type === 'percent') {
      totalTsdf += tsdfProp.value.value;
      netsWithTsdf.push({ name: net.name, tsdf: tsdfProp.value.value });
    }
  }

  if (totalTsdf > 100) {
    diag.push({
      message:
        `Total TSDF across all nets is ${totalTsdf}%, which exceeds the 100% budget. ` +
        `Nets: ${netsWithTsdf.map((n) => `${n.name} (${n.tsdf}%)`).join(', ')}.`,
      severity: 'error',
      span: network.span,
      rule: 'total-tsdf-budget',
      specRef: 'MIL-STD-6016 §4.3.2',
    });
  } else if (totalTsdf > 90) {
    diag.push({
      message:
        `Total TSDF is ${totalTsdf}%, which is close to the 100% budget limit. ` +
        `Consider reducing to allow for future expansion.`,
      severity: 'warning',
      span: network.span,
      rule: 'total-tsdf-budget',
      specRef: 'MIL-STD-6016 §4.3.2',
    });
  }
}

// ─── NPG Subscriber Coverage ────────────────────────────────────────

function validateNpgSubscriberCoverage(network: NetworkDeclaration, diag: Diagnostic[]): void {
  // For every NPG that a terminal transmits on, at least one OTHER terminal should subscribe.
  for (const terminal of network.terminals) {
    const transmitsProp = terminal.properties.find((p) => p.key === 'transmits');
    if (transmitsProp && transmitsProp.value.type === 'array') {
      for (const npgId of transmitsProp.value.value) {
        const hasSubscriber = network.terminals.some((other) => {
          if (other.name === terminal.name) return false;
          const subProp = other.properties.find((p) => p.key === 'subscribes');
          return subProp && subProp.value.type === 'array' && subProp.value.value.includes(npgId);
        });

        if (!hasSubscriber) {
          diag.push({
            message:
              `Terminal '${terminal.name}' transmits on ${npgId} but no other terminal subscribes to it. ` +
              `Messages will have no recipients.`,
            severity: 'warning',
            span: transmitsProp.span,
            rule: 'npg-subscriber-coverage',
            specRef: 'MIL-STD-6016 §5.1.4',
          });
        }
      }
    }
  }
}

// ─── PPLI Required ──────────────────────────────────────────────────

function validatePpliRequired(network: NetworkDeclaration, diag: Diagnostic[]): void {
  for (const terminal of network.terminals) {
    const subProp = terminal.properties.find((p) => p.key === 'subscribes');
    if (subProp && subProp.value.type === 'array') {
      const hasPpliNpg =
        subProp.value.value.includes('NPG_A') || subProp.value.value.includes('NPG_B');
      if (!hasPpliNpg) {
        diag.push({
          message:
            `Terminal '${terminal.name}' does not subscribe to NPG_A or NPG_B. ` +
            `All terminals should have a PPLI-capable NPG for position reporting.`,
          severity: 'warning',
          span: terminal.span,
          rule: 'ppli-required',
          specRef: 'MIL-STD-6016 §3.3.1',
        });
      }
    }
  }
}

// ─── Message-NPG Match ──────────────────────────────────────────────

function validateMessageNpgMatch(network: NetworkDeclaration, diag: Diagnostic[]): void {
  if (!network.messages) return;

  for (const entry of network.messages.entries) {
    const npgProp = entry.properties.find((p) => p.key === 'npg');
    if (npgProp && npgProp.value.type === 'identifier') {
      const msgDef = findJMessage(entry.messageId);
      if (msgDef && !msgDef.validNPGs.includes(npgProp.value.value)) {
        diag.push({
          message:
            `Message ${entry.messageId} (${msgDef.name}) is assigned to ${npgProp.value.value}, ` +
            `but it is only valid on: ${msgDef.validNPGs.join(', ')}.`,
          severity: 'error',
          span: entry.span,
          rule: 'message-npg-match',
          specRef: msgDef.specRef,
        });
      }
    }
  }
}

// ─── Stacking Consistency ───────────────────────────────────────────

function validateStackingConsistency(network: NetworkDeclaration, diag: Diagnostic[]): void {
  for (const net of network.nets) {
    const stackedProp = net.properties.find((p) => p.key === 'stacked');
    const stackingLevelProp = net.properties.find((p) => p.key === 'stacking_level');

    if (stackedProp && stackedProp.value.type === 'boolean' && stackedProp.value.value) {
      // Stacked is true — stacking_level must be specified
      if (!stackingLevelProp) {
        diag.push({
          message: `Net '${net.name}' has stacked: true but no stacking_level specified. Must be 2 or 4.`,
          severity: 'error',
          span: net.span,
          rule: 'stacking-consistency',
          specRef: 'MIL-STD-6016 §4.4.1',
        });
      } else if (stackingLevelProp.value.type === 'number') {
        const level = stackingLevelProp.value.value;
        if (level !== 2 && level !== 4) {
          diag.push({
            message: `Net '${net.name}' stacking_level is ${level}. Must be 2 or 4.`,
            severity: 'error',
            span: stackingLevelProp.span,
            rule: 'stacking-consistency',
            specRef: 'MIL-STD-6016 §4.4.1',
          });
        }
      }
    }

    if (stackingLevelProp && (!stackedProp || (stackedProp.value.type === 'boolean' && !stackedProp.value.value))) {
      diag.push({
        message: `Net '${net.name}' has stacking_level but stacked is not true.`,
        severity: 'warning',
        span: stackingLevelProp.span,
        rule: 'stacking-consistency',
        specRef: 'MIL-STD-6016 §4.4.1',
      });
    }
  }
}

// ─── NPG Reference Validation ──────────────────────────────────────

function validateNpgReferences(network: NetworkDeclaration, diag: Diagnostic[]): void {
  const validNpgs = new Set(allNPGIds());

  // Check terminal NPG references
  for (const terminal of network.terminals) {
    for (const prop of terminal.properties) {
      if ((prop.key === 'subscribes' || prop.key === 'transmits') && prop.value.type === 'array') {
        for (const npgId of prop.value.value) {
          if (!validNpgs.has(npgId)) {
            diag.push({
              message: `Unknown NPG '${npgId}'. Valid NPGs: ${allNPGIds().join(', ')}.`,
              severity: 'error',
              span: prop.span,
              rule: 'valid-npg-reference',
            });
          }
        }
      }
    }
  }

  // Check net NPG references
  for (const net of network.nets) {
    const npgProp = net.properties.find((p) => p.key === 'npg');
    if (npgProp && npgProp.value.type === 'identifier') {
      if (!validNpgs.has(npgProp.value.value)) {
        diag.push({
          message: `Unknown NPG '${npgProp.value.value}' in net '${net.name}'.`,
          severity: 'error',
          span: npgProp.span,
          rule: 'valid-npg-reference',
        });
      }
    }
  }
}

// ─── J-Message Reference Validation ─────────────────────────────────

function validateJMessageReferences(network: NetworkDeclaration, diag: Diagnostic[]): void {
  if (!network.messages) return;

  const validMessages = new Set(allJMessageIds());

  for (const entry of network.messages.entries) {
    if (!validMessages.has(entry.messageId)) {
      diag.push({
        message: `Unknown J-message '${entry.messageId}'. Check the message identifier.`,
        severity: 'error',
        span: entry.span,
        rule: 'valid-j-message-reference',
      });
    }
  }
}

// ─── Participant Reference Validation ────────────────────────────────

function validateParticipantReferences(network: NetworkDeclaration, diag: Diagnostic[]): void {
  const terminalNames = new Set(network.terminals.map((t) => t.name));

  for (const net of network.nets) {
    const participantsProp = net.properties.find((p) => p.key === 'participants');
    if (participantsProp && participantsProp.value.type === 'array') {
      for (const name of participantsProp.value.value) {
        if (!terminalNames.has(name)) {
          diag.push({
            message: `Unknown terminal '${name}' in net '${net.name}' participants. Defined terminals: ${[...terminalNames].join(', ')}.`,
            severity: 'error',
            span: participantsProp.span,
            rule: 'participant-reference',
          });
        }
      }
    }
  }
}

// ─── Track Number Uniqueness ─────────────────────────────────────────

function validateTrackNumberUniqueness(network: NetworkDeclaration, diag: Diagnostic[]): void {
  const trackNumbers = new Map<number, string>();

  for (const terminal of network.terminals) {
    const tnProp = terminal.properties.find((p) => p.key === 'track_number');
    if (tnProp && tnProp.value.type === 'number') {
      const tn = tnProp.value.value;
      const existing = trackNumbers.get(tn);
      if (existing) {
        diag.push({
          message: `Duplicate track number ${tn}. Also used by terminal '${existing}'.`,
          severity: 'error',
          span: tnProp.span,
          rule: 'track-number-uniqueness',
        });
      } else {
        trackNumbers.set(tn, terminal.name);
      }
    }
  }
}

// ─── Net Number Uniqueness ───────────────────────────────────────────

function validateNetNumberUniqueness(network: NetworkDeclaration, diag: Diagnostic[]): void {
  const netNumbers = new Map<number, string>();

  for (const net of network.nets) {
    const nnProp = net.properties.find((p) => p.key === 'net_number');
    if (nnProp && nnProp.value.type === 'number') {
      const nn = nnProp.value.value;
      const existing = netNumbers.get(nn);
      if (existing) {
        diag.push({
          message: `Duplicate net number ${nn}. Also used by net '${existing}'.`,
          severity: 'error',
          span: nnProp.span,
          rule: 'net-number-uniqueness',
        });
      } else {
        netNumbers.set(nn, net.name);
      }
    }
  }
}

// ─── Link 22 Rules ──────────────────────────────────────────────────

function validateLink22Network(network: NetworkDeclaration, diag: Diagnostic[]): void {
  // Rule: link22-forwarding
  for (const sub of network.subnetworks) {
    const membersWithForwarding = sub.members.filter((m) => {
      return getPropertyValue(m.properties, 'forwarding') === 'enabled';
    });

    if (sub.members.length > 0 && membersWithForwarding.length === 0) {
      diag.push({
        message:
          `Subnetwork '${sub.name}' has no member with forwarding enabled. ` +
          `At least one member must have forwarding: enabled.`,
        severity: 'error',
        span: sub.span,
        rule: 'link22-forwarding',
        specRef: 'STANAG 5522 §6.2',
      });
    }
  }

  // Rule: link22-controller-required
  for (const sub of network.subnetworks) {
    const controllers = sub.members.filter((m) => {
      return getPropertyValue(m.properties, 'role') === 'Controller';
    });

    if (controllers.length === 0) {
      diag.push({
        message: `Subnetwork '${sub.name}' has no Controller. At least one member must have role: Controller.`,
        severity: 'error',
        span: sub.span,
        rule: 'link22-controller-required',
        specRef: 'STANAG 5522 §4.2',
      });
    }
  }

  // Rule: valid property values for Link 22 subnetworks and members
  validateLink22SubnetworkProperties(network, diag);

  // Rule: valid classification
  validateClassification(network, diag);

  // Rule: link22-unit-id-uniqueness
  validateLink22UnitIdUniqueness(network, diag);
}

// ─── Helpers ────────────────────────────────────────────────────────

// ─── Property Value Validation — Link 16 Terminals ──────────────────

const VALID_LINK16_ROLE_IDS = LINK16_ROLES.map((r) => r.id);
const VALID_LINK22_ROLE_IDS = LINK22_ROLES.map((r) => r.id);
const VALID_PLATFORM_TYPE_IDS = allPlatformTypeIds();
const VALID_CLASSIFICATION_IDS = CLASSIFICATION_LEVELS.map((c) => c.id);
const VALID_LINK22_OPERATING_MODE_IDS = LINK22_OPERATING_MODES.map((m) => m.id);
const VALID_LINK22_DATA_RATE_IDS = LINK22_DATA_RATES.map((r) => r.id);

function validateClassification(network: NetworkDeclaration, diag: Diagnostic[]): void {
  const classProp = network.properties.find((p) => p.key === 'classification');
  if (classProp && classProp.value.type === 'identifier') {
    if (!VALID_CLASSIFICATION_IDS.includes(classProp.value.value)) {
      diag.push({
        message: `Invalid classification '${classProp.value.value}'. Expected one of: ${VALID_CLASSIFICATION_IDS.join(', ')}.`,
        severity: 'error',
        span: classProp.span,
        rule: 'valid-classification',
      });
    }
  }
}

function validateLink16TerminalProperties(network: NetworkDeclaration, diag: Diagnostic[]): void {
  for (const terminal of network.terminals) {
    // Validate role
    const roleProp = terminal.properties.find((p) => p.key === 'role');
    if (roleProp && roleProp.value.type === 'identifier') {
      if (!VALID_LINK16_ROLE_IDS.includes(roleProp.value.value)) {
        diag.push({
          message: `Invalid Link 16 role '${roleProp.value.value}'. Expected one of: ${VALID_LINK16_ROLE_IDS.join(', ')}.`,
          severity: 'error',
          span: roleProp.span,
          rule: 'valid-role',
          specRef: 'MIL-STD-6016 §3.2',
        });
      }
    }

    // Validate platform_type
    const platProp = terminal.properties.find((p) => p.key === 'platform_type');
    if (platProp && platProp.value.type === 'identifier') {
      if (!VALID_PLATFORM_TYPE_IDS.includes(platProp.value.value)) {
        diag.push({
          message: `Unknown platform type '${platProp.value.value}'. Check the identifier against known platform types.`,
          severity: 'warning',
          span: platProp.span,
          rule: 'valid-platform-type',
        });
      }
    }

    // Validate track_number range (Link 16 octal track numbers: 0–77777 = 0–32767 decimal)
    const tnProp = terminal.properties.find((p) => p.key === 'track_number');
    if (tnProp && tnProp.value.type === 'number') {
      const tn = tnProp.value.value;
      if (tn < 0 || tn > 77777) {
        diag.push({
          message: `Track number ${tn} is out of range. Must be between 00000 and 77777 (octal).`,
          severity: 'error',
          span: tnProp.span,
          rule: 'valid-track-number',
          specRef: 'MIL-STD-6016 §3.4.1',
        });
      }
    }

    // Warn if terminal has no role
    if (!roleProp) {
      diag.push({
        message: `Terminal '${terminal.name}' has no role specified. Expected one of: ${VALID_LINK16_ROLE_IDS.join(', ')}.`,
        severity: 'warning',
        span: terminal.span,
        rule: 'required-property',
      });
    }
  }
}

function validateLink16NetProperties(network: NetworkDeclaration, diag: Diagnostic[]): void {
  for (const net of network.nets) {
    // Validate net_number range (positive integer)
    const nnProp = net.properties.find((p) => p.key === 'net_number');
    if (nnProp && nnProp.value.type === 'number') {
      if (nnProp.value.value < 0 || nnProp.value.value > 127) {
        diag.push({
          message: `Net number ${nnProp.value.value} is out of range. Must be between 0 and 127.`,
          severity: 'error',
          span: nnProp.span,
          rule: 'valid-net-number',
          specRef: 'MIL-STD-6016 §4.2.1',
        });
      }
    }

    // Validate tsdf range (0–100%)
    const tsdfProp = net.properties.find((p) => p.key === 'tsdf');
    if (tsdfProp && tsdfProp.value.type === 'percent') {
      if (tsdfProp.value.value < 0 || tsdfProp.value.value > 100) {
        diag.push({
          message: `TSDF ${tsdfProp.value.value}% is out of range. Must be between 0% and 100%.`,
          severity: 'error',
          span: tsdfProp.span,
          rule: 'valid-tsdf',
          specRef: 'MIL-STD-6016 §4.3.2',
        });
      }
    }

    // Warn if net has no net_number
    if (!nnProp) {
      diag.push({
        message: `Net '${net.name}' has no net_number specified.`,
        severity: 'warning',
        span: net.span,
        rule: 'required-property',
      });
    }
  }
}

// ─── Property Value Validation — Link 22 ────────────────────────────

function validateLink22SubnetworkProperties(network: NetworkDeclaration, diag: Diagnostic[]): void {
  for (const sub of network.subnetworks) {
    // Validate operating_mode
    const modeProp = sub.properties.find((p) => p.key === 'operating_mode');
    if (modeProp && modeProp.value.type === 'identifier') {
      if (!VALID_LINK22_OPERATING_MODE_IDS.includes(modeProp.value.value)) {
        diag.push({
          message: `Invalid operating mode '${modeProp.value.value}'. Expected one of: ${VALID_LINK22_OPERATING_MODE_IDS.join(', ')}.`,
          severity: 'error',
          span: modeProp.span,
          rule: 'valid-operating-mode',
          specRef: 'STANAG 5522 §5.2',
        });
      }
    }

    // Validate data_rate
    const rateProp = sub.properties.find((p) => p.key === 'data_rate');
    if (rateProp && rateProp.value.type === 'identifier') {
      if (!VALID_LINK22_DATA_RATE_IDS.includes(rateProp.value.value)) {
        diag.push({
          message: `Invalid data rate '${rateProp.value.value}'. Expected one of: ${VALID_LINK22_DATA_RATE_IDS.join(', ')}.`,
          severity: 'error',
          span: rateProp.span,
          rule: 'valid-data-rate',
          specRef: 'STANAG 5522 §6.1',
        });
      }
    }

    // Validate member properties
    for (const member of sub.members) {
      // Validate role
      const roleProp = member.properties.find((p) => p.key === 'role');
      if (roleProp && roleProp.value.type === 'identifier') {
        if (!VALID_LINK22_ROLE_IDS.includes(roleProp.value.value)) {
          diag.push({
            message: `Invalid Link 22 role '${roleProp.value.value}'. Expected one of: ${VALID_LINK22_ROLE_IDS.join(', ')}.`,
            severity: 'error',
            span: roleProp.span,
            rule: 'valid-role',
            specRef: 'STANAG 5522 §4.2',
          });
        }
      }

      // Validate unit_id is hex
      const uidProp = member.properties.find((p) => p.key === 'unit_id');
      if (uidProp && uidProp.value.type !== 'hex') {
        diag.push({
          message: `unit_id must be a hex value (e.g. 0x1A3F), got ${uidProp.value.type}.`,
          severity: 'error',
          span: uidProp.span,
          rule: 'valid-unit-id',
          specRef: 'STANAG 5522 §4.1',
        });
      }

      // Validate forwarding is enabled/disabled
      const fwdProp = member.properties.find((p) => p.key === 'forwarding');
      if (fwdProp && fwdProp.value.type === 'identifier') {
        if (fwdProp.value.value !== 'enabled' && fwdProp.value.value !== 'disabled') {
          diag.push({
            message: `Invalid forwarding value '${fwdProp.value.value}'. Expected 'enabled' or 'disabled'.`,
            severity: 'error',
            span: fwdProp.span,
            rule: 'valid-forwarding',
            specRef: 'STANAG 5522 §6.2',
          });
        }
      }

      // Warn if member has no role
      if (!roleProp) {
        diag.push({
          message: `Member '${member.name}' has no role specified. Expected one of: ${VALID_LINK22_ROLE_IDS.join(', ')}.`,
          severity: 'warning',
          span: member.span,
          rule: 'required-property',
        });
      }

      // Warn if member has no unit_id
      if (!uidProp) {
        diag.push({
          message: `Member '${member.name}' has no unit_id specified. A hex unit identifier is required.`,
          severity: 'warning',
          span: member.span,
          rule: 'required-property',
          specRef: 'STANAG 5522 §4.1',
        });
      }
    }
  }
}

// ─── Link 22 Unit ID Uniqueness ─────────────────────────────────────

function validateLink22UnitIdUniqueness(network: NetworkDeclaration, diag: Diagnostic[]): void {
  const unitIds = new Map<string, string>();

  for (const sub of network.subnetworks) {
    for (const member of sub.members) {
      const uidProp = member.properties.find((p) => p.key === 'unit_id');
      if (uidProp && uidProp.value.type === 'hex') {
        const uid = uidProp.value.value.toLowerCase();
        const existing = unitIds.get(uid);
        // Same unit appearing in multiple subnetworks is valid (dual-membership),
        // but different members with same unit_id in the same subnetwork is an error
        if (existing && existing !== member.name) {
          diag.push({
            message: `Duplicate unit_id ${uidProp.value.value}. Also used by member '${existing}'.`,
            severity: 'warning',
            span: uidProp.span,
            rule: 'unit-id-uniqueness',
            specRef: 'STANAG 5522 §4.1',
          });
        } else {
          unitIds.set(uid, member.name);
        }
      }
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

function getPropertyValue(properties: PropertyAssignment[], key: string): string | undefined {
  const prop = properties.find((p) => p.key === key);
  if (!prop) return undefined;
  if (prop.value.type === 'identifier' || prop.value.type === 'string') {
    return prop.value.value;
  }
  return undefined;
}
