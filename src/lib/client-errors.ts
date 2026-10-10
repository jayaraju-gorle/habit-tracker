const ERROR_LOG_KEY = "habit-tracker:errors";
const MAX_ENTRIES = 20;
const MAX_RAW_LENGTH = 8000;

export const CLIENT_ERROR_MESSAGE = "Habits failed to render.";

type ErrorEntry = { at: string; message: string };

function priorEntries(raw: string | null): ErrorEntry[] {
  if (!raw || raw.length > MAX_RAW_LENGTH) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const entries: ErrorEntry[] = [];
    for (const item of parsed) {
      if (typeof item !== "object" || item === null) continue;
      const at = (item as { at?: unknown }).at;
      const message = (item as { message?: unknown }).message;
      if (typeof at !== "string" || message !== CLIENT_ERROR_MESSAGE) continue;
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(at)) continue;
      entries.push({ at, message });
    }
    return entries.slice(-(MAX_ENTRIES - 1));
  } catch {
    return [];
  }
}

export function recordClientError(storage: Pick<Storage, "getItem" | "setItem">, now = new Date()): void {
  try {
    const next = [
      ...priorEntries(storage.getItem(ERROR_LOG_KEY)),
      { at: now.toISOString(), message: CLIENT_ERROR_MESSAGE },
    ];
    storage.setItem(ERROR_LOG_KEY, JSON.stringify(next));
  } catch {
    // Storage can be blocked. The on-screen fallback still shows.
  }
}
