'use client';

import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { MagnifyingGlassIcon, UserCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface SelectedEmployee {
  employeeId: string;
  fullName: string;
  email: string;
  phone: string | null;
  department: string | null;
}

interface EmployeeResult {
  id: number;
  employeeId: string;
  fullName: string;
  email: string;
  phone: string | null;
  department: string | null;
  title: string | null;
}

interface Props {
  onSelect: (user: SelectedEmployee | null) => void;
  placeholder?: string;
  required?: boolean;
  label?: string;
}

export default function UserSearchCombobox({
  onSelect,
  placeholder = 'Search by name, email, or employee ID…',
  required = false,
  label,
}: Props): JSX.Element {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EmployeeResult[]>([]);
  const [selected, setSelected] = useState<SelectedEmployee | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setIsLoading(false);
      setResults([]);
      setIsOpen(false);
      setHighlightedIndex(-1);
      return;
    }
    setIsLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/employees/search?q=${encodeURIComponent(query.trim())}`);
        if (!res.ok) return;
        const data = await res.json() as { employees: EmployeeResult[] };
        setResults(data.employees ?? []);
        setIsOpen(true);
        setHighlightedIndex(-1);
      } catch {
        // non-fatal
      } finally {
        setIsLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(emp: EmployeeResult) {
    const user: SelectedEmployee = {
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
    };
    setSelected(user);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onSelect(user);
  }

  function handleClear() {
    setSelected(null);
    setQuery('');
    onSelect(null);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  if (selected) {
    return (
      <div>
        {label && (
          <p className="block text-sm font-medium text-gray-700 mb-1">{label}</p>
        )}
        <div className="flex items-center gap-3 px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
          <UserCircleIcon className="h-5 w-5 text-violet-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{selected.fullName}</p>
            <p className="text-xs text-gray-500 truncate">
              {selected.employeeId}
              {selected.email ? ` · ${selected.email}` : ''}
              {selected.phone ? ` · ${selected.phone}` : ''}
              {selected.department ? ` · ${selected.department}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded text-gray-400 hover:text-gray-600"
            aria-label="Clear selection"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      )}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
        )}
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-primary-500 focus:border-primary-500"
        />
        {/* Hidden input to carry "required" validation — will be empty when nothing selected */}
        {required && (
          <input
            type="text"
            required
            readOnly
            tabIndex={-1}
            value={selected ? 'selected' : ''}
            aria-hidden="true"
            className="sr-only"
          />
        )}
      </div>
      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-md bg-white border border-gray-200 shadow-lg py-1">
          {results.map((emp, idx) => (
            <li
              key={emp.id}
              onClick={() => handleSelect(emp)}
              onMouseEnter={() => setHighlightedIndex(idx)}
              className={`flex items-center gap-3 px-3 py-2 cursor-pointer text-sm transition-colors ${
                idx === highlightedIndex ? 'bg-violet-50' : 'hover:bg-gray-50'
              }`}
            >
              <UserCircleIcon className="h-5 w-5 text-gray-400 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">{emp.fullName}</p>
                <p className="text-xs text-gray-500 truncate">
                  {emp.employeeId}
                  {emp.email ? ` · ${emp.email}` : ''}
                  {emp.department ? ` · ${emp.department}` : ''}
                  {emp.title ? ` · ${emp.title}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {isOpen && query.trim().length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-50 mt-1 w-full rounded-md bg-white border border-gray-200 shadow-lg px-3 py-2 text-sm text-gray-500 italic">
          No employees found for &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
