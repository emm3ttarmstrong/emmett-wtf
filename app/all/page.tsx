import { Gallery } from "@/components/site/gallery";
import { entries } from "@/lib/entries";

// The owner's gallery. proxy.ts serves it at / for the owner and answers 404 to everyone else.
export default function All() {
  return <Gallery entries={entries} owner />;
}
