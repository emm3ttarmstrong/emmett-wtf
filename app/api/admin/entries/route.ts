import { mkdir, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isOwner, SESSION_COOKIE } from "@/lib/auth";
import { entries } from "@/lib/entries";

const ACTIONS = ["hide", "unhide", "delete"] as const;

// The gallery's card controls. An edit is not applied here: it is written to a queue folder that Omarchy watches,
// and `wtf-app edits` turns it into a commit on main, which then deploys. See server/README.md.
async function owner() {
  const jar = await cookies();
  return isOwner(jar.get(SESSION_COOKIE)?.value);
}

export async function GET() {
  if (!(await owner())) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ entries: Object.fromEntries(entries.map((e) => [e.slug, { hidden: e.hidden }])) });
}

export async function POST(request: Request) {
  try {
    if (!(await owner())) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.headers.get("host")) {
      return NextResponse.json({ error: "Wrong origin" }, { status: 403 });
    }
    const dir = process.env.EDITS_DIR;
    if (!dir) return NextResponse.json({ error: "Edits only work on the live site" }, { status: 501 });

    const { slug, action } = await request.json();
    const entry = entries.find((e) => e.slug === slug);
    if (!entry || !ACTIONS.includes(action)) return NextResponse.json({ error: "Bad request" }, { status: 400 });

    await mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${entry.slug}`;
    // Written under another name and renamed, so the watcher never reads half a file.
    await writeFile(join(dir, `${name}.tmp`), JSON.stringify({ slug: entry.slug, kind: entry.kind, action }));
    await rename(join(dir, `${name}.tmp`), join(dir, `${name}.json`));
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Could not queue the edit" }, { status: 500 });
  }
}
