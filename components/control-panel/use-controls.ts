"use client";

import { useCallback, useEffect, useState } from "react";
import { decode, defaults, encode, portable, randomize, sanitize, type Schema, type Values } from "./schema";

const LINK_PREFIX = "#c=";

export type Controls<S extends Schema> = {
  schema: S;
  values: Values<S>;
  set: <K extends keyof Values<S>>(key: K, value: Values<S>[K]) => void;
  reset: () => void;
  randomize: () => void;
  // A link to this page that opens with the current values.
  shareUrl: () => string;
};

// Values persist in localStorage under `<namespace>:controls`. Pass the prototype's slug as the namespace.
// A link made by `shareUrl` carries values in its hash, and those win over the saved ones.
export function useControls<S extends Schema>(namespace: string, schema: S): Controls<S> {
  const storageKey = `${namespace}:controls`;
  const [values, setValues] = useState<Values<S>>(() => defaults(schema));

  useEffect(() => {
    try {
      const hash = window.location.hash;
      const shared = hash.startsWith(LINK_PREFIX) ? decode(hash.slice(LINK_PREFIX.length)) : null;
      const stored = shared ?? JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
      if (!stored) return;
      const next = sanitize(schema, stored);
      if (shared) {
        // A shared link is used once: its values are saved like any others and the hash is cleared.
        window.localStorage.setItem(storageKey, JSON.stringify(portable(schema, next)));
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      // Saved and shared values only exist in the browser, so they are applied after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValues(next);
    } catch {}
  }, [storageKey, schema]);

  const update = useCallback(
    (next: Values<S>) => {
      setValues(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(portable(schema, next)));
      } catch {}
    },
    [storageKey, schema],
  );

  return {
    schema,
    values,
    set: (key, value) => update({ ...values, [key]: value }),
    reset: () => update(defaults(schema)),
    randomize: () => update(randomize(schema, values)),
    shareUrl: () =>
      `${window.location.origin}${window.location.pathname}${LINK_PREFIX}${encode(portable(schema, values))}`,
  };
}
