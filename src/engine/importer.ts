/**
 * Import engine — converts external formats to TDL DSL source text.
 *
 * Supported formats:
 *   - JSON  (structured tdl-config format, or generic network definitions)
 *   - CSV   (terminal lists with columns for name, track_number, platform_type, role, etc.)
 *   - XML   (JREAP / SIMPLE -style tdl-config XML)
 */

// ─── Types ────────────────────────────────────────────────────────────────

export interface ImportResult {
  source: string;
  warnings: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function quoteString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function indent(level: number): string {
  return '  '.repeat(level);
}

function formatValue(val: unknown): string {
  if (Array.isArray(val)) {
    return `[${val.map((v) => String(v)).join(', ')}]`;
  }
  if (typeof val === 'boolean') return String(val);
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') {
    // Check if it looks like an identifier (no spaces, starts with letter/underscore)
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(val)) return val;
    // Hex
    if (/^0x[0-9A-Fa-f]+$/.test(val)) return val;
    // Percent
    if (/^\d+%$/.test(val)) return val;
    // J-message
    if (/^J\d+\/\d+$/.test(val)) return val;
    // Number
    if (/^\d+$/.test(val)) return val;
    // Otherwise quote it
    return quoteString(val);
  }
  return String(val);
}

// ─── JSON Import ──────────────────────────────────────────────────────────

interface JsonImportNetwork {
  name: string;
  properties?: Record<string, unknown>;
  link?: string;
  classification?: string;
  terminals?: JsonImportTerminal[];
  nets?: JsonImportNet[];
  subnetworks?: JsonImportSubnetwork[];
  messages?: JsonImportMessage[];
  filters?: {
    inbound?: JsonImportFilterRule[];
    outbound?: JsonImportFilterRule[];
  };
  [key: string]: unknown;
}

interface JsonImportTerminal {
  name: string;
  [key: string]: unknown;
}

interface JsonImportNet {
  name: string;
  [key: string]: unknown;
}

interface JsonImportSubnetwork {
  name: string;
  members?: JsonImportMember[];
  [key: string]: unknown;
}

interface JsonImportMember {
  name: string;
  [key: string]: unknown;
}

interface JsonImportMessage {
  messageId: string;
  [key: string]: unknown;
}

interface JsonImportFilterRule {
  action: string;
  messageId: string;
  condition?: {
    field: string;
    operator: string;
    value: string;
  };
}

function propsToTdl(
  obj: Record<string, unknown>,
  excludeKeys: Set<string>,
  level: number,
): string[] {
  const lines: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (excludeKeys.has(key) || val === undefined || val === null) continue;
    lines.push(`${indent(level)}${key}: ${formatValue(val)}`);
  }
  return lines;
}

function terminalToTdl(t: JsonImportTerminal, level: number): string[] {
  const lines: string[] = [];
  lines.push(`${indent(level)}terminal ${quoteString(t.name)} {`);
  lines.push(...propsToTdl(t, new Set(['name']), level + 1));
  lines.push(`${indent(level)}}`);
  return lines;
}

function netToTdl(n: JsonImportNet, level: number): string[] {
  const lines: string[] = [];
  lines.push(`${indent(level)}net ${quoteString(n.name)} {`);
  lines.push(...propsToTdl(n, new Set(['name']), level + 1));
  lines.push(`${indent(level)}}`);
  return lines;
}

function memberToTdl(m: JsonImportMember, level: number): string[] {
  const lines: string[] = [];
  lines.push(`${indent(level)}member ${quoteString(m.name)} {`);
  lines.push(...propsToTdl(m, new Set(['name']), level + 1));
  lines.push(`${indent(level)}}`);
  return lines;
}

function subnetworkToTdl(s: JsonImportSubnetwork, level: number): string[] {
  const lines: string[] = [];
  lines.push(`${indent(level)}subnetwork ${quoteString(s.name)} {`);
  lines.push(...propsToTdl(s, new Set(['name', 'members']), level + 1));
  if (s.members && s.members.length > 0) {
    for (const m of s.members) {
      lines.push('');
      lines.push(...memberToTdl(m, level + 1));
    }
  }
  lines.push(`${indent(level)}}`);
  return lines;
}

function messageToTdl(m: JsonImportMessage, level: number): string[] {
  const props = propsToTdl(m, new Set(['messageId']), level + 1);
  if (props.length <= 2) {
    // Inline format for short messages
    const inlineProps = Object.entries(m)
      .filter(([k]) => k !== 'messageId')
      .map(([k, v]) => `${k}: ${formatValue(v)}`)
      .join(', ');
    return [`${indent(level)}${m.messageId} { ${inlineProps} }`];
  }
  const lines: string[] = [];
  lines.push(`${indent(level)}${m.messageId} {`);
  lines.push(...props);
  lines.push(`${indent(level)}}`);
  return lines;
}

function filterRuleToTdl(r: JsonImportFilterRule, level: number): string[] {
  let line = `${indent(level)}${r.action} ${r.messageId}`;
  if (r.condition) {
    line += ` where { ${r.condition.field} ${r.condition.operator} ${formatValue(r.condition.value)} }`;
  }
  return [line];
}

function networkToTdl(n: JsonImportNetwork): string[] {
  const lines: string[] = [];
  lines.push(`network ${quoteString(n.name)} {`);

  // Properties (either from a flat "properties" object or top-level keys)
  const networkExclude = new Set([
    'name', 'properties', 'terminals', 'nets', 'subnetworks', 'messages', 'filters',
  ]);
  if (n.properties) {
    lines.push(...propsToTdl(n.properties, new Set(), 1));
  }
  // Also pick up link/classification if at top level
  lines.push(...propsToTdl(n as Record<string, unknown>, networkExclude, 1));

  // Terminals
  if (n.terminals && n.terminals.length > 0) {
    for (const t of n.terminals) {
      lines.push('');
      lines.push(...terminalToTdl(t, 1));
    }
  }

  // Nets
  if (n.nets && n.nets.length > 0) {
    for (const net of n.nets) {
      lines.push('');
      lines.push(...netToTdl(net, 1));
    }
  }

  // Subnetworks
  if (n.subnetworks && n.subnetworks.length > 0) {
    for (const s of n.subnetworks) {
      lines.push('');
      lines.push(...subnetworkToTdl(s, 1));
    }
  }

  // Messages
  if (n.messages && n.messages.length > 0) {
    lines.push('');
    lines.push('  messages {');
    for (const m of n.messages) {
      lines.push(...messageToTdl(m, 2));
    }
    lines.push('  }');
  }

  // Filters
  if (n.filters) {
    lines.push('');
    lines.push('  filters {');
    if (n.filters.inbound && n.filters.inbound.length > 0) {
      lines.push('    inbound {');
      for (const r of n.filters.inbound) {
        lines.push(...filterRuleToTdl(r, 3));
      }
      lines.push('    }');
    }
    if (n.filters.outbound && n.filters.outbound.length > 0) {
      lines.push('    outbound {');
      for (const r of n.filters.outbound) {
        lines.push(...filterRuleToTdl(r, 3));
      }
      lines.push('    }');
    }
    lines.push('  }');
  }

  lines.push('}');
  return lines;
}

export function importFromJson(jsonString: string): ImportResult {
  const warnings: string[] = [];
  let data: unknown;

  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    return { source: '', warnings: [`Invalid JSON: ${(e as Error).message}`] };
  }

  // Handle our own export format
  if (
    typeof data === 'object' &&
    data !== null &&
    'format' in data &&
    (data as Record<string, unknown>).format === 'tdl-config'
  ) {
    const networks = (data as Record<string, unknown>).networks as JsonImportNetwork[];
    if (!Array.isArray(networks)) {
      return { source: '', warnings: ['Invalid tdl-config format: missing networks array'] };
    }
    const blocks = networks.map(networkToTdl);
    return { source: blocks.map((b) => b.join('\n')).join('\n\n') + '\n', warnings };
  }

  // Handle array of networks
  if (Array.isArray(data)) {
    const blocks = (data as JsonImportNetwork[]).map(networkToTdl);
    return { source: blocks.map((b) => b.join('\n')).join('\n\n') + '\n', warnings };
  }

  // Handle single network object
  if (typeof data === 'object' && data !== null && 'name' in data) {
    const lines = networkToTdl(data as JsonImportNetwork);
    return { source: lines.join('\n') + '\n', warnings };
  }

  return { source: '', warnings: ['Unrecognised JSON structure. Expected a network object, array of networks, or tdl-config format.'] };
}

// ─── CSV Import ───────────────────────────────────────────────────────────

/**
 * Import terminals from CSV. Expected columns (case-insensitive, order-flexible):
 *   name, track_number, platform_type, role, subscribes, transmits
 *
 * The first line is treated as headers.
 * A "network" column is optional — if present, terminals are grouped into separate networks.
 */
export function importFromCsv(csvString: string): ImportResult {
  const warnings: string[] = [];
  const rows = parseCsvRows(csvString);

  if (rows.length < 2) {
    return { source: '', warnings: ['CSV must have a header row and at least one data row.'] };
  }

  const headers = rows[0]!.map((h) => h.trim().toLowerCase());
  const nameIdx = headers.indexOf('name');
  if (nameIdx === -1) {
    return { source: '', warnings: ['CSV must have a "name" column.'] };
  }

  const networkIdx = headers.indexOf('network');
  const knownKeys = new Set(['name', 'network']);

  // Property column indices
  const propCols: { key: string; idx: number }[] = [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i]!;
    if (!knownKeys.has(h) && h !== '') {
      propCols.push({ key: h, idx: i });
    }
  }

  // Group terminals by network
  const networkMap = new Map<string, JsonImportTerminal[]>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!;
    if (row.every((cell) => cell.trim() === '')) continue; // skip blank rows

    const name = (row[nameIdx] ?? '').trim();
    if (!name) {
      warnings.push(`Row ${r + 1}: skipped \u2014 no name.`);
      continue;
    }

    const networkName = networkIdx >= 0 ? ((row[networkIdx] ?? '').trim() || 'IMPORTED') : 'IMPORTED';
    if (!networkMap.has(networkName)) {
      networkMap.set(networkName, []);
    }

    const terminal: JsonImportTerminal = { name };
    for (const col of propCols) {
      const val = (row[col.idx] ?? '').trim();
      if (!val) continue;

      // Try to parse arrays (comma-separated inside brackets or just comma-separated)
      if (val.startsWith('[') && val.endsWith(']')) {
        terminal[col.key] = val.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
      } else if ((col.key === 'subscribes' || col.key === 'transmits') && val.includes(',')) {
        terminal[col.key] = val.split(',').map((s) => s.trim()).filter(Boolean);
      } else if (val.toLowerCase() === 'true' || val.toLowerCase() === 'false') {
        terminal[col.key] = val.toLowerCase() === 'true';
      } else if (/^\d+$/.test(val)) {
        // Keep track numbers as strings (leading zeros matter)
        if (col.key === 'track_number' || col.key === 'net_number') {
          terminal[col.key] = val;
        } else {
          terminal[col.key] = Number(val);
        }
      } else if (/^\d+%$/.test(val)) {
        terminal[col.key] = val;
      } else {
        terminal[col.key] = val;
      }
    }

    networkMap.get(networkName)!.push(terminal);
  }

  // Generate TDL source
  const blocks: string[] = [];
  for (const [netName, terminals] of networkMap) {
    const lines: string[] = [];
    lines.push(`network ${quoteString(netName)} {`);
    lines.push('  link: Link16');
    lines.push('  classification: UNCLASSIFIED');
    for (const t of terminals) {
      lines.push('');
      lines.push(...terminalToTdl(t, 1));
    }
    lines.push('}');
    blocks.push(lines.join('\n'));
  }

  return { source: blocks.join('\n\n') + '\n', warnings };
}

/** Simple CSV parser that handles quoted fields. */
function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  const lines = csv.split(/\r?\n/);

  for (const line of lines) {
    if (line.trim() === '') continue;
    const cells: string[] = [];
    let i = 0;
    while (i < line.length) {
      if (line[i] === '"') {
        // Quoted field
        let val = '';
        i++; // skip opening quote
        while (i < line.length) {
          if (line[i] === '"') {
            if (i + 1 < line.length && line[i + 1] === '"') {
              val += '"';
              i += 2;
            } else {
              i++; // skip closing quote
              break;
            }
          } else {
            val += line[i];
            i++;
          }
        }
        cells.push(val);
        if (i < line.length && line[i] === ',') i++; // skip comma
      } else {
        const nextComma = line.indexOf(',', i);
        if (nextComma === -1) {
          cells.push(line.slice(i));
          i = line.length;
        } else {
          cells.push(line.slice(i, nextComma));
          i = nextComma + 1;
        }
      }
    }
    rows.push(cells);
  }

  return rows;
}

// ─── XML Import ───────────────────────────────────────────────────────────

/**
 * Import from tdl-config XML format.
 * Uses basic DOM parsing (available in all browsers).
 */
export function importFromXml(xmlString: string): ImportResult {
  const warnings: string[] = [];
  let doc: Document;

  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(xmlString, 'application/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return { source: '', warnings: [`Invalid XML: ${parseError.textContent}`] };
    }
  } catch (e) {
    return { source: '', warnings: [`Failed to parse XML: ${(e as Error).message}`] };
  }

  const networkElements = doc.querySelectorAll('network');
  if (networkElements.length === 0) {
    return { source: '', warnings: ['No <network> elements found in XML.'] };
  }

  const networks: JsonImportNetwork[] = [];

  for (const netEl of networkElements) {
    const name = netEl.getAttribute('name') || 'UNNAMED';
    const network: JsonImportNetwork = { name, terminals: [], nets: [], subnetworks: [], messages: [] };

    // Extract direct property children (not nested in terminals/nets/etc)
    const propElements = Array.from(netEl.children).filter(
      (el) => !['terminals', 'nets', 'subnetworks', 'messages', 'filters'].includes(el.tagName)
    );
    network.properties = {};
    for (const prop of propElements) {
      if (prop.querySelector('item')) {
        // Array property
        network.properties[prop.tagName] = Array.from(prop.querySelectorAll('item')).map(
          (item) => item.textContent || ''
        );
      } else {
        network.properties[prop.tagName] = prop.textContent || '';
      }
    }

    // Terminals
    for (const tEl of netEl.querySelectorAll(':scope > terminals > terminal')) {
      const terminal: JsonImportTerminal = { name: tEl.getAttribute('name') || '' };
      for (const child of tEl.children) {
        if (child.querySelector('item')) {
          terminal[child.tagName] = Array.from(child.querySelectorAll('item')).map(
            (item) => item.textContent || ''
          );
        } else {
          terminal[child.tagName] = child.textContent || '';
        }
      }
      network.terminals!.push(terminal);
    }

    // Nets
    for (const nEl of netEl.querySelectorAll(':scope > nets > net')) {
      const net: JsonImportNet = { name: nEl.getAttribute('name') || '' };
      for (const child of nEl.children) {
        if (child.querySelector('item')) {
          net[child.tagName] = Array.from(child.querySelectorAll('item')).map(
            (item) => item.textContent || ''
          );
        } else {
          net[child.tagName] = child.textContent || '';
        }
      }
      network.nets!.push(net);
    }

    // Subnetworks
    for (const sEl of netEl.querySelectorAll(':scope > subnetworks > subnetwork')) {
      const sub: JsonImportSubnetwork = {
        name: sEl.getAttribute('name') || '',
        members: [],
      };
      // Properties (exclude members container)
      for (const child of Array.from(sEl.children).filter((el) => el.tagName !== 'members')) {
        if (child.querySelector('item')) {
          sub[child.tagName] = Array.from(child.querySelectorAll('item')).map(
            (item) => item.textContent || ''
          );
        } else {
          sub[child.tagName] = child.textContent || '';
        }
      }
      // Members
      for (const mEl of sEl.querySelectorAll(':scope > members > member')) {
        const member: JsonImportMember = { name: mEl.getAttribute('name') || '' };
        for (const child of mEl.children) {
          if (child.querySelector('item')) {
            member[child.tagName] = Array.from(child.querySelectorAll('item')).map(
              (item) => item.textContent || ''
            );
          } else {
            member[child.tagName] = child.textContent || '';
          }
        }
        sub.members!.push(member);
      }
      network.subnetworks!.push(sub);
    }

    // Messages
    for (const mEl of netEl.querySelectorAll(':scope > messages > message')) {
      const msg: JsonImportMessage = { messageId: mEl.getAttribute('id') || '' };
      for (const child of mEl.children) {
        msg[child.tagName] = child.textContent || '';
      }
      network.messages!.push(msg);
    }

    // Filters
    const filtersEl = netEl.querySelector(':scope > filters');
    if (filtersEl) {
      network.filters = {};
      const inboundRules: JsonImportFilterRule[] = [];
      for (const rEl of filtersEl.querySelectorAll(':scope > inbound > rule')) {
        const rule: JsonImportFilterRule = {
          action: rEl.getAttribute('action') || 'accept',
          messageId: rEl.getAttribute('message') || '',
        };
        const condEl = rEl.querySelector('condition');
        if (condEl) {
          rule.condition = {
            field: condEl.getAttribute('field') || '',
            operator: condEl.getAttribute('operator') || '',
            value: condEl.getAttribute('value') || '',
          };
        }
        inboundRules.push(rule);
      }
      if (inboundRules.length > 0) network.filters.inbound = inboundRules;

      const outboundRules: JsonImportFilterRule[] = [];
      for (const rEl of filtersEl.querySelectorAll(':scope > outbound > rule')) {
        const rule: JsonImportFilterRule = {
          action: rEl.getAttribute('action') || 'accept',
          messageId: rEl.getAttribute('message') || '',
        };
        const condEl = rEl.querySelector('condition');
        if (condEl) {
          rule.condition = {
            field: condEl.getAttribute('field') || '',
            operator: condEl.getAttribute('operator') || '',
            value: condEl.getAttribute('value') || '',
          };
        }
        outboundRules.push(rule);
      }
      if (outboundRules.length > 0) network.filters.outbound = outboundRules;
    }

    networks.push(network);
  }

  const blocks = networks.map(networkToTdl);
  return { source: blocks.map((b) => b.join('\n')).join('\n\n') + '\n', warnings };
}

// ─── Auto-detect format ──────────────────────────────────────────────────

export type ImportFormat = 'json' | 'csv' | 'xml' | 'tdl';

export function detectFormat(content: string): ImportFormat {
  const trimmed = content.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (trimmed.startsWith('<?xml') || trimmed.startsWith('<tdl-config') || trimmed.startsWith('<network')) return 'xml';
  // Check if it looks like TDL DSL
  if (/^\s*(--|network\s)/.test(trimmed)) return 'tdl';
  return 'csv';
}

export function importAuto(content: string): ImportResult {
  const format = detectFormat(content);
  switch (format) {
    case 'json':
      return importFromJson(content);
    case 'csv':
      return importFromCsv(content);
    case 'xml':
      return importFromXml(content);
    case 'tdl':
      return { source: content, warnings: ['Content is already in TDL format.'] };
  }
}
