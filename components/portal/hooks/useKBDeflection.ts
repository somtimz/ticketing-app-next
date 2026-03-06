'use client';

import { useState, useEffect, useRef } from 'react';

interface KBArticle {
  id: number;
  title: string;
}

export function useKBDeflection(title: string) {
  const [suggestions, setSuggestions] = useState<KBArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (title.trim().length < 4) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/kb/search?q=${encodeURIComponent(title)}&limit=3`);
        if (!res.ok) return;
        const data = await res.json() as { articles: KBArticle[] };
        setSuggestions(data.articles ?? []);
      } catch {
        // non-fatal
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [title]);

  return { suggestions, isLoading };
}
