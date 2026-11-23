import { SCENE } from "./data";

type Point = { x: number; y: number };

const clamp = (angle: number) => Math.min(SCENE.aimMax, Math.max(SCENE.aimMin, angle));

// The torch angle, in degrees, that points from the searcher's hand at a point on the artboard.
export function aimAt(point: Point) {
  const dx = Math.max(1, point.x - SCENE.pivot.x);
  return clamp((Math.atan2(point.y - SCENE.pivot.y, dx) * 180) / Math.PI);
}

// A slow sweep for when nobody is tapping.
export function idleAim(seconds: number) {
  return SCENE.aimRest + SCENE.aimSweep * Math.sin(seconds * 0.55);
}

// Moves towards a target with smooth deceleration and no overshoot, whatever the frame rate.
export function approach(current: number, target: number, seconds: number, speed = 9) {
  return target + (current - target) * Math.exp(-speed * seconds);
}

// Converts a pointer position inside the scene element into artboard units.
export function toArtboard(clientX: number, clientY: number, box: DOMRect): Point {
  return { x: ((clientX - box.left) / box.width) * SCENE.width, y: ((clientY - box.top) / box.height) * SCENE.height };
}
