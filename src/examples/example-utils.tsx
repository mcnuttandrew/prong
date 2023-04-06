import { useState, useEffect, useRef } from "react";

import * as vega from "vega";
import { parse, View } from "vega";

import { simpleParse, setIn } from "../lib/utils";
import { ProjectionProps } from "../lib/projections";

export const maybeTrim = (x: string) => {
  return x.at(0) === '"' && x.at(-1) === '"' ? x.slice(1, x.length - 1) : x;
};

export const usePersistedState = (name: string, defaultValue: any) => {
  const [value, setValue] = useState(defaultValue);
  const nameRef = useRef(name);

  useEffect(() => {
    try {
      const storedValue = localStorage.getItem(name);
      if (storedValue !== null) setValue(storedValue);
      else localStorage.setItem(name, defaultValue);
    } catch {
      setValue(defaultValue);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(nameRef.current, value);
    } catch {}
  }, [value]);

  useEffect(() => {
    const lastName = nameRef.current;
    if (name !== lastName) {
      try {
        localStorage.setItem(name, value);
        nameRef.current = name;
        localStorage.removeItem(lastName);
      } catch {}
    }
  }, [name]);

  return [value, setValue];
};
export function analyzeVegaCode(
  currentCode: string,
  analysis: (viewState: { signals?: any; data?: any }) => void
) {
  try {
    const code = simpleParse(currentCode, {});
    const spec = parse(code, {}, { ast: true });
    const view = new View(spec).initialize();
    view.runAsync().then(() => {
      const x = view.getState({
        signals: vega.truthy,
        data: vega.truthy,
        recurse: true,
      });
      analysis(x);
    });
  } catch (err) {
    console.log(err);
  }
}

export type Table = Record<string, any>[];
export function extractFieldNames(data: Table) {
  const fieldNames = new Set<string>([]);
  data.forEach((row) => {
    Object.keys(row).forEach((fieldName) => fieldNames.add(fieldName));
  });
  return Array.from(fieldNames);
}

export const buttonListProjection =
  (list: string[], currentCode: string) => (props: ProjectionProps) => {
    return (
      <div>
        {list.map((item) => {
          return (
            <button
              key={item}
              onClick={() =>
                props.setCode(setIn(props.keyPath, `"${item}"`, currentCode))
              }
            >
              {item}
            </button>
          );
        })}
      </div>
    );
  };
