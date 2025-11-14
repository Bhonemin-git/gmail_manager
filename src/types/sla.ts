export const SLA_CONFIG = {
  "1: billing": { slaHours: 6, onTrackHours: 5 },
  "2: bug report": { slaHours: 2, onTrackHours: 1.5 },
  "3: feature request": { slaHours: 24, onTrackHours: 22 },
  "4: abuse report": { slaHours: 3, onTrackHours: 2.5 },
} as const;

export type SLALabel = keyof typeof SLA_CONFIG;

export type SLAStatus = "On Track" | "Warning" | "Breached" | "Resolved";

export interface SLAEmailRow {
  id: string;
  user_email: string;
  message_id: string;
  email_address: string;
  subject: string;
  body_preview: string;
  label: SLALabel;
  received_at: string;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SLAProgressData {
  elapsedHours: number;
  remainingHours: number;
  fraction: number;
  onTrackFraction: number;
  status: SLAStatus;
  timeRemainingText: string;
}
