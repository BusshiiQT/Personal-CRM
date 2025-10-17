"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type ContactOption = { id: string; name: string };

type Props = {
  options: ContactOption[];
  value: string | null;                       // selected contact_id or null
  onChange: (id: string | null) => void;      // bubble selection up
  placeholder?: string;
  label?: string;
};

export default function ContactSelect({
  options,
  value,
  onChange,
  placeholder = "Search contacts…",
  label = "Linked contact (optional)",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string>("");
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Derive current label from selected value
  const selected = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value]
  );

  // Filter options by query (case-insensitive substring match)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 50); // show first 50 by default
    return options
      .filter((o) => o.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [options, query]);

  // Close when clicking outside
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Keyboard nav
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      setActiveIndex(0);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) {
        choose(filtered[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const choose = (opt: ContactOption | null) => {
    onChange(opt ? opt.id : null);
    setOpen(false);
    setActiveIndex(-1);
    if (inputRef.current) inputRef.current.blur();
  };

  const clear = () => {
    setQuery("");
    choose(null);
  };

  return (
    <div ref={rootRef} className="space-y-1">
      <label className="label">{label}</label>
      {/* Visually it's an input; we keep a hidden input in the parent form for name="contact_id" */}
      <div className="relative">
        <input
          ref={inputRef}
          className="input pr-20"
          placeholder={placeholder}
          value={open ? query : (selected?.name ?? "")}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          aria-expanded={open}
          role="combobox"
          aria-autocomplete="list"
          aria-controls="contact-select-listbox"
        />
        {/* Right-side controls */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-2 pr-2">
          {selected && (
            <span className="pointer-events-auto">
              <button
                type="button"
                className="btn px-2 py-1 text-xs"
                onClick={clear}
              >
                Clear
              </button>
            </span>
          )}
          <span className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 bg-white">
            {filtered.length}
          </span>
        </div>

        {/* Dropdown */}
        {open && (
          <ul
            id="contact-select-listbox"
            role="listbox"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg"
          >
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-500">No matches</li>
            )}
            {filtered.map((opt, idx) => {
              const active = idx === activeIndex;
              const isSelected = value === opt.id;
              return (
                <li
                  key={opt.id}
                  role="option"
                  aria-selected={isSelected}
                  className={`cursor-pointer px-3 py-2 text-sm ${
                    active ? "bg-gray-100" : ""
                  }`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => e.preventDefault()} // prevent input blur before click
                  onClick={() => choose(opt)}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{opt.name}</span>
                    {isSelected && (
                      <span className="ml-3 text-xs text-gray-500">Selected</span>
                    )}
                  </div>
                </li>
              );
            })}
            {/* None option */}
            <li
              role="option"
              aria-selected={value === null}
              className="cursor-pointer border-t border-gray-100 px-3 py-2 text-sm text-gray-700"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(null)}
            >
              — None —
            </li>
          </ul>
        )}
      </div>
      <p className="text-xs text-gray-500">
        Type to search. Press ↑/↓ to navigate, Enter to select, Esc to close.
      </p>
    </div>
  );
}
