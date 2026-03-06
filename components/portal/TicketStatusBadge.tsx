const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-500 text-white',
  Assigned: 'bg-indigo-500 text-white',
  InProgress: 'bg-amber-500 text-white',
  Pending: 'bg-yellow-500 text-white',
  Resolved: 'bg-green-500 text-white',
  Closed: 'bg-gray-400 text-white'
};

const STATUS_LABELS: Record<string, string> = {
  New: 'New',
  Assigned: 'Assigned',
  InProgress: 'In Progress',
  Pending: 'Pending',
  Resolved: 'Resolved',
  Closed: 'Closed'
};

export default function TicketStatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800'}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
