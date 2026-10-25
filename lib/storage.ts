// Everything a person saves, kept in Supabase (AGENTS.md, "Data model") and
// mirrored in memory so screens read it synchronously. A change shows at once
// and is written in the background; if a write fails, the change is undone by
// reloading from the database. Read only in the browser: the server snapshot
// is null, so pages render a neutral state until the data has loaded (and
// never read it while prerendering).

import type { SupabaseClient } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import type { Meal } from "./meals.ts";
import type { Nutrients } from "./nutrients.ts";
import type { Profile } from "./profile.ts";
import type { Recipe } from "./recipe.ts";
import { changesBetween, dataFromRows, hasChanges, type Changes } from "./rows.ts";
import { supabaseFor } from "./supabase.ts";
import { showToast } from "./toast.ts";

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
  /** Added by "Load a sample 2 weeks" (lib/sample.ts). */
  sample?: boolean;
  createdAt: string;
}

/** A food saved from USDA search (my_foods, kind "usda"). Logged in grams. */
export interface SavedFood {
  id: string;
  fdcId: number;
  name: string;
  per100g: Nutrients;
  createdAt: string;
}

export interface SavedData {
  version: 1;
  profile: Profile | null;
  entries: Entry[];
  /** Dates the person marked complete. */
  completeDays: string[];
  recipes: Recipe[];
  savedFoods: SavedFood[];
}

export type SyncStatus = "signed-out" | "loading" | "ready" | "error";

let state: { status: SyncStatus; data: SavedData | null } = { status: "signed-out", data: null };
let db: SupabaseClient | null = null;
let userId: string | null = null;
/** Writes run one after another, so an Undo never overtakes what it undoes. */
let writes: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

function setState(next: typeof state) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Saved data, or null while it isn't known yet (signed out, loading, server render). */
export function useSavedData(): SavedData | null {
  return useSyncExternalStore(subscribe, () => state.data, () => null);
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(subscribe, () => state.status, () => "loading");
}

/**
 * Called by components/DataSync.tsx whenever the Clerk user changes. A new
 * user starts from nothing, so one person's data never shows for another.
 */
export function connect(id: string | null, getToken: () => Promise<string | null>) {
  if (id === userId) return;
  userId = id;
  writes = Promise.resolve();
  if (!id) {
    db = null;
    setState({ status: "signed-out", data: null });
    return;
  }
  db = supabaseFor(getToken);
  void load();
}

/** Loads the signed-in person's data again (after an error, or a failed save). */
export async function load() {
  const client = db;
  const id = userId;
  if (!client || !id) return;
  setState({ status: "loading", data: null });
  try {
    // No user_id filter on purpose: row-level security returns only the
    // signed-in person's rows, and the two-user test checks exactly that.
    const [profile, entries, days, foods] = await Promise.all([
      client.from("profiles").select("units, height_cm, weight_kg, birth_date, sex, activity, allergies, pattern, life_stage").maybeSingle(),
      client.from("log_entries").select("id, date, meal, name, amount, source, nutrients, is_sample, created_at").order("created_at"),
      client.from("complete_days").select("date").order("date"),
      client.from("my_foods").select("id, kind, name, fdc_id, nutrients, servings, ingredients, created_at").order("created_at"),
    ]);
    if (id !== userId) return; // Signed out or switched while loading.
    const error = profile.error ?? entries.error ?? days.error ?? foods.error;
    if (error) throw error;
    setState({
      status: "ready",
      data: dataFromRows({ profile: profile.data, entries: entries.data ?? [], days: days.data ?? [], foods: foods.data ?? [] }),
    });
  } catch {
    if (id === userId) setState({ status: "error", data: null });
  }
}

async function write(client: SupabaseClient, changes: Changes) {
  const { profile, entries, days, foods } = changes;
  const requests: PromiseLike<{ error: unknown }>[] = [];
  // Deletes always carry a filter (Supabase refuses a DELETE without one);
  // row-level security limits every request to the person's own rows.
  if (profile === "delete") requests.push(client.from("profiles").delete().not("user_id", "is", null));
  else if (profile) requests.push(client.from("profiles").upsert({ ...profile, updated_at: new Date().toISOString() }));
  if (entries.upsert.length) requests.push(client.from("log_entries").upsert(entries.upsert));
  if (entries.delete.length) requests.push(client.from("log_entries").delete().in("id", entries.delete));
  if (days.add.length) {
    requests.push(
      client.from("complete_days").upsert(days.add.map((date) => ({ date })), { onConflict: "user_id,date", ignoreDuplicates: true }),
    );
  }
  if (days.remove.length) requests.push(client.from("complete_days").delete().in("date", days.remove));
  if (foods.upsert.length) requests.push(client.from("my_foods").upsert(foods.upsert));
  if (foods.delete.length) requests.push(client.from("my_foods").delete().in("id", foods.delete));
  const results = await Promise.all(requests);
  const failed = results.find((result) => result.error);
  if (failed) throw failed.error;
}

/** Applies a change on screen and saves it. Returns false if there's nothing loaded to change. */
export function updateData(change: (data: SavedData) => SavedData): boolean {
  const before = state.data;
  const client = db;
  const id = userId;
  if (!before || !client) return false;
  const after = change(before);
  setState({ ...state, data: after });
  const changes = changesBetween(before, after);
  if (hasChanges(changes)) {
    writes = writes
      .then(() => write(client, changes))
      .catch(() => {
        if (id !== userId) return;
        showToast("Couldn’t save that change, so it was undone. Check your connection and try again.");
        void load();
      });
  }
  return true;
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

