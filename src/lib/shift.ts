// Trocas de turno da portaria: 6h e 18h. Sessões abertas antes da última
// troca são consideradas encerradas (logout automático).
const MORNING_SHIFT_HOUR = 6;
const NIGHT_SHIFT_HOUR = 18;

/** Horário (Date) da última troca de turno antes de `now`. */
export function mostRecentShiftBoundary(now: Date = new Date()): Date {
  const boundary = new Date(now);
  boundary.setMinutes(0, 0, 0);

  const hour = now.getHours();
  if (hour >= NIGHT_SHIFT_HOUR) {
    boundary.setHours(NIGHT_SHIFT_HOUR);
  } else if (hour >= MORNING_SHIFT_HOUR) {
    boundary.setHours(MORNING_SHIFT_HOUR);
  } else {
    boundary.setDate(boundary.getDate() - 1);
    boundary.setHours(NIGHT_SHIFT_HOUR);
  }
  return boundary;
}

/** Horário (Date) da próxima troca de turno a partir de `now`. */
export function nextShiftBoundary(now: Date = new Date()): Date {
  const next = new Date(mostRecentShiftBoundary(now));
  const hour = next.getHours() >= NIGHT_SHIFT_HOUR ? MORNING_SHIFT_HOUR : NIGHT_SHIFT_HOUR;
  if (hour === MORNING_SHIFT_HOUR) {
    next.setDate(next.getDate() + 1);
  }
  next.setHours(hour);
  return next;
}

/** Uma sessão iniciada antes da última troca de turno já expirou. */
export function isSessionExpiredByShift(loginAt: number, now: Date = new Date()): boolean {
  return loginAt < mostRecentShiftBoundary(now).getTime();
}
