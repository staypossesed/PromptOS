export interface TaskMetric {
  task_id: string;
  result_id: string;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseTaskMetric(value: unknown): TaskMetric | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  return typeof v.task_id === "string" && uuid.test(v.task_id) && typeof v.result_id === "string" && uuid.test(v.result_id)
    ? { task_id: v.task_id, result_id: v.result_id } : null;
}

// Versions share a task ID; only a genuinely new task can count towards retention.
export function nextTaskMetric(previous: TaskMetric | null, newTask: boolean): TaskMetric {
  return { task_id: !newTask && previous ? previous.task_id : crypto.randomUUID(), result_id: crypto.randomUUID() };
}
