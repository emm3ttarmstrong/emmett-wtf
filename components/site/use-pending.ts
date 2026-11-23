"use client";

import { useCallback, useEffect, useState } from "react";
import type { Entry } from "@/lib/entries";

export type EditAction = "hide" | "unhide" | "delete";
type Pending = Record<string, EditAction>;
type Live = Record<string, { hidden: boolean }>;

const KEY = "gallery:pending";
const POLL_MS = 15000;

function landed(action: EditAction, state: { hidden: boolean } | undefined) {
  if (action === "delete") return !state;
  return state ? state.hidden === (action === "hide") : true;
}

function save(pending: Pending) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(pending));
  } catch {}
}

// An edit takes a minute or two to deploy. Until it does, the card is shown as pending, and this remembers that
// across reloads. Once the server reports the edit has landed, the page reloads to show the new build.
export function usePending(entries: Entry[]) {
  const [pending, setPending] = useState<Pending>({});

  useEffect(() => {
    try {
      const stored: Pending = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
      const live: Live = Object.fromEntries(entries.map((e) => [e.slug, e]));
      const open = Object.fromEntries(Object.entries(stored).filter(([slug, action]) => !landed(action, live[slug])));
      save(open);
      // Pending edits only exist in the browser, so they are applied after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPending(open);
    } catch {}
  }, [entries]);

  useEffect(() => {
    if (Object.keys(pending).length === 0) return;
    const timer = window.setInterval(async () => {
      try {
        const response = await fetch("/api/admin/entries", { cache: "no-store" });
        if (!response.ok) return;
        const live: Live = (await response.json()).entries;
        if (Object.entries(pending).some(([slug, action]) => landed(action, live[slug]))) window.location.reload();
      } catch {}
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [pending]);

  const request = useCallback(async (slug: string, action: EditAction) => {
    const response = await fetch("/api/admin/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, action }),
    });
    if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Could not queue the edit");
    setPending((current) => {
      const next = { ...current, [slug]: action };
      save(next);
      return next;
    });
  }, []);

  return { pending, request };
}
