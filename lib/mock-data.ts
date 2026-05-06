export type ToolId = "claude" | "cursor" | "chatgpt";

export interface Tool {
  id: ToolId;
  name: string;
  description: string;
  accent: string;
}

export const TOOLS: Tool[] = [
  {
    id: "claude",
    name: "Claude",
    description: "Long-form reasoning, writing, structured analysis",
    accent: "from-clay-100 to-cream-50",
  },
  {
    id: "cursor",
    name: "Cursor",
    description: "Codebase-aware engineering tasks and edits",
    accent: "from-cream-200 to-cream-50",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    description: "Conversational tasks, persona-driven outputs",
    accent: "from-clay-50 to-cream-50",
  },
];

export interface ScoreDimension {
  key: string;
  label: string;
  score: number;
  reason: string;
  tip: string;
}

export interface PromptScore {
  overall: number;
  dimensions: ScoreDimension[];
}

export const MOCK_SCORE: PromptScore = {
  overall: 87,
  dimensions: [
    {
      key: "clarity",
      label: "Clarity",
      score: 92,
      reason: "Task is unambiguous and singular in interpretation.",
      tip: "Consider naming the deliverable explicitly in the first line.",
    },
    {
      key: "context",
      label: "Context",
      score: 88,
      reason: "Background, audience, and prior state are well-stated.",
      tip: "Add the framework version to lock the model to current APIs.",
    },
    {
      key: "constraints",
      label: "Constraints",
      score: 84,
      reason: "Several musts and must-nots specified.",
      tip: "Specify token/length budget for predictable output.",
    },
    {
      key: "examples",
      label: "Examples",
      score: 78,
      reason: "One concrete example included.",
      tip: "Add a counter-example to prevent drift.",
    },
    {
      key: "output_format",
      label: "Output Format",
      score: 90,
      reason: "Output structure declared with explicit sections.",
      tip: "Ask for a fenced code block to ease copying.",
    },
    {
      key: "tool_fit",
      label: "Tool Fit",
      score: 89,
      reason: "Uses XML tagging that Claude follows reliably.",
      tip: "Move success criteria above context for stronger anchoring.",
    },
  ],
};

export const MOCK_GENERATED_PROMPT = `<role>
You are a senior full-stack engineer specializing in Next.js 15, TypeScript, and Supabase auth.
</role>

<task>
Implement a magic-link authentication flow in a Next.js App Router project. The flow must support email-based sign-in, route protection via middleware, and a callback handler.
</task>

<context>
- Next.js 15 with App Router
- TypeScript strict mode
- Tailwind CSS already configured
- Supabase client already initialized in lib/supabase
- Routes /dashboard and /builder must be protected
- Public routes: /, /login, /auth/callback
</context>

<constraints>
- Do not use NextAuth.js — use Supabase Auth directly
- All session reads on the server must use the request cookie helpers
- Middleware must redirect unauthenticated users to /login with a return URL
- Do not store tokens in localStorage
</constraints>

<output_format>
Return three files in this order:
1. middleware.ts
2. app/login/page.tsx
3. app/auth/callback/route.ts

Each file as a single fenced code block with a header comment indicating the path.
</output_format>

<examples>
A typical magic-link call looks like:
supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })
</examples>`;

export interface MockPrompt {
  id: string;
  title: string;
  idea: string;
  tool: ToolId;
  score: number;
  updatedAt: string;
  preview: string;
}

export const MOCK_PROMPTS: MockPrompt[] = [
  {
    id: "p_01",
    title: "Magic-link auth flow for Next.js",
    idea: "I need to add Supabase magic-link auth to my Next.js App Router project",
    tool: "claude",
    score: 87,
    updatedAt: "2 hours ago",
    preview:
      "You are a senior full-stack engineer specializing in Next.js 15, TypeScript, and Supabase auth…",
  },
  {
    id: "p_02",
    title: "Cold email sequence for SaaS founders",
    idea: "Write a cold email sequence targeting early-stage SaaS founders",
    tool: "chatgpt",
    score: 81,
    updatedAt: "Yesterday",
    preview:
      "Adopt the voice of a seasoned outbound strategist. Write a 3-email sequence…",
  },
  {
    id: "p_03",
    title: "Refactor data layer to use server actions",
    idea: "Refactor my Next.js data fetching to use server actions and revalidatePath",
    tool: "cursor",
    score: 92,
    updatedAt: "2 days ago",
    preview:
      "Working in app/(dashboard)/orders. Migrate the existing fetch + useSWR hooks…",
  },
  {
    id: "p_04",
    title: "Landing page hero copy variations",
    idea: "Generate 5 landing page hero copy variations for a B2B AI tool",
    tool: "claude",
    score: 76,
    updatedAt: "3 days ago",
    preview:
      "You are a conversion copywriter. Produce 5 distinct hero copy variants…",
  },
  {
    id: "p_05",
    title: "RLS policies for multi-tenant Supabase app",
    idea: "Help me write Postgres RLS policies for a multi-tenant SaaS using Supabase",
    tool: "cursor",
    score: 89,
    updatedAt: "1 week ago",
    preview:
      "You are a Postgres + Supabase security specialist. Design RLS policies…",
  },
];

export const EXAMPLE_IDEAS = [
  "Build a Next.js auth flow with magic links",
  "Write a cold email to a Series A founder",
  "Generate a landing page hero for a B2B AI tool",
  "Refactor my React component to use server actions",
];
