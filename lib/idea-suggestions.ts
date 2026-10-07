import type { TaskCategory } from "./task-categories";
import { LOCALIZED_IDEAS } from "./localized-ideas";

export interface IdeaSuggestion {
  id: string;
  category: Exclude<TaskCategory, "auto">;
  title: string;
  idea: string;
  keywords: string[];
}

export const IDEA_SUGGESTIONS: IdeaSuggestion[] = [
  { id: "email", category: "writing", title: "An email that sounds like you", idea: "Write an email asking for a deadline extension, honest and professional without overexplaining.", keywords: ["write", "email", "message", "reply"] },
  { id: "resume", category: "writing", title: "Make your experience stand out", idea: "Improve my resume bullet points for a job application while keeping every claim accurate.", keywords: ["resume", "job", "career", "write"] },
  { id: "post", category: "writing", title: "Turn a thought into a post", idea: "Turn my rough thoughts into a concise LinkedIn post that sounds natural, with a strong opening.", keywords: ["write", "post", "social", "linkedin"] },
  { id: "essay", category: "writing", title: "Give your essay a clear direction", idea: "Help me outline an essay with a clear argument, supporting evidence and a useful conclusion.", keywords: ["essay", "write", "school", "outline"] },
  { id: "reply", category: "writing", title: "Find the words for a difficult reply", idea: "Help me reply to a difficult message calmly, clearly and with appropriate boundaries.", keywords: ["reply", "message", "write", "difficult"] },
  { id: "edit", category: "writing", title: "Make your draft clearer", idea: "Edit my draft for clarity and flow while preserving my tone and meaning.", keywords: ["edit", "rewrite", "improve", "draft"] },
  { id: "feature", category: "coding", title: "Build the feature in your head", idea: "Turn my feature idea into an implementation plan that fits my existing project and includes acceptance checks.", keywords: ["build", "code", "app", "feature", "website"] },
  { id: "debug", category: "coding", title: "Get to the cause of a bug", idea: "Help me debug an error by tracing its root cause, proposing a minimal fix and checking for regressions.", keywords: ["fix", "debug", "error", "bug", "code"] },
  { id: "learncode", category: "coding", title: "Understand unfamiliar code", idea: "Explain this code with a small example, covering what it does and why each important part exists.", keywords: ["explain", "code", "learn", "understand"] },
  { id: "tests", category: "coding", title: "Test the behavior that matters", idea: "Write focused tests for my feature covering expected behavior, edge cases and failure handling.", keywords: ["test", "code", "build", "feature"] },
  { id: "automate", category: "coding", title: "Automate a repetitive task", idea: "Help me automate a repetitive task with a reliable workflow, including failures and recovery.", keywords: ["automate", "workflow", "script", "build"] },
  { id: "review", category: "coding", title: "Catch problems before shipping", idea: "Review my code for bugs and security issues, prioritizing actionable findings with clear explanations.", keywords: ["review", "code", "security", "check"] },
  { id: "compare", category: "research", title: "Make a decision with evidence", idea: "Compare my options using my priorities, current reliable sources and a clear recommendation with tradeoffs.", keywords: ["compare", "research", "choose", "best", "buy"] },
  { id: "topic", category: "research", title: "Understand a complicated topic", idea: "Explain a topic from first principles with concrete examples, common misconceptions and reliable sources.", keywords: ["explain", "research", "understand", "learn"] },
  { id: "paper", category: "research", title: "Get the substance of a paper", idea: "Summarize a research paper's question, method, findings and limitations without overstating its conclusions.", keywords: ["summarize", "paper", "research", "study"] },
  { id: "fact", category: "research", title: "Check a claim before sharing it", idea: "Fact-check a claim using primary sources and distinguish verified evidence from uncertainty.", keywords: ["check", "fact", "research", "verify"] },
  { id: "interview", category: "research", title: "Ask more useful interview questions", idea: "Prepare thoughtful interview questions for learning about a topic, including follow-ups that uncover specifics.", keywords: ["interview", "research", "questions", "prepare"] },
  { id: "notes", category: "research", title: "Turn notes into understanding", idea: "Organize my messy notes into key themes, open questions and a concise evidence-based summary.", keywords: ["notes", "summarize", "organize", "research"] },
  { id: "week", category: "daily", title: "Make room for what matters", idea: "Plan my week around my commitments, energy levels and top priorities, leaving realistic buffer time.", keywords: ["plan", "week", "schedule", "organize"] },
  { id: "meal", category: "daily", title: "Take the thinking out of dinner", idea: "Create a practical weekly meal plan using my food preferences, available time and budget, with a shopping list.", keywords: ["plan", "meal", "food", "dinner", "cook"] },
  { id: "trip", category: "daily", title: "Plan a trip that fits you", idea: "Plan a trip around my destination, dates, budget and interests, with realistic travel times and current information.", keywords: ["plan", "trip", "travel", "holiday", "vacation"] },
  { id: "study", category: "daily", title: "Learn without feeling overwhelmed", idea: "Create a manageable study plan for my goal, with short practice sessions and ways to check understanding.", keywords: ["learn", "study", "plan", "exam"] },
  { id: "budget", category: "daily", title: "Organize your everyday spending", idea: "Help me organize a monthly household budget from my income and expenses, showing clear categories and assumptions.", keywords: ["budget", "money", "organize", "plan"] },
  { id: "decision", category: "daily", title: "Untangle a difficult decision", idea: "Help me think through a decision by clarifying priorities, realistic options and tradeoffs without deciding for me.", keywords: ["decide", "help", "decision", "choose"] },
  { id: "pitch", category: "business", title: "Make your pitch clear", idea: "Turn my business idea into a clear pitch explaining the customer problem, solution and differentiation without invented claims.", keywords: ["pitch", "business", "startup", "write"] },
  { id: "customers", category: "business", title: "Find out what customers need", idea: "Design a customer discovery plan with interview questions and a simple way to evaluate demand for my idea.", keywords: ["customer", "business", "research", "startup"] },
  { id: "meeting", category: "business", title: "Leave a meeting with next steps", idea: "Turn meeting notes into decisions, action items, owners and unresolved questions, without inventing missing details.", keywords: ["meeting", "notes", "summarize", "work"] },
  { id: "launch", category: "business", title: "Give your launch a plan", idea: "Create a realistic launch plan for my product with priorities, milestones and ways to measure progress.", keywords: ["launch", "plan", "product", "business"] },
  { id: "proposal", category: "business", title: "Write a proposal worth reading", idea: "Draft a client proposal covering their problem, my approach, deliverables and next steps using only the facts I provide.", keywords: ["proposal", "client", "write", "business"] },
  { id: "feedback", category: "business", title: "Make feedback useful", idea: "Turn customer feedback into themes, concrete product improvements and questions to investigate further.", keywords: ["feedback", "customer", "analyze", "product"] },
  { id: "story", category: "creative", title: "Find the story in your idea", idea: "Develop my story idea into a compelling premise, believable characters and a focused plot outline.", keywords: ["write", "story", "creative", "novel"] },
  { id: "image", category: "creative", title: "Describe the image you imagine", idea: "Turn my visual idea into an image-generation prompt with subject, composition, lighting and style.", keywords: ["image", "design", "create", "picture", "photo"] },
  { id: "names", category: "creative", title: "Find a name that feels right", idea: "Brainstorm memorable names for my project with different directions and a short explanation for each.", keywords: ["name", "brainstorm", "brand", "create"] },
  { id: "video", category: "creative", title: "Shape an idea into a video", idea: "Turn my idea into a short video script with a strong opening, scene outline and natural dialogue.", keywords: ["video", "script", "create", "write"] },
  { id: "gift", category: "creative", title: "Find a thoughtful gift", idea: "Suggest thoughtful gift ideas based on the recipient's interests, our relationship and my budget.", keywords: ["gift", "ideas", "birthday", "help"] },
  { id: "design", category: "creative", title: "Give your design a direction", idea: "Create a design brief for my project covering its audience, purpose, visual direction and practical requirements.", keywords: ["design", "brand", "create", "brief"] },
];

export function hashSeed(value: string): number {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function relevance(words: string[], suggestion: IdeaSuggestion): number {
  return words.reduce((score, word) => score + suggestion.keywords.reduce((sum, keyword) =>
    sum + (keyword === word ? 5 : word.length >= 2 && keyword.startsWith(word) ? 2 : 0), 0), 0);
}

export function inferTaskCategory(query: string, language = "en"): TaskCategory {
  const words = query.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const catalog = language === "ru" || language === "es" ? LOCALIZED_IDEAS[language] : IDEA_SUGGESTIONS;
  const ranked = catalog.map((suggestion) => ({ category: suggestion.category, score: relevance(words, suggestion) })).sort((a, b) => b.score - a.score);
  return ranked[0]?.score > 0 ? ranked[0].category : "auto";
}

export function getSuggestions(query: string, category: TaskCategory, seed: number, limit = 6, language = "en"): IdeaSuggestion[] {
  const words = query.toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const catalog = language === "ru" || language === "es" ? LOCALIZED_IDEAS[language] : IDEA_SUGGESTIONS;
  const pool = catalog.filter((s) => category === "auto" || s.category === category);
  const ranked = pool.map((suggestion) => ({
    suggestion,
    relevance: relevance(words, suggestion),
    order: hashSeed(`${seed}:${suggestion.id}`),
  })).sort((a, b) => b.relevance - a.relevance || a.order - b.order);
  if (words.length && ranked.some((item) => item.relevance > 0)) {
    return ranked.filter((item) => item.relevance > 0).slice(0, limit).map((item) => item.suggestion);
  }
  if (words.length || category !== "auto") return ranked.slice(0, limit).map((r) => r.suggestion);
  // An empty composer shows breadth instead of six variations on the same task.
  const used = new Set<string>();
  return ranked.filter(({ suggestion }) => {
    if (used.has(suggestion.category)) return false;
    used.add(suggestion.category);
    return true;
  }).slice(0, limit).map((r) => r.suggestion);
}
