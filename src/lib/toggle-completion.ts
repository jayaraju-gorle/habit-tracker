import type { Habit } from "./habit-store";

export function toggleCompletion(habit: Habit, period: string): Habit {
  const completed = habit.completions.includes(period);
  const completions = completed
    ? habit.completions.filter((date) => date !== period)
    : [...habit.completions, period].sort();
  return { ...habit, completions };
}
