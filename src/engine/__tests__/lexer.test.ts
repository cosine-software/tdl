import { describe, it, expect } from 'vitest';
import { lex, lexSignificant } from '../lexer';
import { TokenType } from '../types';

describe('Lexer', () => {
  // ─── Basic Tokens ──────────────────────────────────────────────

  describe('single tokens', () => {
    it('lexes opening brace', () => {
      const tokens = lexSignificant('{');
      expect(tokens[0]!.type).toBe(TokenType.LBrace);
      expect(tokens[0]!.value).toBe('{');
    });

    it('lexes closing brace', () => {
      const tokens = lexSignificant('}');
      expect(tokens[0]!.type).toBe(TokenType.RBrace);
    });

    it('lexes opening bracket', () => {
      const tokens = lexSignificant('[');
      expect(tokens[0]!.type).toBe(TokenType.LBracket);
    });

    it('lexes closing bracket', () => {
      const tokens = lexSignificant(']');
      expect(tokens[0]!.type).toBe(TokenType.RBracket);
    });

    it('lexes colon', () => {
      const tokens = lexSignificant(':');
      expect(tokens[0]!.type).toBe(TokenType.Colon);
    });

    it('lexes comma', () => {
      const tokens = lexSignificant(',');
      expect(tokens[0]!.type).toBe(TokenType.Comma);
    });
  });

  // ─── Strings ────────────────────────────────────────────────────

  describe('strings', () => {
    it('lexes simple string', () => {
      const tokens = lexSignificant('"hello"');
      expect(tokens[0]!.type).toBe(TokenType.String);
      expect(tokens[0]!.value).toBe('"hello"');
    });

    it('lexes empty string', () => {
      const tokens = lexSignificant('""');
      expect(tokens[0]!.type).toBe(TokenType.String);
      expect(tokens[0]!.value).toBe('""');
    });

    it('lexes string with spaces', () => {
      const tokens = lexSignificant('"ALPHA BRAVO"');
      expect(tokens[0]!.type).toBe(TokenType.String);
      expect(tokens[0]!.value).toBe('"ALPHA BRAVO"');
    });

    it('handles unterminated string', () => {
      const tokens = lexSignificant('"oops\n');
      expect(tokens[0]!.type).toBe(TokenType.String);
      expect(tokens[0]!.value).toBe('"oops');
    });
  });

  // ─── Numbers ────────────────────────────────────────────────────

  describe('numbers', () => {
    it('lexes integer', () => {
      const tokens = lexSignificant('42');
      expect(tokens[0]!.type).toBe(TokenType.Number);
      expect(tokens[0]!.value).toBe('42');
    });

    it('lexes zero', () => {
      const tokens = lexSignificant('0');
      expect(tokens[0]!.type).toBe(TokenType.Number);
      expect(tokens[0]!.value).toBe('0');
    });

    it('lexes multi-digit number', () => {
      const tokens = lexSignificant('01400');
      expect(tokens[0]!.type).toBe(TokenType.Number);
      expect(tokens[0]!.value).toBe('01400');
    });

    it('lexes decimal number', () => {
      const tokens = lexSignificant('12.5');
      expect(tokens[0]!.type).toBe(TokenType.Number);
      expect(tokens[0]!.value).toBe('12.5');
    });

    it('lexes hex number', () => {
      const tokens = lexSignificant('0x1A3F');
      expect(tokens[0]!.type).toBe(TokenType.HexNumber);
      expect(tokens[0]!.value).toBe('0x1A3F');
    });

    it('lexes lowercase hex number', () => {
      const tokens = lexSignificant('0xff');
      expect(tokens[0]!.type).toBe(TokenType.HexNumber);
      expect(tokens[0]!.value).toBe('0xff');
    });
  });

  // ─── Percentages ────────────────────────────────────────────────

  describe('percentages', () => {
    it('lexes integer percentage', () => {
      const tokens = lexSignificant('25%');
      expect(tokens[0]!.type).toBe(TokenType.Percent);
      expect(tokens[0]!.value).toBe('25%');
    });

    it('lexes decimal percentage', () => {
      const tokens = lexSignificant('12.5%');
      expect(tokens[0]!.type).toBe(TokenType.Percent);
      expect(tokens[0]!.value).toBe('12.5%');
    });

    it('lexes 100%', () => {
      const tokens = lexSignificant('100%');
      expect(tokens[0]!.type).toBe(TokenType.Percent);
      expect(tokens[0]!.value).toBe('100%');
    });
  });

  // ─── Durations ──────────────────────────────────────────────────

  describe('durations', () => {
    it('lexes seconds', () => {
      const tokens = lexSignificant('60s');
      expect(tokens[0]!.type).toBe(TokenType.Duration);
      expect(tokens[0]!.value).toBe('60s');
    });

    it('lexes milliseconds', () => {
      const tokens = lexSignificant('500ms');
      expect(tokens[0]!.type).toBe(TokenType.Duration);
      expect(tokens[0]!.value).toBe('500ms');
    });

    it('lexes minutes', () => {
      const tokens = lexSignificant('5min');
      expect(tokens[0]!.type).toBe(TokenType.Duration);
      expect(tokens[0]!.value).toBe('5min');
    });

    it('lexes hours', () => {
      const tokens = lexSignificant('2h');
      expect(tokens[0]!.type).toBe(TokenType.Duration);
      expect(tokens[0]!.value).toBe('2h');
    });
  });

  // ─── J-Message Identifiers ─────────────────────────────────────

  describe('J-message identifiers', () => {
    it('lexes J3/2', () => {
      const tokens = lexSignificant('J3/2');
      expect(tokens[0]!.type).toBe(TokenType.JMessage);
      expect(tokens[0]!.value).toBe('J3/2');
    });

    it('lexes J2/2', () => {
      const tokens = lexSignificant('J2/2');
      expect(tokens[0]!.type).toBe(TokenType.JMessage);
      expect(tokens[0]!.value).toBe('J2/2');
    });

    it('lexes J12/6', () => {
      const tokens = lexSignificant('J12/6');
      expect(tokens[0]!.type).toBe(TokenType.JMessage);
      expect(tokens[0]!.value).toBe('J12/6');
    });

    it('lexes J7/0', () => {
      const tokens = lexSignificant('J7/0');
      expect(tokens[0]!.type).toBe(TokenType.JMessage);
      expect(tokens[0]!.value).toBe('J7/0');
    });

    it('lexes J0/0', () => {
      const tokens = lexSignificant('J0/0');
      expect(tokens[0]!.type).toBe(TokenType.JMessage);
      expect(tokens[0]!.value).toBe('J0/0');
    });
  });

  // ─── Booleans ───────────────────────────────────────────────────

  describe('booleans', () => {
    it('lexes true', () => {
      const tokens = lexSignificant('true');
      expect(tokens[0]!.type).toBe(TokenType.Boolean);
      expect(tokens[0]!.value).toBe('true');
    });

    it('lexes false', () => {
      const tokens = lexSignificant('false');
      expect(tokens[0]!.type).toBe(TokenType.Boolean);
      expect(tokens[0]!.value).toBe('false');
    });
  });

  // ─── Keywords ───────────────────────────────────────────────────

  describe('keywords', () => {
    const keywords = [
      'network', 'terminal', 'net', 'subnetwork', 'member',
      'messages', 'filters', 'inbound', 'outbound',
      'accept', 'drop', 'where',
      'link', 'classification', 'track_number', 'platform_type',
      'role', 'subscribes', 'transmits', 'net_number',
      'npg', 'stacked', 'stacking_level', 'tsdf', 'participants',
      'enabled', 'operating_mode', 'data_rate', 'unit_id', 'forwarding',
    ];

    for (const kw of keywords) {
      it(`lexes keyword '${kw}'`, () => {
        const tokens = lexSignificant(kw);
        expect(tokens[0]!.type).toBe(TokenType.Keyword);
        expect(tokens[0]!.value).toBe(kw);
      });
    }
  });

  // ─── Identifiers ───────────────────────────────────────────────

  describe('identifiers', () => {
    it('lexes simple identifier', () => {
      const tokens = lexSignificant('Link16');
      expect(tokens[0]!.type).toBe(TokenType.Identifier);
      expect(tokens[0]!.value).toBe('Link16');
    });

    it('lexes identifier with hyphens', () => {
      const tokens = lexSignificant('AWACS-1');
      expect(tokens[0]!.type).toBe(TokenType.Identifier);
      expect(tokens[0]!.value).toBe('AWACS-1');
    });

    it('lexes identifier with underscores', () => {
      const tokens = lexSignificant('NPG_A');
      expect(tokens[0]!.type).toBe(TokenType.Identifier);
      expect(tokens[0]!.value).toBe('NPG_A');
    });

    it('lexes NPG identifier with number', () => {
      const tokens = lexSignificant('NPG_9');
      expect(tokens[0]!.type).toBe(TokenType.Identifier);
      expect(tokens[0]!.value).toBe('NPG_9');
    });
  });

  // ─── Comparison Operators ──────────────────────────────────────

  describe('comparison operators', () => {
    it('lexes >=', () => {
      const tokens = lexSignificant('>=');
      expect(tokens[0]!.type).toBe(TokenType.GreaterThanOrEqual);
    });

    it('lexes <=', () => {
      const tokens = lexSignificant('<=');
      expect(tokens[0]!.type).toBe(TokenType.LessThanOrEqual);
    });

    it('lexes >', () => {
      const tokens = lexSignificant('>');
      expect(tokens[0]!.type).toBe(TokenType.GreaterThan);
    });

    it('lexes <', () => {
      const tokens = lexSignificant('<');
      expect(tokens[0]!.type).toBe(TokenType.LessThan);
    });

    it('lexes ==', () => {
      const tokens = lexSignificant('==');
      expect(tokens[0]!.type).toBe(TokenType.EqualEqual);
    });

    it('lexes !=', () => {
      const tokens = lexSignificant('!=');
      expect(tokens[0]!.type).toBe(TokenType.NotEqual);
    });
  });

  // ─── Comments ──────────────────────────────────────────────────

  describe('comments', () => {
    it('lexes comment and preserves it', () => {
      const tokens = lex('-- this is a comment');
      const commentTokens = tokens.filter((t) => t.type === TokenType.Comment);
      expect(commentTokens).toHaveLength(1);
      expect(commentTokens[0]!.value).toBe('-- this is a comment');
    });

    it('strips comments in lexSignificant', () => {
      const tokens = lexSignificant('network -- comment\n"TEST"');
      expect(tokens.map((t) => t.type)).toEqual([
        TokenType.Keyword,
        TokenType.String,
        TokenType.EOF,
      ]);
    });
  });

  // ─── Source Spans ───────────────────────────────────────────────

  describe('source spans', () => {
    it('tracks line and column correctly', () => {
      const tokens = lexSignificant('network "ALPHA" {\n  link: Link16\n}');
      const networkToken = tokens[0]!;
      expect(networkToken.span.line).toBe(1);
      expect(networkToken.span.column).toBe(1);
      expect(networkToken.span.length).toBe(7);

      // "ALPHA" is on line 1
      const alphaToken = tokens[1]!;
      expect(alphaToken.span.line).toBe(1);

      // link is on line 2
      const linkToken = tokens.find((t) => t.value === 'link')!;
      expect(linkToken.span.line).toBe(2);
      expect(linkToken.span.column).toBe(3);
    });

    it('records correct offsets', () => {
      const tokens = lexSignificant('network');
      expect(tokens[0]!.span.offset).toBe(0);
      expect(tokens[0]!.span.length).toBe(7);
    });
  });

  // ─── Complex Input ─────────────────────────────────────────────

  describe('complex input', () => {
    it('lexes a full terminal block', () => {
      const input = `terminal "AWACS-1" {
  track_number: 01400
  platform_type: E3A
  role: NetControlStation
  subscribes: [NPG_A, NPG_2, NPG_6]
  transmits: [NPG_A, NPG_6]
}`;
      const tokens = lexSignificant(input);
      const types = tokens.map((t) => t.type);

      expect(types).toContain(TokenType.Keyword);
      expect(types).toContain(TokenType.String);
      expect(types).toContain(TokenType.LBrace);
      expect(types).toContain(TokenType.Colon);
      expect(types).toContain(TokenType.Number);
      expect(types).toContain(TokenType.Identifier);
      expect(types).toContain(TokenType.LBracket);
      expect(types).toContain(TokenType.RBracket);
      expect(types).toContain(TokenType.Comma);
      expect(types).toContain(TokenType.RBrace);
      expect(types).toContain(TokenType.EOF);
    });

    it('lexes filter with where clause', () => {
      const input = 'accept J3/2 where { quality >= 3 }';
      const tokens = lexSignificant(input);
      const values = tokens.map((t) => t.value).filter((v) => v !== '');
      expect(values).toEqual([
        'accept', 'J3/2', 'where', '{', 'quality', '>=', '3', '}',
      ]);
    });

    it('handles empty input', () => {
      const tokens = lexSignificant('');
      expect(tokens).toHaveLength(1);
      expect(tokens[0]!.type).toBe(TokenType.EOF);
    });

    it('handles only whitespace', () => {
      const tokens = lexSignificant('   \t  \n  ');
      expect(tokens).toHaveLength(1);
      expect(tokens[0]!.type).toBe(TokenType.EOF);
    });

    it('handles unknown characters gracefully', () => {
      const tokens = lexSignificant('@#$');
      expect(tokens.filter((t) => t.type === TokenType.Unknown)).toHaveLength(3);
    });
  });

  // ─── Edge Cases ─────────────────────────────────────────────────

  describe('edge cases', () => {
    it('distinguishes J-message from identifier starting with J', () => {
      const tokens = lexSignificant('JSON');
      expect(tokens[0]!.type).toBe(TokenType.Identifier);
      expect(tokens[0]!.value).toBe('JSON');
    });

    it('lexes J-message without decimal part', () => {
      const tokens = lexSignificant('J3');
      expect(tokens[0]!.type).toBe(TokenType.JMessage);
      expect(tokens[0]!.value).toBe('J3');
    });

    it('handles number followed immediately by identifier', () => {
      // This should lex as number + identifier
      const tokens = lexSignificant('42abc');
      expect(tokens[0]!.type).toBe(TokenType.Number);
      expect(tokens[0]!.value).toBe('42');
      expect(tokens[1]!.type).toBe(TokenType.Identifier);
      expect(tokens[1]!.value).toBe('abc');
    });

    it('handles multiple consecutive operators', () => {
      const tokens = lexSignificant('>= <= !=');
      expect(tokens[0]!.type).toBe(TokenType.GreaterThanOrEqual);
      expect(tokens[1]!.type).toBe(TokenType.LessThanOrEqual);
      expect(tokens[2]!.type).toBe(TokenType.NotEqual);
    });
  });
});
