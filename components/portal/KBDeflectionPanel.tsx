import Link from 'next/link';

interface KBArticle {
  id: number;
  title: string;
}

interface Props {
  suggestions: KBArticle[];
}

export default function KBDeflectionPanel({ suggestions }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 p-4">
      <p className="text-sm font-medium text-blue-800 mb-2">
        These Help Center articles might solve your issue:
      </p>
      <ul className="space-y-1">
        {suggestions.map(article => (
          <li key={article.id}>
            <Link
              href={`/portal/kb/${article.id}`}
              target="_blank"
              className="text-sm text-blue-700 hover:underline"
            >
              {article.title}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-blue-600">
        Check these articles before submitting — your question may already be answered.
      </p>
    </div>
  );
}
