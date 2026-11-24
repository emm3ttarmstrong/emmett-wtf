// Generates the Torchlight artwork as plain SVG. Run: node prototypes/search-party/art/build.mjs
// Every drawing is a function, so one definition serves the review sheet and the files imported into Rive.
// Output SVG sticks to shapes, groups and flat fills, which Rive's SVG import turns into editable shapes.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const out = new URL("./svg/", import.meta.url).pathname;
// Positions and beam sizes shared with the game code.
const GEO = JSON.parse(readFileSync(new URL("../geometry.json", import.meta.url), "utf8"));
mkdirSync(out, { recursive: true });

// Character colours. Characters carry their own light, so they keep these in the dark.
const C = {
  skin: "#FBEFD9",
  skinShade: "#EAD7B6",
  ink: "#1B1B1F",
  hair: "#3A2E28",
  blush: "#F4A38A",
  yellow: "#FFD45C",
  yellowShade: "#E7B43A",
  yellowDeep: "#B98722",
  cream: "#F4F1EA",
  creamShade: "#D2CCBD",
  slate: "#5B6170",
  slateLight: "#8089A0",
  slateDark: "#383C48",
  boot: "#2E2E36",
  beam: "#FFE9A8",
  beamCore: "#FFF6D6",
};

// The room is drawn twice from the same shapes: once unlit, once in torchlight.
const UNLIT = { base: "#17171B", shade: "#101013", line: "#2B2B33", hi: "#202026", pop: "#2A2A32", wall: "#060607", floor: "#0B0B0D", dark: "#000000" };
const LIT = { base: "#F0DA9C", shade: "#C9A75C", line: "#4B3B17", hi: "#FFF3CF", pop: "#FFFDF4", wall: "#3A3019", floor: "#5A4A27", dark: "#2A2110" };

const svg = (w, h, body, vb = `0 0 ${w} ${h}`) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}" fill="none">${body}</svg>`;
const g = (transform, body, name) => `<g${name ? ` id="${name}"` : ""}${transform ? ` transform="${transform}"` : ""}>${body}</g>`;

// ───────────────────────── The searcher ─────────────────────────
// Feet at the origin, facing right, about 196 tall. `aim` turns the torch, `mood` changes the face.
const blush = (cx, cy) =>
  `<ellipse cx="${cx - 16}" cy="${cy + 9}" rx="5.5" ry="3.4" fill="${C.blush}" fill-opacity="0.75"/>` +
  `<ellipse cx="${cx + 19}" cy="${cy + 9}" rx="5.5" ry="3.4" fill="${C.blush}" fill-opacity="0.75"/>`;
const face = (mood, cx, cy) => blush(cx, cy) + features(mood, cx, cy);
// The smiling face with its eyes in a group pivoted between them, so a blink is one scaleY key.
function rigSmile(cx, cy) {
  const eye = (x) => `<circle cx="${x}" cy="0" r="4.4" fill="${C.ink}"/><circle cx="${x + 1.6}" cy="-1.6" r="1.5" fill="#FFFFFF"/>`;
  return `<g id="blink" transform="translate(${cx + 1.5} ${cy})">${eye(-10.5)}${eye(10.5)}</g><path d="M${cx - 2} ${cy + 11} q4 4 8 0" stroke="${C.ink}" stroke-width="2.4" stroke-linecap="round"/>`;
}
function features(mood, cx, cy) {
  const eye = (x) => {
    if (mood === "happy") return `<path d="M${x - 5} ${cy + 1} q5 -7 10 0" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/>`;
    if (mood === "wow") return `<circle cx="${x}" cy="${cy}" r="6.5" fill="#FFFFFF"/><circle cx="${x + 1}" cy="${cy}" r="3.2" fill="${C.ink}"/>`;
    return `<circle cx="${x}" cy="${cy}" r="4.4" fill="${C.ink}"/><circle cx="${x + 1.6}" cy="${cy - 1.6}" r="1.5" fill="#FFFFFF"/>`;
  };
  const mouth =
    mood === "wow"
      ? `<ellipse cx="${cx + 2}" cy="${cy + 13}" rx="3.4" ry="4.4" fill="${C.ink}"/>`
      : mood === "happy"
        ? `<path d="M${cx - 5} ${cy + 10} q7 8 14 0 z" fill="${C.ink}"/>`
        : `<path d="M${cx - 2} ${cy + 11} q4 4 8 0" stroke="${C.ink}" stroke-width="2.4" stroke-linecap="round"/>`;
  return eye(cx - 9) + eye(cx + 12) + mouth;
}

function torch(aim, rig = false) {
  return g(
    rig ? "translate(50 -84)" : `translate(50 -84) rotate(${aim})`,
    (rig ? `<path id="haze" d="${rig}" fill="url(#hz-main)"/>` : "") +
    `<rect x="-8" y="-6.5" width="30" height="13" rx="4" fill="${C.slate}"/>` +
      `<rect x="-2" y="-6.5" width="4" height="13" fill="${C.slateDark}"/><rect x="5" y="-6.5" width="4" height="13" fill="${C.slateDark}"/>` +
      `<rect x="10" y="-9.5" width="8" height="4" rx="2" fill="${C.yellow}"/>` +
      `<path d="M20 -6.5 L34 -12 L34 12 L20 6.5 Z" fill="${C.slateLight}"/>` +
      `<ellipse cx="34" cy="0" rx="3.4" ry="12" fill="${C.beamCore}"/>`,
    "torch",
  );
}

function searcher({ aim = -10, mood = "smile", rig = false } = {}) {
  const backpack =
    `<rect x="-48" y="-104" width="30" height="52" rx="11" fill="${C.slate}"/>` +
    `<rect x="-48" y="-80" width="30" height="5" fill="${C.slateDark}"/>` +
    `<rect x="-44" y="-72" width="14" height="14" rx="4" fill="${C.slateDark}"/>` +
    `<rect x="-50" y="-117" width="32" height="14" rx="7" fill="${C.slateLight}"/>` +
    `<path d="M-40 -117 v14 M-28 -117 v14" stroke="${C.slate}" stroke-width="2.5"/>`;
  const leg = (name, rect, boot, stripe, sole) =>
    `<g${rig ? ` id="${name}"` : ""}><rect x="${rect}" y="-32" width="13" height="20" fill="${C.slateDark}"/><path d="${boot}" fill="${C.boot}"/>` +
    `<rect x="${stripe}" y="-18" width="20" height="4" fill="${C.yellow}"/><rect x="${stripe}" y="-3" width="${sole}" height="3" fill="${C.ink}"/></g>`;
  const legs =
    leg("leg-l", -21, "M-27 0 v-12 a6 6 0 0 1 6 -6 h14 v18 z", -27, 20) + leg("leg-r", 9, "M3 0 v-18 h13 a15 15 0 0 1 15 15 v3 z", 3, 28);
  const backArm =
    `<path d="M-20 -98 L-31 -58" stroke="${C.yellowShade}" stroke-width="17" stroke-linecap="round"/>` +
    `<circle cx="-32" cy="-52" r="7.5" fill="${C.skinShade}"/>`;
  const coat =
    `<path d="M-35 -28 C-41 -70 -31 -104 -18 -113 L22 -113 C35 -104 46 -70 42 -28 Q3 -19 -35 -28 Z" fill="${C.yellow}"/>` +
    `<path d="M-35 -28 C-41 -70 -31 -104 -18 -113 L-7 -113 C-19 -100 -25 -66 -21 -25 Q-28 -26 -35 -28 Z" fill="${C.yellowShade}"/>` +
    `<path d="M-35 -28 Q3 -19 42 -28 L41 -36 Q3 -27 -34 -36 Z" fill="${C.yellowShade}"/>` +
    `<path d="M11 -111 L13 -27" stroke="${C.yellowShade}" stroke-width="2.5"/>` +
    `<circle cx="12" cy="-84" r="3.2" fill="${C.yellowDeep}"/><circle cx="12.5" cy="-64" r="3.2" fill="${C.yellowDeep}"/><circle cx="13" cy="-44" r="3.2" fill="${C.yellowDeep}"/>` +
    `<ellipse cx="4" cy="-104" rx="27" ry="9" fill="${C.yellowShade}"/>` +
    `<path d="M22 -62 h15 v10 a5 5 0 0 1 -5 5 h-5 a5 5 0 0 1 -5 -5 z" stroke="${C.yellowShade}" stroke-width="2.5"/>`;
  const hood =
    `<path d="M-24 -182 Q-40 -204 -52 -192 Q-38 -188 -34 -168 Z" fill="${C.yellowShade}"/>` +
    `<circle cx="2" cy="-148" r="45" fill="${C.yellowShade}"/><circle cx="7" cy="-147" r="41" fill="${C.yellow}"/>` +
    `<ellipse cx="13" cy="-144" rx="29" ry="28" fill="${C.skinShade}"/><ellipse cx="13" cy="-141" rx="28" ry="26" fill="${C.skin}"/>` +
    `<path d="M-10 -160 Q4 -176 30 -166 Q16 -165 9 -155 Q2 -163 -10 -160 Z" fill="${C.hair}"/>`;
  const frontArm =
    `<path d="M17 -93 L48 -85" stroke="${C.yellow}" stroke-width="17" stroke-linecap="round"/>` +
    `<path d="M38 -97 L34 -81" stroke="${C.yellowShade}" stroke-width="3" stroke-linecap="round"/>`;
  const hand = `<circle cx="51" cy="-83" r="8.5" fill="${C.skin}"/>`;
  const faces = rig
    ? blush(13, -143) + `<g id="face-smile">${rigSmile(13, -143)}</g><g id="face-wow" opacity="0">${features("wow", 13, -143)}</g><g id="face-happy" opacity="0">${features("happy", 13, -143)}</g>`
    : face(mood, 13, -143);
  return g("", backpack + legs + backArm + coat + hood + faces + frontArm + torch(aim, rig) + hand, "searcher");
}

// ───────────────────────── Helpers ─────────────────────────
function intern(cone = true) {
  return g(
    "",
    `<rect x="-17" y="-30" width="11" height="22" fill="${C.slateDark}"/><rect x="7" y="-30" width="11" height="22" fill="${C.slateDark}"/>` +
      `<rect x="-24" y="-11" width="22" height="11" rx="5" fill="${C.cream}"/><rect x="3" y="-11" width="24" height="11" rx="5" fill="${C.cream}"/>` +
      `<rect x="-24" y="-3" width="22" height="3" fill="${C.slate}"/><rect x="3" y="-3" width="24" height="3" fill="${C.slate}"/>` +
      // back arm with a coffee
      `<path d="M-18 -78 L-31 -58" stroke="${C.creamShade}" stroke-width="13" stroke-linecap="round"/>` +
      `<path d="M-41 -66 h14 l-2 18 h-10 z" fill="${C.cream}"/><rect x="-42" y="-69" width="16" height="5" rx="2" fill="${C.slate}"/><rect x="-40" y="-60" width="12" height="6" fill="${C.yellowDeep}"/>` +
      `<path d="M-37 -74 q-3 -4 0 -8 q3 -4 0 -8" stroke="${C.slateLight}" stroke-width="2" stroke-linecap="round"/>` +
      // hoodie
      `<path d="M-27 -26 C-31 -60 -25 -84 -14 -91 L16 -91 C27 -84 33 -60 29 -26 Q1 -19 -27 -26 Z" fill="${C.cream}"/>` +
      `<path d="M-27 -26 C-31 -60 -25 -84 -14 -91 L-6 -91 C-15 -80 -19 -56 -16 -24 Q-22 -25 -27 -26 Z" fill="${C.creamShade}"/>` +
      `<path d="M-10 -46 h24 l4 14 h-32 z" stroke="${C.creamShade}" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<path d="M-8 -90 L4 -62 L14 -90" stroke="${C.yellow}" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<rect x="-4" y="-64" width="16" height="20" rx="3" fill="${C.yellow}"/><circle cx="4" cy="-57" r="3.2" fill="${C.yellowDeep}"/><rect x="-1" y="-51" width="10" height="3" rx="1.5" fill="${C.yellowDeep}"/>` +
      // head
      `<circle cx="0" cy="-150" r="10" fill="${C.hair}"/>` +
      `<circle cx="2" cy="-114" r="30" fill="${C.skin}"/>` +
      `<path d="M-28 -116 C-32 -152 36 -154 32 -114 C26 -130 10 -136 -4 -130 C-14 -126 -22 -122 -28 -116 Z" fill="${C.hair}"/>` +
      `<circle cx="-7" cy="-110" r="9.5" fill="#FFFFFF" fill-opacity="0.35" stroke="${C.ink}" stroke-width="2.5"/><circle cx="16" cy="-110" r="9.5" fill="#FFFFFF" fill-opacity="0.35" stroke="${C.ink}" stroke-width="2.5"/>` +
      `<path d="M2.5 -110 h4" stroke="${C.ink}" stroke-width="2.5"/>` +
      `<circle cx="-5" cy="-110" r="2.8" fill="${C.ink}"/><circle cx="18" cy="-110" r="2.8" fill="${C.ink}"/>` +
      `<ellipse cx="-14" cy="-98" rx="4.5" ry="2.8" fill="${C.blush}" fill-opacity="0.75"/><ellipse cx="24" cy="-98" rx="4.5" ry="2.8" fill="${C.blush}" fill-opacity="0.75"/>` +
      `<path d="M0 -95 q2.5 -3 5 0 q2.5 3 5 0" stroke="${C.ink}" stroke-width="2.2" stroke-linecap="round"/>` +
      // phone torch
      (cone ? `<path d="M38 -112 L78 -134 L78 -86 Z" fill="${C.beam}" fill-opacity="0.28"/>` : "") +
      `<path d="M18 -78 L38 -96" stroke="${C.cream}" stroke-width="13" stroke-linecap="round"/>` +
      `<rect x="31" y="-122" width="13" height="24" rx="3.5" fill="${C.slateDark}"/><circle cx="40" cy="-117" r="2.2" fill="${C.beamCore}"/>` +
      `<circle cx="39" cy="-97" r="7" fill="${C.skin}"/>`,
    "intern",
  );
}

function crawler(cone = true) {
  const leg = (d) => `<path d="${d}" stroke="${C.slateDark}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  return g(
    "",
    (cone ? `<path d="M26 -40 L70 -54 L70 -22 Z" fill="${C.beam}" fill-opacity="0.28"/>` : "") +
      leg("M-30 -20 L-50 -32 L-56 -2") + leg("M-20 -16 L-34 -18 L-38 -2") + leg("M30 -20 L50 -32 L56 -2") + leg("M20 -16 L34 -18 L38 -2") + leg("M-6 -14 L-9 -2") + leg("M6 -14 L9 -2") +
      `<circle cx="-56" cy="-2" r="3.5" fill="${C.yellow}"/><circle cx="56" cy="-2" r="3.5" fill="${C.yellow}"/><circle cx="-38" cy="-2" r="3" fill="${C.yellow}"/><circle cx="38" cy="-2" r="3" fill="${C.yellow}"/>` +
      `<path d="M-12 -52 L-18 -74" stroke="${C.slateDark}" stroke-width="3" stroke-linecap="round"/><circle cx="-19" cy="-77" r="5" fill="${C.yellow}"/>` +
      `<path d="M-36 -24 a36 32 0 0 1 72 0 z" fill="${C.slateLight}"/>` +
      `<path d="M-36 -24 a36 32 0 0 1 22 -30 a40 40 0 0 0 -8 30 z" fill="${C.slate}"/>` +
      `<rect x="-39" y="-27" width="78" height="12" rx="6" fill="${C.slate}"/>` +
      `<circle cx="-28" cy="-21" r="1.8" fill="${C.slateDark}"/><circle cx="-14" cy="-21" r="1.8" fill="${C.slateDark}"/><circle cx="0" cy="-21" r="1.8" fill="${C.slateDark}"/><circle cx="14" cy="-21" r="1.8" fill="${C.slateDark}"/><circle cx="28" cy="-21" r="1.8" fill="${C.slateDark}"/>` +
      `<circle cx="13" cy="-38" r="14" fill="${C.ink}"/><circle cx="13" cy="-38" r="10" fill="${C.yellow}"/><circle cx="15" cy="-38" r="6" fill="${C.beamCore}"/><circle cx="18" cy="-41" r="2" fill="#FFFFFF"/>` +
      `<path d="M-22 -42 q4 -8 12 -10" stroke="${C.cream}" stroke-width="2.5" stroke-linecap="round" stroke-opacity="0.6"/>`,
    "crawler",
  );
}

function dog() {
  return g(
    "",
    `<path d="M-42 -38 Q-60 -48 -55 -68" stroke="${C.cream}" stroke-width="8" stroke-linecap="round"/>` +
      `<rect x="-30" y="-20" width="10" height="20" rx="5" fill="${C.creamShade}"/><rect x="16" y="-20" width="10" height="20" rx="5" fill="${C.creamShade}"/>` +
      `<rect x="-46" y="-48" width="80" height="32" rx="16" fill="${C.cream}"/>` +
      `<ellipse cx="-22" cy="-39" rx="13" ry="8" fill="${C.slateLight}"/>` +
      `<rect x="-42" y="-22" width="10" height="22" rx="5" fill="${C.cream}"/><rect x="4" y="-22" width="10" height="22" rx="5" fill="${C.cream}"/>` +
      `<rect x="-6" y="-49" width="22" height="34" rx="5" fill="${C.yellow}"/><rect x="-6" y="-36" width="22" height="5" fill="${C.cream}"/><rect x="-6" y="-49" width="22" height="5" rx="2.5" fill="${C.yellowShade}"/>` +
      `<ellipse cx="44" cy="-27" rx="18" ry="15" fill="${C.cream}"/>` +
      `<ellipse cx="60" cy="-17" rx="13" ry="9" fill="${C.cream}"/>` +
      `<circle cx="71" cy="-18" r="4.5" fill="${C.ink}"/>` +
      `<path d="M47 -31 q3.5 -4 7 0" stroke="${C.ink}" stroke-width="2.4" stroke-linecap="round"/>` +
      `<ellipse cx="35" cy="-22" rx="7.5" ry="14" transform="rotate(14 35 -22)" fill="${C.slateDark}"/>` +
      `<path d="M27 -45 q6 11 1 24" stroke="${C.yellow}" stroke-width="4.500" stroke-linecap="round"/><circle cx="30" cy="-19" r="3" fill="${C.yellowDeep}"/>` +
      `<path d="M78 -8 q4 3 0 6 M85 -12 q6 5 0 10" stroke="${C.slateLight}" stroke-width="2.2" stroke-linecap="round"/>`,
    "dog",
  );
}

function detective() {
  return g(
    "",
    `<rect x="-19" y="-30" width="12" height="22" fill="${C.slateDark}"/><rect x="9" y="-30" width="12" height="22" fill="${C.slateDark}"/>` +
      `<path d="M-27 0 v-6 a6 6 0 0 1 6 -6 h15 v12 z" fill="${C.ink}"/><path d="M5 0 v-12 h14 a12 12 0 0 1 12 12 z" fill="${C.ink}"/>` +
      // back arm with notebook
      `<path d="M-18 -98 L-30 -62" stroke="${C.slateDark}" stroke-width="15" stroke-linecap="round"/>` +
      `<rect x="-43" y="-64" width="17" height="21" rx="2" fill="${C.cream}"/><path d="M-39 -58 h9 M-39 -53 h9 M-39 -48 h5" stroke="${C.slateLight}" stroke-width="1.8" stroke-linecap="round"/>` +
      // coat
      `<path d="M-33 -24 C-38 -70 -29 -104 -16 -111 L20 -111 C33 -104 42 -70 38 -24 Q2 -16 -33 -24 Z" fill="${C.slate}"/>` +
      `<path d="M-33 -24 C-38 -70 -29 -104 -16 -111 L-6 -111 C-17 -98 -22 -64 -19 -22 Q-26 -23 -33 -24 Z" fill="${C.slateDark}"/>` +
      `<path d="M-14 -111 L3 -80 L18 -111 Z" fill="${C.cream}"/><path d="M-1 -100 L3 -80 L7 -100 L3 -106 Z" fill="${C.yellow}"/>` +
      `<path d="M-16 -111 L3 -80 L-10 -78 L-22 -100 Z" fill="${C.slateLight}"/><path d="M20 -111 L3 -80 L16 -78 L28 -100 Z" fill="${C.slateLight}"/>` +
      `<path d="M-36 -62 Q2 -54 40 -62 L40 -54 Q2 -46 -36 -54 Z" fill="${C.slateDark}"/><rect x="-2" y="-59" width="11" height="11" rx="2" fill="${C.yellow}"/>` +
      `<circle cx="4" cy="-70" r="2.6" fill="${C.slateDark}"/><circle cx="5" cy="-36" r="2.6" fill="${C.slateDark}"/>` +
      // head and hat
      `<circle cx="2" cy="-136" r="28" fill="${C.skin}"/>` +
      `<path d="M2 -127 q-9 -9 -20 2 q11 8 20 -2 q9 9 20 2 q-11 -11 -20 -2 z" fill="${C.hair}"/>` +
      `<ellipse cx="-17" cy="-128" rx="4.5" ry="2.8" fill="${C.blush}" fill-opacity="0.75"/>` +
      `<circle cx="-9" cy="-140" r="3.6" fill="${C.ink}"/>` +
      `<path d="M-22 -156 C-24 -190 30 -190 28 -156 Z" fill="${C.slateDark}"/>` +
      `<path d="M-22.500 -171 Q3 -167 28.500 -171 L28 -161 L-22 -161 Z" fill="${C.yellow}"/>` +
      `<ellipse cx="3" cy="-155" rx="40" ry="7.5" fill="${C.slateDark}"/>` +
      // magnifying glass
      `<path d="M22 -98 L46 -106" stroke="${C.slate}" stroke-width="15" stroke-linecap="round"/>` +
      `<path d="M34 -124 L47 -106" stroke="${C.ink}" stroke-width="6" stroke-linecap="round"/>` +
      `<circle cx="23" cy="-138" r="16" fill="${C.beam}" fill-opacity="0.35" stroke="${C.slateLight}" stroke-width="4.5"/>` +
      `<circle cx="23" cy="-138" r="8.5" fill="#FFFFFF"/><circle cx="25" cy="-138" r="4.6" fill="${C.ink}"/><circle cx="26.6" cy="-139.8" r="1.5" fill="#FFFFFF"/>` +
      `<circle cx="48" cy="-105" r="7.5" fill="${C.skin}"/>`,
    "detective",
  );
}

function satellite(cone = true) {
  const panel = (x) =>
    `<rect x="${x}" y="-17" width="50" height="34" rx="3" fill="${C.slate}"/>` +
    `<path d="M${x + 12.5} -17 v34 M${x + 25} -17 v34 M${x + 37.5} -17 v34 M${x} 0 h50" stroke="${C.slateLight}" stroke-width="1.8"/>`;
  return g(
    "rotate(-12)",
    (cone ? `<path d="M-5 22 L5 22 L30 84 L-30 84 Z" fill="${C.beam}" fill-opacity="0.25"/>` : "") +
      `<rect x="-32" y="-3.5" width="64" height="7" fill="${C.slateDark}"/>` +
      panel(-82) + panel(32) +
      `<path d="M0 -20 v-10" stroke="${C.slateDark}" stroke-width="3.5"/><path d="M-13 -37 Q0 -22 13 -37 Z" fill="${C.creamShade}"/><circle cx="0" cy="-41" r="3.5" fill="${C.yellow}"/>` +
      `<rect x="-23" y="-20" width="46" height="40" rx="8" fill="${C.cream}"/>` +
      `<path d="M-23 -12 a8 8 0 0 1 8 -8 h8 v40 h-8 a8 8 0 0 1 -8 -8 z" fill="${C.creamShade}"/>` +
      `<rect x="-23" y="9" width="46" height="4" fill="${C.yellow}"/>` +
      `<circle cx="-6" cy="-5" r="3.4" fill="${C.ink}"/><circle cx="10" cy="-5" r="3.4" fill="${C.ink}"/>` +
      `<path d="M-2 2 q4 4 8 0" stroke="${C.ink}" stroke-width="2.2" stroke-linecap="round"/>` +
      `<ellipse cx="-12" cy="1" rx="3.6" ry="2.2" fill="${C.blush}" fill-opacity="0.75"/><ellipse cx="16" cy="1" rx="3.6" ry="2.2" fill="${C.blush}" fill-opacity="0.75"/>` +
      `<circle cx="0" cy="21" r="6.5" fill="${C.ink}"/><circle cx="0" cy="21" r="3.2" fill="${C.beamCore}"/>`,
    "satellite",
  );
}

// ───────────────────────── Finds (80×80 each) ─────────────────────────
const sparkle = (x, y, s, fill) => `<path d="M${x} ${y - s} q${s * 0.18} ${s * 0.82} ${s} ${s} q-${s * 0.82} ${s * 0.18} -${s} ${s} q-${s * 0.18} -${s * 0.82} -${s} -${s} q${s * 0.82} -${s * 0.18} ${s} -${s} z" fill="${fill}"/>`;

const FINDS = {
  sock: (t) =>
    `<path d="M26 10 h24 v30 l16 10 a11 11 0 0 1 -6 20 h-22 a14 14 0 0 1 -12 -14 z" fill="${t.base}"/>` +
    `<path d="M26 10 h24 v10 h-24 z" fill="${t.hi}"/><path d="M26 25 h24 M26 31 h24" stroke="${t.shade}" stroke-width="3"/>` +
    `<path d="M26 56 a14 14 0 0 0 12 14 h4 a10 10 0 0 0 -16 -14 z" fill="${t.shade}"/>` +
    `<path d="M60 70 a11 11 0 0 0 6 -20 l-4 -2.5 a12 12 0 0 0 -8 22.5 z" fill="${t.shade}"/>` +
    `<circle cx="42" cy="44" r="3.4" fill="${t.line}"/><path d="M30 13 v4 M34 13 v4 M38 13 v4 M42 13 v4 M46 13 v4" stroke="${t.shade}" stroke-width="1.6"/>`,
  semicolon: (t) =>
    `<circle cx="41" cy="23" r="11" fill="${t.base}"/><path d="M34 19 a8 8 0 0 1 8 -5" stroke="${t.hi}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M41 39 a11 11 0 0 1 11 11 c0 12 -9 20 -20 23 c5 -5 7 -9 6 -13 a11 11 0 0 1 3 -21 z" fill="${t.base}"/>` +
    `<path d="M34 46 a8 8 0 0 1 8 -4" stroke="${t.hi}" stroke-width="3" stroke-linecap="round"/><path d="M47 58 q-2 6 -7 10" stroke="${t.shade}" stroke-width="3" stroke-linecap="round"/>`,
  remote: (t) =>
    g(
      "rotate(16 40 40)",
      `<rect x="35" y="3" width="10" height="6" rx="2" fill="${t.line}"/><rect x="26" y="7" width="28" height="66" rx="9" fill="${t.base}"/>` +
        `<path d="M26 16 a9 9 0 0 1 9 -9 h3 v66 h-3 a9 9 0 0 1 -9 -9 z" fill="${t.shade}"/>` +
        `<circle cx="40" cy="18" r="4" fill="${t.line}"/>` +
        [28, 36, 44].map((y) => [33, 40, 47].map((x) => `<circle cx="${x}" cy="${y}" r="2.5" fill="${t.line}"/>`).join("")).join("") +
        `<circle cx="40" cy="59" r="8" fill="${t.hi}" stroke="${t.line}" stroke-width="2"/><circle cx="40" cy="59" r="2.6" fill="${t.line}"/>`,
    ),
  keys: (t) =>
    `<circle cx="34" cy="22" r="13" stroke="${t.shade}" stroke-width="4"/>` +
    g("rotate(-24 34 34)", `<circle cx="34" cy="38" r="8" fill="${t.shade}"/><circle cx="34" cy="38" r="2.8" fill="${t.line}"/><path d="M31 44 h6 v30 h-6 z M37 58 h6 v4 h-6 z M37 66 h5 v4 h-5 z" fill="${t.shade}"/>`) +
    g("rotate(28 34 34)", `<circle cx="34" cy="38" r="9" fill="${t.base}"/><circle cx="34" cy="38" r="3" fill="${t.line}"/><path d="M30.500 45 h7 v30 l-3.500 4 l-3.500 -4 z M37.500 56 h6 v4.500 h-6 z M37.500 64 h4.500 v4.500 h-4.500 z" fill="${t.base}"/><path d="M34 48 v26" stroke="${t.hi}" stroke-width="1.8"/>`) +
    `<rect x="42" y="8" width="16" height="12" rx="3" transform="rotate(20 50 14)" fill="${t.hi}"/><circle cx="47" cy="12" r="1.8" fill="${t.line}"/>`,
  socket: (t) =>
    `<path d="M20 26 v32 a20 8 0 0 0 40 0 v-32 z" fill="${t.base}"/><path d="M20 26 v32 a20 8 0 0 0 9 6.500 v-33 z" fill="${t.shade}"/>` +
    `<path d="M20 44 a20 8 0 0 0 40 0 v6 a20 8 0 0 1 -40 0 z" fill="${t.shade}"/>` +
    `<path d="M34 37 v6 M40 38 v6 M46 37.500 v6 M52 36 v6" stroke="${t.shade}" stroke-width="2" stroke-linecap="round"/>` +
    `<ellipse cx="40" cy="26" rx="20" ry="8" fill="${t.hi}"/><path d="M29 26 l5.500 -4.200 h11 l5.500 4.200 l-5.500 4.200 h-11 z" fill="${t.line}"/>`,
  plot: (t) =>
    `<rect x="20" y="64" width="44" height="8" rx="2" fill="${t.hi}"/><path d="M22 67 h40 M22 70 h40" stroke="${t.shade}" stroke-width="1.2"/>` +
    `<rect x="14" y="8" width="50" height="60" rx="4" fill="${t.base}"/><path d="M14 12 a4 4 0 0 1 4 -4 h6 v60 h-6 a4 4 0 0 1 -4 -4 z" fill="${t.shade}"/>` +
    `<path d="M30 52 L38 40 L44 46 L52 26 L58 31" stroke="${t.line}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="30" cy="52" r="3" fill="${t.line}"/><circle cx="52" cy="26" r="3" fill="${t.line}"/>` +
    `<path d="M30 16 h22 M30 21 h14" stroke="${t.shade}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M52 8 h7 v18 l-3.500 -4 l-3.500 4 z" fill="${t.pop}"/>`,
  atlantis: (t) =>
    `<rect x="10" y="60" width="60" height="11" rx="4" fill="${t.shade}"/><rect x="16" y="63" width="48" height="3" rx="1.5" fill="${t.line}"/>` +
    `<path d="M13 60 a27 46 0 0 1 54 0 z" fill="${t.base}" fill-opacity="0.35"/>` +
    `<path d="M27 40 L40 30 L53 40 Z" fill="${t.base}"/><rect x="27" y="40" width="26" height="3" fill="${t.shade}"/>` +
    `<rect x="29" y="43" width="4" height="12" fill="${t.base}"/><rect x="35.500" y="43" width="4" height="12" fill="${t.base}"/><rect x="42" y="43" width="4" height="12" fill="${t.base}"/><rect x="48.500" y="43" width="4" height="12" fill="${t.base}"/>` +
    `<rect x="25" y="55" width="30" height="5" fill="${t.base}"/>` +
    `<path d="M15 52 q4 -4 8 0 M57 50 q4 -4 8 0" stroke="${t.hi}" stroke-width="2" stroke-linecap="round"/>` +
    `<circle cx="22" cy="40" r="2.2" stroke="${t.hi}" stroke-width="1.6"/><circle cx="58" cy="36" r="3" stroke="${t.hi}" stroke-width="1.6"/><circle cx="50" cy="24" r="1.8" stroke="${t.hi}" stroke-width="1.6"/>` +
    `<path d="M13 60 a27 46 0 0 1 54 0" stroke="${t.hi}" stroke-width="3"/><path d="M24 34 a20 30 0 0 1 9 -13" stroke="${t.pop}" stroke-width="3" stroke-linecap="round"/>`,
  note: (t) =>
    g(
      "rotate(-5 40 40)",
      `<path d="M16 12 h36 l12 12 v46 h-48 z" fill="${t.base}"/><path d="M52 12 v12 h12 z" fill="${t.shade}"/>` +
        `<path d="M24 32 h30 M24 40 h24 M24 48 h28" stroke="${t.line}" stroke-width="2.6" stroke-linecap="round"/>` +
        `<path d="M24 60 h20 m-6 -5 l6 5 l-6 5" stroke="${t.line}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<circle cx="34" cy="14" r="5" fill="${t.shade}"/><circle cx="33" cy="13" r="2" fill="${t.pop}"/>`,
    ),
};

// ───────────────────────── The room (390×380, floor at y=318) ─────────────────────────
const W = 390, H = 380, FLOOR = 318;

// The wall, skirting board and floorboards, repeated every 390 units so the room can be any width.
function wallAndFloor(t, width = W) {
  const bays = Math.ceil(width / 390);
  const seams = Array.from({ length: bays }, (_, i) => `M${i * 390 + 52} 318 v22 M${i * 390 + 188} 318 v22 M${i * 390 + 312} 318 v22 M${i * 390 + 118} 340 v22 M${i * 390 + 252} 340 v22 M${i * 390 + 30} 362 v18 M${i * 390 + 170} 362 v18 M${i * 390 + 330} 362 v18`).join(" ");
  return (
    `<rect width="${width}" height="${FLOOR}" fill="${t.wall}"/><rect y="${FLOOR}" width="${width}" height="${H - FLOOR}" fill="${t.floor}"/>` +
    `<path d="M0 340 h${width} M0 362 h${width} ${seams}" stroke="${t.line}" stroke-width="1" stroke-opacity="0.7"/>` +
    `<rect y="306" width="${width}" height="12" fill="${t.base}"/><rect y="306" width="${width}" height="2" fill="${t.hi}"/>` +
    `<path d="M243 318 v-6 a6 6 0 0 1 12 0 v6 z" fill="${t.dark}"/>`
  );
}
function cobweb(t, spider = true) {
  return (
    `<path d="M0 0 L70 22 M0 0 L52 52 M0 0 L20 68" stroke="${t.line}" stroke-width="1"/>` +
    `<path d="M22 7 Q24 18 17 17 Q14 26 7 23 M44 14 Q44 32 34 34 Q28 46 13 45 M64 20 Q62 42 48 48 Q38 62 19 64" stroke="${t.line}" stroke-width="1"/>` +
    (spider ? spiderOnThread(t, 48, 48) : "")
  );
}

const spiderOnThread = (t, x, y) =>
  `<path d="M${x} ${y} v26" stroke="${t.line}" stroke-width="1"/><circle cx="${x}" cy="${y + 29}" r="3.2" fill="${t.pop}"/>` +
  `<path d="M${x - 3} ${y + 27} l-4 -3 M${x - 3} ${y + 30} l-4 2 M${x + 3} ${y + 27} l4 -3 M${x + 3} ${y + 30} l4 2" stroke="${t.pop}" stroke-width="1" stroke-linecap="round"/>`;

function bulb(t) {
  return (
    `<path d="M150 0 v40" stroke="${t.line}" stroke-width="1.5"/><rect x="145" y="40" width="10" height="9" rx="2" fill="${t.pop}"/>` +
    `<path d="M143 58 a7 7 0 0 1 3 -9 h8 a7 7 0 0 1 3 9 a8 8 0 1 1 -14 0 z" fill="${t.hi}" stroke="${t.line}" stroke-width="1.2"/>` +
    `<path d="M147 60 q3 -5 6 0" stroke="${t.line}" stroke-width="1.2"/>`
  );
}

function cabinet(t) {
  const drawer = (y, dx = 0) =>
    `<rect x="${27 + dx}" y="${y}" width="40" height="33" rx="2" fill="${t.hi}"/>` +
    `<rect x="${39 + dx}" y="${y + 6}" width="16" height="8" rx="1" fill="${t.pop}" stroke="${t.line}" stroke-width="0.8"/>` +
    `<rect x="${40 + dx}" y="${y + 21}" width="14" height="4" rx="2" fill="${t.line}"/>`;
  return (
    `<rect x="16" y="314" width="5" height="4" fill="${t.shade}"/><rect x="66" y="314" width="5" height="4" fill="${t.shade}"/>` +
    `<rect x="14" y="194" width="58" height="121" rx="3" fill="${t.base}"/><rect x="14" y="194" width="9" height="121" fill="${t.shade}"/>` +
    // papers poking out of the open top drawer
    `<path d="M36 200 l4 -9 l14 3 l-2 6 z" fill="${t.pop}"/><path d="M48 200 l3 -7 l10 2 l-1 5 z" fill="${t.hi}"/>` +
    drawer(200, 3) + drawer(239) + drawer(278) +
    // a tired plant and a paper stack on top
    `<rect x="18" y="188" width="24" height="3" fill="${t.pop}"/><rect x="20" y="185" width="22" height="3" fill="${t.hi}"/><rect x="17" y="191" width="26" height="3" fill="${t.hi}"/>` +
    `<path d="M50 178 h16 l-2 16 h-12 z" fill="${t.shade}"/><rect x="49" y="176" width="18" height="4" rx="1" fill="${t.line}"/>` +
    `<path d="M58 176 q-2 -14 -12 -16 q0 9 12 16 z M58 176 q0 -18 8 -24 q4 10 -8 24 z M58 176 q8 -8 14 -4 q-4 6 -14 4 z" fill="${t.hi}"/>`
  );
}

function boxes(t) {
  return (
    `<rect x="180" y="274" width="68" height="44" fill="${t.base}"/><rect x="180" y="274" width="68" height="5" fill="${t.hi}"/>` +
    `<rect x="209" y="274" width="10" height="44" fill="${t.hi}"/><rect x="180" y="274" width="6" height="44" fill="${t.shade}"/>` +
    `<rect x="189" y="290" width="16" height="12" fill="${t.pop}"/><path d="M192 294 h10 M192 298 h6" stroke="${t.line}" stroke-width="1.2"/>` +
    `<path d="M229 305 v-12 m-4 4 l4 -4 l4 4 M240 305 v-12 m-4 4 l4 -4 l4 4" stroke="${t.line}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>` +
    g(
      "rotate(-4 212 260)",
      `<path d="M190 247 l-9 -9 l22 1 l8 8 z" fill="${t.shade}"/><rect x="190" y="247" width="46" height="27" fill="${t.base}"/>` +
        `<rect x="190" y="247" width="46" height="4" fill="${t.hi}"/><rect x="208" y="247" width="9" height="27" fill="${t.hi}"/>` +
        `<path d="M222 258 l8 0 M222 262 l8 0 M222 266 l5 0" stroke="${t.line}" stroke-width="1.2"/>`,
    )
  );
}

// The cat keeps its eyes in the dark, so they are drawn in beam colour in both versions.
function cat(t, lit, eyes = true) {
  const fur = lit ? "#2B241A" : "#0E0E11";
  return (
    `<path d="M239 243 Q250 241 248 229" stroke="${fur}" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M214 245 C210 228 216 219 225 219 C234 219 240 228 237 245 Z" fill="${fur}"/>` +
    `<circle cx="224" cy="212" r="9.500" fill="${fur}"/><path d="M215.500 208 L217 196 L223 204 Z M226 204 L231 196 L233 208 Z" fill="${fur}"/>` +
    (eyes ? `<ellipse cx="220.500" cy="212" rx="2.400" ry="${lit ? 2.2 : 1.7}" fill="${C.beam}"/><ellipse cx="228" cy="212" rx="2.400" ry="${lit ? 2.2 : 1.7}" fill="${C.beam}"/>` : "") +
    (lit && eyes ? `<path d="M220.500 210 v4 M228 210 v4" stroke="${C.ink}" stroke-width="1"/>` : "") + (lit ? `<path d="M224 215 l-1.200 1.400 h2.400 z" fill="${C.blush}"/><path d="M219 240 q6 4 12 0" stroke="#4A3F2C" stroke-width="1.2"/>` : "")
  );
}

function shelf(t) {
  const book = (x, w, h, fill, band = true) =>
    `<rect x="${x}" y="${200 - h}" width="${w}" height="${h}" rx="1" fill="${fill}"/>` +
    (band ? `<rect x="${x}" y="${206 - h}" width="${w}" height="2.500" fill="${t.line}"/>` : "");
  return (
    `<path d="M274 205 v9 l7 -9 z M344 205 v9 l-7 -9 z" fill="${t.shade}"/><rect x="262" y="200" width="96" height="5" rx="1" fill="${t.base}"/><rect x="262" y="200" width="96" height="1.500" fill="${t.hi}"/>` +
    book(268, 7, 28, t.base) + book(276, 9, 35, t.hi) + book(286, 6, 24, t.shade, false) + book(293, 8, 31, t.base) +
    g("rotate(14 306 200)", book(302, 7, 27, t.hi)) +
    // a little globe and a mug
    `<rect x="321" y="196" width="14" height="4" rx="1" fill="${t.shade}"/><path d="M328 196 v-5" stroke="${t.shade}" stroke-width="2"/>` +
    `<circle cx="328" cy="181" r="10" fill="${t.hi}"/><path d="M322 176 q4 -3 7 0 q-1 5 -6 4 z M329 184 q5 -2 7 2 q-3 4 -7 2 z" fill="${t.shade}"/><path d="M319 189 a10 10 0 0 0 18 -16" stroke="${t.line}" stroke-width="1.4"/>` +
    `<rect x="343" y="188" width="10" height="12" rx="2" fill="${t.base}"/><path d="M353 191 h2 a2 2 0 0 1 2 2 v2 a2 2 0 0 1 -2 2 h-2" stroke="${t.base}" stroke-width="2"/>`
  );
}

// The pale patch where a picture used to hang, with its nail still in the wall.
function missingPicture(t) {
  return (
    `<rect x="286" y="228" width="42" height="52" fill="${t.hi}" fill-opacity="0.55"/>` +
    `<path d="M286 228 h42 v52 h-42 z" stroke="${t.line}" stroke-width="1" stroke-dasharray="3 3"/>` +
    `<circle cx="307" cy="221" r="2" fill="${t.pop}"/><path d="M307 221 l3 -4" stroke="${t.pop}" stroke-width="1.2" stroke-linecap="round"/>`
  );
}

function plant(t) {
  const leaf = (r, s = 1) =>
    g(`translate(372 290) rotate(${r}) scale(${s})`, `<path d="M0 0 C-12 -16 -10 -40 0 -52 C10 -40 12 -16 0 0 Z" fill="${t.base}"/><path d="M0 -4 v-40 M0 -16 l-6 -7 M0 -16 l6 -7 M0 -28 l-5 -6 M0 -28 l5 -6" stroke="${t.shade}" stroke-width="1.4" stroke-linecap="round"/>`);
  return leaf(-38, 0.95) + leaf(34, 0.8) + leaf(-10, 1.15) + leaf(12, 1) + `<path d="M356 288 h32 l-4 30 h-24 z" fill="${t.shade}"/><rect x="354" y="285" width="36" height="6" rx="2" fill="${t.line}"/>`;
}

// ───────────────────────── More furniture for the wide room ─────────────────────────
// Each is drawn at the left of its own space and moved into place with `shift`.
function door(t) {
  return (
    `<rect x="0" y="156" width="78" height="162" fill="${t.shade}"/><rect x="6" y="162" width="66" height="156" fill="${t.base}"/>` +
    `<rect x="14" y="172" width="50" height="58" rx="2" fill="${t.hi}"/><rect x="14" y="240" width="50" height="68" rx="2" fill="${t.hi}"/>` +
    `<rect x="24" y="182" width="30" height="13" rx="2" fill="${t.pop}"/>` +
    `<path d="M28 185 v4 h4 M32 185 v7 M36.500 185.500 h4 v6 h-4 z M45 185 v4 h4 M49 185 v7" stroke="${t.line}" stroke-width="1.300" stroke-linejoin="round"/>` +
    `<circle cx="62" cy="246" r="3.600" fill="${t.pop}"/><rect x="6" y="315" width="66" height="3" fill="${t.dark}"/>`
  );
}

function desk(t) {
  return (
    // chair
    `<rect x="-24" y="252" width="6" height="66" fill="${t.shade}"/><rect x="-24" y="284" width="30" height="6" rx="2" fill="${t.shade}"/><rect x="0" y="290" width="5" height="28" fill="${t.shade}"/>` +
    `<rect x="4" y="268" width="6" height="50" fill="${t.shade}"/><rect x="110" y="268" width="6" height="50" fill="${t.shade}"/>` +
    `<rect x="76" y="268" width="38" height="36" fill="${t.hi}"/><rect x="88" y="276" width="14" height="4" rx="2" fill="${t.line}"/><rect x="88" y="292" width="14" height="4" rx="2" fill="${t.line}"/>` +
    `<rect x="0" y="262" width="120" height="6" rx="1" fill="${t.base}"/><rect x="0" y="262" width="120" height="1.500" fill="${t.hi}"/>` +
    // an old monitor with a question mark on it
    `<rect x="44" y="254" width="16" height="8" fill="${t.shade}"/><rect x="28" y="218" width="48" height="38" rx="5" fill="${t.base}"/><rect x="33" y="223" width="38" height="26" rx="3" fill="${t.dark}"/>` +
    `<path d="M48 231 a4 4 0 1 1 5.500 3.700 q-1.500 0.800 -1.500 3" stroke="${t.pop}" stroke-width="2" stroke-linecap="round"/><circle cx="52" cy="242.500" r="1.300" fill="${t.pop}"/>` +
    `<rect x="24" y="258" width="34" height="4" rx="1" fill="${t.hi}"/><rect x="92" y="250" width="10" height="12" rx="2" fill="${t.pop}"/>` +
    // a desk phone
    `<rect x="6" y="254" width="20" height="8" rx="2" fill="${t.shade}"/><rect x="4" y="249" width="24" height="6" rx="3" fill="${t.line}"/>`
  );
}

function bookcase(t) {
  const fills = [t.hi, t.pop, t.base, t.hi, t.line, t.pop, t.hi, t.base];
  const row = (y, seed) => {
    let x = 9;
    let out = `<rect x="6" y="${y}" width="72" height="34" fill="${t.shade}"/>`;
    for (let i = 0; x < 68; i++) {
      const w = 5 + ((seed + i * 3) % 4);
      const h = 20 + ((seed * 5 + i * 7) % 11);
      out += `<rect x="${x}" y="${y + 34 - h}" width="${w}" height="${h}" fill="${fills[(seed + i) % fills.length]}"/>`;
      x += w + 1;
    }
    return out;
  };
  return `<rect x="0" y="150" width="84" height="168" rx="2" fill="${t.base}"/><rect x="0" y="150" width="6" height="168" fill="${t.shade}"/>` + row(156, 1) + row(196, 4) + row(236, 2) + row(276, 6);
}

function nightWindow(t) {
  const pane = (x, y) => `<rect x="${x}" y="${y}" width="34" height="44" fill="${t.dark}"/>`;
  return (
    `<rect x="0" y="86" width="84" height="104" rx="2" fill="${t.base}"/>` + pane(6, 92) + pane(44, 92) + pane(6, 140) + pane(44, 140) +
    `<circle cx="60" cy="110" r="8" fill="${t.hi}"/><circle cx="64" cy="107" r="7" fill="${t.dark}"/>` +
    `<circle cx="16" cy="104" r="1" fill="${t.pop}"/><circle cx="28" cy="120" r="0.800" fill="${t.pop}"/><circle cx="54" cy="156" r="1" fill="${t.pop}"/><circle cx="22" cy="166" r="0.800" fill="${t.pop}"/><circle cx="70" cy="172" r="0.800" fill="${t.pop}"/>` +
    `<rect x="-5" y="190" width="94" height="6" rx="1" fill="${t.hi}"/>`
  );
}

function wallClock(t) {
  return `<circle cx="0" cy="0" r="17" fill="${t.base}"/><circle cx="0" cy="0" r="13.500" fill="${t.hi}"/><path d="M0 -11 v2 M0 9 v2 M-11 0 h2 M9 0 h2" stroke="${t.line}" stroke-width="1.400"/><path d="M0 0 L0 -8 M0 0 L6 3" stroke="${t.line}" stroke-width="1.800" stroke-linecap="round"/><circle cx="0" cy="0" r="1.500" fill="${t.line}"/>`;
}

function ladder(t) {
  const rungs = Array.from({ length: 6 }, (_, i) => `M${3 + i * 3.600} ${294 - i * 26} h34`).join(" ");
  return `<path d="${rungs}" stroke="${t.hi}" stroke-width="4" stroke-linecap="round"/><path d="M0 318 L22 152 M34 318 L56 152" stroke="${t.base}" stroke-width="5" stroke-linecap="round"/>`;
}

// ───────────────────────── The room ─────────────────────────
// Three bays wide. `tag` names the six objects that can be rummaged, so Rive can shake the unlit and lit copies together.
const shift = (dx, body) => g(`translate(${dx} 0)`, body);
const named = (tag, name, body) => (tag ? `<g id="${name}-${tag}">${body}</g>` : body);
const room = (t, lit, tag = "") =>
  wallAndFloor(t, GEO.width) + cobweb(t, !tag) + g(`translate(${GEO.width} 0) scale(-1 1)`, cobweb(t, false)) +
  shift(55, bulb(t)) + shift(435, bulb(t)) + shift(815, bulb(t)) +
  shift(250, nightWindow(t)) + shift(250, missingPicture(t)) + shift(330, shelf(t)) + shift(820, door(t)) + g("translate(940 112)", wallClock(t)) + shift(925, ladder(t)) +
  named(tag, "cabinet", cabinet(t)) + named(tag, "boxes", shift(-86, boxes(t) + cat(t, lit, !tag))) + named(tag, "bookcase", shift(410, bookcase(t))) +
  named(tag, "desk", shift(610, desk(t))) + named(tag, "crates", shift(820, boxes(t))) + named(tag, "plant", shift(770, plant(t)));

function mouse() {
  return `<ellipse cx="0" cy="0" rx="6" ry="3.500" fill="${C.creamShade}"/><circle cx="6" cy="-1" r="2.600" fill="${C.creamShade}"/><circle cx="7" cy="-3.500" r="1.500" fill="${C.blush}"/><circle cx="7.500" cy="-1.400" r="0.600" fill="${C.ink}"/><path d="M-6 0 q-6 0 -8 -4" stroke="${C.creamShade}" stroke-width="1"/>`;
}

// A beam is a wedge along the x axis. It is `near` wide either side where it starts and `far` at its end, and it can
// start a little way out from its pivot, so the searcher's beam leaves the torch lens and not the hand.
// The same wedge clips the lit room and draws the haze.
const wedge = (b, scale = 1) => {
  const start = (b.start ?? 0) / scale;
  return `M${start} ${-b.near / scale} L${b.length / scale} ${-b.far / scale} L${b.length / scale} ${b.far / scale} L${start} ${b.near / scale} Z`;
};
const disc = (r) => `M${r} 0 A${r} ${r} 0 1 1 ${-r} 0 A${r} ${r} 0 1 1 ${r} 0 Z`;
const hazeGradient = (id, len, strength) =>
  `<linearGradient id="hz-${id}" x1="0" y1="0" x2="${len}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.beam}" stop-opacity="${strength}"/><stop offset="1" stop-color="${C.beam}" stop-opacity="0.03"/></linearGradient>`;
const radial = (id, r, inner, outer = 0) =>
  `<radialGradient id="${id}" cx="0" cy="0" r="${r}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${C.beamCore}" stop-opacity="${inner}"/><stop offset="1" stop-color="${C.beam}" stop-opacity="${outer}"/></radialGradient>`;

const HERO = GEO.hero;
const FLOOR_Y = GEO.floor;
const B = GEO.beams;
const L = GEO.lights;
// Where each helper stands when the file is imported. The game moves them afterwards.
const HELPER_X = { satellite: 500, detective: 30, intern: 420, crawler: 700, dog: 200 };
const HELPER_AIM = { intern: -30, crawler: -150, detective: -15, satellite: 80 };
const DRAW = { intern, crawler, detective, satellite, dog };
// Scattered start positions for glints and dust, from a fixed sequence so the file is the same on every run.
const scatter = (count, seed) => Array.from({ length: count }, (_, i) => [16 + ((seed * 97 + i * 211) % (GEO.width - 32)), 20 + ((seed * 53 + i * 137) % 340)]);
const MOTES = scatter(54, 3).map(([x, y], i) => [x, Math.min(300, y), 0.9 + (i % 4) * 0.2]);

function moth() {
  return `<g id="moth-wings"><path d="M0 0 C-9 -9 -13 -2 -9 3 C-6 6 -2 4 0 0 Z M0 0 C9 -9 13 -2 9 3 C6 6 2 4 0 0 Z" fill="${C.cream}"/><circle cx="-6" cy="-1" r="1.300" fill="${C.slateLight}"/><circle cx="6" cy="-1" r="1.300" fill="${C.slateLight}"/></g><ellipse cx="0" cy="0.500" rx="1.600" ry="4" fill="${C.slateDark}"/>`;
}

// A loose sheet of paper. One of these, drawn larger, is "the page".
function sheet() {
  return `<path d="M-7 -9 h10 l4 4 v14 h-14 z" fill="${C.cream}"/><path d="M3 -9 v4 h4 z" fill="${C.creamShade}"/><path d="M-4 -2 h8 M-4 2 h8 M-4 6 h5" stroke="${C.slateLight}" stroke-width="1.200" stroke-linecap="round"/>`;
}

// ───────────────────────── The scene as Rive imports it ─────────────────────────
// Ids become layer names in Rive. Anything that moves sits in its own group, translated to its pivot,
// with no rotation or scale of its own, so the game and the timelines start from clean values.
function rigScene() {
  const s = HERO.scale;
  const hand = { x: HERO.x + HERO.handX, y: HERO.handY };
  const origin = (name) => ({ x: HELPER_X[name] + B[name].dx, y: B[name].oy });
  const beamed = ["intern", "crawler", "detective", "satellite"];
  const helper = (name) => {
    const y = name === "dog" ? GEO.dog.y : B[name].y;
    const hs = name === "dog" ? GEO.dog.scale : B[name].scale;
    const flip = name === "crawler" ? -hs : hs;
    const inner = `<g transform="scale(${flip} ${hs})">${DRAW[name](false)}</g>`;
    return `<g id="helper-${name}" transform="translate(${HELPER_X[name]} ${y})">${name === "dog" ? `<g id="dog-flip">${inner}</g>` : inner}</g>`;
  };
  const ring = Array.from({ length: 6 }, (_, i) => sparkle(Math.cos((i * Math.PI) / 3) * 17, Math.sin((i * Math.PI) / 3) * 17, i % 2 ? 3 : 4.5, C.beamCore)).join("");
  const glow = (r) => `<circle cx="0" cy="0" r="${r}" fill="url(#glow)"/>`;
  // A dark disc behind every marker, so it still reads when the wall behind it is lit.
  const backing = (r) => `<circle cx="0" cy="0" r="${r}" fill="#000000" fill-opacity="0.5"/>`;
  // Lights that belong to the room: three ceiling bulbs and the moon through the window. Each is a clip path and a haze.
  const fixed = [...L.bulbs.map((bulb, i) => ({ id: `bulb-${i}`, x: bulb.x, y: bulb.y, angle: 90, ...L.bulb })), { id: "moon", ...L.moon }];
  const head = { x: HERO.x + L.head.dx, y: L.head.y };
  return (
    `<defs><clipPath id="beam"><path id="beam-main" transform="translate(${hand.x} ${hand.y})" d="${wedge(B.main)}"/>` +
    beamed.map((n) => `<path id="beam-${n}" transform="translate(${origin(n).x} ${origin(n).y}) rotate(${HELPER_AIM[n]})" d="${wedge(B[n])}"/>`).join("") +
    fixed.map((f) => `<path id="beam-${f.id}" transform="translate(${f.x} ${f.y}) rotate(${f.angle})" d="${wedge(f)}"/>`).join("") +
    `<path id="beam-head" transform="translate(${head.x} ${head.y}) rotate(${L.head.angle})" d="${wedge(L.head)}"/>` +
    `<path id="beam-lantern" transform="translate(${HERO.x} ${L.lantern.y})" d="${disc(L.lantern.radius)}"/>` +
    // Lightning: the whole room, slid into view for an instant.
    `<path id="beam-flash" transform="translate(-5000 0)" d="M0 0 H${GEO.width} V${GEO.height} H0 Z"/>` +
    `</clipPath>${hazeGradient("main", B.main.length / s, B.main.strength)}${beamed.map((n) => hazeGradient(n, B[n].length, B[n].strength)).join("")}` +
    fixed.map((f) => hazeGradient(f.id, f.length, f.strength)).join("") + hazeGradient("head", L.head.length / s, L.head.strength) +
    radial("glow", 12, 0.85) + radial("lantern-glow", L.lantern.radius, L.lantern.strength) + `</defs>` +
    `<g id="room-dark">${room(UNLIT, false, "dark")}</g>` +
    `<g id="room-lit" clip-path="url(#beam)">${room(LIT, true, "lit")}<g id="motes">${MOTES.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${C.beamCore}" fill-opacity="0.8"/>`).join("")}</g></g>` +
    `<g id="cat-eyes" transform="translate(138.250 212)"><ellipse cx="-3.750" cy="0" rx="2.400" ry="1.900" fill="${C.beam}"/><ellipse cx="3.750" cy="0" rx="2.400" ry="1.900" fill="${C.beam}"/></g>` +
    `<g id="cat-collar" transform="translate(${GEO.cat.x} ${GEO.cat.y})"><rect x="-7" y="-2" width="14" height="4" rx="2" fill="${C.yellow}"/><circle cx="0" cy="3.500" r="2.200" fill="${C.yellowDeep}"/></g>` +
    `<g id="mouse-eyes" transform="translate(249 313)"><circle cx="-2" cy="0" r="0.900" fill="${C.beam}"/><circle cx="2" cy="0" r="0.900" fill="${C.beam}"/></g>` +
    `<g id="spider" transform="translate(48 48)">${spiderOnThread(UNLIT, 0, 0)}</g>` +
    fixed.map((f) => `<g id="haze-${f.id}" transform="translate(${f.x} ${f.y}) rotate(${f.angle})"><path d="${wedge(f)}" fill="url(#hz-${f.id})"/></g>`).join("") +
    beamed.map((n) => `<g id="haze-${n}" transform="translate(${origin(n).x} ${origin(n).y}) rotate(${HELPER_AIM[n]})"><path d="${wedge(B[n])}" fill="url(#hz-${n})"/></g>`).join("") +
    Object.entries(FINDS).map(([name, draw]) => `<g id="find-${name}" transform="translate(${HERO.x + 60} ${FLOOR_Y})"><g transform="translate(-22.400 -43) scale(0.56)">${draw(LIT)}</g></g>`).join("") +
    `<g id="sparkles" transform="translate(${HERO.x + 60} ${FLOOR_Y - 24})">${sparkle(-28, -18, 5, C.beamCore) + sparkle(28, -6, 3.5, C.beamCore) + sparkle(8, -30, 2.6, C.beamCore)}</g>` +
    GEO.stashes.map((st, i) => `<g id="stash-${i}" transform="translate(${st.x} ${st.y})">${backing(13)}<g id="stash-glow-${i}">${glow(16)}</g><circle cx="0" cy="0" r="10" stroke="${C.beamCore}" stroke-opacity="0.8" stroke-width="1.400"/>${sparkle(0, 0, 6, C.beamCore)}</g>`).join("") +
    scatter(GEO.glints, 7).map(([x, y], i) => `<g id="glint-${i}" transform="translate(${x} ${y})">${backing(5.5)}<g id="glow-${i}">${glow(12)}</g>${sparkle(0, 0, 3.6, C.beamCore)}</g>`).join("") +
    // Something that needs a light on it quickly: the ringing phone.
    `<g id="alert" transform="translate(${GEO.phone.x} ${GEO.phone.y})">${backing(13)}<circle cx="0" cy="0" r="10" stroke="${C.yellow}" stroke-width="1.800"/><path d="M0 -5 v6" stroke="${C.yellow}" stroke-width="2.400" stroke-linecap="round"/><circle cx="0" cy="4.500" r="1.400" fill="${C.yellow}"/></g>` +
    Array.from({ length: GEO.pages }, (_, i) => `<g id="page-${i}" transform="translate(${GEO.door.x - i * 22} ${GEO.door.y})">${sheet()}</g>`).join("") +
    `<g id="moth" transform="translate(${HERO.x + 120} 120)">${moth()}</g>` +
    `<g id="mouse" transform="translate(-40 ${GEO.mouseY})">${mouse()}</g>` +
    helper("satellite") + helper("detective") +
    `<g id="hero" transform="translate(${HERO.x} ${FLOOR_Y})"><ellipse cx="0" cy="1" rx="26" ry="4" fill="#000000" fill-opacity="0.6"/>` +
    `<g id="haze-lantern" transform="translate(0 ${L.lantern.y - FLOOR_Y})"><circle cx="0" cy="0" r="${L.lantern.radius}" fill="url(#lantern-glow)"/></g>` +
    `<g id="hero-flip"><g id="hero-body"><g transform="scale(${s})">${searcher({ rig: wedge(B.main, s) })}` +
    // The headlamp: a small lamp on the hood and its own little beam.
    `<g id="headlamp" transform="translate(${L.head.dx / s} ${(L.head.y - FLOOR_Y) / s})"><g id="haze-head" transform="rotate(${L.head.angle})"><path d="${wedge(L.head, s)}" fill="url(#hz-head)"/></g><rect x="-6" y="-7" width="12" height="12" rx="4" fill="${C.slate}"/><circle cx="2" cy="-1" r="4" fill="${C.beamCore}"/></g>` +
    `</g></g></g></g>` +
    helper("intern") + helper("crawler") + helper("dog") +
    `<g id="burst" transform="translate(${HERO.x} 200)"><circle cx="0" cy="0" r="12" stroke="${C.beamCore}" stroke-width="1.500"/>${ring}</g>`
  );
}

// ───────────────────────── Files ─────────────────────────
const write = (name, content) => writeFileSync(out + name, content);

write("rive-scene.svg", svg(GEO.width, GEO.height, rigScene()));
// The whole room in each colouring, for review.
write("room-dark.svg", svg(GEO.width, GEO.height, room(UNLIT, false)));
write("room-lit.svg", svg(GEO.width, GEO.height, room(LIT, true)));

for (const [name, draw] of Object.entries(FINDS)) write(`find-${name}.svg`, svg(80, 80, draw(LIT)));
const cast = [[intern(), 80, 200], [crawler(), 250, 200], [dog(), 430, 200], [detective(), 610, 200]];
write("sheet-helpers.svg", svg(900, 230, `<rect width="900" height="230" fill="#0A0A0C"/>` + cast.map(([b, x, y]) => g(`translate(${x} ${y})`, b)).join("") + g("translate(790 90)", satellite())));
write("sheet-finds.svg", svg(800, 110, `<rect width="800" height="110" fill="${LIT.wall}"/>` + Object.keys(FINDS).map((n, i) => g(`translate(${10 + i * 100} 15)`, FINDS[n](LIT))).join("")));
write("sheet-poses.svg", svg(600, 240, `<rect width="600" height="240" fill="#0A0A0C"/>` + g("translate(90 226)", searcher()) + g("translate(290 226)", searcher({ aim: -42, mood: "wow" })) + g("translate(490 226)", searcher({ aim: 16, mood: "happy" }))));
console.log("wrote", out);
