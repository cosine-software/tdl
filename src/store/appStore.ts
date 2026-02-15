import { create } from 'zustand';
import { parse } from '../engine/parser';
import { validate } from '../engine/validator';
import type { DocumentNode, Diagnostic, SourceSpan } from '../engine/types';

export interface AppState {
  /** Current editor content. */
  source: string;

  /** Parsed AST (may be partial on errors). */
  ast: DocumentNode | null;

  /** Combined parse + validation diagnostics. */
  diagnostics: Diagnostic[];

  /** Currently selected problem index (for problems panel). */
  selectedProblemIndex: number | null;

  /** Span to reveal in the editor (set by outline / other UI). */
  revealSpan: SourceSpan | null;

  /** Update the source code and re-run parse + validation. */
  setSource: (source: string) => void;

  /** Select a problem in the problems panel. */
  selectProblem: (index: number | null) => void;

  /** Reveal a source span in the editor. */
  setRevealSpan: (span: SourceSpan | null) => void;
}

const DEFAULT_SOURCE = `-- Link 16 Network Configuration
-- Edit this configuration to get started

network "EXAMPLE" {
  link: Link16
  classification: SECRET

  terminal "AWACS-1" {
    track_number: 01400
    platform_type: E3A
    role: NetControlStation
    subscribes: [NPG_A, NPG_2, NPG_9]
    transmits: [NPG_A, NPG_9]
  }

  terminal "F16-LEAD" {
    track_number: 02100
    platform_type: F16C
    role: Participant
    subscribes: [NPG_A, NPG_9]
    transmits: [NPG_A, NPG_9]
  }

  net "SURVEILLANCE" {
    net_number: 1
    npg: NPG_9
    stacked: false
    tsdf: 25%
    participants: [AWACS-1, F16-LEAD]
  }

  net "FIGHTER-TO-FIGHTER" {
    net_number: 2
    npg: NPG_A
    stacked: false
    tsdf: 15%
    participants: [F16-LEAD]
  }

  net "PPLI-PRIMARY" {
    net_number: 3
    npg: NPG_2
    stacked: true
    stacking_level: 2
    tsdf: 30%
    participants: [AWACS-1, F16-LEAD]
  }

  net "PPLI-BACKUP" {
    net_number: 4
    npg: NPG_2
    stacked: true
    stacking_level: 2
    tsdf: 20%
    participants: [AWACS-1]
  }

  messages {
    J2/2 { enabled: true, npg: NPG_2 }
    J3/2 { enabled: true, npg: NPG_9 }
  }
}

-- ────────────────────────────────────────────
-- Link 22 Network Configuration (STANAG 5522)
-- Exercise: TRIDENT JAVELIN 2026
-- Classification: UNCLASSIFIED // TRAINING ONLY
-- ────────────────────────────────────────────

network "L22-ALPHA" {
  link: Link22
  classification: UNCLASSIFIED

  -- Primary subnetwork: Surface combatants
  -- NetSlotted mode with 750ms slots for deterministic access
  subnetwork "SURFACE-COMB" {
    operating_mode: NetSlotted
    data_rate: High

    -- Net Control Station — DDG acting as controller
    member "UNIT-A01" {
      unit_id: 0x1A3F
      role: Controller
      forwarding: enabled
    }

    -- Airborne participant — maritime patrol
    member "UNIT-B12" {
      unit_id: 0x2B4E
      role: Participant
      forwarding: enabled
    }

    -- Subsurface participant
    member "UNIT-C07" {
      unit_id: 0x3C5D
      role: Participant
      forwarding: disabled
    }
  }

  -- Secondary subnetwork: ISR & coordination
  -- Contention mode for flexible, high-throughput data sharing
  subnetwork "ISR-COORD" {
    operating_mode: Contention
    data_rate: Medium

    member "UNIT-A01" {
      unit_id: 0x1A3F
      role: Controller
      forwarding: enabled
    }

    member "UNIT-D03" {
      unit_id: 0x4D6E
      role: Participant
      forwarding: enabled
    }

    member "UNIT-E19" {
      unit_id: 0x5E7F
      role: Participant
      forwarding: disabled
    }
  }
}
`;

function runEngine(source: string): { ast: DocumentNode; diagnostics: Diagnostic[] } {
  const { ast, diagnostics: parseErrors } = parse(source);
  const validationErrors = validate(ast);
  return {
    ast,
    diagnostics: [...parseErrors, ...validationErrors],
  };
}

// Initialise with default source
const initialResult = runEngine(DEFAULT_SOURCE);

export const useAppStore = create<AppState>((set) => ({
  source: DEFAULT_SOURCE,
  ast: initialResult.ast,
  diagnostics: initialResult.diagnostics,
  selectedProblemIndex: null,
  revealSpan: null,

  setSource: (source: string) => {
    const { ast, diagnostics } = runEngine(source);
    set({ source, ast, diagnostics });
  },

  selectProblem: (index: number | null) => {
    set({ selectedProblemIndex: index });
  },

  setRevealSpan: (span: SourceSpan | null) => {
    set({ revealSpan: span });
  },
}));
