# TDL Configuration Editor — Project Plan

## Vision

A browser-based Single Page Application that provides a purpose-built editor for
Tactical Data Link configurations (Link 16 / MIL-STD-6016 and Link 22 / STANAG 5522).
The tool uses a custom Domain Specific Language (DSL) with full editor support —
syntax highlighting, autocompletion, diagnostics, hover documentation — powered by
the Monaco Editor and a hand-written parser that produces an AST for multi-level
validation.

The goal: **make TDL configuration auditable, teachable, and less error-prone.**

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    Browser SPA                       │
│                                                      │
│  ┌────────────┐  ┌─────────────┐  ┌───────────────┐ │
│  │  Monaco     │  │  Sidebar    │  │  Visualiser   │ │
│  │  Editor     │  │  (explorer, │  │  (network     │ │
│  │  + custom   │  │   problems, │  │   topology,   │ │
│  │  language   │  │   outline,  │  │   time slot   │ │
│  │  support    │  │   docs)     │  │   diagrams)   │ │
│  └─────┬───── ┘  └──────┬──────┘  └───────┬───────┘ │
│        │                │                  │         │
│  ┌─────▼────────────────▼──────────────────▼───────┐ │
│  │              Core Engine (TypeScript)            │ │
│  │                                                  │ │
│  │  ┌──────────┐ ┌──────┐ ┌──────────┐ ┌────────┐ │ │
│  │  │  Lexer   │→│Parser│→│ AST /    │→│  Rule  │ │ │
│  │  │          │ │      │ │ Semantic │ │ Engine │ │ │
│  │  │          │ │      │ │ Model    │ │        │ │ │
│  │  └──────────┘ └──────┘ └──────────┘ └────────┘ │ │
│  │                                                  │ │
│  │  ┌──────────────────┐  ┌───────────────────────┐│ │
│  │  │  Spec Database   │  │  Export / Import       ││ │
│  │  │  (J-messages,    │  │  (SIMPLE, XML, JSON,  ││ │
│  │  │   NPGs, fields,  │  │   binary)             ││ │
│  │  │   enumerations)  │  │                       ││ │
│  │  └──────────────────┘  └───────────────────────┘│ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

Everything runs **client-side** — no server required. The entire engine
(lexer → parser → AST → validation) is TypeScript, runs in the browser,
and integrates directly with Monaco's diagnostics/completion APIs.

---

## 2. The DSL — Design Principles

The configuration language should be:

- **Readable** — looks like structured English, not XML
- **Declarative** — describes the desired state, not procedures
- **Hierarchical** — mirrors the TDL domain model (networks contain nets,
  nets contain time slot assignments, terminals join nets, etc.)
- **Documented inline** — hover any keyword to see the spec reference

### 2.1 Example Syntax (Link 16)

```tdl
-- Link 16 Network Design
-- Exercise: BOLD QUEST 2026

network "ALPHA" {
  link: Link16
  classification: SECRET

  -- Define participating units
  terminal "AWACS-1" {
    track_number: 01400
    platform_type: E3A
    role: NetControlStation

    subscribes: [NPG_A, NPG_2, NPG_6, NPG_7, NPG_9, NPG_14]
    transmits:   [NPG_A, NPG_6, NPG_9]
  }

  terminal "F16-LEAD" {
    track_number: 02100
    platform_type: F16C
    role: Participant

    subscribes: [NPG_A, NPG_2, NPG_6, NPG_9]
    transmits:   [NPG_A, NPG_9]
  }

  -- Net definitions with time slot allocation
  net "NET-1" {
    net_number: 1
    npg: NPG_9           -- Surveillance
    stacked: false
    tsdf: 25%             -- Time Slot Duty Factor

    participants: [AWACS-1, F16-LEAD]
  }

  net "NET-2" {
    net_number: 2
    npg: NPG_6           -- Fighter-to-Fighter
    stacked: true
    stacking_level: 2
    tsdf: 12.5%

    participants: [F16-LEAD]
  }

  -- Message catalog
  messages {
    J2/2  { enabled: true,  npg: NPG_2  }  -- Indirect PPLI
    J3/2  { enabled: true,  npg: NPG_9  }  -- Air Track
    J3/5  { enabled: true,  npg: NPG_9  }  -- Land Track
    J7/0  { enabled: true,  npg: NPG_6  }  -- Attack Order
    J7/2  { enabled: false }                 -- Attack Acknowledgement
    J12/6 { enabled: true,  npg: NPG_14 }  -- EW
  }

  -- Filter rules
  filters {
    inbound {
      accept J3/2 where { quality >= 3 }
      drop   J3/5 where { age > 60s }
    }
  }
}
```

### 2.2 Example Syntax (Link 22)

```tdl
network "BRAVO" {
  link: Link22

  -- Link 22 uses a different network model
  subnetwork "SUB-1" {
    operating_mode: NetSlotted
    data_rate: High

    member "SHIP-1" {
      unit_id: 0x1A3F
      role: Controller
      forwarding: enabled
    }

    member "SHIP-2" {
      unit_id: 0x2B4E
      role: Participant
      forwarding: disabled
    }
  }
}
```

### 2.3 Key DSL Features

| Feature           | Purpose                                                |
|-------------------|--------------------------------------------------------|
| `--` comments     | Inline documentation                                  |
| Block structure   | `{ }` nesting mirrors the domain hierarchy             |
| Named references  | `participants: [AWACS-1]` — references validated       |
| Enumerations      | `role: NetControlStation` — checked against spec       |
| Units             | `age > 60s`, `tsdf: 25%` — domain-aware types         |
| J-message refs    | `J3/2`, `J7/0` — validated against message catalog    |

---

## 3. Core Engine — Lexer, Parser, AST

### 3.1 Lexer (Tokeniser)

Hand-written scanner (not a generator — we need precise error locations
and recovery). Token types:

```
KEYWORD      network, terminal, net, messages, filters, ...
IDENTIFIER   user-defined names
STRING       "ALPHA"
NUMBER       01400, 0x1A3F, 25
PERCENT      25%
DURATION     60s, 5min
J_MESSAGE    J2/2, J3/5, J7/0, J12/6
LBRACE       {
RBRACE       }
LBRACKET     [
RBRACKET     ]
COLON        :
COMMA        ,
COMMENT      -- ...
BOOLEAN      true, false
COMPARISON   >=, <=, >, <, ==
EOF
```

### 3.2 Parser

Recursive descent parser producing a typed AST. Key design decisions:

- **Error recovery** — the parser does NOT bail on first error. It uses
  synchronisation points (`}`, newlines) to recover and continue, so
  the user gets multiple diagnostics at once.
- **Source mapping** — every AST node carries `{ line, column, offset, length }`
  for precise editor integration.
- **Incremental** — on each keystroke, only re-parse the changed region
  (or the enclosing block). Full re-parse as fallback.

### 3.3 AST Node Types

```typescript
type ASTNode =
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
  | Identifier
  | Literal

interface NetworkDeclaration {
  kind: "network"
  name: string
  linkType: "Link16" | "Link22"
  classification?: Classification
  terminals: TerminalDeclaration[]
  nets: NetDeclaration[]
  subnetworks: SubnetworkDeclaration[]
  messages: MessageCatalog
  filters: FilterBlock
  span: SourceSpan
}
```

### 3.4 Semantic Model

The AST is lowered into a **Semantic Model** — a resolved, cross-referenced
representation:

- All identifier references are resolved (or flagged as errors)
- Types are checked (enum values, numeric ranges, percentages)
- The model has convenience methods: `network.totalTsdf()`,
  `terminal.allNets()`, `net.subscriberCount()`

---

## 4. Validation — Three Levels

### Level 1: Syntax

Handled by the parser. Examples:
- Missing closing `}`
- Invalid token
- Unexpected keyword

### Level 2: Semantic / Type

Handled during AST → Semantic Model lowering. Examples:
- `role: Banana` — invalid enum value
- `tsdf: 150%` — numeric range violation
- `participants: [GHOST]` — unresolved reference
- `npg: NPG_99` — nonexistent NPG
- `J99/9` — invalid J-message identifier

### Level 3: Domain Rules (the real value)

A rule engine that runs over the semantic model. Rules are individually
documented with spec references. Examples:

```
RULE: total-tsdf-budget
  The sum of TSDF across all nets in a network must not exceed 100%.
  Reference: MIL-STD-6016 §4.3.2

RULE: ncs-required
  A Link 16 network must have exactly one terminal with role
  NetControlStation.
  Reference: MIL-STD-6016 §3.2.1

RULE: npg-subscriber-coverage
  Every NPG that a terminal transmits on must have at least one
  other terminal that subscribes to it.
  Reference: MIL-STD-6016 §5.1.4

RULE: stacking-consistency
  If a net is stacked, stacking_level must be specified and must
  be 2 or 4.
  Reference: MIL-STD-6016 §4.4.1

RULE: message-npg-match
  Each J-message must be assigned to an NPG that is valid for that
  message type per the spec tables.
  Reference: MIL-STD-6016 Table A-I

RULE: link22-forwarding
  In a Link 22 subnetwork, at least one member must have
  forwarding enabled.
  Reference: STANAG 5522 §6.2

RULE: track-number-uniqueness
  Track numbers must be unique within a network.

RULE: net-number-uniqueness
  Net numbers must be unique within a network.

RULE: ppli-required
  Every terminal should have at least one PPLI-capable NPG
  (NPG_A or NPG_B) to maintain platform position reporting.
```

Rules produce diagnostics with severity (Error, Warning, Info, Hint)
and include the spec reference so users can learn *why*.

---

## 5. Monaco Editor Integration

### 5.1 Language Registration

Register a custom language `tdl` with Monaco:

- **Monarch tokeniser** — for fast syntax highlighting (runs on every frame)
- **Completion provider** — context-aware suggestions:
  - After `link:` → suggest `Link16`, `Link22`
  - After `npg:` → suggest valid NPGs
  - After `role:` → suggest `NetControlStation`, `Participant`, ...
  - Inside `messages {}` → suggest J-message identifiers
  - Inside `participants:` → suggest declared terminal names
- **Hover provider** — show spec documentation on hover:
  - Hover `NPG_9` → "Network Participation Group 9: Surveillance.
    Used for air, surface, and subsurface track reporting. Ref: MIL-STD-6016 Table 3-I"
  - Hover `J3/2` → "J3/2 Air Track Message. Reports aircraft position, identity,
    and kinematics. Fields: track number, position, speed, heading, IFF..."
- **Diagnostics** — red/yellow squiggles with messages and spec references
- **Code actions** — quick fixes:
  - "Add missing NCS terminal"
  - "Reduce TSDF to fit budget"
  - "Add required NPG subscription"
- **Outline view** — structured tree of the configuration
- **Folding** — block-level code folding
- **Formatting** — auto-format on save

### 5.2 Document Lifecycle

```
Keystroke → Debounce (150ms) → Lexer → Parser → AST
  → Semantic Model → Rule Engine → Diagnostics → Monaco markers
```

Target: full cycle in <50ms for a 1000-line config.

---

## 6. UI Layout

```
┌─────────────────────────────────────────────────────────┐
│  TDL Config Editor                        [Export] [Help]│
├────────┬───────────────────────────┬────────────────────┤
│        │                           │                    │
│  Doc   │     Monaco Editor         │   Visualiser       │
│  Tree  │     (tdl language)        │                    │
│        │                           │   ┌──────────────┐ │
│  NET   │  network "ALPHA" {       │   │  Network     │ │
│  ├AWACS│    link: Link16          │   │  Topology    │ │
│  ├F16  │    ...                    │   │  Diagram     │ │
│  ├Net1 │                           │   └──────────────┘ │
│  └Net2 │                           │   ┌──────────────┐ │
│        │                           │   │  Time Slot   │ │
│        │                           │   │  Allocation  │ │
│        │                           │   │  ████░░░░░░  │ │
│        │                           │   │  ██░░░░░░░░  │ │
│        │                           │   └──────────────┘ │
│        │                           │   ┌──────────────┐ │
│        │                           │   │  NPG Matrix  │ │
│        │                           │   │              │ │
│        │                           │   └──────────────┘ │
├────────┴───────────────────────────┴────────────────────┤
│  PROBLEMS (2 errors, 1 warning)                         │
│  ⛔ Net NET-1: TSDF total exceeds 100% (112.5%)        │
│  ⛔ Terminal GHOST: unresolved reference in NET-2       │
│  ⚠  NPG_14 (EW) assigned but no terminal subscribes   │
└─────────────────────────────────────────────────────────┘
```

### 6.1 Visualiser Panels (right pane, tabbed)

1. **Network Topology** — nodes = terminals, edges = shared nets. Colour-coded by role.
2. **Time Slot Allocation** — horizontal bar chart showing TSDF per net with a 100% budget line.
3. **NPG Matrix** — grid: terminals × NPGs, showing subscribe/transmit.
4. **Message Flow** — which messages flow between which terminals via which NPGs.

---

## 7. Tech Stack

| Layer             | Technology                         | Rationale                          |
|-------------------|------------------------------------|------------------------------------|
| Framework         | React 18+                          | Component model, ecosystem         |
| Editor            | Monaco Editor (`@monaco-editor/react`) | VSCode-grade editing           |
| Language engine   | Hand-written TypeScript            | Full control, no WASM overhead     |
| State management  | Zustand                            | Lightweight, no boilerplate        |
| Visualisation     | D3.js or React Flow                | Network diagrams, charts           |
| Styling           | Tailwind CSS                       | Fast, utility-first                |
| Testing           | Vitest + Testing Library           | Fast unit + integration tests      |
| Build             | Vite                               | Fast dev, optimised production     |
| Deployment        | Static site (S3/Netlify/Vercel)    | No server needed                   |

---

## 8. Spec Database

A key asset is the **structured spec database** — TypeScript modules that
encode the Link 16 and Link 22 specifications:

```typescript
// src/specs/link16/npgs.ts
export const NPG_DEFINITIONS: NPGDefinition[] = [
  {
    id: "NPG_A",
    name: "Initial Entry",
    number: 0,
    description: "Used for net entry, PPLI, and initial position reporting",
    validMessages: ["J0/0", "J1/0", "J2/0", "J2/2"],
    specRef: "MIL-STD-6016 Table 3-I",
  },
  {
    id: "NPG_2",
    name: "Indirect PPLI",
    number: 2,
    description: "Precise Participant Location and Identification (indirect)",
    validMessages: ["J2/2", "J2/3", "J2/5"],
    specRef: "MIL-STD-6016 Table 3-I",
  },
  // ...
];

// src/specs/link16/messages.ts
export const J_MESSAGES: JMessageDefinition[] = [
  {
    id: "J2/2",
    name: "Indirect Interface Unit PPLI",
    wordFormat: "F2",
    words: 3,
    fields: [
      { name: "track_number", bits: [0, 14], type: "unsigned" },
      { name: "latitude",     bits: [15, 38], type: "signed", unit: "degrees" },
      { name: "longitude",    bits: [39, 62], type: "signed", unit: "degrees" },
      // ...
    ],
    validNPGs: ["NPG_2"],
    specRef: "MIL-STD-6016 §A.2.2",
  },
  // ...
];
```

This database is the foundation for autocompletion, hover docs, and
semantic validation. It should be:
- **Comprehensive** — cover all NPGs, J-messages, fields, enumerations
- **Sourced from the spec** — with section references
- **Versioned** — support different editions of the standards
- **Tested** — snapshot tests to ensure accuracy

---

## 9. Testing Strategy

### 9.1 Unit Tests (Vitest)

**Lexer tests** (~100+)
```typescript
test("lexes J-message identifier", () => {
  const tokens = lex("J3/2");
  expect(tokens).toEqual([
    { type: "J_MESSAGE", value: "J3/2", span: { line: 1, col: 1, len: 4 } },
  ]);
});

test("lexes percentage", () => {
  const tokens = lex("25%");
  expect(tokens).toEqual([
    { type: "PERCENT", value: 25, span: { line: 1, col: 1, len: 3 } },
  ]);
});
```

**Parser tests** (~200+)
```typescript
test("parses minimal network", () => {
  const ast = parse('network "TEST" { link: Link16 }');
  expect(ast.networks).toHaveLength(1);
  expect(ast.networks[0].name).toBe("TEST");
  expect(ast.networks[0].linkType).toBe("Link16");
});

test("recovers from missing closing brace", () => {
  const { ast, errors } = parse('network "TEST" { link: Link16');
  expect(errors).toHaveLength(1);
  expect(errors[0].message).toContain("Expected '}'");
  expect(ast.networks).toHaveLength(1); // still produces partial AST
});
```

**Validation rule tests** (~50+ per rule)
```typescript
test("flags TSDF exceeding 100%", () => {
  const config = parse(`
    network "X" {
      link: Link16
      net "A" { net_number: 1, npg: NPG_9, tsdf: 60% }
      net "B" { net_number: 2, npg: NPG_6, tsdf: 50% }
    }
  `);
  const diagnostics = validate(config);
  expect(diagnostics).toContainEqual(
    expect.objectContaining({
      rule: "total-tsdf-budget",
      severity: "error",
      message: expect.stringContaining("110%"),
    })
  );
});
```

**Spec database tests** (~coverage tests)
```typescript
test("every J-message has valid NPG references", () => {
  for (const msg of J_MESSAGES) {
    for (const npg of msg.validNPGs) {
      expect(NPG_DEFINITIONS.find(n => n.id === npg)).toBeDefined();
    }
  }
});
```

### 9.2 Integration Tests

- **Editor ↔ Engine** — type in Monaco, assert diagnostics appear
- **Completion** — trigger completion at specific positions, assert suggestions
- **Round-trip** — parse → serialise → parse, assert equality

### 9.3 Snapshot Tests

- AST snapshots for representative configs
- Diagnostic output snapshots for known-bad configs

### 9.4 Coverage Target

- Core engine (lexer, parser, validator): **>95%** line coverage
- Spec database: **100%** cross-reference integrity
- UI components: **>80%** coverage

---

## 10. Development Phases

### Phase 1: Foundation (Weeks 1–3)
- [ ] Project scaffolding (Vite + React + TypeScript + Vitest)
- [ ] DSL grammar specification (formal, written down)
- [ ] Lexer with full test suite
- [ ] Parser with error recovery and full test suite
- [ ] AST type definitions
- [ ] Basic Monaco integration (syntax highlighting only)

### Phase 2: Spec Database + Semantics (Weeks 4–6)
- [ ] Link 16 NPG definitions (complete)
- [ ] Link 16 J-message catalog (core messages)
- [ ] Link 16 enumerations (roles, platform types, etc.)
- [ ] Semantic model (reference resolution, type checking)
- [ ] Level 1 + Level 2 validation with tests

### Phase 3: Domain Rules (Weeks 7–9)
- [ ] Rule engine architecture
- [ ] Implement core rules (TSDF budget, NCS, NPG coverage, etc.)
- [ ] Diagnostic integration with Monaco (markers, problems panel)
- [ ] Quick fixes / code actions
- [ ] Hover documentation provider

### Phase 4: Editor UX (Weeks 10–12)
- [ ] Completion provider (context-aware)
- [ ] Document outline / symbol provider
- [ ] UI layout (sidebar, problems panel)
- [ ] Keyboard shortcuts and command palette
- [ ] Example configurations / templates

### Phase 5: Visualisation (Weeks 13–15)
- [ ] Network topology diagram
- [ ] TSDF allocation chart
- [ ] NPG subscription matrix
- [ ] Message flow diagram

### Phase 6: Link 22 Support (Weeks 16-18)
- [ ] Link 22 spec database (STANAG 5522)
- [ ] DSL extensions for Link 22 concepts (subnetworks, forwarding)
- [ ] Link 22–specific validation rules
- [ ] Link 22 visualisations

### Phase 7: Polish + Export (Weeks 19–21)
- [ ] Import/export (JSON, XML, potentially SIMPLE format)
- [ ] Multi-file / multi-network support
- [ ] Undo/redo for all operations
- [ ] Dark/light theme
- [ ] Performance optimisation (large configs)
- [ ] Accessibility audit

### Phase 8: Documentation + Release (Weeks 22–24)
- [ ] Interactive tutorial (guided walkthrough)
- [ ] Language reference documentation
- [ ] Spec cross-reference index
- [ ] Deployment pipeline
- [ ] Beta testing with domain experts

---

## 11. Educational Features

A key goal is to be an **educational aid**:

1. **Spec-linked hover** — every keyword, NPG, message type links to the
   relevant spec section with a human-readable explanation
2. **"Explain" mode** — click any element to see a detailed explanation
   of what it does and why it matters
3. **Templates** — pre-built configurations for common scenarios
   (basic surveillance net, fighter sweep, maritime patrol) with
   inline comments explaining each decision
4. **Guided mode** — wizard-style flow that walks through building a
   network step by step, generating DSL as you go
5. **Problem explanations** — every diagnostic includes not just "what's
   wrong" but "why it matters" and "how to fix it"
6. **Glossary** — searchable reference for all TDL terminology

---

## 12. Security Note

This tool deals with unclassified configuration *structure* and *format*,
not with actual operational data, crypto variables, or real network
designs. The spec database encodes publicly available standard references
(MIL-STD-6016 and STANAG 5522 structure). No classified information
should be stored in or generated by the tool. A clear disclaimer should
be displayed.

---

## 13. Risks & Mitigations

| Risk                                    | Mitigation                                    |
|-----------------------------------------|-----------------------------------------------|
| Spec complexity (thousands of pages)    | Start with core subset, expand incrementally  |
| Spec access (distribution restricted)   | Work from publicly available references,      |
|                                         | supplement with domain expert review          |
| Parser performance on large configs     | Incremental parsing, web worker offload       |
| Monaco bundle size (~2MB)               | Lazy load, code split                         |
| Domain expert availability              | Build feedback loops into each phase          |

---

## 14. Success Criteria

1. A user with TDL knowledge can write a complete Link 16 network config
   in <10 minutes using autocompletion and templates
2. All syntactically valid configs are parseable with zero false positives
3. Domain rule violations are caught with clear, spec-referenced messages
4. Core engine test suite passes with >95% coverage
5. Full parse-validate cycle completes in <50ms for 1000-line configs
6. The tool is genuinely useful for training new TDL operators
