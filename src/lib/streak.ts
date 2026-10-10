function previousDay(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function streakLength(completedDates: readonly string[], today: string): number {
  const done = new Set(completedDates);
  let anchor = today;

  if (!done.has(today)) {
    const yesterday = previousDay(today);
    if (!done.has(yesterday)) return 0;
    anchor = yesterday;
  }

  let count = 0;
  for (let day = anchor; done.has(day); day = previousDay(day)) {
    count += 1;
  }
  return count;
}
