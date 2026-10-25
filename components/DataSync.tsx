"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";
import { connect, load, useSyncStatus } from "@/lib/storage";

// Points the saved data at whoever is signed in: loads their rows when they
// sign in, and drops everything when they sign out or someone else signs in.
// Each request to Supabase carries the Clerk session token, which row-level
// security reads to decide whose rows it may see.
export function DataSync() {
  const { isLoaded, userId, getToken } = useAuth();
  const status = useSyncStatus();

  useEffect(() => {
    if (isLoaded) connect(userId ?? null, () => getToken());
  }, [isLoaded, userId, getToken]);

  if (status !== "error") return null;
  return (
    <div role="alert" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-lemon-tint px-4 py-3 text-center text-sm">
      <span>
        <b>Couldn’t load your data.</b> Check your connection, then try again.
      </span>
      <button
        type="button"
        onClick={() => void load()}
        className="min-h-11 rounded-full px-3 font-bold text-leaf underline underline-offset-[3px] hover:text-soil"
      >
        Try again
      </button>
    </div>
  );
}
