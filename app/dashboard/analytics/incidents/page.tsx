'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
  ShieldExclamationIcon,
  TicketIcon,
} from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CategoryVolume {
  categoryId: number | null;
  categoryName: string;
  count: number;
}

interface IncidentAnalytics {
  days: number;
  since: string;
  totalCount: number;
  mttrMinutes: number | null;
  reopenRate: number | null;
  slaBreachCount: number;
  slaBreachRate: number;
  volumeByCategory: CategoryVolume[];
  statusBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAY_OPTIONS = [
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
  { label: '365 days', value: 365 },
] as const;

const STATUS_COLORS: Record<string, string> = {
  Open: 'bg-blue-500',
  Assigned: 'bg-indigo-500',
  'In Progress': 'bg-violet-500',
  'On Hold': 'bg-amber-500',
  Resolved: 'bg-green-500',
  Closed: 'bg-gray-400',
};

const PRIORITY_COLORS: Record<string, string> = {
  P1: 'bg-red-600',
  P2: 'bg-orange-500',
  P3: 'bg-yellow-500',
  P4: 'bg-green-500',
};

const PRIORITY_LABELS: Record<string, string> = {
  P1: 'P1 – Critical',
  P2: 'P2 – High',
  P3: 'P3 – Medium',
  P4: 'P4 – Low',
};

// ── Helper: format MTTR ───────────────────────────────────────────────────────

function formatMTTR(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const rh = h % 24;
  return rh > 0 ? `${d}d ${rh}h` : `${d}d`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'violet',
  alert = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  alert?: boolean;
}) {
  const iconColor = alert
    ? 'text-red-600 bg-red-50'
    : color === 'green'
      ? 'text-green-600 bg-green-50'
      : color === 'amber'
        ? 'text-amber-600 bg-amber-50'
        : color === 'blue'
          ? 'text-blue-600 bg-blue-50'
          : 'text-violet-600 bg-violet-50';

  const valueColor = alert ? 'text-red-700' : 'text-gray-900';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <p className={`text-3xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function HorizontalBar({
  label,
  count,
  max,
  color = 'bg-violet-500',
}: {
  label: string;
  count: number;
  max: number;
  color?: string;
}) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700 w-36 truncate shrink-0" title={label}>
        {label}
      </span>
      <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-medium text-gray-900 w-8 text-right tabular-nums">
        {count}
      </span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function IncidentAnalyticsPage(): JSX.Element {
  const { data: session, status: sessionStatus } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const isAgent =
    userRole === 'Agent' || userRole === 'TeamLead' || userRole === 'Admin';

  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<IncidentAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!isAgent) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/analytics/incidents?days=${days}`);
      if (!res.ok) throw new Error('Failed to load');
      const json = (await res.json()) as IncidentAnalytics;
      setData(json);
    } catch {
      setError('Failed to load incident analytics. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [isAgent, days]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ── Access guard ────────────────────────────────────────────────────────────

  if (sessionStatus === 'loading') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400 animate-pulse">Loading…</p>
      </div>
    );
  }

  if (!isAgent) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Incident analytics are available to agents and above.</p>
      </div>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const maxCategoryCount = Math.max(1, ...(data?.volumeByCategory.map(c => c.count) ?? [1]));

  const statusEntries = Object.entries(data?.statusBreakdown ?? {}).sort(
    ([, a], [, b]) => b - a
  );
  const maxStatusCount = Math.max(1, ...statusEntries.map(([, c]) => c));

  const priorityOrder = ['P1', 'P2', 'P3', 'P4'];
  const priorityEntries = priorityOrder
    .map(p => [p, data?.priorityBreakdown[p] ?? 0] as [string, number])
    .filter(([, count]) => count > 0);
  const maxPriorityCount = Math.max(1, ...priorityEntries.map(([, c]) => c));

  const sinceDate = data
    ? new Date(data.since).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-6 w-6 text-violet-600" />
            <h1 className="text-2xl font-semibold text-gray-900">Incident Analytics</h1>
          </div>
          {data && (
            <p className="mt-1 text-sm text-gray-500">
              {data.totalCount} tickets from {sinceDate} to today
            </p>
          )}
        </div>

        {/* Day range picker */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {DAY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                days === opt.value
                  ? 'bg-white text-violet-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading / Error states ──────────────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400 animate-pulse">Loading incident metrics…</p>
        </div>
      )}

      {error && !isLoading && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={() => void fetchData()}
            className="ml-auto text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          {/* ── Metric cards ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard
              icon={TicketIcon}
              label="Total Tickets"
              value={data.totalCount}
              sub={`Last ${data.days} days`}
              color="blue"
            />
            <MetricCard
              icon={ClockIcon}
              label="Mean Time to Resolve"
              value={formatMTTR(data.mttrMinutes)}
              sub={data.mttrMinutes !== null ? 'avg across resolved tickets' : 'No resolved tickets'}
              color="violet"
            />
            <MetricCard
              icon={ArrowPathIcon}
              label="Reopen Rate"
              value={data.reopenRate !== null ? `${data.reopenRate}%` : '—'}
              sub={data.reopenRate !== null ? 'of resolved tickets reopened' : 'No resolved tickets'}
              color={data.reopenRate !== null && data.reopenRate > 10 ? undefined : 'green'}
              alert={data.reopenRate !== null && data.reopenRate > 10}
            />
            <MetricCard
              icon={ShieldExclamationIcon}
              label="SLA Breaches"
              value={data.slaBreachCount}
              sub={`${data.slaBreachRate}% of total tickets`}
              color={data.slaBreachCount > 0 ? undefined : 'green'}
              alert={data.slaBreachCount > 0}
            />
          </div>

          {/* ── Volume by category ───────────────────────────────────────────── */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Volume by Category</h2>
            <p className="text-xs text-gray-400 mb-5">Tickets created in the selected period</p>
            {data.volumeByCategory.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No tickets in this period.</p>
            ) : (
              <div className="space-y-3">
                {data.volumeByCategory.map(cat => (
                  <HorizontalBar
                    key={cat.categoryId ?? 'none'}
                    label={cat.categoryName}
                    count={cat.count}
                    max={maxCategoryCount}
                    color="bg-violet-500"
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Status + Priority breakdowns ────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Status breakdown */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Status Breakdown</h2>
              <p className="text-xs text-gray-400 mb-5">
                Distribution of ticket statuses in this period
              </p>
              {statusEntries.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No data.</p>
              ) : (
                <div className="space-y-3">
                  {statusEntries.map(([status, count]) => (
                    <HorizontalBar
                      key={status}
                      label={status}
                      count={count}
                      max={maxStatusCount}
                      color={STATUS_COLORS[status] ?? 'bg-gray-400'}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Priority breakdown */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Priority Breakdown</h2>
              <p className="text-xs text-gray-400 mb-5">
                Ticket volume by severity level
              </p>
              {priorityEntries.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No data.</p>
              ) : (
                <div className="space-y-3">
                  {priorityEntries.map(([priority, count]) => (
                    <HorizontalBar
                      key={priority}
                      label={PRIORITY_LABELS[priority] ?? priority}
                      count={count}
                      max={maxPriorityCount}
                      color={PRIORITY_COLORS[priority] ?? 'bg-gray-400'}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── SLA health summary ───────────────────────────────────────────── */}
          {data.totalCount > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">SLA Health</h2>
              <div className="flex items-center gap-4">
                {/* Breach bar */}
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                    <span>SLA Breached</span>
                    <span>SLA Met</span>
                  </div>
                  <div className="h-4 bg-green-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${data.slaBreachRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1.5">
                    <span className="text-red-600 font-medium">{data.slaBreachRate}% breached</span>
                    <span className="text-green-600 font-medium">
                      {Math.round((100 - data.slaBreachRate) * 10) / 10}% met
                    </span>
                  </div>
                </div>

                {/* Counts */}
                <div className="flex gap-6 shrink-0">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600 tabular-nums">
                      {data.slaBreachCount}
                    </p>
                    <p className="text-xs text-gray-500">Breached</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600 tabular-nums">
                      {data.totalCount - data.slaBreachCount}
                    </p>
                    <p className="text-xs text-gray-500">Met SLA</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
