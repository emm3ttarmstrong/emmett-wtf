"use client";

import { useState } from "react";
import { EllipsisIcon, EyeIcon, EyeOffIcon, GlobeIcon, LockIcon, Trash2Icon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Entry } from "@/lib/entries";
import type { EditAction } from "./use-pending";

export function CardMenu({ entry, onEdit }: { entry: Entry; onEdit: (action: EditAction) => void }) {
  const [confirming, setConfirming] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="secondary"
              className="absolute top-2 right-2 size-11"
              aria-label={`Options for ${entry.title}`}
            />
          }
        >
          <EllipsisIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="min-h-11" onClick={() => onEdit(entry.hidden ? "unhide" : "hide")}>
            {entry.hidden ? <EyeIcon /> : <EyeOffIcon />}
            {entry.hidden ? "Unhide" : "Hide"}
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11" onClick={() => onEdit(entry.public ? "unpublish" : "publish")}>
            {entry.public ? <LockIcon /> : <GlobeIcon />}
            {entry.public ? "Make private" : "Make public"}
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11" variant="destructive" onClick={() => setConfirming(true)}>
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {entry.title}?</AlertDialogTitle>
            <AlertDialogDescription>
              {entry.kind === "site"
                ? `This removes the card. The site keeps running at ${entry.host} until it is removed on the server.`
                : "This removes its code from the repo. It can be restored from git history."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="h-11"
              onClick={() => {
                setConfirming(false);
                onEdit("delete");
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
