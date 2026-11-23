"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRightIcon, LockIcon, LogOutIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { Entry } from "@/lib/entries";
import { ThemeToggle } from "./theme-toggle";
import { Thumbnail } from "./thumbnail";

export function Gallery({ entries, owner }: { entries: Entry[]; owner: boolean }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  const tags = useMemo(() => [...new Set(entries.flatMap((e) => e.tags))].sort(), [entries]);
  const anyHidden = entries.some((e) => e.hidden);
  const visible = entries.filter((e) => {
    if (e.hidden && !showHidden) return false;
    if (tag && !e.tags.includes(tag)) return false;
    const q = query.trim().toLowerCase();
    return !q || [e.title, e.description, ...e.tags].join(" ").toLowerCase().includes(q);
  });

  async function signOut() {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16">
      <header className="flex h-16 items-center justify-between">
        <h1 className="font-mono text-sm">emmett.wtf</h1>
        <div className="flex items-center">
          <ThemeToggle />
          {owner ? (
            <Button variant="ghost" className="size-11" aria-label="Sign out" onClick={signOut}>
              <LogOutIcon />
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="size-11"
              aria-label="Sign in"
              nativeButton={false}
              render={<Link href="/login" />}
            >
              <LockIcon />
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-3">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          aria-label="Search"
          className="h-11"
        />
        {(tags.length > 0 || (owner && anyHidden)) && (
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tag === t}
                onClick={() => setTag(tag === t ? null : t)}
                className="flex h-11 items-center"
              >
                <Badge variant={tag === t ? "default" : "outline"}>{t}</Badge>
              </button>
            ))}
            {owner && anyHidden && (
              <label className="ml-auto flex h-11 items-center gap-2 text-sm text-muted-foreground">
                Hidden
                <Switch checked={showHidden} onCheckedChange={setShowHidden} />
              </label>
            )}
          </div>
        )}
      </div>

      <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((entry) => (
          <li key={entry.slug}>
            <a
              href={entry.href}
              className="group block overflow-hidden rounded-xl border border-border bg-card outline-none transition-colors hover:border-ring focus-visible:border-ring active:border-ring"
            >
              <Thumbnail entry={entry} />
              <div className="flex flex-col gap-1 p-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-medium">{entry.title}</h2>
                  {entry.kind === "site" && <ArrowUpRightIcon className="size-4 text-muted-foreground" aria-label="Opens its own site" />}
                  {owner && !entry.public && (
                    <Badge variant="outline" className="ml-auto">
                      private
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{entry.description}</p>
              </div>
            </a>
          </li>
        ))}
      </ul>
      {visible.length === 0 && <p className="mt-10 text-center text-sm text-muted-foreground">Nothing here.</p>}
    </div>
  );
}
