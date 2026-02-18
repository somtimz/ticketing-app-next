import { describe, it, expect } from 'vitest';
import {
  calculatePriority,
  calculateSLADueDates,
  isSLABreached,
  getSLAStatus
} from '@/lib/sla';

describe('calculatePriority', () => {
  it('High impact + High urgency → P1', () => {
    expect(calculatePriority('High', 'High')).toBe('P1');
  });

  it('High impact + Medium urgency → P1', () => {
    expect(calculatePriority('High', 'Medium')).toBe('P1');
  });

  it('Medium impact + High urgency → P1', () => {
    expect(calculatePriority('Medium', 'High')).toBe('P1');
  });

  it('High impact + Low urgency → P2', () => {
    expect(calculatePriority('High', 'Low')).toBe('P2');
  });

  it('Medium impact + Medium urgency → P2', () => {
    expect(calculatePriority('Medium', 'Medium')).toBe('P2');
  });

  it('Low impact + High urgency → P2', () => {
    expect(calculatePriority('Low', 'High')).toBe('P2');
  });

  it('Medium impact + Low urgency → P3', () => {
    expect(calculatePriority('Medium', 'Low')).toBe('P3');
  });

  it('Low impact + Medium urgency → P3', () => {
    expect(calculatePriority('Low', 'Medium')).toBe('P3');
  });

  it('Low impact + Low urgency → P4', () => {
    expect(calculatePriority('Low', 'Low')).toBe('P4');
  });
});

describe('calculateSLADueDates', () => {
  const base = new Date('2026-01-01T12:00:00Z');

  it('P1: first response due in 15 minutes', () => {
    const { firstResponseDue } = calculateSLADueDates('P1', base);
    expect(firstResponseDue.getTime() - base.getTime()).toBe(15 * 60 * 1000);
  });

  it('P1: resolution due in 4 hours', () => {
    const { resolutionDue } = calculateSLADueDates('P1', base);
    expect(resolutionDue.getTime() - base.getTime()).toBe(240 * 60 * 1000);
  });

  it('P2: first response due in 1 hour', () => {
    const { firstResponseDue } = calculateSLADueDates('P2', base);
    expect(firstResponseDue.getTime() - base.getTime()).toBe(60 * 60 * 1000);
  });

  it('P2: resolution due in 24 hours', () => {
    const { resolutionDue } = calculateSLADueDates('P2', base);
    expect(resolutionDue.getTime() - base.getTime()).toBe(1440 * 60 * 1000);
  });

  it('P3: first response due in 4 hours', () => {
    const { firstResponseDue } = calculateSLADueDates('P3', base);
    expect(firstResponseDue.getTime() - base.getTime()).toBe(240 * 60 * 1000);
  });

  it('P3: resolution due in 3 days', () => {
    const { resolutionDue } = calculateSLADueDates('P3', base);
    expect(resolutionDue.getTime() - base.getTime()).toBe(4320 * 60 * 1000);
  });

  it('P4: first response due in 24 hours', () => {
    const { firstResponseDue } = calculateSLADueDates('P4', base);
    expect(firstResponseDue.getTime() - base.getTime()).toBe(1440 * 60 * 1000);
  });

  it('P4: resolution due in 7 days', () => {
    const { resolutionDue } = calculateSLADueDates('P4', base);
    expect(resolutionDue.getTime() - base.getTime()).toBe(10080 * 60 * 1000);
  });

  it('returns Date objects', () => {
    const { firstResponseDue, resolutionDue } = calculateSLADueDates('P1', base);
    expect(firstResponseDue).toBeInstanceOf(Date);
    expect(resolutionDue).toBeInstanceOf(Date);
  });
});

describe('isSLABreached', () => {
  it('returns true when now is after dueDate', () => {
    const dueDate = new Date('2026-01-01T12:00:00Z');
    const now = new Date('2026-01-01T13:00:00Z');
    expect(isSLABreached(dueDate, now)).toBe(true);
  });

  it('returns false when now is before dueDate', () => {
    const dueDate = new Date('2026-01-01T12:00:00Z');
    const now = new Date('2026-01-01T11:00:00Z');
    expect(isSLABreached(dueDate, now)).toBe(false);
  });

  it('returns false when now equals dueDate exactly', () => {
    const dueDate = new Date('2026-01-01T12:00:00Z');
    expect(isSLABreached(dueDate, dueDate)).toBe(false);
  });
});

describe('getSLAStatus', () => {
  it('returns breached when past due date', () => {
    const created = new Date('2026-01-01T12:00:00Z');
    const due = new Date('2026-01-01T13:00:00Z');
    const now = new Date('2026-01-01T14:00:00Z');
    expect(getSLAStatus(created, due, now)).toBe('breached');
  });

  it('returns warning when less than 20% of window remains', () => {
    // 1-hour window → 20% threshold = 12 minutes
    const created = new Date('2026-01-01T12:00:00Z');
    const due = new Date('2026-01-01T13:00:00Z');
    const now = new Date('2026-01-01T12:49:00Z'); // 11 min remaining < 12 min threshold
    expect(getSLAStatus(created, due, now)).toBe('warning');
  });

  it('returns ok when more than 20% of window remains', () => {
    const created = new Date('2026-01-01T12:00:00Z');
    const due = new Date('2026-01-01T13:00:00Z');
    const now = new Date('2026-01-01T12:30:00Z'); // 30 min remaining = 50%
    expect(getSLAStatus(created, due, now)).toBe('ok');
  });

  it('returns ok at exactly 20% remaining', () => {
    // 1-hour window → exactly 12 minutes remaining (not less than)
    const created = new Date('2026-01-01T12:00:00Z');
    const due = new Date('2026-01-01T13:00:00Z');
    const now = new Date('2026-01-01T12:48:00Z'); // exactly 12 min remaining
    expect(getSLAStatus(created, due, now)).toBe('ok');
  });
});
