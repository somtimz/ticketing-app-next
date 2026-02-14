'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

interface AgentWorkload {
  agentId: number;
  agentName: string;
  workload: {
    open: number;
    inProgress: number;
    pending: number;
    resolvedToday: number;
    slaCompliance: number;
  };
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
  tickets: { id: number; ticketNumber: string; title: string }[];
}

export default function AnalyticsDashboardPage(): JSX.Element {
  const { data: session } = useSession();
  const userRole = (session?.user as { role?: string })?.role;
  const userId = session?.user?.id;
  const isTeamLead = userRole === 'TeamLead' || userRole === 'Admin';
  const isAgent = userRole === 'Agent' || isTeamLead;

  const [workloads, setWorkloads] = useState<AgentWorkload[]>([]);
  const [summary, setSummary] = useState<WorkloadSummary | null>(null);
  const [myWorkload, setMyWorkload] = useState<AgentWorkload | null>(null);
  const [recurring, setRecurring] = useState<RecurringIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!isAgent) return;
    setIsLoading(true);
    setError('');
    try {
      const fetches: Promise<void>[] = [];

      // All workloads (TeamLead+)
      if (isTeamLead) {
        fetches.push(
          fetch('/api/analytics/workloads')
            .then(r => r.json())
            .then((d: { workloads: AgentWorkload[]; summary: WorkloadSummary }) => {
              setWorkloads(d.workloads ?? []);
              setSummary(d.summary ?? null);
            })
            .catch(() => {})
        );

        // Recurring issues
        fetches.push(
          fetch('/api/analytics/recurring')
            .then(r => r.json())
            .then((d: { recurring: RecurringIssue[] }) => {
              setRecurring(d.recurring ?? []);
            })
            .catch(() => {})
        );
      }

      // Own workload (all agents)
      if (userId) {
        fetches.push(
          fetch(`/api/analytics/workloads?agentId=${userId}`)
            .then(r => r.json())
            .then((d: { workload: AgentWorkload }) => {
              setMyWorkload(d.workload ?? null);
            })
            .catch(() => {})
        );
      }

      await Promise.all(fetches);
    } catch {
      setError('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  }, [isAgent, isTeamLead, userId]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">Workload and SLA performance overview</p>
      </div>

      {/* My Workload */}
      {myWorkload && (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">My Workload</h2>
          <WorkloadRow workload={myWorkload} />
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
                  <th className="pb-2 pr-4 text-center">In Progress</th>
                  <th className="pb-2 pr-4 text-center">Pending</th>
                  <th className="pb-2 pr-4 text-center">Resolved Today</th>
                  <th className="pb-2 text-center">SLA %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {workloads.map(w => (
                  <tr key={w.agentId}>
                    <td className="py-2 pr-4 font-medium text-gray-900">{w.agentName}</td>
                    <td className="py-2 pr-4 text-center">{w.workload.open}</td>
                    <td className="py-2 pr-4 text-center">{w.workload.inProgress}</td>
                    <td className="py-2 pr-4 text-center">{w.workload.pending}</td>
                    <td className="py-2 pr-4 text-center">{w.workload.resolvedToday}</td>
                    <td className="py-2 text-center">
                      <span className={`font-medium ${w.workload.slaCompliance >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                        {w.workload.slaCompliance.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {workloads.length === 0 && (
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
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 text-center">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

function WorkloadRow({ workload }: { workload: AgentWorkload }) {
  const w = workload.workload;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-900">{w.open}</p>
        <p className="text-xs text-gray-500">Open</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-yellow-600">{w.inProgress}</p>
        <p className="text-xs text-gray-500">In Progress</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-gray-600">{w.pending}</p>
        <p className="text-xs text-gray-500">Pending</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-green-600">{w.resolvedToday}</p>
        <p className="text-xs text-gray-500">Resolved Today</p>
      </div>
      <div className="text-center">
        <p className={`text-2xl font-bold ${w.slaCompliance >= 80 ? 'text-green-600' : 'text-red-600'}`}>
          {w.slaCompliance.toFixed(0)}%
        </p>
        <p className="text-xs text-gray-500">SLA Compliance</p>
      </div>
    </div>
  );
}
