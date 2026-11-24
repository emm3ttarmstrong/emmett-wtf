import { bulbBeams, CREW, crewBeam, designOf, handOf, inBeam, segmentsInView, torchBeam, torchDwell, turnTowards, VIEW } from "./beams";
import { GEO, NOT_THE_PAGE, TUNING } from "./data";
import { glintValue, otherGlintValue } from "./game";
import type { Economy, Follower, FollowerId, Glint, Point, Sheet, World, WorldEvent } from "./types";

type Random = () => number;

const between = ([low, high]: readonly number[], random: Random) => low + random() * (high - low);
const towards = (value: number, target: number, step: number) => (Math.abs(target - value) <= step ? target : value + Math.sign(target - value) * step);

// Moves towards a target at up to a top speed, slowing as it arrives, with no overshoot.
function glide(value: number, target: number, topSpeed: number, ease: number, crawl: number, seconds: number) {
  const gap = Math.abs(target - value);
  const step = Math.min(topSpeed * seconds, Math.max(gap * (1 - Math.exp(-ease * seconds)), crawl * seconds));
  return towards(value, target, step);
}

const FOLLOWERS = Object.keys(GEO.party) as FollowerId[];
// Glints sit on the wall, never on the floor, so the torch can always reach one from where the searcher stands.
const wallY = (random: Random) => 20 + random() * (GEO.floor - 44);

// Where a find lands: on the floor just ahead of the searcher. It is left behind as the walk goes on.
export const findSpot = (heroX: number, facing: 1 | -1) => heroX + facing * 60;

const idleSheet = (): Sheet => ({ active: false, x: -1e6, baseY: 0, speed: 0, phase: 0, big: false });
export const sheetY = (sheet: Sheet, time: number) => sheet.baseY + (sheet.big ? 38 : 9) * Math.sin(time * (sheet.big ? 1.3 : 4) + sheet.phase);

// Every stash in view, in world space, with its key.
export function stashesInView(camX: number) {
  return segmentsInView(camX, 0).flatMap((k) => GEO.stashes[designOf(k)].map(([x, y], slot) => ({ key: `${k}:${slot}`, x: k * GEO.segment + x, y })));
}

export function createWorld(random: Random): World {
  const heroX = GEO.hero.screenX;
  return {
    time: 0,
    camX: 0,
    seen: { left: 0, right: VIEW },
    hero: { x: heroX, speed: 0, turn: 80, rest: 80, facing: 1, target: null, releaseAt: 0, walking: false, aimedAt: -Infinity },
    followers: Object.fromEntries(FOLLOWERS.map((id) => [id, { x: heroX + GEO.party[id], dir: 1, walking: false }])) as Record<FollowerId, Follower>,
    glints: Array.from({ length: GEO.glints }, (): Glint => ({ x: 40 + random() * (VIEW - 80), y: wallY(random), state: "on", timer: 0, charge: 0 })),
    stashes: {},
    mouse: { active: false, x: -1e6, dir: 1, nextAt: TUNING.firstMouse },
    findX: findSpot(heroX, 1),
    nextEventAt: TUNING.firstEvent,
    flashFrom: -Infinity,
    moth: { active: false, x: -1e6, y: 0, held: 0, leaveAt: 0 },
    phone: { active: false, until: 0, charge: 0, x: -1e6, y: 0 },
    sheets: Array.from({ length: GEO.pages }, idleSheet),
  };
}

// A tap points the torch at a place in the world. The searcher hurries towards one far ahead, and waits for one behind.
export function tapWorld(world: World, point: Point): World {
  return { ...world, hero: { ...world.hero, target: point, releaseAt: Infinity, aimedAt: world.time } };
}

// Whether lightning is lighting the view this instant: two quick flashes.
export function flashing(world: World) {
  const since = world.time - world.flashFrom;
  return (since >= 0 && since < 0.12) || (since >= 0.25 && since < 0.55);
}

// Advances the walk by a fraction of a second. Returns the new world, the clues collected and anything worth animating.
// `snap` moves the view without easing, for people who prefer reduced motion.
export function stepWorld(world: World, state: Economy, seconds: number, random: Random, snap = false): { world: World; gained: number; events: WorldEvent[] } {
  const time = world.time + seconds;
  const events: WorldEvent[] = [];
  const value = glintValue(state);
  const otherValue = otherGlintValue(state);
  let gained = 0;

  // ── The searcher ──
  // Left alone they amble forward. A target far ahead makes them hurry until it is in reach. A target within reach,
  // or behind, makes them stand and look at it.
  const hero = { ...world.hero };
  const gap = hero.target ? hero.target.x - hero.x : Infinity;
  const wantSpeed = !hero.target ? TUNING.ambleSpeed : gap > TUNING.standOff ? TUNING.walkSpeed : 0;
  hero.speed = glide(hero.speed, wantSpeed, 400, TUNING.walkEase, 20, seconds);
  hero.x += hero.speed * seconds;
  hero.walking = hero.speed > 5;
  if (hero.target) {
    // Which way to face is judged from the body, not the hand. The hand changes sides when the searcher turns round,
    // so judging from it made a target overhead flip the facing back and forth forever.
    const fromBody = turnTowards({ x: hero.x, y: GEO.hero.handY }, hero.target);
    const side = fromBody > TUNING.flipPast ? 1 : fromBody < -TUNING.flipPast ? -1 : hero.facing;
    if (side !== hero.facing) {
      // Turning round is instant and carries the torch with it, so the beam mirrors to the other side.
      hero.facing = side;
      hero.turn = -hero.turn;
    }
  } else if (hero.facing === -1 && hero.turn > TUNING.flipPast) {
    // With nothing to look at, the torch swings back over the top, and the searcher turns to face the way they are
    // walking as it crosses.
    hero.facing = 1;
  }
  const wanted = hero.target ? turnTowards(handOf(hero.x, hero.facing), hero.target) : hero.rest + TUNING.idleDrift * Math.sin(time * 0.6);
  hero.turn = glide(hero.turn, wanted, TUNING.turnSpeed, TUNING.turnEase, 10, seconds);
  if (hero.target && wantSpeed === 0 && Math.abs(hero.turn - wanted) < 0.5) {
    if (hero.releaseAt === Infinity) hero.releaseAt = time + TUNING.holdSeconds;
    else if (time >= hero.releaseAt) {
      hero.target = null;
      hero.rest = Math.max(30, Math.abs(hero.turn));
    }
  }
  // The view follows the searcher, easing after them when they hurry.
  const wantCam = hero.x - GEO.hero.screenX;
  const camX = snap ? wantCam : glide(world.camX, wantCam, 600, 3, 4, seconds);
  // The part of the world the device shows.
  const seen = { left: camX + world.seen.left, right: camX + world.seen.right };
  const inSight = (x: number, margin = 0) => x >= seen.left + margin && x <= seen.right - margin;
  // A new glint appears ahead of the searcher, on screen or just beyond it, so the walk keeps bringing more.
  const ahead = (): Point => ({ x: hero.x + 30 + random() * Math.max(60, seen.right - hero.x + 80), y: wallY(random) });

  // ── The party ──
  // Everyone keeps their place relative to the searcher, walking to catch up, and faces the way they move.
  const mouseWas = world.mouse;
  const followers = { ...world.followers };
  for (const id of FOLLOWERS) {
    const was = world.followers[id];
    const chasing = id === "dog" && state.levels.dog > 0 && mouseWas.active;
    const place = id === "satellite" ? hero.x + GEO.party.satellite + 50 * Math.sin(time * 0.3) : hero.x + GEO.party[id];
    const speed = TUNING.followSpeed * (id === "dog" ? 1 + 0.15 * Math.max(0, state.levels.dog - 1) : 1);
    const x = chasing ? towards(was.x, mouseWas.x, speed * seconds) : glide(was.x, place, speed, 3, 5, seconds);
    const moved = x - was.x;
    const walking = Math.abs(moved) > 6 * seconds;
    followers[id] = { x, walking, dir: walking ? (moved > 0 ? 1 : -1) : chasing ? was.dir : 1 };
  }
  const noseX = followers.dog.x + followers.dog.dir * 32;
  const cat = followers.cat;

  // ── Every light ──
  const torch = torchBeam(hero.x, hero.facing, hero.turn, state);
  // The torch counts as in use for a few seconds after the last tap or drag.
  const attentive = time - hero.aimedAt <= TUNING.attentionSeconds;
  const crew = Object.fromEntries(CREW.filter((id) => state.levels[id] > 0).map((id) => [id, crewBeam(id, followers[id], time, state)]));
  const others = [...Object.values(crew), ...bulbBeams(camX, state)];
  // Whether anything but the searcher's torch is helping with a point: a light, or a pet close by.
  const helped = (point: Point, margin = 4) =>
    others.some((beam) => inBeam(beam, point, margin)) ||
    (state.levels.dog > 0 && Math.abs(point.x - noseX) <= GEO.dog.reach && point.y >= GEO.dog.low) ||
    (state.levels.cat > 0 && Math.abs(point.x - cat.x) <= GEO.pets.cat.reach + 6 * state.levels.cat && point.y >= GEO.pets.cat.low);
  const pay = (who: "torch" | "other", glints: number) => {
    gained += (who === "torch" ? value : otherValue) * glints;
  };
  // While the torch is in use it pays the torch's rate. Left alone, everything pays the lower rate.
  const mine = attentive ? ("torch" as const) : ("other" as const);

  // ── Glints ──
  // A light has to rest on a glint to find it. While the player is using the torch, every other light only gives
  // glints a head start and leaves the finding to the torch. Once nobody is playing, any light finds them.
  const myDwell = torchDwell(state);
  let glints = world.glints.map((glint): Glint => {
    // A glint that has slid out of sight behind is gone, and another turns up ahead.
    if (glint.x < seen.left - 30) return { ...ahead(), state: "on", timer: 0, charge: 0 };
    if (glint.state === "on") {
      const lit = inBeam(torch, glint);
      const assisted = !lit && helped(glint);
      let charge = glint.charge;
      if (lit) charge += seconds / (attentive ? myDwell : TUNING.otherDwell);
      else if (assisted) charge = attentive ? Math.max(charge, Math.min(TUNING.headStart, charge + seconds / TUNING.otherDwell)) : charge + seconds / TUNING.otherDwell;
      else charge = Math.max(0, charge - seconds / TUNING.dwellFade);
      if (charge < 1) return charge === glint.charge ? glint : { ...glint, charge };
      pay(lit ? mine : "other", 1);
      return { ...glint, state: "pop", timer: TUNING.popSeconds, charge: 0 };
    }
    const timer = glint.timer - seconds;
    if (timer > 0) return { ...glint, timer };
    if (glint.state === "pop") return { ...glint, state: "off", timer: between(TUNING.respawn, random) };
    return { ...ahead(), state: "on", timer: 0, charge: 0 };
  });

  // ── Stashes: the searcher's torch rummages them, and so does the detective's light ──
  const stashes: World["stashes"] = {};
  for (const stash of stashesInView(camX)) {
    const was = world.stashes[stash.key] ?? { readyAt: 0, charge: 0 };
    if (time < was.readyAt) {
      stashes[stash.key] = was;
      continue;
    }
    const lit = inBeam(torch, stash, 8);
    const theirs = !lit && crew.detective !== undefined && inBeam(crew.detective, stash, 8);
    const charge = Math.max(0, was.charge + (lit || theirs ? seconds / TUNING.stashDwell : -seconds / TUNING.dwellFade));
    if (charge >= 1) {
      pay(lit ? mine : "other", TUNING.stashGlints);
      events.push({ type: "burst", x: stash.x, y: stash.y });
      stashes[stash.key] = { readyAt: time + TUNING.stashCooldown, charge: 0 };
    } else if (charge > 0) stashes[stash.key] = { readyAt: 0, charge };
  }

  // ── The mouse runs across what the device shows. The torch catches it, and the dog runs it down. ──
  let mouse = world.mouse;
  if (mouse.active) {
    const x = mouse.x + mouse.dir * TUNING.mouseSpeed * seconds;
    const spot = { x, y: GEO.mouseY };
    const dogGotIt = state.levels.dog > 0 && Math.abs(noseX - x) <= 20;
    if (dogGotIt || inBeam(torch, spot, 8)) {
      pay(dogGotIt ? "other" : mine, TUNING.mouseGlints);
      events.push({ type: "burst", ...spot }, { type: "notice", text: dogGotIt ? "The dog caught the mouse" : "Caught the mouse" });
      mouse = { ...mouse, active: false, x: -1e6, nextAt: time + between(TUNING.mouseEvery, random) };
    } else if (x < seen.left - 30 || x > seen.right + 30) mouse = { ...mouse, active: false, x: -1e6, nextAt: time + between(TUNING.mouseEvery, random) };
    else mouse = { ...mouse, x };
  } else if (time >= mouse.nextAt) {
    const dir = random() < 0.5 ? 1 : -1;
    mouse = { active: true, dir, x: dir === 1 ? seen.left - 10 : seen.right + 10, nextAt: 0 };
  }

  // ── Events ──
  let { nextEventAt, flashFrom } = world;
  let moth = world.moth;
  let phone = world.phone;
  let sheets = world.sheets;
  const busy = moth.active || phone.active || sheets.some((s) => s.active);
  if (!busy && time >= nextEventAt) {
    nextEventAt = time + between(TUNING.eventEvery, random);
    // Some events need a thing to be on screen: the office cat's box, or a desk phone. "The page" is rare.
    const phones = GEO.phones as Record<string, number[]>;
    const office = segmentsInView(camX, 0).map((k) => (designOf(k) === GEO.cat.design ? k * GEO.segment : null)).find((x) => x !== null && inSight(x + GEO.cat.left) && inSight(x + GEO.cat.right)) ?? null;
    const ringing = segmentsInView(camX, 0).flatMap((k) => (phones[String(designOf(k))] ? [{ x: k * GEO.segment + phones[String(designOf(k))][0], y: phones[String(designOf(k))][1] }] : [])).find((at) => inSight(at.x, 50)) ?? null;
    const options = ["lightning", "moth", "draught", ...(office !== null ? ["crash"] : []), ...(ringing ? ["phone"] : [])];
    const event = random() < 0.08 ? "page" : options[Math.floor(random() * options.length)];
    if (event === "lightning") {
      // Lightning lights everything on screen for an instant, and every glint there is found.
      flashFrom = time;
      glints = glints.map((g) => {
        if (g.state !== "on" || !inSight(g.x)) return g;
        pay(mine, 1);
        return { ...g, state: "pop", timer: TUNING.popSeconds, charge: 0 };
      });
      events.push({ type: "notice", text: "Lightning" });
    } else if (event === "crash" && office !== null) {
      // The office cat knocks something off its box, and a pile of glints spills out beside it. The spill uses
      // glints that are waiting to come back or are off screen, so none on screen vanish.
      const spare = glints.flatMap((g, i) => (g.state === "off" || (g.state === "on" && !inSight(g.x)) ? [i] : [])).slice(0, TUNING.crashGlints);
      glints = glints.map((g, i) => (spare.includes(i) ? { x: office + GEO.cat.left + 10 + random() * (GEO.cat.right - GEO.cat.left - 20), y: 190 + random() * 100, state: "on", timer: 0, charge: 0 } : g));
      events.push({ type: "burst", x: office + GEO.cat.x, y: GEO.cat.y + 30 }, { type: "notice", text: "The cat knocked something over" });
    } else if (event === "moth") {
      moth = { active: true, x: seen.right - 30, y: 40, held: 0, leaveAt: time + TUNING.mothSeconds };
      events.push({ type: "notice", text: "A moth" });
    } else if (event === "phone" && ringing) {
      phone = { active: true, until: time + TUNING.phoneSeconds, charge: 0, ...ringing };
      events.push({ type: "notice", text: "The phone is ringing" });
    } else if (event === "draught") {
      sheets = sheets.map((_, i) => ({ active: true, x: seen.right + 10 + i * 26, baseY: 90 + random() * 180, speed: 70 + random() * 50, phase: random() * 6, big: false }));
      events.push({ type: "notice", text: "A draught" });
    } else {
      sheets = sheets.map((s, i) => (i === 0 ? { active: true, x: seen.right + 20, baseY: 110, speed: 55, phase: random() * 6, big: true } : s));
      events.push({ type: "notice", text: "The page!" });
    }
  }

  // The moth flies to the far end of the searcher's beam and flutters there. Holding the beam on it catches it,
  // and a torch nobody is pointing still does, given longer.
  if (moth.active) {
    const angle = torch.angle * (Math.PI / 180);
    const lure = { x: torch.x + Math.cos(angle) * torch.length * 0.7 + 18 * Math.sin(time * 3.1), y: torch.y + Math.sin(angle) * torch.length * 0.7 + 14 * Math.sin(time * 4.3) };
    const x = glide(moth.x, lure.x, 110, 2.2, 10, seconds);
    const y = glide(moth.y, Math.max(14, Math.min(GEO.floor - 20, lure.y)), 110, 2.2, 10, seconds);
    const held = inBeam(torch, { x, y }, 6) ? moth.held + seconds : Math.max(0, moth.held - seconds * 0.5);
    if (held >= (attentive ? TUNING.mothHold : TUNING.mothIdleHold)) {
      pay(mine, TUNING.mothGlints);
      events.push({ type: "burst", x, y }, { type: "notice", text: "Caught the moth" });
      moth = { ...moth, active: false, x: -1e6 };
    } else if (time >= moth.leaveAt) moth = { ...moth, active: false, x: -1e6 };
    else moth = { ...moth, x, y, held };
  }

  // The phone: only the searcher's torch answers it, before it stops ringing or slides out of sight.
  if (phone.active) {
    const charge = inBeam(torch, phone, 10) ? phone.charge + seconds / 0.35 : phone.charge;
    if (charge >= 1) {
      pay(mine, TUNING.phoneGlints);
      events.push({ type: "burst", x: phone.x, y: phone.y }, { type: "notice", text: "Wrong number" });
      phone = { ...phone, active: false };
    } else if (time >= phone.until || phone.x < seen.left) phone = { ...phone, active: false };
    else phone = { ...phone, charge };
  }

  // Loose sheets blow right to left. Any light catches a small one. Only the searcher's torch catches "the page".
  if (sheets.some((s) => s.active)) {
    sheets = sheets.map((sheet) => {
      if (!sheet.active) return sheet;
      const moved = { ...sheet, x: sheet.x - sheet.speed * seconds };
      const spot = { x: moved.x, y: sheetY(moved, time) };
      const lit = inBeam(torch, spot, sheet.big ? 12 : 8);
      if (lit || (!sheet.big && inSight(spot.x) && helped(spot, 8))) {
        pay(lit ? mine : "other", sheet.big ? TUNING.pageGlints : TUNING.sheetGlints);
        events.push({ type: "burst", ...spot });
        if (sheet.big) events.push({ type: "notice", text: NOT_THE_PAGE[Math.floor(random() * NOT_THE_PAGE.length)] });
        return idleSheet();
      }
      return moved.x < seen.left - 30 ? idleSheet() : moved;
    });
  }

  return { world: { time, camX, seen: world.seen, hero, followers, glints, stashes, mouse, findX: world.findX, nextEventAt, flashFrom, moth, phone, sheets }, gained, events };
}
