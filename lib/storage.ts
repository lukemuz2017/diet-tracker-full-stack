// Everything the app saves, in one versioned localStorage entry. Read only in
// the browser: the server snapshot is null, so pages render a neutral state
// until the saved data is known (and never read it while prerendering).

import { useSyncExternalStore } from "react";
import type { Meal } from "./meals.ts";
import type { Nutrients } from "./nutrients.ts";
import { isProfile, type Profile } from "./profile.ts";
import type { Recipe } from "./recipe.ts";

export interface Entry {
  id: string;
  /** Local date the food was eaten, "YYYY-MM-DD". */
  date: string;
  name: string;
  servings: number;
  /** Which meal it was part of. Older entries have none (see lib/meals.ts). */
  meal?: Meal;
  /** Set when the food came from the built-in list. */
  foodId?: string;
  /** Totals for this entry (servings already applied). */
  nutrients: Nutrients;
  createdAt: string;
}

export interface SavedData {
  version: 1;
  profile: Profile | null;
  entries: Entry[];
  /** Dates the person marked complete. */
  completeDays: string[];
  recipes: Recipe[];
}

const KEY = "diet-tracker:v1";
const EMPTY: SavedData = { version: 1, profile: null, entries: [], completeDays: [], recipes: [] };

let cache: SavedData | null = null;
const listeners = new Set<() => void>();

function parse(raw: string | null): SavedData {
  if (!raw) return EMPTY;
  try {
    const value = JSON.parse(raw);
    if (value && typeof value === "object" && value.version === 1) {
      return {
        version: 1,
        // A profile saved before a shape change is dropped, so setup runs again.
        profile: isProfile(value.profile) ? value.profile : null,
        entries: Array.isArray(value.entries) ? value.entries : [],
        completeDays: Array.isArray(value.completeDays) ? value.completeDays : [],
        recipes: Array.isArray(value.recipes) ? value.recipes : [],
      };
    }
  } catch {
    // Corrupt data: start fresh rather than crash.
  }
  return EMPTY;
}

function read(): SavedData {
  if (cache === null) {
    try {
      cache = parse(window.localStorage.getItem(KEY));
    } catch {
      cache = EMPTY;
    }
  }
  return cache;
}

function notify() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  // Another tab changed the data.
  if (event.key === KEY) {
    cache = null;
    notify();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

/** Saved data, or null while it isn't known yet (server render, hydration). */
export function useSavedData(): SavedData | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** Applies a change and saves it. Returns false if the browser refused to store it. */
export function updateData(change: (data: SavedData) => SavedData): boolean {
  cache = change(read());
  notify();
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
    return true;
  } catch {
    return false;
  }
}

const TRAY_KEY = "diet-tracker:tray";

/** Foods picked in Add food but not added yet. Kept for this tab only (sessionStorage). */
export interface TrayItem {
  uid: string;
  name: string;
  foodId?: string;
  perServing: Nutrients;
  /** Multiple of the food's base amount. */
  multiple: number;
}

export function readTray(): TrayItem[] {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(TRAY_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(
      (item) =>
        item && typeof item.uid === "string" && typeof item.name === "string" && typeof item.multiple === "number" && typeof item.perServing === "object",
    );
  } catch {
    return [];
  }
}

export function writeTray(items: TrayItem[]) {
  try {
    if (items.length) window.sessionStorage.setItem(TRAY_KEY, JSON.stringify(items));
    else window.sessionStorage.removeItem(TRAY_KEY);
  } catch {
    // Storage blocked: the tray just won't outlive the page.
  }
}

/** Whether this browser lets the app keep data (private windows may not). */
export function canSave(): boolean {
  try {
    const probe = `${KEY}:probe`;
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
