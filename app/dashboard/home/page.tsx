'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { HomeIcon } from '@heroicons/react/24/outline';
import type { TicketWithRelations, TicketStatus } from '@/types';

// ── Types ────────────────────────────────────────────────────────────────────

interface AgentWorkload {
  open: number;
  resolved: number;
  closed: number;
  total: number;
  slaCompliance: number;
}

interface ServiceRequestRow {
  id: number;
  requestNumber: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  P1: 'bg-red-100 text-red-800',
  P2: 'bg-orange-100 text-orange-800',
  P3: 'bg-yellow-100 text-yellow-800',
  P4: 'bg-gray-100 text-gray-800'
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  New: 'bg-status-open text-white',
  Assigned: 'bg-blue-500 text-white',
  InProgress: 'bg-status-inProgress text-white',
  'On Hold': 'bg-yellow-500 text-white',
  Resolved: 'bg-status-resolved text-white',
  Closed: 'bg-status-closed text-white'
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  New: 'New',
  Assigned: 'Assigned',
  InProgress: 'In Progress',
  'On Hold': 'On Hold',
  Resolved: 'Resolved',
  Closed: 'Closed'
};

function SLACountdown({ slaResolutionDue }: { slaResolutionDue: Date | string | null }): JSX.Element | null {
  const [display, setDisplay] = useState<string>('');
  const [colorClass, setColorClass] = useState<string>('text-green-600');

  useEffect(() => {
    if (!slaResolutionDue) return;

    const update = (): void => {
      const due = new Date(slaResolutionDue).getTime();
      const now = Date.now();
      const diffMs = due - now;

      if (diffMs <= 0) {
        setDisplay('Breached');
        setColorClass('text-red-600 font-semibold');
        return;
      }

      const totalMins = Math.floor(diffMs / 60000);
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      setDisplay(`${hours}h ${mins}m`);

      if (totalMins < 60) {
        setColorClass('text-red-600 font-semibold');
      } else if (totalMins < 240) {
        setColorClass('text-amber-600 font-medium');
      } else {
        setColorClass('text-green-600');
      }
    };

    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [slaResolutionDue]);

  if (!slaResolutionDue || !display) return null;
  return <span className={`text-xs ${colorClass}`}>{display}</span>;
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function MyDashboardPage(): JSX.Element {
  const { data: session } = useSession();

  const [myTickets, setMyTickets] = useState<TicketWithRelations[]>([]);
  const [workload, setWorkload] = useState<AgentWorkload | null>(null);
  const [pendingSRs, setPendingSRs] = useState<ServiceRequestRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const userId = session?.user?.id;

  const fetchData = useCallback(async (): Promise<void> => {
    if (!userId) return;

    try {
      const [ticketsRes, workloadRes, srRes] = await Promise.all([
        fetch(
          `/api/tickets?assignedAgentId=${userId}&status=InProgress,Assigned,New&limit=10`
        ),
        fetch(`/api/analytics/workloads?agentId=${userId}`),
        fetch(
          `/api/service-requests?assignedAgentId=${userId}&status=Submitted,Approved,In+Progress&limit=5`
        )
      ]);

      if (ticketsRes.ok) {
        const data = (await ticketsRes.json()) as { tickets: TicketWithRelations[] };
        setMyTickets(data.tickets ?? []);
      }

      if (workloadRes.ok) {
        const data = (await workloadRes.json()) as { workload: AgentWorkload };
        setWorkload(data.workload ?? null);
      }

      if (srRes.ok) {
        const data = (await srRes.json()) as { serviceRequests: ServiceRequestRow[] };
        setPendingSRs(data.serviceRequests ?? []);
      }
    } catch {
      console.error('Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Count resolved today from workload is not available directly; derive from tickets if needed
  // The workload API returns open/resolved/closed totals, not "today" scoped.
  // We use workload.resolved as "Total Resolved" and leave "Resolved Today" as a nice-to-have.

  if (!session) {
    return (
      <div className="p-6 text-center text-gray-500 text-sm">
        Please sign in to view your dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-2">
        <HomeIcon className="h-6 w-6 text-violet-600" />
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Welcome back, {(session.user as any).fullName ?? session.user?.email}
          </p>
        </div>
      </div>

      {/* My Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-3xl font-bold text-violet-600">
            {isLoading ? '—' : (workload?.open ?? 0)}
          </div>
          <div className="text-sm text-gray-500 mt-1">Open Tickets</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-3xl font-bold text-green-600">
            {isLoading ? '—' : (workload?.resolved ?? 0)}
          </div>
          <div className="text-sm text-gray-500 mt-1">Total Resolved</div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="text-3xl font-bold text-blue-600">
            {isLoading ? '—' : `${workload?.slaCompliance ?? 0}%`}
          </div>
          <div className="text-sm text-gray-500 mt-1">SLA Compliance</div>
        </div>
      </div>

      {/* My Queue */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">My Queue</h2>
          <p className="text-xs text-gray-500 mt-0.5">Your top 10 open tickets</p>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-sm text-gray-500">Loading…</div>
        ) : myTickets.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No open tickets assigned to you.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Ticket</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Priority</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wide text-xs">SLA Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {myTickets.map(ticket => (
                  <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/issue-logging/${ticket.id}`} className="block">
                        <span className="font-medium text-primary-600">{ticket.ticketNumber}</span>
                        <p className="text-gray-800 mt-0.5 line-clamp-1">{ticket.title}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${PRIORITY_COLORS[ticket.priority] ?? 'bg-gray-100 text-gray-800'}`}
                      >
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${STATUS_COLORS[ticket.status] ?? 'bg-gray-100 text-gray-800'}`}
                      >
                        {STATUS_LABELS[ticket.status] ?? ticket.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {ticket.status === 'Resolved' || ticket.status === 'Closed' ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <SLACountdown slaResolutionDue={ticket.slaResolutionDue} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Service Requests */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Pending Service Requests</h2>
          <p className="text-xs text-gray-500 mt-0.5">Service requests assigned to you</p>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-sm text-gray-500">Loading…</div>
        ) : pendingSRs.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">
            No pending service requests assigned to you.
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {pendingSRs.map(sr => (
              <li key={sr.id} className="px-6 py-3 hover:bg-gray-50 transition-colors">
                <Link href={`/dashboard/service-requests/${sr.id}`} className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-medium text-primary-600 mr-2">{sr.requestNumber}</span>
                    <span className="text-sm font-medium text-gray-900">{sr.title}</span>
                    <p className="text-xs text-gray-500 mt-0.5">{sr.category}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${PRIORITY_COLORS[sr.priority] ?? 'bg-gray-100 text-gray-800'}`}
                    >
                      {sr.priority}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                      {sr.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
