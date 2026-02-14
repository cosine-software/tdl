import {
  Token,
  TokenType,
  DocumentNode,
  NetworkDeclaration,
  TerminalDeclaration,
  NetDeclaration,
  SubnetworkDeclaration,
  MemberDeclaration,
  MessageCatalog,
  MessageEntry,
  FilterBlock,
  FilterRule,
  WhereClause,
  ConditionExpression,
  PropertyAssignment,
  PropertyValue,
  Diagnostic,
  ParseResult,
  SourceSpan,
} from './types';
import { lexWithTrivia } from './lexer';

/**
 * Recursive descent parser for TDL configuration language.
 *
 * Key design decisions:
 * - Error recovery: does not bail on first error; uses synchronisation
 *   points ('}', newlines) to recover and produce partial AST.
 * - Source mapping: every AST node carries SourceSpan for editor integration.
 * - Comments are preserved for documentation features.
 */
export class Parser {
  private tokens: Token[] = [];
  private pos: number = 0;
  private diagnostics: Diagnostic[] = [];

  /** Comments extracted during parsing — available for documentation features. */
  public comments: Token[] = [];

  /**
   * Parse TDL source text into AST + diagnostics.
   */
  parse(source: string): ParseResult {
    // Get all tokens for comment extraction
    const allTokens = lexWithTrivia(source);
    this.comments = allTokens.filter((t) => t.type === TokenType.Comment);

    // Filter to significant tokens for parsing
    this.tokens = allTokens.filter(
      (t) =>
        t.type !== TokenType.Comment &&
        t.type !== TokenType.Whitespace &&
        t.type !== TokenType.Newline,
    );
    this.pos = 0;
    this.diagnostics = [];

    const networks: NetworkDeclaration[] = [];
    const startSpan = this.currentSpan();

    while (!this.isAtEnd()) {
      if (this.check(TokenType.Keyword, 'network')) {
        const network = this.parseNetworkDeclaration();
        if (network) {
          networks.push(network);
        }
      } else {
        this.error(`Expected 'network' declaration, got '${this.currentValue()}'`);
        this.advance(); // skip unexpected token
      }
    }

    const endSpan = this.currentSpan();
    const ast: DocumentNode = {
      kind: 'Document',
      networks,
      span: this.mergeSpans(startSpan, endSpan),
    };

    return { ast, diagnostics: this.diagnostics };
  }

  // ─── Network ────────────────────────────────────────────────────────

  private parseNetworkDeclaration(): NetworkDeclaration | null {
    const startSpan = this.currentSpan();
    this.expect(TokenType.Keyword, 'network');

    const name = this.expectString();
    if (!this.expectToken(TokenType.LBrace)) {
      this.synchronize();
      return null;
    }

    const properties: PropertyAssignment[] = [];
    const terminals: TerminalDeclaration[] = [];
    const nets: NetDeclaration[] = [];
    const subnetworks: SubnetworkDeclaration[] = [];
    let messages: MessageCatalog | null = null;
    let filters: FilterBlock | null = null;

    while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
      if (this.check(TokenType.Keyword, 'terminal')) {
        const terminal = this.parseTerminalDeclaration();
        if (terminal) terminals.push(terminal);
      } else if (this.check(TokenType.Keyword, 'net')) {
        const net = this.parseNetDeclaration();
        if (net) nets.push(net);
      } else if (this.check(TokenType.Keyword, 'subnetwork')) {
        const sub = this.parseSubnetworkDeclaration();
        if (sub) subnetworks.push(sub);
      } else if (this.check(TokenType.Keyword, 'messages')) {
        messages = this.parseMessageCatalog();
      } else if (this.check(TokenType.Keyword, 'filters')) {
        filters = this.parseFilterBlock();
      } else if (this.check(TokenType.Keyword) || this.check(TokenType.Identifier)) {
        const prop = this.parsePropertyAssignment();
        if (prop) properties.push(prop);
      } else {
        this.error(`Unexpected token '${this.currentValue()}' in network body`);
        this.advance();
      }
    }

    const endSpan = this.currentSpan();
    this.expectToken(TokenType.RBrace);

    return {
      kind: 'Network',
      name,
      properties,
      terminals,
      nets,
      subnetworks,
      messages,
      filters,
      span: this.mergeSpans(startSpan, endSpan),
    };
  }

  // ─── Terminal ───────────────────────────────────────────────────────

  private parseTerminalDeclaration(): TerminalDeclaration | null {
    const startSpan = this.currentSpan();
    this.expect(TokenType.Keyword, 'terminal');

    const name = this.expectString();
    if (!this.expectToken(TokenType.LBrace)) {
      this.synchronize();
      return null;
    }

    const properties = this.parsePropertyBlock();

    const endSpan = this.currentSpan();
    this.expectToken(TokenType.RBrace);

    return {
      kind: 'Terminal',
      name,
      properties,
      span: this.mergeSpans(startSpan, endSpan),
    };
  }

  // ─── Net ────────────────────────────────────────────────────────────

  private parseNetDeclaration(): NetDeclaration | null {
    const startSpan = this.currentSpan();
    this.expect(TokenType.Keyword, 'net');

    const name = this.expectString();
    if (!this.expectToken(TokenType.LBrace)) {
      this.synchronize();
      return null;
    }

    const properties = this.parsePropertyBlock();

    const endSpan = this.currentSpan();
    this.expectToken(TokenType.RBrace);

    return {
      kind: 'Net',
      name,
      properties,
      span: this.mergeSpans(startSpan, endSpan),
    };
  }

  // ─── Subnetwork ─────────────────────────────────────────────────────

  private parseSubnetworkDeclaration(): SubnetworkDeclaration | null {
    const startSpan = this.currentSpan();
    this.expect(TokenType.Keyword, 'subnetwork');

    const name = this.expectString();
    if (!this.expectToken(TokenType.LBrace)) {
      this.synchronize();
      return null;
    }

    const properties: PropertyAssignment[] = [];
    const members: MemberDeclaration[] = [];

    while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
      if (this.check(TokenType.Keyword, 'member')) {
        const member = this.parseMemberDeclaration();
        if (member) members.push(member);
      } else if (this.check(TokenType.Keyword) || this.check(TokenType.Identifier)) {
        const prop = this.parsePropertyAssignment();
        if (prop) properties.push(prop);
      } else {
        this.error(`Unexpected token '${this.currentValue()}' in subnetwork body`);
        this.advance();
      }
    }

    const endSpan = this.currentSpan();
    this.expectToken(TokenType.RBrace);

    return {
      kind: 'Subnetwork',
      name,
      properties,
      members,
      span: this.mergeSpans(startSpan, endSpan),
    };
  }

  // ─── Member ─────────────────────────────────────────────────────────

  private parseMemberDeclaration(): MemberDeclaration | null {
    const startSpan = this.currentSpan();
    this.expect(TokenType.Keyword, 'member');

    const name = this.expectString();
    if (!this.expectToken(TokenType.LBrace)) {
      this.synchronize();
      return null;
    }

    const properties = this.parsePropertyBlock();

    const endSpan = this.currentSpan();
    this.expectToken(TokenType.RBrace);

    return {
      kind: 'Member',
      name,
      properties,
      span: this.mergeSpans(startSpan, endSpan),
    };
  }

  // ─── Messages ───────────────────────────────────────────────────────

  private parseMessageCatalog(): MessageCatalog | null {
    const startSpan = this.currentSpan();
    this.expect(TokenType.Keyword, 'messages');

    if (!this.expectToken(TokenType.LBrace)) {
      this.synchronize();
      return null;
    }

    const entries: MessageEntry[] = [];

    while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
      if (this.check(TokenType.JMessage)) {
        const entry = this.parseMessageEntry();
        if (entry) entries.push(entry);
      } else {
        this.error(`Expected J-message identifier, got '${this.currentValue()}'`);
        this.advance();
      }
    }

    const endSpan = this.currentSpan();
    this.expectToken(TokenType.RBrace);

    return {
      kind: 'MessageCatalog',
      entries,
      span: this.mergeSpans(startSpan, endSpan),
    };
  }

  private parseMessageEntry(): MessageEntry | null {
    const startSpan = this.currentSpan();
    const messageId = this.currentValue();
    this.advance();

    if (!this.expectToken(TokenType.LBrace)) {
      this.synchronize();
      return null;
    }

    const properties = this.parsePropertyBlock();

    const endSpan = this.currentSpan();
    this.expectToken(TokenType.RBrace);

    return {
      kind: 'MessageEntry',
      messageId,
      properties,
      span: this.mergeSpans(startSpan, endSpan),
    };
  }

  // ─── Filters ────────────────────────────────────────────────────────

  private parseFilterBlock(): FilterBlock | null {
    const startSpan = this.currentSpan();
    this.expect(TokenType.Keyword, 'filters');

    if (!this.expectToken(TokenType.LBrace)) {
      this.synchronize();
      return null;
    }

    const inbound: FilterRule[] = [];
    const outbound: FilterRule[] = [];

    while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
      if (this.check(TokenType.Keyword, 'inbound')) {
        this.advance();
        if (!this.expectToken(TokenType.LBrace)) {
          this.synchronize();
          continue;
        }
        while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
          const rule = this.parseFilterRule();
          if (rule) inbound.push(rule);
        }
        this.expectToken(TokenType.RBrace);
      } else if (this.check(TokenType.Keyword, 'outbound')) {
        this.advance();
        if (!this.expectToken(TokenType.LBrace)) {
          this.synchronize();
          continue;
        }
        while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
          const rule = this.parseFilterRule();
          if (rule) outbound.push(rule);
        }
        this.expectToken(TokenType.RBrace);
      } else {
        this.error(`Expected 'inbound' or 'outbound', got '${this.currentValue()}'`);
        this.advance();
      }
    }

    const endSpan = this.currentSpan();
    this.expectToken(TokenType.RBrace);

    return {
      kind: 'FilterBlock',
      inbound,
      outbound,
      span: this.mergeSpans(startSpan, endSpan),
    };
  }

  private parseFilterRule(): FilterRule | null {
    const startSpan = this.currentSpan();

    let action: 'accept' | 'drop';
    if (this.check(TokenType.Keyword, 'accept')) {
      action = 'accept';
      this.advance();
    } else if (this.check(TokenType.Keyword, 'drop')) {
      action = 'drop';
      this.advance();
    } else {
      this.error(`Expected 'accept' or 'drop', got '${this.currentValue()}'`);
      this.advance();
      return null;
    }

    if (!this.check(TokenType.JMessage)) {
      this.error(`Expected J-message identifier after '${action}'`);
      return null;
    }
    const messageId = this.currentValue();
    this.advance();

    let where: WhereClause | null = null;
    if (this.check(TokenType.Keyword, 'where')) {
      where = this.parseWhereClause();
    }

    return {
      kind: 'FilterRule',
      action,
      messageId,
      where,
      span: this.mergeSpans(startSpan, this.prevSpan()),
    };
  }

  private parseWhereClause(): WhereClause | null {
    const startSpan = this.currentSpan();
    this.expect(TokenType.Keyword, 'where');

    if (!this.expectToken(TokenType.LBrace)) {
      return null;
    }

    const condition = this.parseCondition();

    const endSpan = this.currentSpan();
    this.expectToken(TokenType.RBrace);

    if (!condition) return null;

    return {
      kind: 'WhereClause',
      condition,
      span: this.mergeSpans(startSpan, endSpan),
    };
  }

  private parseCondition(): ConditionExpression | null {
    const startSpan = this.currentSpan();

    if (!this.check(TokenType.Keyword) && !this.check(TokenType.Identifier)) {
      this.error(`Expected field name in condition`);
      return null;
    }
    const field = this.currentValue();
    this.advance();

    const opToken = this.current();
    let operator: ConditionExpression['operator'];
    switch (opToken.type) {
      case TokenType.GreaterThanOrEqual: operator = '>='; break;
      case TokenType.LessThanOrEqual: operator = '<='; break;
      case TokenType.GreaterThan: operator = '>'; break;
      case TokenType.LessThan: operator = '<'; break;
      case TokenType.EqualEqual: operator = '=='; break;
      case TokenType.NotEqual: operator = '!='; break;
      default:
        this.error(`Expected comparison operator, got '${this.currentValue()}'`);
        return null;
    }
    this.advance();

    const value = this.currentValue();
    const endSpan = this.currentSpan();
    this.advance();

    return {
      kind: 'Condition',
      field,
      operator,
      value,
      span: this.mergeSpans(startSpan, endSpan),
    };
  }

  // ─── Properties ─────────────────────────────────────────────────────

  private parsePropertyBlock(): PropertyAssignment[] {
    const properties: PropertyAssignment[] = [];
    while (!this.check(TokenType.RBrace) && !this.isAtEnd()) {
      if (this.check(TokenType.Keyword) || this.check(TokenType.Identifier)) {
        const prop = this.parsePropertyAssignment();
        if (prop) properties.push(prop);
      } else {
        this.error(`Unexpected token '${this.currentValue()}' in property block`);
        this.advance();
      }
    }
    return properties;
  }

  private parsePropertyAssignment(): PropertyAssignment | null {
    const startSpan = this.currentSpan();
    const key = this.currentValue();
    this.advance();

    if (!this.expectToken(TokenType.Colon)) {
      return null;
    }

    const value = this.parsePropertyValue();
    if (!value) {
      this.error(`Expected value for property '${key}'`);
      return null;
    }

    // Consume optional comma
    if (this.check(TokenType.Comma)) {
      this.advance();
    }

    return {
      kind: 'Property',
      key,
      value,
      span: this.mergeSpans(startSpan, this.prevSpan()),
    };
  }

  private parsePropertyValue(): PropertyValue | null {
    const token = this.current();

    switch (token.type) {
      case TokenType.String:
        this.advance();
        // Strip quotes
        return { type: 'string', value: token.value.slice(1, -1) };

      case TokenType.Number:
        this.advance();
        return { type: 'number', value: Number(token.value) };

      case TokenType.Percent:
        this.advance();
        return { type: 'percent', value: parseFloat(token.value) };

      case TokenType.Duration:
        this.advance();
        return { type: 'duration', value: token.value };

      case TokenType.Boolean:
        this.advance();
        return { type: 'boolean', value: token.value === 'true' };

      case TokenType.HexNumber:
        this.advance();
        return { type: 'hex', value: token.value };

      case TokenType.Identifier:
      case TokenType.Keyword:
        this.advance();
        return { type: 'identifier', value: token.value };

      case TokenType.LBracket:
        return this.parseArrayValue();

      default:
        return null;
    }
  }

  private parseArrayValue(): PropertyValue | null {
    this.advance(); // skip [
    const elements: string[] = [];

    while (!this.check(TokenType.RBracket) && !this.isAtEnd()) {
      if (this.check(TokenType.Identifier) || this.check(TokenType.Keyword) || this.check(TokenType.JMessage)) {
        elements.push(this.currentValue());
        this.advance();
      } else if (this.check(TokenType.String)) {
        elements.push(this.currentValue().slice(1, -1));
        this.advance();
      } else {
        this.error(`Unexpected token '${this.currentValue()}' in array`);
        this.advance();
      }

      if (this.check(TokenType.Comma)) {
        this.advance();
      }
    }

    this.expectToken(TokenType.RBracket);
    return { type: 'array', value: elements };
  }

  // ─── Token Helpers ──────────────────────────────────────────────────

  private current(): Token {
    return this.tokens[this.pos] ?? {
      type: TokenType.EOF,
      value: '',
      span: { line: 1, column: 1, offset: 0, length: 0 },
    };
  }

  private currentValue(): string {
    return this.current().value;
  }

  private currentSpan(): SourceSpan {
    return { ...this.current().span };
  }

  private prevSpan(): SourceSpan {
    if (this.pos > 0) {
      return { ...this.tokens[this.pos - 1]!.span };
    }
    return this.currentSpan();
  }

  private isAtEnd(): boolean {
    return this.current().type === TokenType.EOF;
  }

  private check(type: TokenType, value?: string): boolean {
    const token = this.current();
    if (token.type !== type) return false;
    if (value !== undefined && token.value !== value) return false;
    return true;
  }

  private advance(): Token {
    const token = this.current();
    if (!this.isAtEnd()) {
      this.pos++;
    }
    return token;
  }

  private expect(type: TokenType, value: string): boolean {
    if (this.check(type, value)) {
      this.advance();
      return true;
    }
    this.error(`Expected '${value}', got '${this.currentValue()}'`);
    return false;
  }

  private expectToken(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    const expected = type === TokenType.LBrace ? '{' :
                     type === TokenType.RBrace ? '}' :
                     type === TokenType.RBracket ? ']' :
                     type === TokenType.Colon ? ':' : type;
    this.error(`Expected '${expected}', got '${this.currentValue()}'`);
    return false;
  }

  private expectString(): string {
    if (this.check(TokenType.String)) {
      const value = this.currentValue();
      this.advance();
      return value.slice(1, -1); // Strip quotes
    }
    this.error(`Expected string, got '${this.currentValue()}'`);
    return '<missing>';
  }

  private error(message: string): void {
    this.diagnostics.push({
      message,
      severity: 'error',
      span: this.currentSpan(),
    });
  }

  /**
   * Error recovery: skip tokens until we find a synchronisation point.
   */
  private synchronize(): void {
    while (!this.isAtEnd()) {
      if (this.check(TokenType.RBrace)) {
        this.advance();
        return;
      }
      if (this.check(TokenType.Keyword, 'network') ||
          this.check(TokenType.Keyword, 'terminal') ||
          this.check(TokenType.Keyword, 'net') ||
          this.check(TokenType.Keyword, 'subnetwork') ||
          this.check(TokenType.Keyword, 'messages') ||
          this.check(TokenType.Keyword, 'filters')) {
        return;
      }
      this.advance();
    }
  }

  private mergeSpans(start: SourceSpan, end: SourceSpan): SourceSpan {
    return {
      line: start.line,
      column: start.column,
      offset: start.offset,
      length: (end.offset + end.length) - start.offset,
    };
  }
}

/**
 * Convenience function: parse TDL source text.
 */
export function parse(source: string): ParseResult {
  return new Parser().parse(source);
}
