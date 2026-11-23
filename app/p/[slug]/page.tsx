import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { ThemeToggle } from "@/components/site/theme-toggle";
import { Button } from "@/components/ui/button";
import { entries, findPrototype } from "@/lib/entries";
import { registry } from "@/lib/generated/registry";

export function generateStaticParams() {
  return entries.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const entry = findPrototype(slug);
  if (!entry) return {};
  if (!entry.public) return { title: entry.title, robots: { index: false, follow: false } };
  return {
    title: entry.title,
    description: entry.description,
    openGraph: {
      title: entry.title,
      description: entry.description,
      url: `/p/${slug}`,
      images: entry.og.image ? [{ url: `/og/${slug}.png`, width: 1200, height: 630 }] : undefined,
      videos: entry.og.video ? [{ url: `/og/${slug}.mp4`, width: 1200, height: 630, type: "video/mp4" }] : undefined,
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function PrototypePage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const entry = findPrototype(slug);
  const load = registry[slug];
  if (!entry || !load) notFound();
  const { default: Prototype } = await load();

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-1">
        <div className="flex min-w-0 items-center">
          <Button variant="ghost" className="size-11" aria-label="All prototypes" nativeButton={false} render={<Link href="/" />}>
            <ArrowLeftIcon />
          </Button>
          <h1 className="truncate text-sm font-medium">{entry.title}</h1>
        </div>
        <ThemeToggle />
      </header>
      <main className="flex min-h-0 flex-1 flex-col">
        <Prototype />
      </main>
    </div>
  );
}
