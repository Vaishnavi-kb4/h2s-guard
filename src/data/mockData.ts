import type { BadgeRecord, Measurement, NotificationItem, ReviewAlert, Worker } from "@/types/h2s";

export const alerts: ReviewAlert[] = [];
export const workers: Worker[] = [];
export const badges: BadgeRecord[] = [];
export const measurements: Measurement[] = [];
export const notifications: NotificationItem[] = [];
export const exposureSeries: { time: string; exposure: number; valid: number }[] = [];
export const calibrationPoints = [
  { known: 0, response: 98 },
  { known: 1, response: 86 },
  { known: 2, response: 72 },
  { known: 3, response: 61 },
  { known: 4, response: 49 },
  { known: 5, response: 40 },
];

export const sampleWorkers: Worker[] = [];
export const sampleBadges: BadgeRecord[] = [];
export const sampleMeasurements: Measurement[] = [];
export const sampleAlerts: ReviewAlert[] = [];
export const sampleNotifications: NotificationItem[] = [];
