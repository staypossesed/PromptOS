import type { ToolId } from "@/lib/mock-data";
import type { PromptContext } from "@/types/prompt";

export type TemplateCategory =
  | "Cursor"
  | "Claude"
  | "ChatGPT"
  | "n8n"
  | "Airtable"
  | "Sales"
  | "Content"
  | "Research";

export interface Template {
  id: string;
  title: string;
  category: TemplateCategory;
  target_tool: ToolId;
  description: string;
  idea: string;
  context?: PromptContext;
}

export const TEMPLATES: Template[] = [
  // ── Cursor ─────────────────────────────────────────────────────────────────
  {
    id: "cursor-auth-flow",
    title: "Magic link auth with Supabase",
    category: "Cursor",
    target_tool: "cursor",
    description:
      "Build a complete magic-link auth flow with middleware route protection and an auth callback handler.",
    idea: "Implement magic-link auth using Supabase in a Next.js 15 App Router project — sign-in page, protected route middleware, and /auth/callback handler",
    context: {
      projectType: "Next.js 15 App Router",
      constraints:
        "TypeScript strict mode. Use Supabase Auth directly — no NextAuth. No tokens in localStorage.",
      outputFormat:
        "Three files: middleware.ts, app/login/page.tsx, app/auth/callback/route.ts",
    },
  },
  {
    id: "cursor-api-endpoint",
    title: "Paginated API endpoint",
    category: "Cursor",
    target_tool: "cursor",
    description:
      "Add a paginated REST API route with input validation, error handling, and Supabase RLS.",
    idea: "Add a paginated GET /api/items endpoint with cursor-based pagination, Supabase server client, input validation, and standard { data, nextCursor, total } response shape",
    context: {
      projectType: "Next.js 15 App Router",
      constraints:
        "TypeScript strict. Use createClient from @/lib/supabase/server. Validate query params before DB call. Return 422 for invalid input, 401 for unauthenticated.",
      outputFormat: "Single file: app/api/items/route.ts",
    },
  },

  // ── Claude ─────────────────────────────────────────────────────────────────
  {
    id: "claude-competitor-analysis",
    title: "Competitor analysis",
    category: "Claude",
    target_tool: "claude",
    description:
      "Research top competitors in any market — pricing, positioning, strengths, and strategic gaps.",
    idea: "Research and analyze the top 5 competitors in [your market/industry] — pricing tiers, positioning, target audience, core strengths, notable weaknesses, and gaps you can exploit",
    context: {
      outputFormat:
        "Structured report: executive summary, comparison table, individual deep-dives (one section per competitor), strategic opportunities list",
      constraints:
        "Use only publicly available information. Flag inferences vs. confirmed facts. Include sources.",
    },
  },
  {
    id: "claude-technical-docs",
    title: "Technical documentation",
    category: "Claude",
    target_tool: "claude",
    description:
      "Write clear, structured technical documentation for any feature, API, or system.",
    idea: "Write technical documentation for [feature or API name] — including overview, authentication/setup, usage examples with code, edge cases, error handling, and a troubleshooting FAQ",
    context: {
      audience: "Developers integrating with the API for the first time",
      outputFormat:
        "Markdown with headers: Overview, Quick Start, API Reference, Code Examples, Edge Cases, Troubleshooting",
      constraints:
        "Use real code examples. Do not use placeholder text — if a value is unknown, say so explicitly.",
    },
  },

  // ── ChatGPT ────────────────────────────────────────────────────────────────
  {
    id: "chatgpt-cold-email",
    title: "Cold email sequence",
    category: "ChatGPT",
    target_tool: "chatgpt",
    description:
      "Write a 3-email outbound sequence with subject lines, a clear value prop, and a soft CTA.",
    idea: "Write a 3-email cold outreach sequence targeting [audience] for [product] — each with a subject line, 100-word body, and one CTA",
    context: {
      audience:
        "Decision-makers who are time-constrained and skeptical of cold outreach",
      outputFormat:
        "Email 1: value hook. Email 2: social proof or use case. Email 3: breakup email. Each: Subject / Body / CTA.",
      constraints:
        "No jargon. No 'I hope this finds you well'. Short paragraphs. First line must hook immediately.",
      examples:
        "Good first line: 'Most [role] I talk to spend 2 hours/week on X — we cut that to 10 minutes.'",
    },
  },
  {
    id: "chatgpt-linkedin-content",
    title: "LinkedIn content calendar",
    category: "ChatGPT",
    target_tool: "chatgpt",
    description:
      "Plan 2 weeks of LinkedIn posts with hooks, content formats, and engagement CTAs.",
    idea: "Create a 2-week LinkedIn content calendar for a [role, e.g. indie founder or dev tools builder] — thought leadership, behind-the-scenes, product updates, and lessons learned",
    context: {
      audience:
        "Other builders, developers, and B2B decision-makers on LinkedIn",
      outputFormat:
        "Table: Day | Content type | Hook (first line) | Key point | CTA",
      constraints:
        "Each post must have a scroll-stopping first line. Vary formats: list, story, insight, question. No corporate speak.",
    },
  },

  // ── n8n ────────────────────────────────────────────────────────────────────
  {
    id: "n8n-lead-automation",
    title: "Lead capture automation",
    category: "n8n",
    target_tool: "chatgpt",
    description:
      "Design a complete n8n workflow for capturing, enriching, and routing leads automatically.",
    idea: "Design a complete n8n automation: when a new lead submits a Typeform, enrich with Clearbit, score the lead, route hot leads to Slack, and add all leads to HubSpot",
    context: {
      projectType: "n8n automation workflow",
      outputFormat:
        "Node-by-node breakdown: trigger → enrichment → scoring logic → routing → CRM update. Include error handling for API failures.",
      constraints:
        "Use native n8n nodes where possible. Flag any steps that require code nodes.",
    },
  },

  // ── Airtable ───────────────────────────────────────────────────────────────
  {
    id: "airtable-project-tracker",
    title: "Project tracker base design",
    category: "Airtable",
    target_tool: "claude",
    description:
      "Design an Airtable base structure for any project type — tables, fields, relations, and views.",
    idea: "Design an Airtable base for tracking [project type, e.g. software features / client work / content production] — define tables, field types, linked record relationships, and recommended views",
    context: {
      outputFormat:
        "For each table: name, fields (name + type + options), linked records, rollup/formula fields. Then: recommended views per table with filter/sort logic.",
      constraints:
        "Design for a team of 2–10. Avoid over-engineering — prioritize usability over completeness.",
    },
  },

  // ── Sales ──────────────────────────────────────────────────────────────────
  {
    id: "sales-discovery-call",
    title: "Discovery call framework",
    category: "Sales",
    target_tool: "chatgpt",
    description:
      "Build a structured discovery call guide with opening questions, objection handling, and next steps.",
    idea: "Create a discovery call framework for selling [product] to [persona, e.g. CTOs at Series A startups] — opening questions, qualification criteria, pain exploration, objection responses, and a close",
    context: {
      audience: "Account executives running 30–45 minute discovery calls",
      outputFormat:
        "Sections: Pre-call research checklist / Opening (2 min) / Discovery questions (15 min) / Qualification scorecard / Common objections + responses / Next steps close",
      constraints:
        "Questions must be open-ended. No product pitching in discovery. Each question should surface a specific pain or qualification signal.",
    },
  },

  // ── Content ────────────────────────────────────────────────────────────────
  {
    id: "content-landing-page",
    title: "Landing page copy",
    category: "Content",
    target_tool: "claude",
    description:
      "Write a full landing page for any product — hero, benefits, social proof, and CTA.",
    idea: "Write a full landing page for [product name] — hero headline and subheadline, 3 benefit sections, 2–3 social proof quotes, FAQ (5 questions), and a final CTA",
    context: {
      audience: "[Target customer, e.g. developers who build AI-powered apps]",
      constraints:
        "Hero headline: max 8 words. Subheadline: 1–2 sentences, lead with outcome. Benefits: result first, then how. No adjectives without evidence.",
      outputFormat:
        "Full page copy in labeled sections with [brackets] showing where to customize",
    },
  },
  {
    id: "content-blog-outline",
    title: "Blog post outline",
    category: "Content",
    target_tool: "chatgpt",
    description:
      "Create a detailed, SEO-structured outline for any blog post topic and audience.",
    idea: "Create a detailed blog post outline for '[post title or topic]' targeting [audience] — SEO-optimized H1, intro hook, 5–7 sections with key points, and a conclusion CTA",
    context: {
      audience: "[Target reader, e.g. developers learning about prompt engineering]",
      outputFormat:
        "H1 title / Meta description (155 chars) / Intro (hook + problem + promise) / Section headers with 2–3 bullet points each / Conclusion / CTA",
      constraints:
        "Target keyword in H1 and first paragraph. Each section must answer a specific reader question. Avoid filler — every section earns its place.",
    },
  },

  // ── Research ───────────────────────────────────────────────────────────────
  {
    id: "research-market-sizing",
    title: "Market sizing analysis",
    category: "Research",
    target_tool: "claude",
    description:
      "Estimate TAM, SAM, and SOM for any product using structured bottom-up and top-down approaches.",
    idea: "Estimate the total addressable market (TAM), serviceable addressable market (SAM), and serviceable obtainable market (SOM) for [product/service] in [geography/segment]",
    context: {
      outputFormat:
        "Bottom-up calculation + top-down validation for each tier. Assumptions table, data sources, confidence intervals, and a 1-paragraph executive summary.",
      constraints:
        "Every number must trace to a stated assumption or source. Flag high-uncertainty estimates. Use ranges, not false precision.",
    },
  },
];

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  "Cursor",
  "Claude",
  "ChatGPT",
  "n8n",
  "Airtable",
  "Sales",
  "Content",
  "Research",
];
