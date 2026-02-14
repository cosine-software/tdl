// ─── Source Span ───────────────────────────────────────────────────────────

/** Represents a location range in source text. */
export interface SourceSpan {
  /** 1-based line number (start). */
  line: number;
  /** 1-based column number (start). */
  column: number;
  /** 0-based character offset from start of source. */
  offset: number;
  /** Length in characters. */
  length: number;
}

// ─── Token Types ──────────────────────────────────────────────────────────

export enum TokenType {
  // Literals
  String = 'String',
  Number = 'Number',
  Percent = 'Percent',
  Duration = 'Duration',
  Boolean = 'Boolean',
  HexNumber = 'HexNumber',

  // Identifiers & keywords
  Keyword = 'Keyword',
  Identifier = 'Identifier',
  JMessage = 'JMessage',

  // Punctuation
  LBrace = 'LBrace',
  RBrace = 'RBrace',
  LBracket = 'LBracket',
  RBracket = 'RBracket',
  Colon = 'Colon',
  Comma = 'Comma',

  // Operators
  GreaterThanOrEqual = 'GreaterThanOrEqual',
  LessThanOrEqual = 'LessThanOrEqual',
  GreaterThan = 'GreaterThan',
  LessThan = 'LessThan',
  EqualEqual = 'EqualEqual',
  NotEqual = 'NotEqual',

  // Trivia
  Comment = 'Comment',
  Whitespace = 'Whitespace',
  Newline = 'Newline',

  // Special
  EOF = 'EOF',
  Unknown = 'Unknown',
}

export interface Token {
  type: TokenType;
  value: string;
  span: SourceSpan;
}

// ─── Keywords ─────────────────────────────────────────────────────────────

export const KEYWORDS = new Set([
  'network',
  'terminal',
  'net',
  'subnetwork',
  'member',
  'messages',
  'filters',
  'inbound',
  'outbound',
  'accept',
  'drop',
  'where',
  'link',
  'classification',
  'track_number',
  'platform_type',
  'role',
  'subscribes',
  'transmits',
  'net_number',
  'npg',
  'stacked',
  'stacking_level',
  'tsdf',
  'participants',
  'enabled',
  'operating_mode',
  'data_rate',
  'unit_id',
  'forwarding',
  'quality',
  'age',
]);

// ─── AST Node Types ──────────────────────────────────────────────────────

export type ASTNode =
  | DocumentNode
  | NetworkDeclaration
  | TerminalDeclaration
  | NetDeclaration
  | SubnetworkDeclaration
  | MemberDeclaration
  | MessageCatalog
  | MessageEntry
  | FilterBlock
  | FilterRule
  | PropertyAssignment
  | ArrayLiteral
  | WhereClause
  | ConditionExpression;

export interface DocumentNode {
  kind: 'Document';
  networks: NetworkDeclaration[];
  span: SourceSpan;
}

export interface NetworkDeclaration {
  kind: 'Network';
  name: string;
  properties: PropertyAssignment[];
  terminals: TerminalDeclaration[];
  nets: NetDeclaration[];
  subnetworks: SubnetworkDeclaration[];
  messages: MessageCatalog | null;
  filters: FilterBlock | null;
  span: SourceSpan;
}

export interface TerminalDeclaration {
  kind: 'Terminal';
  name: string;
  properties: PropertyAssignment[];
  span: SourceSpan;
}

export interface NetDeclaration {
  kind: 'Net';
  name: string;
  properties: PropertyAssignment[];
  span: SourceSpan;
}

export interface SubnetworkDeclaration {
  kind: 'Subnetwork';
  name: string;
  properties: PropertyAssignment[];
  members: MemberDeclaration[];
  span: SourceSpan;
}

export interface MemberDeclaration {
  kind: 'Member';
  name: string;
  properties: PropertyAssignment[];
  span: SourceSpan;
}

export interface MessageCatalog {
  kind: 'MessageCatalog';
  entries: MessageEntry[];
  span: SourceSpan;
}

export interface MessageEntry {
  kind: 'MessageEntry';
  messageId: string;
  properties: PropertyAssignment[];
  span: SourceSpan;
}

export interface FilterBlock {
  kind: 'FilterBlock';
  inbound: FilterRule[];
  outbound: FilterRule[];
  span: SourceSpan;
}

export interface FilterRule {
  kind: 'FilterRule';
  action: 'accept' | 'drop';
  messageId: string;
  where: WhereClause | null;
  span: SourceSpan;
}

export interface WhereClause {
  kind: 'WhereClause';
  condition: ConditionExpression;
  span: SourceSpan;
}

export interface ConditionExpression {
  kind: 'Condition';
  field: string;
  operator: '>=' | '<=' | '>' | '<' | '==' | '!=';
  value: string;
  span: SourceSpan;
}

export interface PropertyAssignment {
  kind: 'Property';
  key: string;
  value: PropertyValue;
  comment?: string;
  span: SourceSpan;
}

export type PropertyValue =
  | { type: 'string'; value: string }
  | { type: 'number'; value: number }
  | { type: 'percent'; value: number }
  | { type: 'duration'; value: string }
  | { type: 'boolean'; value: boolean }
  | { type: 'identifier'; value: string }
  | { type: 'hex'; value: string }
  | { type: 'array'; value: string[] };

export interface ArrayLiteral {
  kind: 'ArrayLiteral';
  elements: string[];
  span: SourceSpan;
}

// ─── Diagnostics ──────────────────────────────────────────────────────────

export type DiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';

export interface Diagnostic {
  message: string;
  severity: DiagnosticSeverity;
  span: SourceSpan;
  rule?: string;
  specRef?: string;
}

// ─── Parse Result ─────────────────────────────────────────────────────────

export interface ParseResult {
  ast: DocumentNode;
  diagnostics: Diagnostic[];
}
