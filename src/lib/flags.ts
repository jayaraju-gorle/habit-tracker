/**
 * weeklyHabits — owner: habit-tracker maintainers — expires: 2026-10-24
 * Remove this flag after it has been on for everyone, or by the expiration date.
 * Default is off. A missing or unreadable flag stays off.
 */
export const WEEKLY_HABITS_FLAG = {
  id: "weeklyHabits",
  owner: "habit-tracker maintainers",
  expires: "2026-10-24",
} as const;

export function readWeeklyHabitsFlag(payload: unknown): boolean {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return false;
  return (payload as { weeklyHabits?: unknown }).weeklyHabits === true;
}

export function habitTypes(weeklyEnabled: boolean): Array<"daily" | "weekly"> {
  return weeklyEnabled ? ["daily", "weekly"] : ["daily"];
}
