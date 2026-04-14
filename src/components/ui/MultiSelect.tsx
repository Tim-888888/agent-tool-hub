'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
}

export default function MultiSelect({ options, selected, onChange, placeholder }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function toggleOption(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'flex min-w-[120px] items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs font-medium outline-none focus:border-[var(--color-accent)] dark:bg-[var(--bg-tertiary)]',
          selected.length > 0 ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
        )}
      >
        <span className="truncate">
          {selected.length > 0 ? selected.join(', ') : placeholder}
        </span>
        {selected.length > 0 && (
          <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-accent)] text-[10px] text-white">
            {selected.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] shadow-lg dark:bg-[var(--bg-secondary)]">
          {options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] dark:hover:bg-[var(--bg-tertiary)]"
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => toggleOption(option)}
                className="h-3 w-3 rounded border-[var(--border)] accent-[var(--color-accent)]"
              />
              {option}
            </label>
          ))}
          {options.length === 0 && (
            <div className="px-3 py-2 text-xs text-[var(--text-secondary)]">—</div>
          )}
        </div>
      )}
    </div>
  );
}
