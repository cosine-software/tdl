/**
 * Export engine — converts TDL AST to machine-readable formats.
 *
 * Supported formats:
 *   - JSON  (structured, suitable for tooling integration)
 *   - XML   (JREAP / SIMPLE -style, suitable for legacy planning tools)
 */

import type {
  DocumentNode,
  NetworkDeclaration,
  TerminalDeclaration,
  NetDeclaration,
  SubnetworkDeclaration,
  MemberDeclaration,
  MessageEntry,
  FilterRule,
  PropertyAssignment,
  PropertyValue,
} from './types';

// ─── Helpers ──────────────────────────────────────────────────────────────

function resolveValue(val: PropertyValue): string | number | boolean | string[] {
  switch (val.type) {
    case 'string':
    case 'identifier':
    case 'duration':
    case 'hex':
      return val.value;
    case 'number':
    case 'percent':
      return val.value;
    case 'boolean':
      return val.value;
    case 'array':
      return val.value;
  }
}

function propsToRecord(props: PropertyAssignment[]): Record<string, string | number | boolean | string[]> {
  const result: Record<string, string | number | boolean | string[]> = {};
  for (const p of props) {
    result[p.key] = resolveValue(p.value);
  }
  return result;
}

// ─── JSON Export ──────────────────────────────────────────────────────────

interface JsonTerminal {
  name: string;
  [key: string]: string | number | boolean | string[] | undefined;
}

interface JsonNet {
  name: string;
  [key: string]: string | number | boolean | string[] | undefined;
}

interface JsonMember {
  name: string;
  [key: string]: string | number | boolean | string[] | undefined;
}

interface JsonSubnetwork {
  name: string;
  members: JsonMember[];
  [key: string]: string | number | boolean | string[] | JsonMember[] | undefined;
}

interface JsonMessage {
  messageId: string;
  [key: string]: string | number | boolean | string[] | undefined;
}

interface JsonFilterRule {
  action: 'accept' | 'drop';
  messageId: string;
  condition?: {
    field: string;
    operator: string;
    value: string;
  };
}

interface JsonNetwork {
  name: string;
  properties: Record<string, string | number | boolean | string[]>;
  terminals: JsonTerminal[];
  nets: JsonNet[];
  subnetworks: JsonSubnetwork[];
  messages: JsonMessage[];
  filters: {
    inbound: JsonFilterRule[];
    outbound: JsonFilterRule[];
  } | null;
}

export interface JsonExport {
  format: 'tdl-config';
  version: '1.0';
  exportedAt: string;
  networks: JsonNetwork[];
}

function terminalToJson(t: TerminalDeclaration): JsonTerminal {
  return { name: t.name, ...propsToRecord(t.properties) };
}

function netToJson(n: NetDeclaration): JsonNet {
  return { name: n.name, ...propsToRecord(n.properties) };
}

function memberToJson(m: MemberDeclaration): JsonMember {
  return { name: m.name, ...propsToRecord(m.properties) };
}

function subnetworkToJson(s: SubnetworkDeclaration): JsonSubnetwork {
  return {
    name: s.name,
    ...propsToRecord(s.properties),
    members: s.members.map(memberToJson),
  };
}

function messageToJson(e: MessageEntry): JsonMessage {
  return { messageId: e.messageId, ...propsToRecord(e.properties) };
}

function filterRuleToJson(r: FilterRule): JsonFilterRule {
  const result: JsonFilterRule = { action: r.action, messageId: r.messageId };
  if (r.where) {
    result.condition = {
      field: r.where.condition.field,
      operator: r.where.condition.operator,
      value: r.where.condition.value,
    };
  }
  return result;
}

function networkToJson(n: NetworkDeclaration): JsonNetwork {
  return {
    name: n.name,
    properties: propsToRecord(n.properties),
    terminals: n.terminals.map(terminalToJson),
    nets: n.nets.map(netToJson),
    subnetworks: n.subnetworks.map(subnetworkToJson),
    messages: n.messages ? n.messages.entries.map(messageToJson) : [],
    filters: n.filters
      ? {
          inbound: n.filters.inbound.map(filterRuleToJson),
          outbound: n.filters.outbound.map(filterRuleToJson),
        }
      : null,
  };
}

export function exportToJson(ast: DocumentNode): string {
  const output: JsonExport = {
    format: 'tdl-config',
    version: '1.0',
    exportedAt: new Date().toISOString(),
    networks: ast.networks.map(networkToJson),
  };
  return JSON.stringify(output, null, 2);
}

// ─── XML Export ───────────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function indent(level: number): string {
  return '  '.repeat(level);
}

function propsToXml(props: PropertyAssignment[], level: number): string {
  const lines: string[] = [];
  for (const p of props) {
    const val = resolveValue(p.value);
    if (Array.isArray(val)) {
      lines.push(`${indent(level)}<${p.key}>`);
      for (const item of val) {
        lines.push(`${indent(level + 1)}<item>${escapeXml(item)}</item>`);
      }
      lines.push(`${indent(level)}</${p.key}>`);
    } else {
      lines.push(`${indent(level)}<${p.key}>${escapeXml(String(val))}</${p.key}>`);
    }
  }
  return lines.join('\n');
}

function terminalToXml(t: TerminalDeclaration, level: number): string {
  const lines: string[] = [];
  lines.push(`${indent(level)}<terminal name="${escapeXml(t.name)}">`);
  lines.push(propsToXml(t.properties, level + 1));
  lines.push(`${indent(level)}</terminal>`);
  return lines.join('\n');
}

function netToXml(n: NetDeclaration, level: number): string {
  const lines: string[] = [];
  lines.push(`${indent(level)}<net name="${escapeXml(n.name)}">`);
  lines.push(propsToXml(n.properties, level + 1));
  lines.push(`${indent(level)}</net>`);
  return lines.join('\n');
}

function memberToXml(m: MemberDeclaration, level: number): string {
  const lines: string[] = [];
  lines.push(`${indent(level)}<member name="${escapeXml(m.name)}">`);
  lines.push(propsToXml(m.properties, level + 1));
  lines.push(`${indent(level)}</member>`);
  return lines.join('\n');
}

function subnetworkToXml(s: SubnetworkDeclaration, level: number): string {
  const lines: string[] = [];
  lines.push(`${indent(level)}<subnetwork name="${escapeXml(s.name)}">`);
  lines.push(propsToXml(s.properties, level + 1));
  if (s.members.length > 0) {
    lines.push(`${indent(level + 1)}<members>`);
    for (const m of s.members) {
      lines.push(memberToXml(m, level + 2));
    }
    lines.push(`${indent(level + 1)}</members>`);
  }
  lines.push(`${indent(level)}</subnetwork>`);
  return lines.join('\n');
}

function messageToXml(e: MessageEntry, level: number): string {
  const lines: string[] = [];
  lines.push(`${indent(level)}<message id="${escapeXml(e.messageId)}">`);
  lines.push(propsToXml(e.properties, level + 1));
  lines.push(`${indent(level)}</message>`);
  return lines.join('\n');
}

function filterRuleToXml(r: FilterRule, level: number): string {
  const lines: string[] = [];
  lines.push(`${indent(level)}<rule action="${r.action}" message="${escapeXml(r.messageId)}">`);
  if (r.where) {
    const c = r.where.condition;
    lines.push(
      `${indent(level + 1)}<condition field="${escapeXml(c.field)}" operator="${escapeXml(c.operator)}" value="${escapeXml(c.value)}" />`
    );
  }
  lines.push(`${indent(level)}</rule>`);
  return lines.join('\n');
}

function networkToXml(n: NetworkDeclaration, level: number): string {
  const lines: string[] = [];
  lines.push(`${indent(level)}<network name="${escapeXml(n.name)}">`);
  lines.push(propsToXml(n.properties, level + 1));

  if (n.terminals.length > 0) {
    lines.push(`${indent(level + 1)}<terminals>`);
    for (const t of n.terminals) {
      lines.push(terminalToXml(t, level + 2));
    }
    lines.push(`${indent(level + 1)}</terminals>`);
  }

  if (n.nets.length > 0) {
    lines.push(`${indent(level + 1)}<nets>`);
    for (const net of n.nets) {
      lines.push(netToXml(net, level + 2));
    }
    lines.push(`${indent(level + 1)}</nets>`);
  }

  if (n.subnetworks.length > 0) {
    lines.push(`${indent(level + 1)}<subnetworks>`);
    for (const s of n.subnetworks) {
      lines.push(subnetworkToXml(s, level + 2));
    }
    lines.push(`${indent(level + 1)}</subnetworks>`);
  }

  if (n.messages && n.messages.entries.length > 0) {
    lines.push(`${indent(level + 1)}<messages>`);
    for (const m of n.messages.entries) {
      lines.push(messageToXml(m, level + 2));
    }
    lines.push(`${indent(level + 1)}</messages>`);
  }

  if (n.filters) {
    lines.push(`${indent(level + 1)}<filters>`);
    if (n.filters.inbound.length > 0) {
      lines.push(`${indent(level + 2)}<inbound>`);
      for (const r of n.filters.inbound) {
        lines.push(filterRuleToXml(r, level + 3));
      }
      lines.push(`${indent(level + 2)}</inbound>`);
    }
    if (n.filters.outbound.length > 0) {
      lines.push(`${indent(level + 2)}<outbound>`);
      for (const r of n.filters.outbound) {
        lines.push(filterRuleToXml(r, level + 3));
      }
      lines.push(`${indent(level + 2)}</outbound>`);
    }
    lines.push(`${indent(level + 1)}</filters>`);
  }

  lines.push(`${indent(level)}</network>`);
  return lines.join('\n');
}

export function exportToXml(ast: DocumentNode): string {
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<tdl-config version="1.0">');
  for (const n of ast.networks) {
    lines.push(networkToXml(n, 1));
  }
  lines.push('</tdl-config>');
  return lines.join('\n');
}
