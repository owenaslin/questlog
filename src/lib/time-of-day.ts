export function getTimeOfDayLabel(): "Morning" | "Afternoon" | "Tonight" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 18) return "Afternoon";
  return "Tonight";
}

export function isStreakStillActive(lastDateStr: string | null | undefined): boolean {
  if (!lastDateStr) return false;
  // Parse as local date components to avoid UTC-midnight shift on date-only strings
  const [year, month, day] = lastDateStr.split("-").map(Number);
  const last = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return last >= yesterday;
}
