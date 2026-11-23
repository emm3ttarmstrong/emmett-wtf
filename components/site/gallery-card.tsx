import { Badge } from "@/components/ui/badge";
import type { Entry } from "@/lib/entries";
import { cn } from "@/lib/utils";
import { CardMenu } from "./card-menu";
import { Thumbnail } from "./thumbnail";
import type { EditAction } from "./use-pending";

const PENDING_LABEL: Record<EditAction, string> = {
  hide: "Hiding…",
  unhide: "Unhiding…",
  publish: "Making public…",
  unpublish: "Making private…",
  delete: "Deleting…",
};

type Props = {
  entry: Entry;
  owner: boolean;
  pending?: EditAction;
  onEdit: (action: EditAction) => void;
};

export function GalleryCard({ entry, owner, pending, onEdit }: Props) {
  return (
    <li className={cn("relative transition-opacity", pending && "opacity-50")}>
      <a
        href={entry.href}
        className="group block overflow-hidden rounded-xl border border-border bg-card outline-none transition-colors hover:border-ring focus-visible:border-ring active:border-ring"
      >
        <Thumbnail entry={entry} />
        <div className="flex flex-col gap-1 p-4">
          <div className="flex items-center gap-2">
            <h2 className="font-medium">{entry.title}</h2>
            {owner && (
              <span className="ml-auto flex gap-1">
                {pending ? (
                  <Badge variant="outline">{PENDING_LABEL[pending]}</Badge>
                ) : (
                  <>
                    {entry.hidden && <Badge variant="outline">hidden</Badge>}
                    {!entry.public && <Badge variant="outline">private</Badge>}
                  </>
                )}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{entry.description}</p>
        </div>
      </a>
      {owner && !pending && <CardMenu entry={entry} onEdit={onEdit} />}
    </li>
  );
}
