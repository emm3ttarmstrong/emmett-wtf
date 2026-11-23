"use client";

import { useCallback, useEffect, useState } from "react";
import { defaults, randomize, sanitize, type Schema, type Values } from "./schema";

export type Controls<S extends Schema> = {
  schema: S;
  values: Values<S>;
  set: <K extends keyof S>(key: K, value: Values<S>[K]) => void;
  reset: () => void;
  randomize: () => void;
};

// Values persist in localStorage under `<namespace>:controls`. Pass the prototype's slug as the namespace.
export function useControls<S extends Schema>(namespace: string, schema: S): Controls<S> {
  const storageKey = `${namespace}:controls`;
  const [values, setValues] = useState<Values<S>>(() => defaults(schema));

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      // Stored values only exist in the browser, so they are applied after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored) setValues(sanitize(schema, JSON.parse(stored)));
    } catch {}
  }, [storageKey, schema]);

  const update = useCallback(
    (next: Values<S>) => {
      setValues(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
    },
    [storageKey],
  );

  return {
    schema,
    values,
    set: (key, value) => update({ ...values, [key]: value }),
    reset: () => update(defaults(schema)),
    randomize: () => update(randomize(schema)),
  };
}
