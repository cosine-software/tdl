# TDL Config Editor

A browser-based editor for Tactical Data Link configurations (Link 16 / MIL-STD-6016 and Link 22 / STANAG 5522). It uses a custom DSL with full editor support — syntax highlighting, autocompletion, diagnostics — powered by the Monaco Editor and a hand-written parser that produces an AST for multi-level validation.

**Goal:** make TDL configuration auditable, teachable, and less error-prone.

Everything runs **client-side** — no server required.

> **Note:** This is a training / configuration tool only. Do not use it with classified data.

---

## Features

- **Custom DSL** — declarative, readable syntax designed to mirror the TDL domain model
- **Hand-written lexer & recursive-descent parser** — precise error locations, error recovery, and partial AST output so the editor stays useful even with broken input
- **Three-level validation** — syntax (parser), semantic (type/reference checking), and domain (spec-level rules like valid NPGs, J-message IDs, track number uniqueness)
- **Monaco Editor integration** — Monarch tokeniser for fast syntax highlighting, plus the full engine for diagnostics and completions
- **Bundled spec database** — Link 16 NPGs, J-messages, platform types, roles, classification levels, operating modes, data rates
- **Document outline & problems panel** — navigate and inspect your configuration at a glance

## DSL Example

```tdl
-- Link 16 Network Design
-- Exercise: BOLD QUEST 2026

network "ALPHA" {
  link: Link16
  classification: SECRET

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

  net "NET-1" {
    net_number: 1
    npg: NPG_9
    stacked: false
    tsdf: 25%
    participants: [AWACS-1, F16-LEAD]
  }

  messages {
    J2/2  { enabled: true,  npg: NPG_2  }
    J3/2  { enabled: true,  npg: NPG_9  }
  }
}
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript (strict) |
| UI | React 19, Tailwind CSS 4 |
| Editor | Monaco Editor |
| State | Zustand |
| Build | Vite 7 |
| Testing | Vitest, Testing Library |

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Project Structure

```
src/
  components/     UI components (editor, problems panel, outline)
  editor/         Monaco language integration (tokeniser, providers)
  engine/         Core DSL engine
    lexer.ts        Tokeniser
    parser.ts       Recursive-descent parser → AST
    validator.ts    Semantic & domain validation
    types.ts        AST node types & diagnostics
    __tests__/      Engine unit tests
  specs/           Bundled TDL spec data
    link16/         NPGs, J-messages, enums, platform types
  store/           Application state (Zustand)
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 Browser SPA                     │
│                                                 │
│  Monaco Editor ──► Lexer ──► Parser ──► AST     │
│       ▲                                  │      │
│       │              Spec Database       ▼      │
│       └──────── Diagnostics ◄── Validator       │
│                                                 │
└─────────────────────────────────────────────────┘
```

## License

This project is licensed under the **Apache License 2.0 with the Commons Clause** — you can use, modify, and share it freely, but you **cannot sell it** or offer it as a paid service. See [LICENSE](LICENSE) for the full text.

Defence primes and integrators: if you'd like a commercial license, get in touch.
