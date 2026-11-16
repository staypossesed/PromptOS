export interface StudyMessage { role: "user" | "assistant"; content: string; }
export type StudyIntent = "lesson" | "checkpoint";
export const MAX_STUDY_MESSAGES = 80;
export const MAX_STUDY_MESSAGE_CHARS = 16000;
export const MAX_STUDY_HISTORY_CHARS = 64000;
export const MAX_STUDY_REQUEST_BYTES = 128000;

export const STUDY_COACH_OPENING = "What subject or skill do you want to study?\n\nHow many weeks do you want the course to last, and how much time can you spend per session?";
export const CHECKPOINT_REQUEST = "End this session and produce my Progress Checkpoint. Preserve any unanswered diagnostic question or practice exercise as the next step.";

export function validateStudyRequest(body: unknown): { messages: StudyMessage[]; intent: StudyIntent } | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const value = body as Record<string, unknown>;
  const intent = value.intent ?? "lesson";
  if (intent !== "lesson" && intent !== "checkpoint") return null;
  if (!Array.isArray(value.messages) || !value.messages.length || value.messages.length > MAX_STUDY_MESSAGES) return null;
  const messages: StudyMessage[] = [];
  let size = 0;
  for (const entry of value.messages) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const item = entry as Record<string, unknown>;
    const expected = messages.length % 2 === 0 ? "user" : "assistant";
    if (item.role !== expected || typeof item.content !== "string" || !item.content.trim() || item.content.length > MAX_STUDY_MESSAGE_CHARS) return null;
    size += item.content.length;
    if (size > MAX_STUDY_HISTORY_CHARS) return null;
    messages.push({ role: expected, content: item.content.trim() });
  }
  if (messages.at(-1)?.role !== "user") return null;
  return { messages, intent };
}

/** Avoid silent context truncation; reserve room for a response and wrap-up request. */
export function studySessionNearLimit(messages: StudyMessage[], draft = ""): boolean {
  return messages.length >= 74 || messages.reduce((sum, message) => sum + message.content.length, 0) + draft.length > 48000;
}

const CHECKPOINT_FIELDS = ["Topic", "Course length", "Time per session", "Current lesson number", "Lessons completed", "Weak areas identified", "Next step", "Pending exercise or diagnostic"] as const;
export function extractStudyCheckpoint(text: string): string | null {
  const start = text.search(/^#{1,3}\s+Progress Checkpoint\s*$/im);
  if (start < 0) return null;
  const checkpoint = text.slice(start).trim();
  if (checkpoint.length > 12000) return null;
  return CHECKPOINT_FIELDS.every(field => new RegExp("^" + field + ":[\\t ]*\\S[^\\r\\n]*$", "im").test(checkpoint)) ? checkpoint : null;
}
