import type { languages } from 'monaco-editor';

/**
 * Monarch tokeniser for the TDL configuration language.
 *
 * This provides fast, regex-based syntax highlighting in Monaco.
 * The full lexer/parser runs separately for diagnostics.
 */
export const tdlLanguageDefinition: languages.IMonarchLanguage = {
  defaultToken: 'invalid',

  keywords: [
    'network', 'terminal', 'net', 'subnetwork', 'member',
    'messages', 'filters', 'inbound', 'outbound',
    'accept', 'drop', 'where',
  ],

  propertyKeywords: [
    'link', 'classification', 'track_number', 'platform_type',
    'role', 'subscribes', 'transmits', 'net_number',
    'npg', 'stacked', 'stacking_level', 'tsdf', 'participants',
    'enabled', 'operating_mode', 'data_rate', 'unit_id', 'forwarding',
    'quality', 'age',
  ],

  linkTypes: ['Link16', 'Link22'],

  roles: [
    'NetControlStation', 'Participant', 'ForwardTell', 'Relay',
    'Controller',
  ],

  booleans: ['true', 'false'],

  operators: ['>=', '<=', '>', '<', '==', '!='],

  tokenizer: {
    root: [
      // Comments
      [/--.*$/, 'comment'],

      // J-message identifiers (before general identifiers)
      [/J\d+\/\d+/, 'type.identifier'],

      // Percentages
      [/\d+\.?\d*%/, 'number.float'],

      // Durations
      [/\d+(?:ms|s|min|h)\b/, 'number'],

      // Hex numbers
      [/0x[0-9a-fA-F]+/, 'number.hex'],

      // Numbers
      [/\d+\.?\d*/, 'number'],

      // Strings
      [/"[^"]*"/, 'string'],

      // NPG identifiers
      [/NPG_[A-Za-z0-9]+/, 'variable.predefined'],

      // Identifiers and keywords
      [/[a-zA-Z_][\w-]*/, {
        cases: {
          '@keywords': 'keyword',
          '@propertyKeywords': 'variable',
          '@linkTypes': 'type',
          '@roles': 'type.identifier',
          '@booleans': 'keyword.other',
          '@default': 'identifier',
        },
      }],

      // Punctuation
      [/[{}]/, '@brackets'],
      [/[[\]]/, '@brackets'],
      [/:/, 'delimiter'],
      [/,/, 'delimiter'],

      // Operators
      [/>=|<=|==|!=|>|</, 'operator'],

      // Whitespace
      [/\s+/, 'white'],
    ],
  },
};

/**
 * Language configuration for bracket matching, comments, etc.
 */
export const tdlLanguageConfig: languages.LanguageConfiguration = {
  comments: {
    lineComment: '--',
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '"', close: '"' },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '"', close: '"' },
  ],
  folding: {
    markers: {
      start: /\{/,
      end: /\}/,
    },
  },
  indentationRules: {
    increaseIndentPattern: /\{[^}]*$/,
    decreaseIndentPattern: /^\s*\}/,
  },
};
