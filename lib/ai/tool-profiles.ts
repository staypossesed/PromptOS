/**
 * lib/ai/tool-profiles.ts
 *
 * Tool profiles are the core IP of Umprompt.
 * Each profile encodes how to write a prompt that performs well
 * for a specific target tool. The system prompt assembled from a
 * profile is what differentiates "tool-tuned" output from generic
 * prompt generators.
 *
 * Stored in code (not DB) for now — see Day 0 architecture plan.
 */

import type { ToolId } from "@/lib/mock-data";

export interface ToolProfile {
  id: ToolId;
  displayName: string;

  /** Short context for the meta-prompt header */
  systemPrimer: string;

  /**
   * The structural template the generator should emit.
   * Used both in the system prompt and as a reference for the user.
   */
  outputTemplate: string;

  /** Anti-patterns to avoid — fed to the model as guardrails */
  antipatterns: string[];

  /** Strong reference examples — few-shot anchoring */
  examples: string[];
}

// ─── Claude profile ────────────────────────────────────────────────────────
// Claude responds best to: explicit role, XML-tagged sections, success
// criteria above context, step-by-step reasoning when complex.

const CLAUDE: ToolProfile = {
  id: "claude",
  displayName: "Claude",
  systemPrimer: `You are writing a prompt that will be sent to Claude (Anthropic).
Claude follows XML-tagged structure reliably and responds best to:
- An explicit <role> assignment that frames the model as a domain expert
- Clear <task> with a single, unambiguous deliverable
- <success_criteria> placed near the top so the model can self-check
- <context> that includes versions, frameworks, and prior state
- <constraints> with both must-haves and must-nots
- <output_format> that declares the exact shape of the response
- <examples> when the task allows them, especially for tone or structure`,

  outputTemplate: `<role>
A specific, named role with relevant domain experience.
</role>

<task>
A single sentence describing the deliverable.
</task>

<success_criteria>
- Bulleted list of what "done" looks like
- Each item objectively checkable
</success_criteria>

<context>
- Tech stack, framework versions, prior state
- Audience and downstream consumer of the output
- Anything the model couldn't infer
</context>

<constraints>
- Hard musts and must-nots
- Length / token budget if relevant
</constraints>

<output_format>
The exact shape of the response — sections, fenced code blocks, JSON schema, etc.
</output_format>

<examples>
One concrete example of the desired output (optional but high-leverage).
</examples>`,

  antipatterns: [
    "Vague pronouns or unclear references",
    "Missing output format declaration",
    "Stacking constraints inside the task instead of a constraints block",
    "Asking for 'best practices' without defining what 'best' means here",
  ],

  examples: [
    `<role>
You are a senior TypeScript engineer specializing in Next.js 15 and Supabase.
</role>

<task>
Implement a magic-link auth flow with a callback handler and protected routes.
</task>

<success_criteria>
- New users can sign up with email only, no password
- /dashboard and /builder are guarded by middleware
- Sessions are read server-side via request cookies
</success_criteria>`,
  ],
};

// ─── Cursor profile ────────────────────────────────────────────────────────
// Cursor wants codebase-aware, file-path-anchored, step-by-step instructions.
// "Don't break X" is a critical pattern.

const CURSOR: ToolProfile = {
  id: "cursor",
  displayName: "Cursor",
  systemPrimer: `You are writing a prompt that will be sent to Cursor.
Cursor is a codebase-aware coding agent. The most effective Cursor prompts:
- Name the file paths the agent should read or modify (e.g. app/foo/page.tsx)
- State the tech stack explicitly so the agent uses the right APIs
- List implementation steps in order, not just an outcome
- Specify acceptance criteria the agent can self-verify
- Include "do not break" instructions for adjacent functionality
- Require running tsc/build/test commands before finishing`,

  outputTemplate: `## Task
One sentence describing what to build or change.

## Tech stack
- Framework version, language, key libraries
- Anything that affects which APIs are valid

## Files to read first
- path/to/relevant-file.ts — why it matters
- path/to/another.ts — why it matters

## Implementation steps
1. First concrete change with the file path
2. Second change
3. ...

## Acceptance criteria
- [ ] Specific, checkable outcome
- [ ] Build passes (npm run build)
- [ ] Type check passes (tsc --noEmit)

## Do not break
- List existing flows or files that must keep working
- Adjacent features that share code paths

## Out of scope
- Things the agent should explicitly NOT touch`,

  antipatterns: [
    "Generic asks like 'make it better' with no concrete file or output",
    "Missing tech stack — leads to wrong API versions",
    "No acceptance criteria — agent stops too early",
    "Forgetting the 'do not break' section — silent regressions",
  ],

  examples: [
    `## Task
Replace the hard-coded mock prompt in /builder with a call to the new /api/prompts/generate streaming endpoint.

## Tech stack
- Next.js 15.0.7 App Router, TypeScript strict
- Vercel AI SDK v4, @ai-sdk/anthropic v1

## Files to read first
- app/builder/page.tsx — current generate handler
- app/api/prompts/generate/route.ts — endpoint contract`,
  ],
};

// ─── ChatGPT profile ───────────────────────────────────────────────────────
// ChatGPT responds best to persona + few-shot + direct imperative instructions.

const CHATGPT: ToolProfile = {
  id: "chatgpt",
  displayName: "ChatGPT",
  systemPrimer: `You are writing a prompt that will be sent to ChatGPT (OpenAI GPT-4/5 family).
ChatGPT responds best to:
- A persona/role at the top (e.g. "You are a senior copywriter…")
- Direct imperative instructions, not requests phrased as questions
- A small number of concrete examples (2-3) that show desired tone and form
- Explicit output format with section labels
- "Think step by step" when the task involves reasoning
- Negative framing for what to avoid, alongside positive guidance`,

  outputTemplate: `# Persona
You are a [specific role with relevant expertise].

# Task
[Direct imperative — Write / Generate / Analyze / Compare …]

# Context
- [Background the model would otherwise have to guess]
- [Audience and tone target]

# Examples
Example 1:
[Concrete example of desired output]

Example 2:
[Second example with different shape but same tone]

# Output format
[Exact structure — headings, bullet count, max length, etc.]

# Avoid
- [Common failure mode 1]
- [Common failure mode 2]`,

  antipatterns: [
    "Asking 'can you help me…' instead of stating the task imperatively",
    "Skipping examples on tasks where tone or style matters",
    "Vague output format like 'a few paragraphs'",
    "No persona — model defaults to a hedged, generic voice",
  ],

  examples: [
    `# Persona
You are a senior B2B SaaS copywriter who has written conversion copy for Linear, Vercel, and Notion.

# Task
Write 5 hero-section headline variations for a landing page.

# Context
- Product: a prompt-engineering workspace for developers
- Audience: vibe coders, automation freelancers, AI power users
- Tone: confident, specific, no marketing fluff`,
  ],
};

// ─── Registry ──────────────────────────────────────────────────────────────

export const TOOL_PROFILES: Record<ToolId, ToolProfile> = {
  claude: CLAUDE,
  cursor: CURSOR,
  chatgpt: CHATGPT,
};

export function getToolProfile(id: ToolId): ToolProfile {
  return TOOL_PROFILES[id];
}
