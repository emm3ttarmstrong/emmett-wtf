import manifest from "@/lib/generated/manifest.json";

export type Entry = {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  hidden: boolean;
  public: boolean;
  href: string;
  thumb: { light: boolean; dark: boolean };
  og: { image: boolean; video: boolean };
};

export const entries = manifest as Entry[];

export const publicEntries = entries.filter((e) => e.public && !e.hidden);

export function findPrototype(slug: string) {
  return entries.find((e) => e.slug === slug);
}

export const SITE_URL = "https://emmett.wtf";
