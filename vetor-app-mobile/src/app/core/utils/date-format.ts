function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function dayLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  if (isSameDay(date, now)) return 'hoje';
  if (isSameDay(date, yesterday)) return 'ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function timeLabel(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
