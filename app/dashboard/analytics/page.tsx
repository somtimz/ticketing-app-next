'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChartBarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useSession } from 'next-auth/react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkloadStats {
  open: number;
  resolved: number;
  closed: number;
  total: number;
  slaCompliance: number;
}

interface AgentWorkloadEntry {
  agent: { id: number; fullName: string; email: string };
  workload: WorkloadStats;
}

interface WorkloadSummary {
  totalAgents: number;
  totalOpenTickets: number;
  avgSLACompliance: number;
}

interface RecurringIssue {
  pattern: string;
  count: number;
  categoryName?: string;
  lastSeen: string;
}

interface TrendDay {
  day: string; // YYYY-MM-DD
  tickets: { total: number; byStatus: Record<string, number> };
  srs: { total: number; byStatus: Record<string, number> };
}

interface AgentActivity {
  agent: { id: number; fullName: string; email: string; role: string };
  activity: {
    ticketsResolved: number;
    ticketsOpen: number;
    comments: number;
    calls: number;
    callDurationSeconds: number;
    serviceRequestsHandled: number;
  };
}

interface IncidentMetrics {
  totalCount: number;
  mttrMinutes: number | null;
  reopenRate: number | null;
  slaBreachCount: number;
  slaBreachRate: number;
  volumeByCategory: { categoryName: string; count: number }[];
  statusBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
}

type Tab = 'overview' | 'trends' | 'agents';

const DAYS_OPTIONS = [7, 14, 30, 60, 90] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMinutes(min: number | null): string {
  if (min === null) return '—';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fmtDuration(seconds: number): string {
  if (seconds === 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Mini bar chart (CSS-only, no external lib) ───────────────────────────────

function MiniBarChart({
  data,
  ticketColor = '#7c3aed',
  srColor = '#0ea5e9',
}: {
  data: TrendDay[];
  ticketColor?: string;
  srColor?: string;
}) {
  const maxVal = Math.max(...data.map(d => Math.max(d.tickets.total, d.srs.total)), 1);
  // Show every Nth label to avoid crowding
  const labelEvery = data.length > 21 ? 7 : data.length > 14 ? 3 : 1;

  return (
    <div className="w-full">
      <div className="flex items-end gap-0.5 h-32" aria-hidden>
        {data.map((d, i) => (
          <div key={d.day} className="flex-1 flex items-end gap-px" title={`${d.day}: ${d.tickets.total} tickets, ${d.srs.total} SRs`}>
            {/* Tickets bar */}
            <div
              className="flex-1 rounded-t-sm transition-all"
              style={{
                height: `${Math.max((d.tickets.total / maxVal) * 100, d.tickets.total > 0 ? 2 : 0)}%`,
                backgroundColor: ticketColor,
                opacity: 0.85,
              }}
            />
            {/* SRs bar */}
            <div
              className="flex-1 rounded-t-sm transition-all"
              style={{
                height: `${Math.max((d.srs.total / maxVal) * 100, d.srs.total > 0 ? 2 : 0)}%`,
                backgroundColor: srColor,
                opacity: 0.75,
              }}
            />
          </div>
        ))}
      </div>
      {/* X-axis labels */}
      <div className="flex mt-1 gap-0.5">
        {data.map((d, i) => (
          <div key={d.day} className="flex-1 text-center">
            {i % labelEvery === 0 && (
              <span className="text-[9px] text-gray-400 whitespace-nowrap">{shortDate(d.day)}</span>
            )}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: ticketColor }} />
          Incidents
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: srColor }} />
          Service Requests
        </span>
      </div>
    </div>
  );
}

// ─── Horizontal bar (for category breakdown) ──────────────────────────────────

function HBar({ label, value, max, color = 'bg-violet-500' }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-32 truncate text-gray-600 shrink-0">{label}</span>
      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right font-medium text-gray-700">{value}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsDashboardPage(): JSX.Element {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const userId = session?.user?.id;
  const isTeamLead = userRole === 'TeamLead' || userRole === 'Admin';
  const isAgent = userRole === 'Agent' || isTeamLead;

  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [days, setDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Overview state
  const [teamWorkloads, setTeamWorkloads] = useState<AgentWorkloadEntry[]>([]);
  const [summary, setSummary] = useState<WorkloadSummary | null>(null);
  const [myStats, setMyStats] = useState<WorkloadStats | null>(null);
  const [recurring, setRecurring] = useState<RecurringIssue[]>([]);
  const [incidents, setIncidents] = useState<IncidentMetrics | null>(null);

  // Trends state
  const [trend, setTrend] = useState<TrendDay[]>([]);

  // Agent activity state
  const [agentActivity, setAgentActivity] = useState<AgentActivity[]>([]);

  const fetchOverview = useCallback(async () => {
    const fetches: Promise<void>[] = [];

    if (isTeamLead) {
      fetches.push(
        fetch('/api/analytics/workloads')
          .then(r => r.json())
          .then((d: { workloads: AgentWorkloadEntry[]; summary: WorkloadSummary }) => {
            setTeamWorkloads(d.workloads ?? []);
            setSummary(d.summary ?? null);
          })
          .catch(() => {})
      );
      fetches.push(
        fetch('/api/analytics/recurring')
          .then(r => r.json())
          .then((d: { recurring: RecurringIssue[] }) => setRecurring(d.recurring ?? []))
          .catch(() => {})
      );
      fetches.push(
        fetch(`/api/analytics/incidents?days=${days}`)
          .then(r => r.json())
          .then((d: IncidentMetrics) => setIncidents(d))
          .catch(() => {})
      );
    }

    if (userId) {
      fetches.push(
        fetch(`/api/analytics/workloads?agentId=${userId}`)
          .then(r => r.json())
          .then((d: { workload: WorkloadStats }) => setMyStats(d.workload ?? null))
          .catch(() => {})
      );
    }

    await Promise.all(fetches);
  }, [isTeamLead, userId, days]);

  const fetchTrends = useCallback(async () => {
    const res = await fetch(`/api/analytics/trend?days=${days}`);
    if (!res.ok) return;
    const d = await res.json() as { trend: TrendDay[] };
    setTrend(d.trend ?? []);
  }, [days]);

  const fetchAgentActivity = useCallback(async () => {
    if (!isTeamLead) return;
    const res = await fetch(`/api/analytics/agent-activity?days=${days}`);
    if (!res.ok) return;
    const d = await res.json() as { agents: AgentActivity[] };
    setAgentActivity(d.agents ?? []);
  }, [isTeamLead, days]);

  const fetchData = useCallback(async () => {
    if (!isAgent) return;
    setIsLoading(true);
    setError('');
    try {
      if (activeTab === 'overview') await fetchOverview();
      else if (activeTab === 'trends') await fetchTrends();
      else if (activeTab === 'agents') await fetchAgentActivity();
    } catch {
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [isAgent, activeTab, fetchOverview, fetchTrends, fetchAgentActivity]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (!isAgent) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Analytics are available to agents and above.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'trends', label: 'Trends' },
    ...(isTeamLead ? [{ id: 'agents' as Tab, label: 'Agent Activity' }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ChartBarIcon className="h-6 w-6 text-violet-600" />
            <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">Performance and activity overview</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Days selector */}
          <select
            value={days}
            onChange={e => setDays(Number(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-primary-500 focus:border-primary-500"
          >
            {DAYS_OPTIONS.map(d => (
              <option key={d} value={d}>Last {d} days</option>
            ))}
          </select>
          <button
            onClick={() => void fetchData()}
            className="p-1.5 rounded-md border border-gray-300 hover:bg-gray-50 text-gray-500"
            title="Refresh"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Tab bar ───────────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-violet-600 text-violet-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-gray-500">Loading analytics…</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-600">{error}</p>
        </div>
      ) : (
        <>
          {/* ══ OVERVIEW TAB ══════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* My Workload */}
              {myStats && (
                <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">My Workload</h2>
                  <WorkloadCards stats={myStats} />
                </div>
              )}

              {/* Incident Metrics (TeamLead+) */}
              {isTeamLead && incidents && (
                <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-5">
                    Incident Metrics
                    <span className="ml-2 text-sm font-normal text-gray-400">(last {days} days)</span>
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <StatCard label="Total Incidents" value={incidents.totalCount} />
                    <StatCard label="Avg MTTR" value={fmtMinutes(incidents.mttrMinutes)} />
                    <StatCard
                      label="SLA Breaches"
                      value={`${incidents.slaBreachCount} (${incidents.slaBreachRate.toFixed(0)}%)`}
                      highlight={incidents.slaBreachRate > 20}
                    />
                    <StatCard
                      label="Reopen Rate"
                      value={incidents.reopenRate !== null ? `${incidents.reopenRate}%` : '—'}
                      highlight={(incidents.reopenRate ?? 0) > 10}
                    />
                  </div>

                  {/* Status breakdown */}
                  {Object.keys(incidents.statusBreakdown).length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">By Status</h3>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(incidents.statusBreakdown).map(([status, count]) => (
                          <span key={status} className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {status}: <strong>{count}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Priority breakdown */}
                  {Object.keys(incidents.priorityBreakdown).length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">By Priority</h3>
                      <div className="flex flex-wrap gap-2">
                        {['P1', 'P2', 'P3', 'P4'].map(p => {
                          const count = incidents.priorityBreakdown[p];
                          if (!count) return null;
                          const colors: Record<string, string> = {
                            P1: 'bg-red-100 text-red-700',
                            P2: 'bg-orange-100 text-orange-700',
                            P3: 'bg-yellow-100 text-yellow-700',
                            P4: 'bg-green-100 text-green-700',
                          };
                          return (
                            <span key={p} className={`px-2 py-1 rounded-full text-xs font-medium ${colors[p]}`}>
                              {p}: <strong>{count}</strong>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Volume by category */}
                  {incidents.volumeByCategory.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3">Volume by Category</h3>
                      <div className="space-y-2">
                        {incidents.volumeByCategory.slice(0, 8).map(cat => (
                          <HBar
                            key={cat.categoryName}
                            label={cat.categoryName}
                            value={cat.count}
                            max={incidents.volumeByCategory[0]?.count ?? 1}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Team Summary (TeamLead+) */}
              {isTeamLead && summary && (
                <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Team Summary</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <StatCard label="Active Agents" value={summary.totalAgents} />
                    <StatCard label="Open Tickets" value={summary.totalOpenTickets} />
                    <StatCard
                      label="Avg SLA Compliance"
                      value={`${summary.avgSLACompliance.toFixed(0)}%`}
                      highlight={summary.avgSLACompliance < 80}
                    />
                  </div>

                  <h3 className="text-sm font-medium text-gray-700 mb-3">Agent Workloads</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <th className="pb-2 pr-4">Agent</th>
                          <th className="pb-2 pr-4 text-center">Open</th>
                          <th className="pb-2 pr-4 text-center">Resolved</th>
                          <th className="pb-2 pr-4 text-center">Closed</th>
                          <th className="pb-2 pr-4 text-center">Total</th>
                          <th className="pb-2 text-center">SLA %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {teamWorkloads.map(({ agent, workload }) => (
                          <tr key={agent.id}>
                            <td className="py-2 pr-4 font-medium text-gray-900">{agent.fullName}</td>
                            <td className="py-2 pr-4 text-center">{workload.open}</td>
                            <td className="py-2 pr-4 text-center">{workload.resolved}</td>
                            <td className="py-2 pr-4 text-center">{workload.closed}</td>
                            <td className="py-2 pr-4 text-center">{workload.total}</td>
                            <td className="py-2 text-center">
                              <span className={`font-medium ${workload.slaCompliance >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                                {workload.slaCompliance.toFixed(0)}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {teamWorkloads.length === 0 && (
                      <p className="text-sm text-gray-400 italic mt-2">No agent data.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Recurring Issues (TeamLead+) */}
              {isTeamLead && (
                <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">
                    Recurring Issues
                    <span className="ml-2 text-sm font-normal text-gray-400">(last 30 days, min 3 occurrences)</span>
                  </h2>
                  {recurring.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No recurring issue patterns detected.</p>
                  ) : (
                    <ul className="space-y-3">
                      {recurring.map((r, i) => (
                        <li key={i} className="border border-gray-200 rounded-md p-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-900">{r.pattern}</span>
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                              {r.count} occurrences
                            </span>
                          </div>
                          {r.categoryName && (
                            <span className="text-xs text-gray-500 mr-3">Category: {r.categoryName}</span>
                          )}
                          <span className="text-xs text-gray-400">Last seen: {new Date(r.lastSeen).toLocaleDateString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ══ TRENDS TAB ════════════════════════════════════════════════════ */}
          {activeTab === 'trends' && (
            <div className="space-y-6">
              {trend.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No trend data available.</p>
              ) : (
                <>
                  {/* Daily volume chart */}
                  <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                      Daily Volume
                      <span className="ml-2 text-sm font-normal text-gray-400">(last {days} days)</span>
                    </h2>
                    <MiniBarChart data={trend} />
                  </div>

                  {/* Summary table */}
                  <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Daily Breakdown</h2>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead>
                          <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <th className="pb-2 pr-4">Date</th>
                            <th className="pb-2 pr-4 text-center">Incidents</th>
                            <th className="pb-2 text-center">Service Requests</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {[...trend].reverse().map(d => (
                            <tr key={d.day}>
                              <td className="py-2 pr-4 text-gray-600">{shortDate(d.day)}</td>
                              <td className="py-2 pr-4 text-center font-medium text-gray-900">{d.tickets.total}</td>
                              <td className="py-2 text-center font-medium text-gray-900">{d.srs.total}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-300 bg-gray-50">
                            <td className="py-2 pr-4 font-medium text-gray-700">Total</td>
                            <td className="py-2 pr-4 text-center font-bold text-violet-700">
                              {trend.reduce((s, d) => s + d.tickets.total, 0)}
                            </td>
                            <td className="py-2 text-center font-bold text-sky-600">
                              {trend.reduce((s, d) => s + d.srs.total, 0)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ══ AGENT ACTIVITY TAB ════════════════════════════════════════════ */}
          {activeTab === 'agents' && isTeamLead && (
            <div className="space-y-6">
              <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-5">
                  Agent Activity Report
                  <span className="ml-2 text-sm font-normal text-gray-400">(last {days} days)</span>
                </h2>

                {agentActivity.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No agent data available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead>
                        <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <th className="pb-3 pr-4">Agent</th>
                          <th className="pb-3 pr-4 text-center">Role</th>
                          <th className="pb-3 pr-4 text-center">Open</th>
                          <th className="pb-3 pr-4 text-center">Resolved</th>
                          <th className="pb-3 pr-4 text-center">Comments</th>
                          <th className="pb-3 pr-4 text-center">Calls</th>
                          <th className="pb-3 pr-4 text-center">Call Time</th>
                          <th className="pb-3 text-center">SRs Handled</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {agentActivity.map(({ agent, activity }) => (
                          <tr key={agent.id} className="hover:bg-gray-50">
                            <td className="py-3 pr-4">
                              <p className="font-medium text-gray-900">{agent.fullName}</p>
                              <p className="text-xs text-gray-400">{agent.email}</p>
                            </td>
                            <td className="py-3 pr-4 text-center">
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                {agent.role}
                              </span>
                            </td>
                            <td className="py-3 pr-4 text-center font-medium text-amber-600">{activity.ticketsOpen}</td>
                            <td className="py-3 pr-4 text-center font-medium text-green-600">{activity.ticketsResolved}</td>
                            <td className="py-3 pr-4 text-center text-gray-700">{activity.comments}</td>
                            <td className="py-3 pr-4 text-center text-gray-700">{activity.calls}</td>
                            <td className="py-3 pr-4 text-center text-gray-500 text-xs">{fmtDuration(activity.callDurationSeconds)}</td>
                            <td className="py-3 text-center text-gray-700">{activity.serviceRequestsHandled}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Per-agent resolved bar chart */}
              {agentActivity.length > 0 && (
                <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Tickets Resolved by Agent</h2>
                  <div className="space-y-2">
                    {agentActivity.map(({ agent, activity }) => (
                      <HBar
                        key={agent.id}
                        label={agent.fullName}
                        value={activity.ticketsResolved}
                        max={agentActivity[0]?.activity.ticketsResolved ?? 1}
                        color="bg-green-500"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-center">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function WorkloadCards({ stats }: { stats: WorkloadStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      <div className="text-center">
        <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
        <p className="text-xs text-gray-500">Open</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
        <p className="text-xs text-gray-500">Resolved</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-500">{stats.closed}</p>
        <p className="text-xs text-gray-500">Closed</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        <p className="text-xs text-gray-500">Total</p>
      </div>
      <div className="text-center">
        <p className={`text-2xl font-bold ${stats.slaCompliance >= 80 ? 'text-green-600' : 'text-red-600'}`}>
          {stats.slaCompliance.toFixed(0)}%
        </p>
        <p className="text-xs text-gray-500">SLA Compliance</p>
      </div>
    </div>
  );
}
