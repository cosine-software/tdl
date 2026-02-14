import type { languages, Position, editor, IRange } from 'monaco-editor';
import {
  findNPG,
  findJMessage,
  findRole,
  findPlatformType,
  LINK16_NPGS,
  LINK16_MESSAGES,
  LINK16_ROLES,
  LINK16_PLATFORM_TYPES,
  CLASSIFICATION_LEVELS,
  LINK22_OPERATING_MODES,
  LINK22_DATA_RATES,
  LINK22_ROLES,
} from '../specs/link16';

// ─── Completion Provider ────────────────────────────────────────────

export function createCompletionProvider(): languages.CompletionItemProvider {
  return {
    triggerCharacters: [':' , ' ', '['],

    provideCompletionItems(
      model: editor.ITextModel,
      position: Position,
    ): languages.ProviderResult<languages.CompletionList> {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      const wordInfo = model.getWordUntilPosition(position);
      const range: IRange = {
        startLineNumber: position.lineNumber,
        startColumn: wordInfo.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: wordInfo.endColumn,
      };

      const suggestions: languages.CompletionItem[] = [];

      // After "link:"
      if (/link:\s*\w*$/.test(textUntilPosition)) {
        suggestions.push(
          mkCompletion('Link16', 'Link 16 (MIL-STD-6016 / TADIL-J)', range, 'Value'),
          mkCompletion('Link22', 'Link 22 (STANAG 5522)', range, 'Value'),
        );
        return { suggestions };
      }

      // After "role:"
      if (/role:\s*\w*$/.test(textUntilPosition)) {
        for (const role of [...LINK16_ROLES, ...LINK22_ROLES]) {
          suggestions.push(mkCompletion(role.id, role.description, range, 'EnumMember'));
        }
        return { suggestions };
      }

      // After "npg:"
      if (/npg:\s*\w*$/.test(textUntilPosition)) {
        for (const npg of LINK16_NPGS) {
          suggestions.push(
            mkCompletion(npg.id, `${npg.name}: ${npg.description}`, range, 'EnumMember'),
          );
        }
        return { suggestions };
      }

      // After "platform_type:"
      if (/platform_type:\s*\w*$/.test(textUntilPosition)) {
        for (const pt of LINK16_PLATFORM_TYPES) {
          suggestions.push(mkCompletion(pt.id, `${pt.name} — ${pt.description}`, range, 'EnumMember'));
        }
        return { suggestions };
      }

      // After "classification:"
      if (/classification:\s*\w*$/.test(textUntilPosition)) {
        for (const cl of CLASSIFICATION_LEVELS) {
          suggestions.push(mkCompletion(cl.id, cl.description, range, 'EnumMember'));
        }
        return { suggestions };
      }

      // After "operating_mode:"
      if (/operating_mode:\s*\w*$/.test(textUntilPosition)) {
        for (const om of LINK22_OPERATING_MODES) {
          suggestions.push(mkCompletion(om.id, om.description, range, 'EnumMember'));
        }
        return { suggestions };
      }

      // After "data_rate:"
      if (/data_rate:\s*\w*$/.test(textUntilPosition)) {
        for (const dr of LINK22_DATA_RATES) {
          suggestions.push(mkCompletion(dr.id, dr.description, range, 'EnumMember'));
        }
        return { suggestions };
      }

      // Inside array context (subscribes/transmits): suggest NPGs
      if (/(?:subscribes|transmits):\s*\[.*$/.test(textUntilPosition)) {
        for (const npg of LINK16_NPGS) {
          suggestions.push(
            mkCompletion(npg.id, `${npg.name}: ${npg.description}`, range, 'EnumMember'),
          );
        }
        return { suggestions };
      }

      // Inside messages block: suggest J-message IDs
      if (isInsideBlock(model, position, 'messages')) {
        for (const msg of LINK16_MESSAGES) {
          suggestions.push(
            mkCompletion(
              msg.id,
              `${msg.name} — ${msg.description}\nValid NPGs: ${msg.validNPGs.join(', ')}`,
              range,
              'Constant',
            ),
          );
        }
        return { suggestions };
      }

      // Top-level keywords
      const topLevelKeywords = [
        { label: 'network', detail: 'Declare a TDL network' },
      ];
      const blockKeywords = [
        { label: 'terminal', detail: 'Declare a terminal/platform' },
        { label: 'net', detail: 'Declare a network net' },
        { label: 'subnetwork', detail: 'Declare a Link 22 subnetwork' },
        { label: 'messages', detail: 'Define message catalog' },
        { label: 'filters', detail: 'Define filter rules' },
        { label: 'member', detail: 'Declare a Link 22 member' },
      ];
      const propertyKeywords = [
        'link', 'classification', 'track_number', 'platform_type',
        'role', 'subscribes', 'transmits', 'net_number',
        'npg', 'stacked', 'stacking_level', 'tsdf', 'participants',
        'enabled', 'operating_mode', 'data_rate', 'unit_id', 'forwarding',
      ];

      for (const kw of topLevelKeywords) {
        suggestions.push(mkCompletion(kw.label, kw.detail, range, 'Keyword'));
      }
      for (const kw of blockKeywords) {
        suggestions.push(mkCompletion(kw.label, kw.detail, range, 'Keyword'));
      }
      for (const kw of propertyKeywords) {
        suggestions.push(mkCompletion(kw, `Property: ${kw}`, range, 'Property'));
      }

      return { suggestions };
    },
  };
}

// ─── Hover Provider ─────────────────────────────────────────────────

export function createHoverProvider(): languages.HoverProvider {
  return {
    provideHover(
      model: editor.ITextModel,
      position: Position,
    ): languages.ProviderResult<languages.Hover> {
      const wordInfo = model.getWordAtPosition(position);
      if (!wordInfo) return null;

      const word = wordInfo.word;
      const range: IRange = {
        startLineNumber: position.lineNumber,
        startColumn: wordInfo.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: wordInfo.endColumn,
      };

      // Check for NPG
      const npg = findNPG(word);
      if (npg) {
        return {
          range,
          contents: [
            { value: `**${npg.id}** — ${npg.name} (NPG ${npg.number})` },
            { value: npg.description },
            { value: `*Ref: ${npg.specRef}*` },
          ],
        };
      }

      // Check if word is part of a J-message pattern
      // Monaco's word detection may split on the slash, so check the full line
      const lineContent = model.getLineContent(position.lineNumber);
      const jMsgMatch = lineContent.match(/J\d+\/\d+/g);
      if (jMsgMatch) {
        for (const jid of jMsgMatch) {
          const idx = lineContent.indexOf(jid);
          if (
            position.column >= idx + 1 &&
            position.column <= idx + jid.length + 1
          ) {
            const msg = findJMessage(jid);
            if (msg) {
              return {
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: idx + 1,
                  endLineNumber: position.lineNumber,
                  endColumn: idx + jid.length + 1,
                },
                contents: [
                  { value: `**${msg.id}** — ${msg.name}` },
                  { value: `*${msg.functionalArea}*` },
                  { value: msg.description },
                  { value: `Fields: ${msg.fields.map((f) => f.name).join(', ')}` },
                  { value: `Valid NPGs: ${msg.validNPGs.join(', ')}` },
                  { value: `*Ref: ${msg.specRef}*` },
                ],
              };
            }
          }
        }
      }

      // Check for role
      const role = findRole(word);
      if (role) {
        return {
          range,
          contents: [
            { value: `**${role.id}** — ${role.name}` },
            { value: role.description },
            { value: role.specRef ? `*Ref: ${role.specRef}*` : '' },
          ],
        };
      }

      // Check for platform type
      const pt = findPlatformType(word);
      if (pt) {
        return {
          range,
          contents: [
            { value: `**${pt.id}** — ${pt.name}` },
            { value: pt.description },
          ],
        };
      }

      // Keyword hover
      const keywordDocs: Record<string, string> = {
        network: 'Declares a Tactical Data Link network configuration.\n\nContains terminals, nets, messages, and filters.',
        terminal: 'Declares a terminal (platform/unit) participating in the network.\n\nSpecify track number, platform type, role, and NPG subscriptions.',
        net: 'Declares a network net with assigned NPG and time slot allocation.\n\nNets define communication channels within the network.',
        messages: 'Defines the message catalog — which J-series messages are enabled and their NPG assignments.',
        filters: 'Defines inbound/outbound filter rules for message acceptance and rejection.',
        subnetwork: 'Declares a Link 22 subnetwork.\n\nContains member declarations and operating parameters.',
        member: 'Declares a member within a Link 22 subnetwork.',
        tsdf: 'Time Slot Duty Factor — the percentage of available time slots allocated to this net.\n\nTotal TSDF across all nets must not exceed 100%.\n\n*Ref: MIL-STD-6016 §4.3.2*',
        stacked: 'Whether this net uses stacked (multi-level) time slot architecture.\n\nIf true, stacking_level must be 2 or 4.\n\n*Ref: MIL-STD-6016 §4.4.1*',
      };

      if (keywordDocs[word]) {
        return {
          range,
          contents: [{ value: keywordDocs[word]! }],
        };
      }

      return null;
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function mkCompletion(
  label: string,
  detail: string,
  range: IRange,
  kindStr: string,
): languages.CompletionItem {
  // Map string to CompletionItemKind number
  const kindMap: Record<string, number> = {
    Keyword: 17,
    Value: 12,
    EnumMember: 16,
    Property: 9,
    Constant: 14,
  };
  return {
    label,
    kind: kindMap[kindStr] ?? 12,
    documentation: detail,
    insertText: label,
    range,
  };
}

function isInsideBlock(
  model: editor.ITextModel,
  position: Position,
  blockKeyword: string,
): boolean {
  // Walk backwards to find if we're inside a block of the given keyword
  for (let line = position.lineNumber; line >= 1; line--) {
    const content = model.getLineContent(line).trim();
    if (content.startsWith(blockKeyword)) {
      return true;
    }
    // If we hit a network or terminal declaration, stop
    if (
      content.startsWith('network') ||
      content.startsWith('terminal') ||
      content.startsWith('net ') ||
      content.startsWith('subnetwork')
    ) {
      return false;
    }
  }
  return false;
}
