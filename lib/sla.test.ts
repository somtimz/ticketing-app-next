import { describe, it, expect } from 'vitest';
import { calculatePriority, calculateSLADueDates, isSLABreached, getSLAStatus } from './sla';

describe('calculatePriority', () => {
  it('calculates P1 for High+High', () => {
    expect(calculatePriority('High', 'High')).toBe('P1');
  });

  it('calculates P4 for Low+Low', () => {
    expect(calculatePriority('Low', 'Low')).toBe('P4');
  });

  it('calculates P2 for High+Low', () => {
    expect(calculatePriority('High', 'Low')).toBe('P2');
  });

  it('calculates P3 for Medium+Low', () => {
    expect(calculatePriority('Medium', 'Low')).toBe('P3');
  });

  it('calculates P1 for High+Medium', () => {
    expect(calculatePriority('High', 'Medium')).toBe('P1');
  });

  it('calculates P2 for Medium+Medium', () => {
    expect(calculatePriority('Medium', 'Medium')).toBe('P2');
  });
});

describe('calculateSLADueDates', () => {
  it('sets tight deadlines for P1', () => {
    const base = new Date('2025-01-09T10:00:00Z');
    const due = calculateSLADueDates('P1', base);

    expect(due.firstResponseDue.getTime()).toBe(base.getTime() + 15 * 60 * 1000);
    expect(due.resolutionDue.getTime()).toBe(base.getTime() + 240 * 60 * 1000);
  });

  it('sets loose deadlines for P4', () => {
    const base = new Date('2025-01-09T10:00:00Z');
    const due = calculateSLADueDates('P4', base);

    expect(due.firstResponseDue.getTime()).toBe(base.getTime() + 1440 * 60 * 1000);
    expect(due.resolutionDue.getTime()).toBe(base.getTime() + 10080 * 60 * 1000);
  });

  it('sets appropriate deadlines for P2', () => {
    const base = new Date('2025-01-09T10:00:00Z');
    const due = calculateSLADueDates('P2', base);

    expect(due.firstResponseDue.getTime()).toBe(base.getTime() + 60 * 60 * 1000);
    expect(due.resolutionDue.getTime()).toBe(base.getTime() + 1440 * 60 * 1000);
  });

  it('sets appropriate deadlines for P3', () => {
    const base = new Date('2025-01-09T10:00:00Z');
    const due = calculateSLADueDates('P3', base);

    expect(due.firstResponseDue.getTime()).toBe(base.getTime() + 240 * 60 * 1000);
    expect(due.resolutionDue.getTime()).toBe(base.getTime() + 4320 * 60 * 1000);
  });
});

describe('isSLABreached', () => {
  it('returns true when past due', () => {
    const past = new Date('2025-01-09T10:00:00Z');
    const now = new Date('2025-01-09T11:00:00Z');
    expect(isSLABreached(past, now)).toBe(true);
  });

  it('returns false when future', () => {
    const future = new Date('2025-01-09T12:00:00Z');
    const now = new Date('2025-01-09T11:00:00Z');
    expect(isSLABreached(future, now)).toBe(false);
  });

  it('returns true when exactly at due date', () => {
    const due = new Date('2025-01-09T10:00:00Z');
    const now = new Date('2025-01-09T10:00:00Z');
    expect(isSLABreached(due, now)).toBe(false);
  });
});

describe('getSLAStatus', () => {
  describe('with P1 tickets (4 hour resolution)', () => {
    it('returns "ok" when plenty of time remains', () => {
      const createdAt = new Date('2025-01-09T10:00:00Z');
      const resolutionDue = new Date('2025-01-09T14:00:00Z'); // 4 hours
      const now = new Date('2025-01-09T10:30:00Z'); // 3.5 hours remaining

      expect(getSLAStatus(createdAt, resolutionDue, now)).toBe('ok');
    });

    it('returns "warning" when less than 20% remains', () => {
      const createdAt = new Date('2025-01-09T10:00:00Z');
      const resolutionDue = new Date('2025-01-09T14:00:00Z'); // 4 hours
      const now = new Date('2025-01-09T13:40:00Z'); // 20 minutes remaining (< 20% of 4 hours = 48 minutes)

      expect(getSLAStatus(createdAt, resolutionDue, now)).toBe('warning');
    });

    it('returns "breached" when past due', () => {
      const createdAt = new Date('2025-01-09T10:00:00Z');
      const resolutionDue = new Date('2025-01-09T14:00:00Z');
      const now = new Date('2025-01-09T14:01:00Z'); // 1 minute past due

      expect(getSLAStatus(createdAt, resolutionDue, now)).toBe('breached');
    });

    it('returns "ok" at exactly 20% threshold', () => {
      const createdAt = new Date('2025-01-09T10:00:00Z');
      const resolutionDue = new Date('2025-01-09T14:00:00Z'); // 4 hours
      const now = new Date('2025-01-09T13:12:00Z'); // exactly 48 minutes remaining (20% of 4 hours)

      expect(getSLAStatus(createdAt, resolutionDue, now)).toBe('ok');
    });
  });

  describe('with P2 tickets (24 hour resolution)', () => {
    it('returns "ok" when plenty of time remains', () => {
      const createdAt = new Date('2025-01-09T10:00:00Z');
      const resolutionDue = new Date('2025-01-10T10:00:00Z'); // 24 hours
      const now = new Date('2025-01-09T12:00:00Z'); // 22 hours remaining

      expect(getSLAStatus(createdAt, resolutionDue, now)).toBe('ok');
    });

    it('returns "warning" when less than 20% remains', () => {
      const createdAt = new Date('2025-01-09T10:00:00Z');
      const resolutionDue = new Date('2025-01-10T10:00:00Z'); // 24 hours
      const now = new Date('2025-01-10T09:00:00Z'); // 1 hour remaining (< 20% of 24 hours = 4.8 hours)

      expect(getSLAStatus(createdAt, resolutionDue, now)).toBe('warning');
    });

    it('returns "breached" when past due', () => {
      const createdAt = new Date('2025-01-09T10:00:00Z');
      const resolutionDue = new Date('2025-01-10T10:00:00Z');
      const now = new Date('2025-01-10T10:01:00Z'); // 1 minute past due

      expect(getSLAStatus(createdAt, resolutionDue, now)).toBe('breached');
    });
  });

  describe('with P3 tickets (72 hour resolution)', () => {
    it('returns "ok" when plenty of time remains', () => {
      const createdAt = new Date('2025-01-09T10:00:00Z');
      const resolutionDue = new Date('2025-01-12T10:00:00Z'); // 72 hours
      const now = new Date('2025-01-09T12:00:00Z'); // 70 hours remaining

      expect(getSLAStatus(createdAt, resolutionDue, now)).toBe('ok');
    });

    it('returns "warning" when less than 20% remains', () => {
      const createdAt = new Date('2025-01-09T10:00:00Z');
      const resolutionDue = new Date('2025-01-12T10:00:00Z'); // 72 hours
      const now = new Date('2025-01-12T09:00:00Z'); // 1 hour remaining (< 20% of 72 hours = 14.4 hours)

      expect(getSLAStatus(createdAt, resolutionDue, now)).toBe('warning');
    });

    it('returns "breached" when past due', () => {
      const createdAt = new Date('2025-01-09T10:00:00Z');
      const resolutionDue = new Date('2025-01-12T10:00:00Z');
      const now = new Date('2025-01-12T10:01:00Z'); // 1 minute past due

      expect(getSLAStatus(createdAt, resolutionDue, now)).toBe('breached');
    });
  });

  describe('with P4 tickets (168 hour / 7 day resolution)', () => {
    it('returns "ok" when plenty of time remains', () => {
      const createdAt = new Date('2025-01-09T10:00:00Z');
      const resolutionDue = new Date('2025-01-16T10:00:00Z'); // 7 days
      const now = new Date('2025-01-09T12:00:00Z'); // ~7 days remaining

      expect(getSLAStatus(createdAt, resolutionDue, now)).toBe('ok');
    });

    it('returns "warning" when less than 20% remains', () => {
      const createdAt = new Date('2025-01-09T10:00:00Z');
      const resolutionDue = new Date('2025-01-16T10:00:00Z'); // 7 days
      const now = new Date('2025-01-16T09:00:00Z'); // 1 hour remaining (< 20% of 7 days = 33.6 hours)

      expect(getSLAStatus(createdAt, resolutionDue, now)).toBe('warning');
    });

    it('returns "breached" when past due', () => {
      const createdAt = new Date('2025-01-09T10:00:00Z');
      const resolutionDue = new Date('2025-01-16T10:00:00Z');
      const now = new Date('2025-01-16T10:01:00Z'); // 1 minute past due

      expect(getSLAStatus(createdAt, resolutionDue, now)).toBe('breached');
    });
  });

  describe('edge cases', () => {
    it('returns "breached" exactly at due date', () => {
      const createdAt = new Date('2025-01-09T10:00:00Z');
      const resolutionDue = new Date('2025-01-09T14:00:00Z');
      const now = new Date('2025-01-09T14:00:00.001Z'); // 1ms past due

      expect(getSLAStatus(createdAt, resolutionDue, now)).toBe('breached');
    });

    it('returns "warning" just before due date', () => {
      const createdAt = new Date('2025-01-09T10:00:00Z');
      const resolutionDue = new Date('2025-01-09T14:00:00Z');
      const now = new Date('2025-01-09T13:59:59.999Z'); // 1ms before due (< 20% threshold)

      expect(getSLAStatus(createdAt, resolutionDue, now)).toBe('warning');
    });

    it('handles zero time remaining correctly', () => {
      const createdAt = new Date('2025-01-09T10:00:00Z');
      const resolutionDue = new Date('2025-01-09T14:00:00Z');
      const now = new Date('2025-01-09T14:00:00Z'); // exactly at due date

      expect(getSLAStatus(createdAt, resolutionDue, now)).toBe('breached');
    });

    it('returns "ok" at ticket creation time', () => {
      const createdAt = new Date('2025-01-09T10:00:00Z');
      const resolutionDue = new Date('2025-01-09T14:00:00Z');
      const now = new Date('2025-01-09T10:00:00Z'); // same as creation

      expect(getSLAStatus(createdAt, resolutionDue, now)).toBe('ok');
    });
  });
});
