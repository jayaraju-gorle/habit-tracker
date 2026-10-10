function isoWeeksInYear(year: number): number {
  const jan1 = new Date(Date.UTC(year, 0, 1)).getUTCDay();
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return jan1 === 4 || (leap && jan1 === 3) ? 53 : 52;
}

export function isoWeekKey(date: Date): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const year = utc.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function previousWeek(key: string): string {
  const match = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!match) return key;
  let year = Number(match[1]);
  let week = Number(match[2]) - 1;
  if (week < 1) {
    year -= 1;
    week = isoWeeksInYear(year);
  }
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function weeklyStreakLength(completedWeeks: readonly string[], thisWeek: string): number {
  const done = new Set(completedWeeks);
  let anchor = thisWeek;

  if (!done.has(thisWeek)) {
    const previous = previousWeek(thisWeek);
    if (!done.has(previous)) return 0;
    anchor = previous;
  }

  let count = 0;
  for (let week = anchor; done.has(week); week = previousWeek(week)) {
    count += 1;
    if (count > 520) break;
  }
  return count;
}
