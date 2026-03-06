'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface User {
  id: number;
  fullName: string;
  email: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

/**
 * Textarea with @mention autocomplete.
 * Fetches /api/agents when the user types @ followed by characters.
 * Inserts @FullName token on selection and tracks mentioned user IDs.
 */
export default function MentionTextarea({
  value,
  onChange,
  placeholder = 'Add a comment…',
  rows = 3,
  className = '',
  disabled = false,
  required = false,
}: MentionTextareaProps) {
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqSeqRef = useRef(0);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!q) { setSuggestions([]); return; }
    const seq = ++reqSeqRef.current;
    try {
      const res = await fetch(`/api/agents?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        // Discard stale responses from earlier, slower requests
        if (seq === reqSeqRef.current) {
          setSuggestions((data.agents ?? []).slice(0, 6));
        }
      }
    } catch {
      if (seq === reqSeqRef.current) setSuggestions([]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const pos = e.target.selectionStart ?? 0;
    onChange(newVal);
    setCursorPos(pos);

    // Detect @mention trigger: find the last @ before cursor
    const textUpToCursor = newVal.slice(0, pos);
    const atMatch = textUpToCursor.match(/@(\w*)$/);
    if (atMatch) {
      const q = atMatch[1];
      setMentionQuery(q);
      setSelectedIndex(0);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchSuggestions(q), 200);
    } else {
      setMentionQuery(null);
      setSuggestions([]);
    }
  };

  const insertMention = (user: User) => {
    if (!textareaRef.current) return;
    const pos = cursorPos;
    const textUpToCursor = value.slice(0, pos);
    const atIndex = textUpToCursor.lastIndexOf('@');
    const before = value.slice(0, atIndex);
    const after = value.slice(pos);
    const mention = `@${user.fullName} `;
    const newVal = before + mention + after;
    onChange(newVal);
    setSuggestions([]);
    setMentionQuery(null);

    // Move cursor after inserted mention
    const newPos = atIndex + mention.length;
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (mentionQuery !== null && suggestions[selectedIndex]) {
        e.preventDefault();
        insertMention(suggestions[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setMentionQuery(null);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        required={required}
        disabled={disabled}
        className={className}
      />
      {suggestions.length > 0 && (
        <div className="absolute z-50 left-0 mt-1 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          {suggestions.map((user, i) => (
            <button
              key={user.id}
              type="button"
              onMouseDown={e => { e.preventDefault(); insertMention(user); }}
              className={`w-full text-left px-3 py-2 text-sm flex flex-col transition-colors ${i === selectedIndex ? 'bg-violet-600 text-white' : 'text-gray-200 hover:bg-gray-800'}`}
            >
              <span className="font-medium">{user.fullName}</span>
              <span className={`text-xs ${i === selectedIndex ? 'text-violet-200' : 'text-gray-400'}`}>{user.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
