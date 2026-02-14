import { Token, TokenType, KEYWORDS, SourceSpan } from './types';

/**
 * Lexer for the TDL configuration language.
 *
 * Hand-written scanner that produces a token stream with precise
 * source locations for editor integration.
 */
export class Lexer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private tokens: Token[] = [];

  constructor(source: string) {
    this.source = source;
  }

  /** Tokenise the entire source and return all tokens (including EOF). */
  tokenize(): Token[] {
    this.tokens = [];
    this.pos = 0;
    this.line = 1;
    this.column = 1;

    while (this.pos < this.source.length) {
      this.scanToken();
    }

    this.tokens.push(this.makeToken(TokenType.EOF, '', 0));
    return this.tokens;
  }

  // ─── Scanning ─────────────────────────────────────────────────────

  private scanToken(): void {
    const ch = this.source[this.pos]!;

    // Whitespace (not newlines)
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      this.scanWhitespace();
      return;
    }

    // Newlines
    if (ch === '\n') {
      const span = this.makeSpan(1);
      this.advance();
      this.tokens.push({ type: TokenType.Newline, value: '\n', span });
      return;
    }

    // Comments: -- to end of line
    if (ch === '-' && this.peek(1) === '-') {
      this.scanComment();
      return;
    }

    // Strings
    if (ch === '"') {
      this.scanString();
      return;
    }

    // Numbers (including hex 0x...)
    if (this.isDigit(ch)) {
      this.scanNumber();
      return;
    }

    // J-message identifiers: J followed by digit(s), slash, digit(s)
    if (ch === 'J' && this.isDigit(this.peek(1))) {
      this.scanJMessage();
      return;
    }

    // Identifiers and keywords
    if (this.isIdentStart(ch)) {
      this.scanIdentifier();
      return;
    }

    // Punctuation
    switch (ch) {
      case '{': this.emitSingle(TokenType.LBrace); return;
      case '}': this.emitSingle(TokenType.RBrace); return;
      case '[': this.emitSingle(TokenType.LBracket); return;
      case ']': this.emitSingle(TokenType.RBracket); return;
      case ':': this.emitSingle(TokenType.Colon); return;
      case ',': this.emitSingle(TokenType.Comma); return;
      default: break;
    }

    // Comparison operators
    if (ch === '>' || ch === '<' || ch === '=' || ch === '!') {
      this.scanOperator();
      return;
    }

    // Unknown character
    const span = this.makeSpan(1);
    this.advance();
    this.tokens.push({ type: TokenType.Unknown, value: ch, span });
  }

  private scanWhitespace(): void {
    const start = this.pos;
    while (this.pos < this.source.length) {
      const ch = this.source[this.pos]!;
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        this.advance();
      } else {
        break;
      }
    }
    // We skip whitespace tokens — they're not needed by the parser
    void start;
  }

  private scanComment(): void {
    const span = this.makeSpan(0); // length updated below
    const start = this.pos;
    while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
      this.advance();
    }
    const value = this.source.slice(start, this.pos);
    span.length = value.length;
    this.tokens.push({ type: TokenType.Comment, value, span });
  }

  private scanString(): void {
    const span = this.makeSpan(0);
    const start = this.pos;
    this.advance(); // skip opening "
    while (this.pos < this.source.length && this.source[this.pos] !== '"') {
      if (this.source[this.pos] === '\n') break; // unterminated string
      this.advance();
    }
    if (this.pos < this.source.length && this.source[this.pos] === '"') {
      this.advance(); // skip closing "
    }
    const value = this.source.slice(start, this.pos);
    span.length = value.length;
    this.tokens.push({ type: TokenType.String, value, span });
  }

  private scanNumber(): void {
    const span = this.makeSpan(0);
    const start = this.pos;

    // Hex number
    if (this.source[this.pos] === '0' && (this.peek(1) === 'x' || this.peek(1) === 'X')) {
      this.advance(); // 0
      this.advance(); // x
      while (this.pos < this.source.length && this.isHexDigit(this.source[this.pos]!)) {
        this.advance();
      }
      const value = this.source.slice(start, this.pos);
      span.length = value.length;
      this.tokens.push({ type: TokenType.HexNumber, value, span });
      return;
    }

    // Regular number
    while (this.pos < this.source.length && this.isDigit(this.source[this.pos]!)) {
      this.advance();
    }

    // Decimal point
    if (this.pos < this.source.length && this.source[this.pos] === '.' &&
        this.pos + 1 < this.source.length && this.isDigit(this.source[this.pos + 1]!)) {
      this.advance(); // .
      while (this.pos < this.source.length && this.isDigit(this.source[this.pos]!)) {
        this.advance();
      }
    }

    // Check for percent suffix
    if (this.pos < this.source.length && this.source[this.pos] === '%') {
      this.advance();
      const value = this.source.slice(start, this.pos);
      span.length = value.length;
      this.tokens.push({ type: TokenType.Percent, value, span });
      return;
    }

    // Check for duration suffix
    if (this.pos < this.source.length) {
      const rest = this.source.slice(this.pos);
      const durationMatch = rest.match(/^(s|ms|min|h)\b/);
      if (durationMatch) {
        for (let i = 0; i < durationMatch[0].length; i++) {
          this.advance();
        }
        const value = this.source.slice(start, this.pos);
        span.length = value.length;
        this.tokens.push({ type: TokenType.Duration, value, span });
        return;
      }
    }

    const value = this.source.slice(start, this.pos);
    span.length = value.length;
    this.tokens.push({ type: TokenType.Number, value, span });
  }

  private scanJMessage(): void {
    const span = this.makeSpan(0);
    const start = this.pos;
    this.advance(); // J
    while (this.pos < this.source.length && this.isDigit(this.source[this.pos]!)) {
      this.advance();
    }
    if (this.pos < this.source.length && this.source[this.pos] === '/') {
      this.advance(); // /
      while (this.pos < this.source.length && this.isDigit(this.source[this.pos]!)) {
        this.advance();
      }
    }
    const value = this.source.slice(start, this.pos);
    span.length = value.length;
    this.tokens.push({ type: TokenType.JMessage, value, span });
  }

  private scanIdentifier(): void {
    const span = this.makeSpan(0);
    const start = this.pos;
    while (this.pos < this.source.length && this.isIdentPart(this.source[this.pos]!)) {
      this.advance();
    }
    const value = this.source.slice(start, this.pos);
    span.length = value.length;

    // Check for boolean literals
    if (value === 'true' || value === 'false') {
      this.tokens.push({ type: TokenType.Boolean, value, span });
      return;
    }

    // Check for keywords
    if (KEYWORDS.has(value)) {
      this.tokens.push({ type: TokenType.Keyword, value, span });
      return;
    }

    this.tokens.push({ type: TokenType.Identifier, value, span });
  }

  private scanOperator(): void {
    const ch = this.source[this.pos]!;
    const next = this.peek(1);

    if (ch === '>' && next === '=') {
      const span = this.makeSpan(2);
      this.advance(); this.advance();
      this.tokens.push({ type: TokenType.GreaterThanOrEqual, value: '>=', span });
    } else if (ch === '<' && next === '=') {
      const span = this.makeSpan(2);
      this.advance(); this.advance();
      this.tokens.push({ type: TokenType.LessThanOrEqual, value: '<=', span });
    } else if (ch === '=' && next === '=') {
      const span = this.makeSpan(2);
      this.advance(); this.advance();
      this.tokens.push({ type: TokenType.EqualEqual, value: '==', span });
    } else if (ch === '!' && next === '=') {
      const span = this.makeSpan(2);
      this.advance(); this.advance();
      this.tokens.push({ type: TokenType.NotEqual, value: '!=', span });
    } else if (ch === '>') {
      this.emitSingle(TokenType.GreaterThan);
    } else if (ch === '<') {
      this.emitSingle(TokenType.LessThan);
    } else {
      // Unknown operator character
      const span = this.makeSpan(1);
      this.advance();
      this.tokens.push({ type: TokenType.Unknown, value: ch, span });
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private advance(): void {
    if (this.pos < this.source.length) {
      if (this.source[this.pos] === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.pos++;
    }
  }

  private peek(offset: number): string | undefined {
    return this.source[this.pos + offset];
  }

  private makeSpan(length: number): SourceSpan {
    return {
      line: this.line,
      column: this.column,
      offset: this.pos,
      length,
    };
  }

  private makeToken(type: TokenType, value: string, length: number): Token {
    return { type, value, span: this.makeSpan(length) };
  }

  private emitSingle(type: TokenType): void {
    const ch = this.source[this.pos]!;
    const span = this.makeSpan(1);
    this.advance();
    this.tokens.push({ type, value: ch, span });
  }

  private isDigit(ch: string | undefined): boolean {
    if (!ch) return false;
    return ch >= '0' && ch <= '9';
  }

  private isHexDigit(ch: string): boolean {
    return (ch >= '0' && ch <= '9') || (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F');
  }

  private isIdentStart(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
  }

  private isIdentPart(ch: string): boolean {
    return this.isIdentStart(ch) || this.isDigit(ch) || ch === '-' || ch === '_';
  }
}

/**
 * Convenience function: tokenise source and return non-trivia tokens.
 */
export function lex(source: string): Token[] {
  return new Lexer(source).tokenize();
}

/**
 * Return all tokens including trivia (comments, newlines).
 */
export function lexWithTrivia(source: string): Token[] {
  return new Lexer(source).tokenize();
}

/**
 * Return only significant tokens (no comments, whitespace, newlines).
 */
export function lexSignificant(source: string): Token[] {
  return new Lexer(source)
    .tokenize()
    .filter(
      (t) =>
        t.type !== TokenType.Comment &&
        t.type !== TokenType.Whitespace &&
        t.type !== TokenType.Newline,
    );
}
