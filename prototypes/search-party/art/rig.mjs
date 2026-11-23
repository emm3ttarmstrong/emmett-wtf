// Rigs the imported scene inside Rive: pivots, view model binds, timelines and the state machine.
// Run stages in order against an open Rive Early Access file: node rig.mjs pivots | binds | ...
import { cmd, tool } from "./rive-client.mjs";

export const K = { x: 13, y: 14, r: 15, sx: 16, sy: 17, opacity: 18, parent: 5, worldX: 808, worldY: 809 };
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

// The product of the scales of a node's ancestors, so a distance on the artboard converts into the node's parent space.
async function parentScale(id) {
  let scale = 1;
  let parent = (await values(id, [K.parent]))[K.parent];
  while (parent) {
    const v = await values(parent, [K.sx, K.parent]);
    if (typeof v[K.sx] !== "number") break;
    scale *= v[K.sx] / 100;
    parent = v[K.parent];
  }
  return scale;
}

// Rive puts an imported group's origin at the centre of its bounding box. This moves the origin to a point on the
// artboard and shifts the children back by the same amount, so nothing moves on screen but rotation and scale pivot there.
export async function repivot(name, worldX, worldY) {
  const id = await idOf(name);
  const now = await values(id, [K.x, K.y, K.sx, K.worldX, K.worldY]);
  const outer = await parentScale(id);
  const dx = (worldX - now[K.worldX]) / outer;
  const dy = (worldY - now[K.worldY]) / outer;
  const inner = now[K.sx] / 100;
  const update = { [id]: { [K.x]: now[K.x] + dx, [K.y]: now[K.y] + dy } };
  for (const child of await childrenOf(id)) {
    const c = await values(child, [K.x, K.y]);
    if (typeof c[K.x] !== "number") continue;
    update[child] = { [K.x]: c[K.x] - dx / inner, [K.y]: c[K.y] - dy / inner };
  }
  await set(update);
  return { name, id, moved: [Number(dx.toFixed(2)), Number(dy.toFixed(2))], children: Object.keys(update).length - 1 };
}

const HERO = { x: 106, y: 318, scale: 0.56 };
const PIVOT = { x: HERO.x + 50 * HERO.scale, y: HERO.y - 84 * HERO.scale };
const FIND = { x: 314, y: 318 };
export const FINDS = ["sock", "semicolon", "remote", "keys", "socket", "plot", "atlantis", "note"];
export const HELPERS = { satellite: [250, 72], detective: [352, 372], intern: [178, 372], crawler: [262, 374], dog: [52, 374] };

const stages = {
  async pivots() {
    const done = [];
    done.push(await repivot("hero", HERO.x, HERO.y));
    done.push(await repivot("hero-body", HERO.x, HERO.y));
    done.push(await repivot("torch", PIVOT.x, PIVOT.y));
    done.push(await repivot("beamshape", PIVOT.x, PIVOT.y));
    done.push(await repivot("blink", HERO.x + 14.5 * HERO.scale, HERO.y - 143 * HERO.scale));
    done.push(await repivot("spider", 48, 48));
    done.push(await repivot("sparkles", FIND.x, FIND.y - 24));
    for (const name of FINDS) done.push(await repivot(`find-${name}`, FIND.x, FIND.y));
    for (const [name, [x, y]] of Object.entries(HELPERS)) done.push(await repivot(`helper-${name}`, x, y));
    return done;
  },

  async binds() {
    const models = (await cmd("viewmodel_editor", "listViewModels")).viewModels;
    const model = models.find((m) => m.name === VM);
    const aim = model.viewModelProperties.find((p) => p.name === "aim").id;
    const artboard = (await tool("list_artboards")).artboards.find((a) => a.name === "Scene").id;
    await cmd("viewmodel_editor", "bindViewModelToArtboard", { artboardId: artboard, viewModelId: model.id });
    return cmd("viewmodel_editor", "databind", {
      viewModelId: model.id,
      bindings: [
        { objectId: await idOf("torch"), propertyKey: K.r, viewModelPropertyId: aim },
        { objectId: await idOf("beamshape"), propertyKey: K.r, viewModelPropertyId: aim },
      ],
    });
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
  return { name, id, keys: add.length };
}

stages.timelines = async () => {
  const id = {};
  for (const n of ["hero", "hero-body", "blink", "face-smile", "face-wow", "face-happy", "sparkles", "cat-eyes", "spider", "motes", "mouse-eyes"]) id[n] = await idOf(n);
  for (const n of FINDS) id[`find-${n}`] = await idOf(`find-${n}`);
  for (const n of Object.keys(HELPERS)) id[`helper-${n}`] = await idOf(`helper-${n}`);
  const base = async (n, key) => (await values(id[n], [key]))[key];
  const heroY = await base("hero", K.y);
  const motesY = await base("motes", K.y);
  const satX = await base("helper-satellite", K.x);
  const crawlX = await base("helper-crawler", K.x);
  const done = [];

  const ambient = await animationId("ambient");
  if (!ambient) await cmd("animation_editor", "renameAnimations", { animations: [{ animationId: await animationId("Timeline 1"), name: "ambient" }] });
  done.push(await timeline("ambient", 240, true, [
    [id.blink, K.sy, 0, 100, "hold"], [id.blink, K.sy, 150, 100, "linear"], [id.blink, K.sy, 155, 8, "linear"], [id.blink, K.sy, 160, 100, "hold"],
    [id["hero-body"], K.sy, 0, 100], [id["hero-body"], K.sy, 120, 101.6], [id["hero-body"], K.sy, 240, 100],
    [id.spider, K.r, 0, -7], [id.spider, K.r, 120, 7], [id.spider, K.r, 240, -7],
    [id["cat-eyes"], K.sy, 0, 100, "hold"], [id["cat-eyes"], K.sy, 58, 100, "linear"], [id["cat-eyes"], K.sy, 63, 10, "linear"], [id["cat-eyes"], K.sy, 68, 100, "hold"],
    [id.motes, K.y, 0, motesY], [id.motes, K.y, 120, motesY - 6], [id.motes, K.y, 240, motesY],
    [id["helper-satellite"], K.x, 0, satX], [id["helper-satellite"], K.x, 120, satX + 12], [id["helper-satellite"], K.x, 240, satX],
    [id["helper-crawler"], K.x, 0, crawlX], [id["helper-crawler"], K.x, 60, crawlX + 5], [id["helper-crawler"], K.x, 180, crawlX - 5], [id["helper-crawler"], K.x, 240, crawlX],
    [id["mouse-eyes"], K.opacity, 0, 100, "hold"], [id["mouse-eyes"], K.opacity, 200, 0, "hold"], [id["mouse-eyes"], K.opacity, 208, 100, "hold"],
  ]));

  const faces = (smile, wow, happy) => [[id["face-smile"], K.opacity, 0, smile, "hold"], [id["face-wow"], K.opacity, 0, wow, "hold"], [id["face-happy"], K.opacity, 0, happy, "hold"]];
  // The beam's clip shape lives outside the hero, so every hop is keyed on both to keep the light on the torch.
  const beam = await idOf("beamshape");
  const beamY = (await values(beam, [K.y]))[K.y];
  const hop = (...steps) => steps.flatMap(([frame, lift, curve]) => [[id.hero, K.y, frame, heroY - lift, curve], [beam, K.y, frame, beamY - lift, curve]]);
  done.push(await timeline("face-smile", 1, false, [...faces(100, 0, 0), ...hop([0, 0, "hold"])]));
  done.push(await timeline("face-wow", 36, false, [...faces(0, 100, 0), ...hop([0, 0, OUT], [8, 10, SMOOTH], [18, 0, "hold"])]));
  done.push(await timeline("face-happy", 90, false, [...faces(0, 0, 100), ...hop([0, 0, OUT], [9, 6, SMOOTH], [18, 0, OUT], [27, 6, SMOOTH], [36, 0, "hold"])]));

  done.push(await timeline("tap-rest", 1, false, [[id["hero-body"], K.sx, 0, 100, "hold"]]));
  done.push(await timeline("tap-squash", 14, false, [[id["hero-body"], K.sx, 0, 100, OUT], [id["hero-body"], K.sx, 4, 106, OUT], [id["hero-body"], K.sx, 14, 100, "hold"]]));

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

  for (const n of Object.keys(HELPERS)) {
    const h = id[`helper-${n}`];
    done.push(await timeline(`${n}-hidden`, 1, false, [[h, K.opacity, 0, 0, "hold"]]));
    done.push(await timeline(`${n}-in`, 24, false, [
      [h, K.opacity, 0, 0, "linear"], [h, K.opacity, 8, 100, "hold"],
      [h, K.sx, 0, 60, OUT], [h, K.sx, 12, 108, SMOOTH], [h, K.sx, 20, 100, "hold"],
      [h, K.sy, 0, 60, OUT], [h, K.sy, 12, 108, SMOOTH], [h, K.sy, 20, 100, "hold"],
    ]));
  }
  return done;
};

// ───────────────────────── State machine ─────────────────────────
const T = { flags: 152, duration: 158, exitTime: 160 };
const EXIT_AT_END = 4 | 8; // enableExitTime | exitTimeIsPercentage
const ENTRY = "{Entry State}";
const ANY = "{Any State}";

stages.machine = async () => {
  const model = (await cmd("viewmodel_editor", "listViewModels")).viewModels.find((m) => m.name === VM);
  const prop = (name) => model.viewModelProperties.find((p) => p.name === name).id;
  const machine = (await cmd("animation_editor", "queryStateMachine")).stateMachineId;

  const state = (name) => ({ name, linearAnimationName: name });
  const layers = [
    { name: "Mood", states: ["face-smile", "face-wow", "face-happy"].map(state), otherTransitions: [[ENTRY, "face-smile"], ["face-smile", "face-wow"], ["face-wow", "face-happy"], ["face-happy", "face-smile"]] },
    { name: "Tap", states: ["tap-rest", "tap-squash"].map(state), otherTransitions: [[ENTRY, "tap-rest"], [ANY, "tap-squash"], ["tap-squash", "tap-rest"]] },
    { name: "Find", states: Array.from({ length: FINDS.length + 1 }, (_, i) => state(`find-${i}`)), otherTransitions: [[ENTRY, "find-0"], ...Array.from({ length: FINDS.length + 1 }, (_, i) => [ANY, `find-${i}`])] },
    ...Object.keys(HELPERS).map((n) => ({ name: n, states: [state(`${n}-hidden`), state(`${n}-in`)], otherTransitions: [[ENTRY, `${n}-hidden`], [`${n}-hidden`, `${n}-in`], [`${n}-in`, `${n}-hidden`]] })),
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
      else if (from === "any" && to.startsWith("find-")) when(t.id, "find", "equal", Number(to.slice(5)));
      else if (to.endsWith("-in")) when(t.id, to.slice(0, -3), "equal", true);
      else if (to.endsWith("-hidden")) when(t.id, to.slice(0, -7), "equal", false);
      else exits[t.id] = { [T.flags]: EXIT_AT_END, [T.exitTime]: 100 };
    }
  }
  await cmd("animation_editor", "createConditions", { transitions: conditions });
  await set(exits);
  return { layers: built.layers.map((l) => `${l.layerName}: ${l.states.length} states, ${l.transitions.length} transitions`), conditions: conditions.length, exits: Object.keys(exits).length };
};

stages.names = async () => {
  const built = await cmd("animation_editor", "queryStateMachine");
  return tool("rename_objects", { renames: [{ id: built.stateMachineId, name: "Game" }, { id: built.layers[0].layerId, name: "Ambient" }] });
};

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const stage of process.argv.slice(2)) console.log(stage, JSON.stringify(await stages[stage]()));
}
