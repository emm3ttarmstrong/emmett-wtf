// Rigs the imported scene inside Rive: pivots, view model binds, timelines and the state machine.
// Run against an open Rive Early Access file that already has the "Game" view model:
//   node rig.mjs import pivots model binds timelines machine names export
import { readFileSync } from "node:fs";
import { cmd, exportRiv, tool, uploadSvg } from "./rive-client.mjs";

const GEO = JSON.parse(readFileSync(new URL("../geometry.json", import.meta.url), "utf8"));

export const K = { x: 13, y: 14, r: 15, sx: 16, sy: 17, opacity: 18, parent: 5 };
export const VM = "Game";

export async function idOf(name, type = "Node") {
  const found = (await tool("find_objects", { name })).objects.filter((o) => o.name === name && (!type || o.type === type));
  if (found.length !== 1) throw new Error(`expected one "${name}", found ${found.length}`);
  return found[0].id;
}

export async function values(id, keys) {
  const v = (await tool("query_property_values", { propertyKeys: { [id]: keys } })).values?.[id] ?? {};
  return Object.fromEntries(keys.map((k) => [k, v[String(k)]]));
}

export const set = (propertyValues) => tool("set_property_values", { propertyValues });

async function childrenOf(id) {
  const objects = (await tool("query_objects", { objectIds: [id], depth: 1 })).objects;
  return objects.find((o) => o.id === id).children ?? [];
}

// A 2D transform as [a, b, c, d, tx, ty]. Rive's own computed world values are only filled in once the editor has
// drawn a frame, which it may not have done while in the background, so world positions are worked out here instead.
const IDENTITY = [1, 0, 0, 1, 0, 0];
const multiply = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const local = (v) => {
  const r = (v[K.r] * Math.PI) / 180;
  const sx = v[K.sx] / 100;
  const sy = v[K.sy] / 100;
  return [Math.cos(r) * sx, Math.sin(r) * sx, -Math.sin(r) * sy, Math.cos(r) * sy, v[K.x], v[K.y]];
};
// Turns a distance in world space into the space a transform maps from.
const unmap = (m, dx, dy) => {
  const det = m[0] * m[3] - m[1] * m[2];
  return [(m[3] * dx - m[2] * dy) / det, (-m[1] * dx + m[0] * dy) / det];
};

async function transformOf(id) {
  const v = await values(id, [K.x, K.y, K.r, K.sx, K.sy, K.parent]);
  return typeof v[K.x] === "number" && typeof v[K.sx] === "number" ? { matrix: local(v), parent: v[K.parent], v } : null;
}

// The transform from a node's parent space to the artboard.
async function parentWorld(parent) {
  const chain = [];
  for (let t = parent && (await transformOf(parent)); t; t = t.parent && (await transformOf(t.parent))) chain.push(t.matrix);
  return chain.reduceRight((m, n) => multiply(m, n), IDENTITY);
}

// Rive puts an imported group's origin at the centre of its bounding box. This moves the origin to a point on the
// artboard and shifts the children back by the same amount, so nothing moves on screen but rotation and scale pivot there.
export async function repivot(name, worldX, worldY, type = null) {
  const id = await idOf(name, type);
  const node = await transformOf(id);
  const outer = await parentWorld(node.parent);
  const world = multiply(outer, node.matrix);
  const [dx, dy] = unmap(outer, worldX - world[4], worldY - world[5]);
  const [cx, cy] = unmap(world, worldX - world[4], worldY - world[5]);
  const update = { [id]: { [K.x]: node.v[K.x] + dx, [K.y]: node.v[K.y] + dy } };
  for (const child of await childrenOf(id)) {
    const c = await values(child, [K.x, K.y]);
    if (typeof c[K.x] !== "number") continue;
    update[child] = { [K.x]: c[K.x] - cx, [K.y]: c[K.y] - cy };
  }
  await set(update);
  return { name, id, moved: [Number(dx.toFixed(2)), Number(dy.toFixed(2))], children: Object.keys(update).length - 1 };
}

const HERO = GEO.hero;
// The artboard is one view of the walk, and the searcher stands at a fixed place in it.
const HERO_X = HERO.screenX;
const HAND = { x: HERO_X + HERO.handX, y: HERO.handY };
const SEG = GEO.segment;
const DESIGNS = Array.from({ length: GEO.designs }, (_, d) => d);
const WINDOWS = Object.keys(GEO.windows).map(Number);
// Where the art generator first places each of the eight places: three abreast.
const segmentX = (d) => (d % 3) * SEG;
export const FINDS = ["sock", "semicolon", "remote", "keys", "socket", "plot", "atlantis", "note"];
// Where the art generator places each helper. `crawler` is the robot.
const HELPER_X = { satellite: 700, detective: 200, intern: 420, crawler: 800, dog: 300, cat: 360 };
const BEAMED = ["intern", "crawler", "detective", "satellite"];
const HELPERS = ["satellite", "detective", "intern", "crawler", "dog", "cat"];
// The followers on the ground, which turn to face the way they walk and step as they go.
const WALKERS = ["intern", "crawler", "detective", "dog", "cat"];
// Where each leg hangs from, in the follower's own artwork units.
const HIPS = {
  intern: [[-11.5, -30], [12.5, -30]],
  detective: [[-13, -30], [15, -30]],
  dog: [[-25, -20], [21, -20], [-37, -22], [9, -22]],
  cat: [[-18.5, -16], [15.5, -16], [-26.5, -16], [7.5, -16]],
};
const placeOf = (n) => (n === "dog" ? GEO.dog : n === "cat" ? GEO.pets.cat : GEO.beams[n]);
// A find appears beside the searcher, so every find and its sparkles share one bound position.
const FIND_START = { x: HERO_X + 60, y: GEO.floor };
const helperY = (n) => placeOf(n).y;

const P = (name, propertyType) => ({ name, propertyType });
// Every view model property the game drives. Numbers unless noted.
const PROPERTIES = [
  P("heroX", "number"), P("facing", "number"), P("beamX", "number"), P("beamAngle", "number"), P("beamWide", "number"), P("walking", "boolean"),
  P("burst", "trigger"), P("burstX", "number"), P("burstY", "number"), P("mouseX", "number"), P("mouseDir", "number"), P("dogX", "number"), P("dogDir", "number"),
  P("internX", "number"), P("internBeamX", "number"), P("internAim", "number"), P("crawlerX", "number"), P("crawlerBeamX", "number"), P("crawlerAim", "number"),
  P("detectiveX", "number"), P("detectiveBeamX", "number"), P("detectiveAim", "number"), P("satelliteX", "number"), P("satelliteBeamX", "number"), P("satelliteAim", "number"),
  // Each glint has a position, a size, and a glow that grows while a light is finding it.
  ...Array.from({ length: GEO.glints }, (_, i) => [P(`g${i}x`, "number"), P(`g${i}y`, "number"), P(`g${i}s`, "number"), P(`g${i}c`, "number")]).flat(),
  // Stash markers are pooled: the game moves each to a stash that is in view.
  ...Array.from({ length: GEO.stashPool }, (_, i) => [P(`stash${i}x`, "number"), P(`stash${i}y`, "number"), P(`stash${i}`, "number"), P(`stash${i}c`, "number")]).flat(),
  // Where each of the eight places is on screen, and the two layers that move at their own speeds.
  ...DESIGNS.map((d) => P(`seg${d}x`, "number")), P("skyAx", "number"), P("skyBx", "number"), P("foreAx", "number"), P("foreBx", "number"),
  P("findX", "number"),
  // The torch's reach and brightness.
  P("beamLong", "number"), P("beamBright", "number"),
  // The ceiling bulbs, and lightning.
  ...Array.from({ length: GEO.lights.bulb.pool }, (_, i) => [P(`bulb${i}`, "number"), P(`bulb${i}x`, "number")]).flat(), P("flashX", "number"),
  // The pet cat, and which way each follower faces and whether it is walking.
  P("cat", "boolean"), P("catX", "number"),
  ...WALKERS.flatMap((n) => [P(`${n}Dir`, "number"), P(`${n}Walking`, "boolean")]),
  // How big each helper's light has grown.
  ...BEAMED.map((n) => P(`${n}Size`, "number")),
  P("mothX", "number"), P("mothY", "number"), P("alertX", "number"), P("alertY", "number"), P("alertS", "number"),
  ...Array.from({ length: GEO.pages }, (_, i) => [P(`p${i}x`, "number"), P(`p${i}y`, "number"), P(`p${i}s`, "number")]).flat(),
];

async function model() {
  return (await cmd("viewmodel_editor", "listViewModels")).viewModels.find((m) => m.name === VM);
}

const stages = {
  // Replaces every artboard with a fresh Scene and places the generated SVG on it.
  async import() {
    for (const board of (await tool("list_artboards")).artboards) await tool("delete_objects", { objectIds: [board.id] });
    await cmd("open_file_editor", "createArtboard", [{ name: "Scene", width: GEO.width, height: GEO.height }]);
    const artboard = (await tool("list_artboards")).artboards.find((a) => a.name === "Scene").id;
    const asset = await uploadSvg(new URL("./svg/rive-scene.svg", import.meta.url).pathname, "scene");
    return cmd("assets_tool", "addSvgInstance", { assetId: asset.id, parentId: artboard, name: "scene", x: 0, y: 0 });
  },

  async pivots() {
    const done = [];
    const at = async (name, x, y) => done.push(await repivot(name, x, y));
    // A bound x is measured from the parent's origin, and Rive puts a group's origin at the middle of its contents.
    // The containers that hold sliding things are moved to the artboard's corner, so a bound x is a place on screen.
    for (const name of ["room-dark", "room-lit", "sky"]) await at(name, 0, 0);
    for (const name of ["beam", "glass"]) done.push(await repivot(name, 0, 0, "Shape"));
    for (const name of ["hero", "hero-flip", "hero-body"]) await at(name, HERO_X, GEO.floor);
    await at("torch", HAND.x, HAND.y);
    await at("beam-main", HAND.x, HAND.y);
    // The haze has to stretch from the torch, not from its own middle.
    await at("haze", HAND.x, HAND.y);
    await at("leg-l", HERO_X - 14.5 * HERO.scale, GEO.floor - 32 * HERO.scale);
    await at("leg-r", HERO_X + 15.5 * HERO.scale, GEO.floor - 32 * HERO.scale);
    await at("blink", HERO_X + 14.5 * HERO.scale, GEO.floor - 143 * HERO.scale);
    await at("sparkles", FIND_START.x, FIND_START.y - 24);
    for (const name of FINDS) await at(`find-${name}`, FIND_START.x, FIND_START.y);
    for (const name of HELPERS) await at(`helper-${name}`, HELPER_X[name], helperY(name));
    for (const name of HELPERS) for (const part of ["flip", "bob"]) await at(`${name}-${part}`, HELPER_X[name], helperY(name));
    for (const [name, hips] of Object.entries(HIPS)) {
      const scale = placeOf(name).scale;
      for (const [i, [x, y]] of hips.entries()) await at(`${name}-leg-${i}`, HELPER_X[name] + x * scale, helperY(name) + y * scale);
    }
    for (const name of BEAMED) {
      const b = GEO.beams[name];
      await at(`beam-${name}`, HELPER_X[name] + b.dx, b.oy);
      await at(`haze-${name}`, HELPER_X[name] + b.dx, b.oy);
    }
    // Each place pivots at its left edge, so its bound x is where that edge is on screen.
    for (const d of DESIGNS) for (const layer of ["dark", "lit", "top"]) await at(`seg-${d}-${layer}`, segmentX(d), 0);
    for (const d of WINDOWS) await at(`glass-${d}`, segmentX(d), 0);
    await at("sky-a", 0, 0);
    await at("sky-b", GEO.sky.period, 0);
    await at("fore-a", 0, 0);
    await at("fore-b", GEO.fore.period, 0);
    const L = GEO.lights;
    for (let i = 0; i < L.bulb.pool; i++) for (const part of ["beam", "haze"]) await at(`${part}-bulb-${i}`, L.bulb.x, L.bulb.y);
    await at("beam-flash", -5000, 0);
    for (const name of ["moth", "moth-wings"]) await at(name, HERO_X + 120, 120);
    await at("alert", SEG + GEO.phones[1][0], GEO.phones[1][1] - 16);
    for (let i = 0; i < GEO.pages; i++) await at(`page-${i}`, 900 - i * 22, 296);
    await at("mouse", -40, GEO.mouseY);
    await at("burst", HERO_X, 200);
    return done.map((d) => `${d.name} ${d.moved}`);
  },

  async model() {
    const m = await model();
    const have = new Set(m.viewModelProperties.map((p) => p.name));
    const missing = PROPERTIES.filter((p) => !have.has(p.name));
    if (missing.length) await cmd("viewmodel_editor", "addProperties", { viewModels: [{ viewModelId: m.id, viewModelProperties: missing }] });
    const artboard = (await tool("list_artboards")).artboards.find((a) => a.name === "Scene").id;
    await cmd("viewmodel_editor", "bindViewModelToArtboard", { artboardId: artboard, viewModelId: m.id });
    return { added: missing.length };
  },

  async binds() {
    const m = await model();
    const prop = (name) => m.viewModelProperties.find((p) => p.name === name).id;
    const bindings = [];
    const bind = async (object, key, name, type = "Node") => bindings.push({ objectId: await idOf(object, type), propertyKey: key, viewModelPropertyId: prop(name) });
    await bind("hero", K.x, "heroX");
    await bind("hero-flip", K.sx, "facing");
    await bind("torch", K.r, "aim");
    await bind("haze", K.sy, "beamWide", "Shape");
    await bind("beam-main", K.x, "beamX");
    await bind("beam-main", K.r, "beamAngle");
    await bind("beam-main", K.sy, "beamWide");
    await bind("beam-main", K.sx, "beamLong");
    await bind("haze", K.sx, "beamLong", "Shape");
    await bind("haze", K.opacity, "beamBright", "Shape");
    const both = async (object, name) => {
      await bind(object, K.sx, name);
      await bind(object, K.sy, name);
    };
    for (let i = 0; i < GEO.lights.bulb.pool; i++) {
      for (const part of ["beam", "haze"]) {
        await both(`${part}-bulb-${i}`, `bulb${i}`);
        await bind(`${part}-bulb-${i}`, K.x, `bulb${i}x`);
      }
    }
    for (const d of DESIGNS) for (const layer of ["dark", "lit", "top"]) await bind(`seg-${d}-${layer}`, K.x, `seg${d}x`);
    for (const d of WINDOWS) await bind(`glass-${d}`, K.x, `seg${d}x`);
    await bind("sky-a", K.x, "skyAx");
    await bind("sky-b", K.x, "skyBx");
    await bind("fore-a", K.x, "foreAx");
    await bind("fore-b", K.x, "foreBx");
    await bind("beam-flash", K.x, "flashX");
    for (const name of BEAMED) for (const part of ["beam", "haze"]) await both(`${part}-${name}`, `${name}Size`);
    await bind("moth", K.x, "mothX");
    await bind("moth", K.y, "mothY");
    await bind("alert", K.x, "alertX");
    await bind("alert", K.y, "alertY");
    await both("alert", "alertS");
    for (let i = 0; i < GEO.pages; i++) {
      await bind(`page-${i}`, K.x, `p${i}x`);
      await bind(`page-${i}`, K.y, `p${i}y`);
      await both(`page-${i}`, `p${i}s`);
    }
    for (const name of BEAMED) {
      for (const part of ["beam", "haze"]) {
        await bind(`${part}-${name}`, K.x, `${name}BeamX`);
        await bind(`${part}-${name}`, K.r, `${name}Aim`);
      }
      await bind(`helper-${name}`, K.x, `${name}X`);
    }
    await bind("helper-dog", K.x, "dogX");
    await bind("helper-cat", K.x, "catX");
    for (const name of WALKERS) await bind(`${name}-flip`, K.sx, `${name}Dir`);
    for (let i = 0; i < GEO.glints; i++) {
      await bind(`glint-${i}`, K.x, `g${i}x`);
      await bind(`glint-${i}`, K.y, `g${i}y`);
      await bind(`glint-${i}`, K.sx, `g${i}s`);
      await bind(`glint-${i}`, K.sy, `g${i}s`);
      await bind(`glow-${i}`, K.sx, `g${i}c`);
      await bind(`glow-${i}`, K.sy, `g${i}c`);
    }
    for (let i = 0; i < GEO.stashPool; i++) {
      await bind(`stash-${i}`, K.x, `stash${i}x`);
      await bind(`stash-${i}`, K.y, `stash${i}y`);
      await bind(`stash-${i}`, K.sx, `stash${i}`);
      await bind(`stash-${i}`, K.sy, `stash${i}`);
      await bind(`stash-glow-${i}`, K.sx, `stash${i}c`);
      await bind(`stash-glow-${i}`, K.sy, `stash${i}c`);
    }
    for (const name of [...FINDS.map((n) => `find-${n}`), "sparkles"]) await bind(name, K.x, "findX");
    await bind("burst", K.x, "burstX");
    await bind("burst", K.y, "burstY");
    await bind("mouse", K.x, "mouseX");
    await bind("mouse", K.sx, "mouseDir");
    for (let i = 0; i < bindings.length; i += 30) await cmd("viewmodel_editor", "databind", { viewModelId: m.id, bindings: bindings.slice(i, i + 30) });
    return { bound: bindings.length };
  },
};

// ───────────────────────── Timelines ─────────────────────────
const A = { fps: 56, frames: 57, loop: 59 };
const SMOOTH = { x1: 0.4, y1: 0, x2: 0.6, y2: 1 };
const OUT = { x1: 0.16, y1: 1, x2: 0.3, y2: 1 };

async function animationId(name) {
  const all = (await cmd("animation_editor", "listLinearAnimations")).linearAnimations;
  return all.find((a) => a.name === name)?.id;
}

// Creates (or reuses) a timeline, sets its length and looping, and adds keys.
// A key is [objectId, propertyKey, frame, value, curve?] where curve is "hold", "linear", SMOOTH or OUT.
async function timeline(name, frames, loop, keys) {
  let id = await animationId(name);
  if (!id) {
    await cmd("animation_editor", "createLinearAnimations", { linearAnimations: [{ name, duration: frames / 60 }] });
    id = await animationId(name);
  }
  await set({ [id]: { [A.fps]: 60, [A.frames]: frames, [A.loop]: loop ? 1 : 0 } });
  const add = keys.map(([objectId, propertyKey, frame, value, curve = SMOOTH]) => ({
    objectId, propertyKey, frame, value,
    ...(typeof curve === "string" ? { interpolationType: curve } : { interpolationType: "cubic", cubicParams: curve }),
  }));
  for (let i = 0; i < add.length; i += 40) await cmd("animation_editor", "modifyKeyFrames", { animationId: id, add: add.slice(i, i + 40) });
  return `${name} ${add.length}`;
}

stages.timelines = async () => {
  const id = {};
  const nodes = ["moth-wings", "hero", "hero-body", "leg-l", "leg-r", "blink", "face-smile", "face-wow", "face-happy", "sparkles", "cat-eyes", "motes", "mouse-eyes", "beam-main", "burst",
    ...FINDS.map((n) => `find-${n}`), ...HELPERS.map((n) => `helper-${n}`), ...BEAMED.map((n) => `haze-${n}`)];
  for (const n of nodes) id[n] = await idOf(n);
  const base = async (n, key) => (await values(id[n], [key]))[key];
  const heroY = await base("hero", K.y);
  const beamY = await base("beam-main", K.y);
  const bodyY = await base("hero-body", K.y);
  const motesY = await base("motes", K.y);
  const done = [];

  if (!(await animationId("ambient"))) await cmd("animation_editor", "renameAnimations", { animations: [{ animationId: await animationId("Timeline 1"), name: "ambient" }] });
  done.push(await timeline("ambient", 240, true, [
    [id.blink, K.sy, 0, 100, "hold"], [id.blink, K.sy, 150, 100, "linear"], [id.blink, K.sy, 155, 8, "linear"], [id.blink, K.sy, 160, 100, "hold"],
    [id["hero-body"], K.sy, 0, 100], [id["hero-body"], K.sy, 120, 101.6], [id["hero-body"], K.sy, 240, 100],
    [id["cat-eyes"], K.sy, 0, 100, "hold"], [id["cat-eyes"], K.sy, 58, 100, "linear"], [id["cat-eyes"], K.sy, 63, 10, "linear"], [id["cat-eyes"], K.sy, 68, 100, "hold"],
    [id.motes, K.y, 0, motesY], [id.motes, K.y, 120, motesY - 6], [id.motes, K.y, 240, motesY],
    [id["mouse-eyes"], K.opacity, 0, 100, "hold"], [id["mouse-eyes"], K.opacity, 200, 0, "hold"], [id["mouse-eyes"], K.opacity, 208, 100, "hold"],
  ]));

  // The beam's clip shape lives outside the hero, so every hop is keyed on both to keep the light on the torch.
  const faces = (smile, wow, happy) => [[id["face-smile"], K.opacity, 0, smile, "hold"], [id["face-wow"], K.opacity, 0, wow, "hold"], [id["face-happy"], K.opacity, 0, happy, "hold"]];
  const hop = (...steps) => steps.flatMap(([frame, lift, curve]) => [[id.hero, K.y, frame, heroY - lift, curve], [id["beam-main"], K.y, frame, beamY - lift, curve]]);
  done.push(await timeline("face-smile", 1, false, [...faces(100, 0, 0), ...hop([0, 0, "hold"])]));
  done.push(await timeline("face-wow", 36, false, [...faces(0, 100, 0), ...hop([0, 0, OUT], [8, 10, SMOOTH], [18, 0, "hold"])]));
  done.push(await timeline("face-happy", 90, false, [...faces(0, 0, 100), ...hop([0, 0, OUT], [9, 6, SMOOTH], [18, 0, OUT], [27, 6, SMOOTH], [36, 0, "hold"])]));

  done.push(await timeline("tap-rest", 1, false, [[id["hero-body"], K.sx, 0, 100, "hold"]]));
  done.push(await timeline("tap-squash", 14, false, [[id["hero-body"], K.sx, 0, 100, OUT], [id["hero-body"], K.sx, 4, 106, OUT], [id["hero-body"], K.sx, 14, 100, "hold"]]));

  done.push(await timeline("walk-rest", 1, false, [[id["leg-l"], K.r, 0, 0, "hold"], [id["leg-r"], K.r, 0, 0, "hold"], [id["hero-body"], K.y, 0, bodyY, "hold"]]));
  done.push(await timeline("walk", 24, true, [
    [id["leg-l"], K.r, 0, 24], [id["leg-l"], K.r, 12, -24], [id["leg-l"], K.r, 24, 24],
    [id["leg-r"], K.r, 0, -24], [id["leg-r"], K.r, 12, 24], [id["leg-r"], K.r, 24, -24],
    [id["hero-body"], K.y, 0, bodyY], [id["hero-body"], K.y, 6, bodyY - 2.5], [id["hero-body"], K.y, 12, bodyY], [id["hero-body"], K.y, 18, bodyY - 2.5], [id["hero-body"], K.y, 24, bodyY],
  ]));

  for (let i = 0; i <= FINDS.length; i++) {
    const keys = FINDS.map((n, j) => [id[`find-${n}`], K.opacity, 0, j + 1 === i ? 100 : 0, "hold"]);
    if (i === 0) keys.push([id.sparkles, K.opacity, 0, 0, "hold"]);
    else {
      const own = id[`find-${FINDS[i - 1]}`];
      for (const key of [K.sx, K.sy]) keys.push([own, key, 0, 0, OUT], [own, key, 10, 116, SMOOTH], [own, key, 18, 100, "hold"]);
      keys.push([id.sparkles, K.opacity, 0, 0, "linear"], [id.sparkles, K.opacity, 8, 100, "hold"]);
      for (const key of [K.sx, K.sy]) keys.push([id.sparkles, key, 0, 0, OUT], [id.sparkles, key, 16, 100, "hold"]);
    }
    done.push(await timeline(`find-${i}`, 30, false, keys));
  }

  for (const n of HELPERS) {
    const h = id[`helper-${n}`];
    const haze = id[`haze-${n}`];
    done.push(await timeline(`${n}-hidden`, 1, false, [[h, K.opacity, 0, 0, "hold"], ...(haze ? [[haze, K.opacity, 0, 0, "hold"]] : [])]));
    done.push(await timeline(`${n}-in`, 24, false, [
      [h, K.opacity, 0, 0, "linear"], [h, K.opacity, 8, 100, "hold"],
      [h, K.sx, 0, 60, OUT], [h, K.sx, 12, 108, SMOOTH], [h, K.sx, 20, 100, "hold"],
      [h, K.sy, 0, 60, OUT], [h, K.sy, 12, 108, SMOOTH], [h, K.sy, 20, 100, "hold"],
      ...(haze ? [[haze, K.opacity, 0, 0, "linear"], [haze, K.opacity, 20, 100, "hold"]] : []),
    ]));
  }

  done.push(await timeline("flap", 10, true, [[id["moth-wings"], K.sx, 0, 100], [id["moth-wings"], K.sx, 5, 35], [id["moth-wings"], K.sx, 10, 100]]));

  for (const name of WALKERS) {
    const bob = await idOf(`${name}-bob`);
    const bobY = (await values(bob, [K.y]))[K.y];
    const legs = [];
    for (let i = 0; i < (HIPS[name]?.length ?? 0); i++) legs.push(await idOf(`${name}-leg-${i}`));
    // The robot has no legs to swing, so it scuttles: a quicker, smaller bob.
    const frames = name === "crawler" ? 10 : name === "intern" || name === "detective" ? 24 : 16;
    const lift = name === "crawler" ? 1 : 1.6;
    const half = frames / 2;
    done.push(await timeline(`${name}-still`, 1, false, [[bob, K.y, 0, bobY, "hold"], ...legs.map((leg) => [leg, K.r, 0, 0, "hold"])]));
    done.push(await timeline(`${name}-walk`, frames, true, [
      [bob, K.y, 0, bobY], [bob, K.y, half / 2, bobY - lift], [bob, K.y, half, bobY], [bob, K.y, half + half / 2, bobY - lift], [bob, K.y, frames, bobY],
      // Legs swing in opposite pairs: 0 and 3 one way, 1 and 2 the other.
      ...legs.flatMap((leg, i) => {
        const swing = (i === 0 || i === 3 ? 1 : -1) * 22;
        return [[leg, K.r, 0, swing], [leg, K.r, half, -swing], [leg, K.r, frames, swing]];
      }),
    ]));
  }

  done.push(await timeline("burst-rest", 1, false, [[id.burst, K.opacity, 0, 0, "hold"]]));
  done.push(await timeline("burst-go", 26, false, [
    [id.burst, K.opacity, 0, 100, "linear"], [id.burst, K.opacity, 10, 100, "linear"], [id.burst, K.opacity, 24, 0, "hold"],
    [id.burst, K.sx, 0, 30, OUT], [id.burst, K.sx, 24, 140, "hold"], [id.burst, K.sy, 0, 30, OUT], [id.burst, K.sy, 24, 140, "hold"],
  ]));

  return done;
};

// ───────────────────────── State machine ─────────────────────────
const T = { flags: 152, duration: 158, exitTime: 160 };
const EXIT_AT_END = 4 | 8; // enableExitTime | exitTimeIsPercentage
const ENTRY = "{Entry State}";
const ANY = "{Any State}";

stages.machine = async () => {
  const m = await model();
  const prop = (name) => m.viewModelProperties.find((p) => p.name === name).id;
  const machine = (await cmd("animation_editor", "queryStateMachine")).stateMachineId;

  const state = (name) => ({ name, linearAnimationName: name });
  const oneShot = (name, rest, go) => ({ name, states: [state(rest), state(go)], otherTransitions: [[ENTRY, rest], [ANY, go], [go, rest]] });
  const toggle = (name, off, on) => ({ name, states: [state(off), state(on)], otherTransitions: [[ENTRY, off], [off, on], [on, off]] });
  const layers = [
    { name: "Mood", states: ["face-smile", "face-wow", "face-happy"].map(state), otherTransitions: [[ENTRY, "face-smile"], ["face-smile", "face-wow"], ["face-wow", "face-happy"], ["face-happy", "face-smile"]] },
    oneShot("Tap", "tap-rest", "tap-squash"),
    toggle("Walk", "walk-rest", "walk"),
    { name: "Find", states: Array.from({ length: FINDS.length + 1 }, (_, i) => state(`find-${i}`)), otherTransitions: [[ENTRY, "find-0"], ...Array.from({ length: FINDS.length + 1 }, (_, i) => [ANY, `find-${i}`])] },
    ...HELPERS.map((n) => toggle(n, `${n}-hidden`, `${n}-in`)),
    ...WALKERS.map((n) => toggle(`${n} steps`, `${n}-still`, `${n}-walk`)),
    oneShot("Burst", "burst-rest", "burst-go"),
    { name: "Flap", states: [state("flap")], otherTransitions: [[ENTRY, "flap"]] },
  ].map((l) => ({ ...l, otherTransitions: l.otherTransitions.map(([from, to]) => ({ from, to })) }));
  await cmd("animation_editor", "createStateMachineLayers", { stateMachineId: machine, layers });

  // Read the machine back to find each transition by the names of the states it joins.
  const built = await cmd("animation_editor", "queryStateMachine", { stateMachineId: machine });
  const conditions = [];
  const exits = {};
  const when = (id, name, operation, value) => conditions.push({ id, conditions: [{ leftComparator: { viewModelPropertyId: prop(name) }, ...(operation ? { comparationOperation: operation, rightComparator: { valueType: "constantValueType", value } } : {}) }] });
  for (const layer of built.layers) {
    const nameOf = Object.fromEntries(layer.states.map((st) => [st.id, st.type === "animation" ? st.animationName : st.type]));
    for (const t of layer.transitions) {
      const from = nameOf[t.fromStateId];
      const to = nameOf[t.toStateId];
      if (from === "entry") continue;
      if (to === "face-wow") when(t.id, "found");
      else if (to === "tap-squash") when(t.id, "tap");
      else if (to === "burst-go") when(t.id, "burst");
      else if (to === "walk") when(t.id, "walking", "equal", true);
      else if (to === "walk-rest") when(t.id, "walking", "equal", false);
      else if (to.endsWith("-walk")) when(t.id, `${to.slice(0, -5)}Walking`, "equal", true);
      else if (to.endsWith("-still")) when(t.id, `${to.slice(0, -6)}Walking`, "equal", false);
      else if (from === "any" && to.startsWith("find-")) when(t.id, "find", "equal", Number(to.slice(5)));
      else if (to.endsWith("-in")) when(t.id, to.slice(0, -3), "equal", true);
      else if (to.endsWith("-hidden")) when(t.id, to.slice(0, -7), "equal", false);
      else exits[t.id] = { [T.flags]: EXIT_AT_END, [T.exitTime]: 100 };
    }
  }
  await cmd("animation_editor", "createConditions", { transitions: conditions });
  await set(exits);
  return { layers: built.layers.length, conditions: conditions.length, exits: Object.keys(exits).length };
};

stages.names = async () => {
  const built = await cmd("animation_editor", "queryStateMachine");
  return tool("rename_objects", { renames: [{ id: built.stateMachineId, name: "Game" }, { id: built.layers[0].layerId, name: "Ambient" }] });
};

stages.export = async () => exportRiv(new URL("../search-party.riv", import.meta.url).pathname);

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const stage of process.argv.slice(2)) console.log(stage, JSON.stringify(await stages[stage]()));
}
