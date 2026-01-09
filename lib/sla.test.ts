import { describe, it, expect } from 'vitest';
import { calculatePriority, calculateSLADueDates, isSLABreached, getSLAStatus } from './sla';

describe('calculatePriority', () => {
  it('calculates P1 for Critical+High', () => {
    expect(calculatePriority('High', 'High')).toBe('P1');
  });

  it('calculates P4 for Low+Low', () => {
    expect(calculatePriority('Low', 'Low')).toBe('P4');
  });

  it('calculates P2 for High+Low', () => {
    expect(calculatePriority('High', 'Low')).toBe('P2');
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
});

describe('isSLABreached', () => {
  it('returns true when past due', () => {
    const past = new Date(Date.now() - 10000);
    expect(isSLABreached(past)).toBe(true);
  });

  it('returns false when future', () => {
    const future = new Date(Date.now() + 1000000);
    expect(isSLABreached(future)).toBe(false);
  });
});
