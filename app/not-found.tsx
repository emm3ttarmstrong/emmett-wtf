import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Button } from "@/components/ui/button";
import SearchParty from "@/prototypes/search-party/page";

export const metadata: Metadata = { title: "Page not found" };

// Every missing address gets this page, including a private prototype's, so it never hints at what exists.
// The game is the Search Party prototype, shown inside the same shell a prototype page uses.
export default function NotFound() {
  return (
    <div className="flex h-dvh flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-1">
        <div className="flex min-w-0 items-center">
          <Button variant="ghost" className="size-11" aria-label="All prototypes" nativeButton={false} render={<Link href="/" />}>
            <ArrowLeftIcon />
          </Button>
          <h1 className="truncate text-sm font-medium">Page not found</h1>
        </div>
        <ThemeToggle />
      </header>
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <SearchParty />
      </main>
    </div>
  );
}
