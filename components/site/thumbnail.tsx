import type { Entry } from "@/lib/entries";

// Both themes are in the markup and CSS picks one, so there is no flash while the theme script runs.
export function Thumbnail({ entry }: { entry: Entry }) {
  const src = (theme: "light" | "dark") => `/thumbnails/${entry.slug}-${theme}.png?v=${encodeURIComponent(entry.updatedAt)}`;
  const empty = (
    <div className="flex size-full items-center justify-center text-sm text-muted-foreground">No preview yet</div>
  );
  return (
    <div className="aspect-[16/10] overflow-hidden bg-muted">
      <div className="size-full dark:hidden">
        {entry.thumb.light ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src("light")} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          empty
        )}
      </div>
      <div className="hidden size-full dark:block">
        {entry.thumb.dark ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src("dark")} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          empty
        )}
      </div>
    </div>
  );
}
