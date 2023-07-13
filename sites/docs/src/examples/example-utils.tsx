import { useState, useEffect, useRef } from "react";

import * as vega from "vega";
import { parse, View } from "vega";

import {
  utils,
  ProjectionProps,
  Projection,
} from "../../../../packages/prong-editor/src/index";
const { simpleParse, setIn } = utils;

export function classNames(input: Record<string, boolean>) {
  return Object.entries(input)
    .filter(([_key, value]) => value)
    .map(([key]) => key)
    .join(" ");
}

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(nameRef.current, value);
    } catch (e) {
      console.error(e);
    }
  }, [value]);

  useEffect(() => {
    const lastName = nameRef.current;
    if (name !== lastName) {
      try {
        localStorage.setItem(name, value);
        nameRef.current = name;
        localStorage.removeItem(lastName);
      } catch (e) {
        console.error(e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    view
      .runAsync()
      .then(() => {
        const x = view.getState({
          signals: vega.truthy,
          data: vega.truthy,
          recurse: true,
        });
        analysis(x);
      })
      .catch((e) => {
        console.error(e);
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

export const buildInlineDropDownProjection = (
  options: string[],
  currentValue: string,
  indexTarget: (string | number)[]
): Projection => ({
  query: { type: "index", query: indexTarget },
  type: "inline",
  hasInternalState: false,
  mode: "replace",
  projection: ({ setCode, fullCode }) => {
    return (
      <select
        value={currentValue}
        aria-label="generic selector"
        onChange={(e) =>
          setCode(setIn(indexTarget, `"${e.target.value}"`, fullCode))
        }
      >
        {options.map((opt) => (
          <option key={opt}>{opt}</option>
        ))}
      </select>
    );
  },
});
