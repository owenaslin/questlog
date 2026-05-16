export function getTimeOfDayLabel(): "Morning" | "Today" | "Tonight" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 18) return "Today";
  return "Tonight";
}

export function isStreakStillActive(lastDateStr: string | null | undefined): boolean {
  if (!lastDateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const last = new Date(lastDateStr);
  last.setHours(0, 0, 0, 0);
  return last >= yesterday;
}
