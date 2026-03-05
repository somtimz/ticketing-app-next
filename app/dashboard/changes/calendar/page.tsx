'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  LockClosedIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChangeEvent {
  id: number;
  changeNumber: string;
  title: string;
  changeType: 'Standard' | 'Normal' | 'Emergency';
  status: string;
  riskLevel: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
}

interface FreezeWindow {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  isActive: boolean;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

const TYPE_DOT: Record<string, string> = {
  Standard: 'bg-blue-500',
  Normal: 'bg-amber-500',
  Emergency: 'bg-red-500',
};

const TYPE_BADGE: Record<string, string> = {
  Standard: 'bg-blue-900 text-blue-200',
  Normal: 'bg-amber-900 text-amber-200',
  Emergency: 'bg-red-900 text-red-200',
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Normalize a date-string / Date to a YYYY-MM-DD string in local time. */
function toLocalDate(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Build the array of day-cells for the calendar grid. */
function buildCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

// ─── Legend component ─────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-gray-400">
      {(['Standard', 'Normal', 'Emergency'] as const).map(t => (
        <span key={t} className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${TYPE_DOT[t]}`} />
          {t}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="w-5 h-2.5 rounded bg-red-900 opacity-60" />
        Freeze Window
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChangesCalendarPage(): JSX.Element {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  const [allChanges, setAllChanges] = useState<ChangeEvent[]>([]);
  const [freezeWindows, setFreezeWindows] = useState<FreezeWindow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [chRes, fzRes] = await Promise.all([
        fetch('/api/changes?limit=200'),
        fetch('/api/changes/freeze'),
      ]);

      if (chRes.ok) {
        const d = await chRes.json() as { changes: ChangeEvent[] };
        setAllChanges(d.changes ?? []);
      }
      if (fzRes.ok) {
        const d = await fzRes.json() as { freezeWindows: FreezeWindow[] };
        setFreezeWindows(d.freezeWindows ?? []);
      }
    } catch {
      // non-fatal
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ── Navigate months ────────────────────────────────────────────────────────

  function prevMonth() {
    setSelectedDay(null);
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    setSelectedDay(null);
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  function goToday() {
    setSelectedDay(today.getDate());
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  // ── Build day-level lookups ────────────────────────────────────────────────

  /** Which changes overlap a given YYYY-MM-DD day? */
  function changesOnDay(dayStr: string): ChangeEvent[] {
    return allChanges.filter(c => {
      if (!c.scheduledStart) return false;
      const start = toLocalDate(c.scheduledStart);
      const end = c.scheduledEnd ? toLocalDate(c.scheduledEnd) : start;
      return start <= dayStr && dayStr <= end;
    });
  }

  /** Is the day inside any freeze window? */
  function isFrozen(dayStr: string): boolean {
    return freezeWindows.some(fw => {
      const start = toLocalDate(fw.startDate);
      const end = toLocalDate(fw.endDate);
      return start <= dayStr && dayStr <= end;
    });
  }

  /** Freeze windows overlapping the visible month (for the top banner list). */
  const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
  const monthEnd = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const activeFreezes = freezeWindows.filter(fw => {
    const start = toLocalDate(fw.startDate);
    const end = toLocalDate(fw.endDate);
    return start <= monthEnd && end >= monthStart;
  });

  // ── Calendar grid ──────────────────────────────────────────────────────────

  const cells = buildCalendarDays(viewYear, viewMonth);
  const todayStr = toLocalDate(today);

  const selectedDayStr = selectedDay != null
    ? `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`
    : null;

  const selectedChanges = selectedDayStr ? changesOnDay(selectedDayStr) : [];
  const selectedFreezes = selectedDayStr
    ? freezeWindows.filter(fw => {
        const s = toLocalDate(fw.startDate); const e = toLocalDate(fw.endDate);
        return s <= selectedDayStr && selectedDayStr <= e;
      })
    : [];

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CalendarDaysIcon className="h-6 w-6 text-violet-400" />
          <div>
            <h1 className="text-2xl font-semibold text-white">Change Calendar</h1>
            <p className="text-sm text-gray-400">Scheduled changes and freeze windows</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/changes"
            className="px-3 py-1.5 border border-gray-700 rounded-md text-sm text-gray-300 hover:bg-gray-800"
          >
            List View
          </Link>
          <button
            onClick={() => void fetchData()}
            className="p-1.5 rounded-md border border-gray-700 hover:bg-gray-800 text-gray-400"
            title="Refresh"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Freeze window banners ─────────────────────────────────────────────── */}
      {activeFreezes.length > 0 && (
        <div className="space-y-2">
          {activeFreezes.map(fw => (
            <div
              key={fw.id}
              className="flex items-start gap-2 bg-red-950 border border-red-800 rounded-lg px-4 py-2 text-sm"
            >
              <LockClosedIcon className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-red-200">{fw.name}</span>
                <span className="text-red-400 ml-2 text-xs">
                  {new Date(fw.startDate).toLocaleDateString()} – {new Date(fw.endDate).toLocaleDateString()}
                  {fw.isActive && <span className="ml-2 bg-red-700 text-red-100 px-1.5 py-0.5 rounded text-xs">Active now</span>}
                </span>
                {fw.reason && <p className="text-red-300 text-xs mt-0.5">{fw.reason}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Calendar card ─────────────────────────────────────────────────────── */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <button
            onClick={prevMonth}
            className="p-1 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-lg font-semibold text-white">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="px-2 py-1 text-xs rounded-md border border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-1 rounded-md hover:bg-gray-800 text-gray-400 hover:text-white"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
        ) : (
          <>
            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 border-b border-gray-800">
              {DAYS_OF_WEEK.map(d => (
                <div key={d} className="py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {cells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="border-b border-r border-gray-800 h-24 bg-gray-950" />;
                }

                const dayStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayChanges = changesOnDay(dayStr);
                const frozen = isFrozen(dayStr);
                const isToday = dayStr === todayStr;
                const isSelected = day === selectedDay;

                return (
                  <div
                    key={dayStr}
                    onClick={() => setSelectedDay(prev => prev === day ? null : day)}
                    className={`border-b border-r border-gray-800 h-24 p-1.5 cursor-pointer transition-colors overflow-hidden
                      ${frozen ? 'bg-red-950 bg-opacity-40' : 'bg-gray-900'}
                      ${isSelected ? 'ring-2 ring-inset ring-violet-500' : 'hover:bg-gray-800'}
                    `}
                  >
                    {/* Day number */}
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium mb-1
                      ${isToday ? 'bg-violet-600 text-white' : isSelected ? 'bg-violet-900 text-violet-200' : 'text-gray-400'}
                    `}>
                      {day}
                    </div>

                    {/* Freeze indicator */}
                    {frozen && (
                      <div className="flex items-center gap-0.5 mb-0.5">
                        <LockClosedIcon className="h-2.5 w-2.5 text-red-400" />
                        <span className="text-red-400 text-[9px] truncate">Freeze</span>
                      </div>
                    )}

                    {/* Change dots — show max 3, then +N */}
                    <div className="space-y-0.5">
                      {dayChanges.slice(0, 2).map(c => (
                        <div
                          key={c.id}
                          className={`flex items-center gap-1 rounded px-1 py-0.5 text-[9px] leading-tight truncate ${TYPE_BADGE[c.changeType]}`}
                          title={`${c.changeNumber}: ${c.title}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TYPE_DOT[c.changeType]}`} />
                          <span className="truncate">{c.changeNumber}</span>
                        </div>
                      ))}
                      {dayChanges.length > 2 && (
                        <div className="text-[9px] text-gray-500 pl-1">+{dayChanges.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Legend ──────────────────────────────────────────────────────────── */}
      <Legend />

      {/* ── Day detail panel ─────────────────────────────────────────────────── */}
      {selectedDayStr && (selectedChanges.length > 0 || selectedFreezes.length > 0) && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 space-y-4">
          <h2 className="text-base font-semibold text-white">
            {new Date(selectedDayStr + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </h2>

          {/* Freeze windows active on this day */}
          {selectedFreezes.map(fw => (
            <div key={fw.id} className="flex items-start gap-2 bg-red-950 border border-red-800 rounded-md p-3 text-sm">
              <LockClosedIcon className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-200">{fw.name}</p>
                {fw.reason && <p className="text-red-400 text-xs mt-0.5">{fw.reason}</p>}
              </div>
            </div>
          ))}

          {/* Changes scheduled on this day */}
          {selectedChanges.map(c => (
            <Link
              key={c.id}
              href={`/dashboard/changes/${c.id}`}
              className="block border border-gray-700 rounded-lg p-4 hover:border-violet-500 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs text-gray-400">{c.changeNumber}</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_BADGE[c.changeType]}`}>
                      {c.changeType}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
                      {c.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white truncate">{c.title}</p>
                  {(c.scheduledStart || c.scheduledEnd) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {c.scheduledStart
                        ? new Date(c.scheduledStart).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                        : ''}
                      {c.scheduledEnd
                        ? ` → ${new Date(c.scheduledEnd).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
                        : ''}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-medium shrink-0 ${
                  c.riskLevel === 'Critical' ? 'text-red-400' :
                  c.riskLevel === 'High' ? 'text-orange-400' :
                  c.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {c.riskLevel} Risk
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Upcoming scheduled changes list ──────────────────────────────────── */}
      {!selectedDay && (() => {
        const upcoming = allChanges
          .filter(c => c.scheduledStart && toLocalDate(c.scheduledStart) >= toLocalDate(today))
          .sort((a, b) => (a.scheduledStart ?? '').localeCompare(b.scheduledStart ?? ''))
          .slice(0, 8);

        if (upcoming.length === 0) return null;

        return (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
            <h2 className="text-base font-semibold text-white mb-4">Upcoming Scheduled Changes</h2>
            <div className="space-y-2">
              {upcoming.map(c => (
                <Link
                  key={c.id}
                  href={`/dashboard/changes/${c.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-800 hover:border-violet-500 transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${TYPE_DOT[c.changeType]}`} />
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs text-gray-500 mr-2">{c.changeNumber}</span>
                    <span className="text-sm text-white truncate">{c.title}</span>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {c.scheduledStart
                      ? new Date(c.scheduledStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : ''}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${TYPE_BADGE[c.changeType]}`}>
                    {c.changeType}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
