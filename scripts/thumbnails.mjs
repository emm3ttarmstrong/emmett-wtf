// Captures gallery thumbnails (light and dark) and, for public prototypes, the Open Graph image and video.
//
//   pnpm thumbnails                 every prototype and site
//   pnpm thumbnails a b             only these slugs
//   pnpm thumbnails --missing       only entries without a thumbnail
//   pnpm thumbnails --no-build a    reuse the existing production build
//
// It runs a production build with the gate open, so private prototypes are captured too.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const root = new URL("..", import.meta.url).pathname;
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const wanted = args.filter((a) => !a.startsWith("--"));
const PORT = 4317;
const SETTLE_MS = 2500;
const VIDEO_MS = 6000;

const run = (cmd, argv, env = {}) => {
  const result = spawnSync(cmd, argv, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

if (flags.has("--no-build")) run("node", ["scripts/manifest.mjs"]);
else run("pnpm", ["build"]);

const manifest = JSON.parse(readFileSync(join(root, "lib/generated/manifest.json"), "utf8"));
const unknown = wanted.filter((slug) => !manifest.some((e) => e.slug === slug));
if (unknown.length) {
  console.error(`thumbnails: no such prototype or site: ${unknown.join(", ")}`);
  process.exit(1);
}
const targets = manifest.filter((e) => {
  if (wanted.length) return wanted.includes(e.slug);
  if (flags.has("--missing")) return !(e.thumb.light && e.thumb.dark) || (e.kind === "prototype" && e.public && !e.og.image);
  return true;
});
if (!targets.length) {
  console.log("thumbnails: nothing to capture");
  process.exit(0);
}

const server = spawn("pnpm", ["exec", "next", "start", "-p", String(PORT)], {
  cwd: root,
  stdio: "ignore",
  env: { ...process.env, WTF_OPEN: "1" },
});
const stop = () => server.kill();
process.on("exit", stop);

const base = `http://localhost:${PORT}`;
for (let i = 0; ; i++) {
  try {
    if ((await fetch(base)).ok) break;
  } catch {}
  if (i > 60) {
    console.error("thumbnails: the server did not start");
    process.exit(1);
  }
  await new Promise((r) => setTimeout(r, 500));
}

mkdirSync(join(root, "public/thumbnails"), { recursive: true });
mkdirSync(join(root, "public/og"), { recursive: true });
const browser = await chromium.launch();
const failed = [];

async function open(entry, theme, options) {
  const context = await browser.newContext({ colorScheme: theme, ...options });
  await context.addInitScript((t) => {
    try {
      window.localStorage.setItem("theme", t);
    } catch {}
  }, theme);
  const page = await context.newPage();
  const url = entry.kind === "site" ? entry.href : base + entry.href;
  const response = await page.goto(url, { waitUntil: "load", timeout: 30000 });
  if (!response || !response.ok()) throw new Error(`${url} answered ${response?.status()}`);
  return { context, page };
}

for (const entry of targets) {
  try {
    for (const theme of ["light", "dark"]) {
      const { context, page } = await open(entry, theme, { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.5 });
      await page.waitForTimeout(SETTLE_MS);
      await page.screenshot({ path: join(root, `public/thumbnails/${entry.slug}-${theme}.png`) });
      await context.close();
    }
    if (entry.kind === "prototype" && entry.public) {
      const size = { width: 1200, height: 630 };
      const videoDir = join(root, ".next/og-video");
      const { context, page } = await open(entry, "dark", { viewport: size, recordVideo: { dir: videoDir, size } });
      await page.waitForTimeout(VIDEO_MS);
      await page.screenshot({ path: join(root, `public/og/${entry.slug}.png`) });
      const video = page.video();
      await context.close();
      const webm = await video.path();
      const mp4 = join(root, `public/og/${entry.slug}.mp4`);
      const ffmpeg = spawnSync(
        "ffmpeg",
        ["-y", "-loglevel", "error", "-i", webm, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "30", "-movflags", "+faststart", mp4],
        { stdio: "inherit" },
      );
      if (ffmpeg.status !== 0) {
        if (existsSync(mp4)) rmSync(mp4);
        console.warn(`thumbnails: ${entry.slug} has no og:video, because ffmpeg is missing or failed`);
      }
      rmSync(videoDir, { recursive: true, force: true });
    }
    console.log(`thumbnails: ${entry.slug}`);
  } catch (error) {
    failed.push(entry.slug);
    console.error(`thumbnails: ${entry.slug} failed: ${error.message}`);
  }
}

await browser.close();
stop();
process.exit(failed.length ? 1 : 0);
