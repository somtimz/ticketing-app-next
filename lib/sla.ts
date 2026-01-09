export type Priority = 'P1' | 'P2' | 'P3' | 'P4';
export type Impact = 'Low' | 'Medium' | 'High';
export type Urgency = 'Low' | 'Medium' | 'High';

const PRIORITY_MATRIX: Record<Impact, Record<Urgency, Priority>> = {
  Low: { Low: 'P4', Medium: 'P3', High: 'P2' },
  Medium: { Low: 'P3', Medium: 'P2', High: 'P1' },
  High: { Low: 'P2', Medium: 'P1', High: 'P1' }
};

export function calculatePriority(impact: Impact, urgency: Urgency): Priority {
  return PRIORITY_MATRIX[impact][urgency];
}

export function calculateSLADueDates(priority: Priority, createdAt: Date): {
  firstResponseDue: Date;
  resolutionDue: Date;
} {
  const SLA_MINUTES: Record<Priority, { firstResponse: number; resolution: number }> = {
    P1: { firstResponse: 15, resolution: 240 },
    P2: { firstResponse: 60, resolution: 1440 },
    P3: { firstResponse: 240, resolution: 4320 },
    P4: { firstResponse: 1440, resolution: 10080 }
  };

  const sla = SLA_MINUTES[priority];
  return {
    firstResponseDue: new Date(createdAt.getTime() + sla.firstResponse * 60 * 1000),
    resolutionDue: new Date(createdAt.getTime() + sla.resolution * 60 * 1000)
  };
}

export function isSLABreached(dueDate: Date, now: Date = new Date()): boolean {
  return now > dueDate;
}

export function getSLAStatus(createdAt: Date, dueDate: Date, now: Date = new Date()): 'ok' | 'warning' | 'breached' {
  const timeUntilDue = dueDate.getTime() - now.getTime();
  const totalWindow = dueDate.getTime() - createdAt.getTime();

  if (timeUntilDue <= 0) return 'breached';
  if (timeUntilDue < totalWindow * 0.2) return 'warning';
  return 'ok';
}
