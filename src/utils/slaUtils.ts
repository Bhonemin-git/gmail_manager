import { SLA_CONFIG, SLAStatus, SLAEmailRow, SLAProgressData } from '../types/sla';

export function format24h(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate().toString().padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day} ${month} ${year}, ${hours}:${minutes}`;
}

export function hoursBetween(startDate: Date, endDate: Date): number {
  const diffMs = endDate.getTime() - startDate.getTime();
  return diffMs / (1000 * 60 * 60);
}

export function computeStatus(row: SLAEmailRow, now: Date): SLAStatus {
  if (row.resolved) {
    return "Resolved";
  }

  const config = SLA_CONFIG[row.label];
  const receivedAt = new Date(row.received_at);
  const elapsed = hoursBetween(receivedAt, now);

  if (elapsed >= config.slaHours) {
    return "Breached";
  } else if (elapsed >= config.onTrackHours) {
    return "Warning";
  } else {
    return "On Track";
  }
}

export function computeProgress(row: SLAEmailRow, now: Date): SLAProgressData {
  const config = SLA_CONFIG[row.label];
  const receivedAt = new Date(row.received_at);

  let elapsed: number;

  if (row.resolved && row.resolved_at) {
    const resolvedAt = new Date(row.resolved_at);
    elapsed = hoursBetween(receivedAt, resolvedAt);
  } else {
    elapsed = hoursBetween(receivedAt, now);
  }

  const remaining = Math.max(0, config.slaHours - elapsed);
  const fraction = Math.min(1, elapsed / config.slaHours);
  const onTrackFraction = config.onTrackHours / config.slaHours;
  const status = computeStatus(row, now);

  let timeRemainingText: string;
  if (status === "Resolved") {
    timeRemainingText = "Resolved";
  } else if (status === "Breached") {
    timeRemainingText = "Breached";
  } else {
    timeRemainingText = formatTimeRemaining(remaining);
  }

  return {
    elapsedHours: elapsed,
    remainingHours: remaining,
    fraction,
    onTrackFraction,
    status,
    timeRemainingText
  };
}

export function formatTimeRemaining(hours: number): string {
  if (hours <= 0) return "0h 0m left";

  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  if (h === 0) {
    return `${m}m left`;
  }

  return `${h}h ${m}m left`;
}
