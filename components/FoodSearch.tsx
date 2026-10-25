"use client";

import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from "react";

export interface SearchOption {
  key: string;
  name: string;
  /** e.g. "½ cup · 114 kcal" */
  detail: string;
  /** e.g. "Contains dairy", from the profile's diet notes. */
  warning?: string;
}

/** A second, slower source searched after the local matches (USDA). */
export interface RemoteSearch {
  /** Heading over its results, e.g. "More from USDA". */
  label: string;
  /** Who's being asked, for the status messages ("USDA"). */
  source: string;
  minLength: number;
  search: (query: string, signal: AbortSignal) => Promise<SearchOption[]>;
}

type RemoteResult = { status: "done"; options: SearchOption[] } | { status: "error" };

const MAX_SUGGESTIONS = 8;
/** Wait for a pause in typing before asking the server. */
const REMOTE_DELAY_MS = 350;

/** Every word typed appears somewhere in the name ("bean bl" finds "Black beans"). */
export function matchesQuery(name: string, query: string): boolean {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const haystack = name.toLowerCase();
  return words.length > 0 && words.every((word) => haystack.includes(word));
}

// A search box with a suggestion list (the ARIA combobox pattern): type to
// filter, arrow keys to move, Enter to pick, Escape to close. With `remote`,
// a second section fills in below the local matches, with its own loading,
// nothing-found and unavailable states; the local matches never wait for it.
export function FoodSearch({
  options,
  emptyOptions = [],
  label = "Search foods",
  placeholder = "Try “eggs” or “rice”",
  autoFocus = false,
  remote,
  onPick,
  onAddOwn,
}: {
  options: SearchOption[];
  /** Shown before anything is typed, e.g. recent foods. */
  emptyOptions?: SearchOption[];
  label?: string;
  placeholder?: string;
  autoFocus?: boolean;
  remote?: RemoteSearch;
  onPick: (key: string) => void;
  /** Offered when typing, to add the typed name as your own food. */
  onAddOwn: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  /** Remote results by search, so going back to an earlier search is instant. */
  const [results, setResults] = useState<Record<string, RemoteResult>>({});
  const listId = useId();
  const inputId = useId();

  const typed = query.trim();
  const remoteKey = remote && typed.length >= remote.minLength ? typed.toLowerCase() : "";
  const remoteResult = remoteKey ? results[remoteKey] : undefined;

  useEffect(() => {
    if (!remote || !remoteKey || results[remoteKey]) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      remote.search(remoteKey, controller.signal).then(
        (found) => setResults((saved) => ({ ...saved, [remoteKey]: { status: "done", options: found } })),
        () => {
          if (!controller.signal.aborted) setResults((saved) => ({ ...saved, [remoteKey]: { status: "error" } }));
        },
      );
    }, REMOTE_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [remote, remoteKey, results]);

  const matches = typed
    ? options.filter((option) => matchesQuery(option.name, typed)).slice(0, MAX_SUGGESTIONS)
    : emptyOptions.slice(0, MAX_SUGGESTIONS);
  // A remote result that's already a local match (a saved food) isn't listed twice.
  const localKeys = new Set(matches.map((option) => option.key));
  const remoteOptions = remoteResult?.status === "done" ? remoteResult.options.filter((option) => !localKeys.has(option.key)) : [];
  const remoteState = !remoteKey ? null : !remoteResult ? "loading" : remoteResult.status === "error" ? "error" : remoteOptions.length ? "found" : "empty";
  // Row order: local matches, remote matches, Try again (if the remote failed),
  // then adding the typed name as your own food.
  const rows = typed
    ? [...matches.map((o) => o.key), ...remoteOptions.map((o) => o.key), ...(remoteState === "error" ? ["__retry"] : []), "__own"]
    : matches.map((option) => option.key);
  // Suggestions appear only while typing, not when the box is first focused.
  const showList = open && typed !== "" && rows.length > 0;
  const optionId = (index: number) => `${listId}-${index}`;
  const indexOf = (key: string) => rows.indexOf(key);

  const sourceName = remote?.source ?? "";
  const remoteMessage =
    remoteState === "loading"
      ? `Searching ${sourceName}…`
      : remoteState === "empty"
        ? `No ${sourceName} foods match “${typed}”.`
        : remoteState === "error"
          ? `Can’t reach ${sourceName} right now. The foods above still work.`
          : remoteState === "found"
            ? `${remoteOptions.length} more ${remoteOptions.length === 1 ? "food" : "foods"} from ${sourceName}.`
            : "";

  function choose(index: number) {
    const key = rows[index];
    if (key === undefined) return;
    if (key === "__retry") {
      // Forget the failure, which asks again; keep the list open.
      setResults((saved) => {
        const rest = { ...saved };
        delete rest[remoteKey];
        return rest;
      });
      return;
    }
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

  const row = (key: string, className: string, children: ReactNode) => {
    const index = indexOf(key);
    return (
      <li
        key={key}
        id={optionId(index)}
        role="option"
        aria-selected={index === active}
        // mousedown, not click, so the input's blur doesn't close the list first.
        onMouseDown={(event) => {
          event.preventDefault();
          choose(index);
        }}
        onMouseEnter={() => setActive(index)}
        className={`cursor-pointer px-3.5 py-2.5 ${index === active ? "bg-leaf-tint" : ""} ${className}`}
      >
        {children}
      </li>
    );
  };

  const foodRow = (option: SearchOption) =>
    row(
      option.key,
      "flex items-baseline justify-between gap-3",
      <>
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-bold">{option.name}</span>
          {option.warning && <span className="rounded-full bg-carrot/25 px-2 text-xs font-bold">{option.warning}</span>}
        </span>
        <span className="flex-none text-right text-[13px] text-muted">{option.detail}</span>
      </>,
    );

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
      {/* The remote section's state, read out as it changes. */}
      <p role="status" className="sr-only">
        {showList ? remoteMessage : ""}
      </p>
      <ul
        id={listId}
        role="listbox"
        aria-label={typed ? "Matching foods" : "Suggestions"}
        hidden={!showList}
        className="absolute inset-x-0 top-full z-20 mt-1 max-h-96 overflow-y-auto rounded-xl border-[1.5px] border-soil bg-white py-1 shadow-[3px_3px_0_var(--color-kraft)]"
      >
        {matches.map(foodRow)}
        {typed && remoteState && (
          <>
            <li role="presentation" className="border-t border-line px-3.5 pb-1 pt-2.5 text-xs font-bold uppercase tracking-[0.08em] text-leaf">
              {remote?.label}
            </li>
            {remoteState === "found" ? (
              remoteOptions.map(foodRow)
            ) : (
              <li role="presentation" aria-hidden="true" className="flex items-center gap-2 px-3.5 py-2 text-[15px] text-muted">
                {remoteState === "loading" && (
                  <span className="size-3.5 flex-none animate-spin rounded-full border-2 border-field border-t-leaf motion-reduce:animate-none" />
                )}
                {remoteMessage}
              </li>
            )}
            {remoteState === "error" && row("__retry", "text-[15px] font-bold text-leaf", <>Try {sourceName} again</>)}
          </>
        )}
        {typed &&
          row(
            "__own",
            "border-t border-line text-[15px] text-leaf",
            <>
              {matches.length === 0 && remoteOptions.length === 0 ? "No match. " : ""}Add “{typed}” as your own food
            </>,
          )}
      </ul>
    </div>
  );
}
