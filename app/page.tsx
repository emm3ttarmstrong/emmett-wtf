import { Gallery } from "@/components/site/gallery";
import { publicEntries } from "@/lib/entries";

export default function Home() {
  return <Gallery entries={publicEntries} owner={false} />;
}
