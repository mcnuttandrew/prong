import * as vega from "vega";
import { parse, View } from "vega";

import { simpleParse } from "../lib/utils";

export function isDataTable(input: any): boolean {
  // array
  if (!Array.isArray(input)) {
    return false;
  }
  // array of objects
  if (!input.every((x) => typeof x === "object")) {
    return false;
  }

  const types = Array.from(
    new Set(input.flatMap((row) => Object.values(row).map((el) => typeof el)))
  );
  const allowed = new Set(["string", "number", "boolean"]);
  return types.every((typ) => allowed.has(typ));
}

export const maybeTrim = (x: string) => {
  return x.at(0) === '"' && x.at(-1) === '"' ? x.slice(1, x.length - 1) : x;
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
