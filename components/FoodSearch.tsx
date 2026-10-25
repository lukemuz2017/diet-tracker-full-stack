"use client";

import { useId, useState, type KeyboardEvent } from "react";

export interface SearchOption {
  key: string;
  name: string;
  /** e.g. "½ cup · 114 kcal" */
  detail: string;
  /** e.g. "Contains dairy", from the profile's diet notes. */
  warning?: string;
}

const MAX_SUGGESTIONS = 8;

/** Every word typed appears somewhere in the name ("bean bl" finds "Black beans"). */
export function matchesQuery(name: string, query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = name.toLowerCase();
  return words.length > 0 && words.every((word) => haystack.includes(word));
}

// A search box with a suggestion list (the ARIA combobox pattern): type to
// filter, arrow keys to move, Enter to pick, Escape to close.
export function FoodSearch({
  options,
  emptyOptions = [],
  label = "Search foods",
  placeholder = "Try “eggs” or “rice”",
  autoFocus = false,
  onPick,
  onAddOwn,
}: {
  options: SearchOption[];
  /** Shown before anything is typed, e.g. recent foods. */
  emptyOptions?: SearchOption[];
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onPick: (key: string) => void;
  /** Offered when typing, to add the typed name as your own food. */
  onAddOwn: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputId = useId();

  const typed = query.trim();
  const matches = typed
    ? options.filter((option) => matchesQuery(option.name, typed)).slice(0, MAX_SUGGESTIONS)
    : emptyOptions.slice(0, MAX_SUGGESTIONS);
  // When typing, the last row offers adding the typed name as your own food.
  const rows = typed ? [...matches.map((option) => option.key), "__own"] : matches.map((option) => option.key);
  // Suggestions appear only while typing, not when the box is first focused.
  const showList = open && typed !== "" && rows.length > 0;
  const optionId = (index: number) => `${listId}-${index}`;

  function choose(index: number) {
    const key = rows[index];
    if (key === undefined) return;
    if (key === "__own") onAddOwn(typed);
    else onPick(key);
    setQuery("");
    setOpen(false);
    setActive(0);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(index + 1, rows.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && showList) {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Escape" && showList) {
      // Close just the suggestions, not the pop-up around the search.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div className="relative flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-[15px] font-bold">
        {label}
      </label>
      <div className="field-box flex h-12 items-center rounded-field border-[1.5px] border-field bg-white px-3.5">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? optionId(active) : undefined}
          autoComplete="off"
          placeholder={placeholder}
          autoFocus={autoFocus}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 bg-transparent text-base text-soil placeholder:text-muted"
        />
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label={typed ? "Matching foods" : "Suggestions"}
        hidden={!showList}
        className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-xl border-[1.5px] border-soil bg-white py-1 shadow-[3px_3px_0_var(--color-kraft)]"
      >
        {matches.map((option, index) => (
          <li
            key={option.key}
            id={optionId(index)}
            role="option"
            aria-selected={index === active}
            // mousedown, not click, so the input's blur doesn't close the list first.
            onMouseDown={(event) => {
              event.preventDefault();
              choose(index);
            }}
            onMouseEnter={() => setActive(index)}
            className={`flex cursor-pointer items-baseline justify-between gap-3 px-3.5 py-2.5 ${
              index === active ? "bg-leaf-tint" : ""
            }`}
          >
            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-bold">{option.name}</span>
              {option.warning && <span className="rounded-full bg-carrot/25 px-2 text-xs font-bold">{option.warning}</span>}
            </span>
            <span className="text-right text-[13px] text-muted">{option.detail}</span>
          </li>
        ))}
        {typed && (
          <li
            id={optionId(matches.length)}
            role="option"
            aria-selected={active === matches.length}
            onMouseDown={(event) => {
              event.preventDefault();
              choose(matches.length);
            }}
            onMouseEnter={() => setActive(matches.length)}
            className={`cursor-pointer border-t border-line px-3.5 py-2.5 text-[15px] text-leaf ${
              active === matches.length ? "bg-leaf-tint" : ""
            }`}
          >
            {matches.length === 0 ? "No match. " : ""}Add “{typed}” as your own food
          </li>
        )}
      </ul>
    </div>
  );
}
