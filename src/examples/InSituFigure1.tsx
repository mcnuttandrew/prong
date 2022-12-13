import React, { useState, useEffect } from "react";
import Editor from "../components/Editor";
import StandardProjections from "../projections/standard-bundle";
import VegaSchema from "../constants/vega-schema.json";
import { bin } from "d3-array";

import * as vega from "vega";
import { parse, View } from "vega";

import { simpleParse } from "../lib/utils";

const connectedScatterPlotSpec = `{
  "marks": [
    {
      "type": "text",
      "from": {"data": "drive"},
      "encode": {
        "enter": {
          "x": {"scale": "x", "field": "miles"},
          "y": {"scale": "y", "field": "gas"},
          "dx": {"scale": "dx", "field": "side"},
          "dy": {"scale": "dy", "field": "side"},
          "fill": {"value": "#000"},
          "text": {"field": "year"},
          "align": {"scale": "align", "field": "side"},
          "baseline": {"scale": "base", "field": "side"}
        }
      }
    }
  ],
  "$schema": "https://vega.github.io/schema/vega/v3.0.json",
  "width": 800,
  "height": 500,
  "padding": 5,

  "data": [{ "name": "drive", "url": "data/driving.json"}],
  "scales": [
    {
      "name": "x",
      "type": "linear",
      "domain": {"data": "drive", "field": "miles"},
      "range": "width",
      "nice": true,
      "zero": false,
      "round": true
    },
    {
      "name": "y",
      "type": "linear",
      "domain": {"data": "drive", "field": "gas"},
      "range": "height",
      "nice": true,
      "zero": false,
      "round": true
    },
    {
      "name": "align",
      "type": "ordinal",
      "domain": ["left", "right", "top", "bottom"],
      "range": ["right", "left", "center", "center"]
    },
    {
      "name": "base",
      "type": "ordinal",
      "domain": ["left", "right", "top", "bottom"],
      "range": ["middle", "middle", "bottom", "top"]
    },
    {
      "name": "dx",
      "type": "ordinal",
      "domain": ["left", "right", "top", "bottom"],
      "range": [-7, 6, 0, 0]
    },
    {
      "name": "dy",
      "type": "ordinal",
      "domain": ["left", "right", "top", "bottom"],
      "range": [1, 1, -5, 6]
    }
  ]
}`;

function isDataTable(input: any): boolean {
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

type DataTable = Record<string, number | string | boolean | undefined>[];
// this is an imperfect histogram
function createHistograms(
  data: DataTable
): Record<string, d3.Bin<number, number>[]> {
  const keys = Object.keys(data[0]);
  const histograms: Record<string, d3.Bin<number, number>[]> = {};
  keys
    .filter((key) => data.every((row) => typeof row[key] === "number"))
    .forEach((key) => {
      const values: number[] = data.map((x) => x[key] as number);
      const domain: [number, number] = [
        Math.min(...values),
        Math.max(...values),
      ];
      histograms[key] = bin().domain(domain)(values);
    });
  return histograms;
}
function InSituFigure1() {
  const [currentCode, setCurrentCode] = useState(connectedScatterPlotSpec);
  const [vegaState, setVegaState] = useState({});
  const [preComputedHistgrams, setPrecomputedHistograms] = useState<
    Record<string, any>
  >({});

  useEffect(() => {
    try {
      const view = new View(
        parse(simpleParse(currentCode, {}), {})
      ).initialize();
      view.runAsync().then(() => {
        // resolve(
        const x = view.getState({
          signals: vega.falsy,
          data: vega.truthy,
          recurse: true,
        });
        const namedPairs = Object.entries(x.data)
          .filter(([key, dataSet]) => isDataTable(dataSet))
          .map(([key, data]) => [key, createHistograms(data as DataTable)]);
        setPrecomputedHistograms(Object.fromEntries(namedPairs));
        setVegaState(x);
        // );
      });
    } catch (err) {
      console.log(err);
    }
  }, [currentCode]);
  console.log(preComputedHistgrams);

  return (
    <Editor
      schema={VegaSchema}
      code={currentCode}
      onChange={(x) => setCurrentCode(x)}
      projections={[
        ...StandardProjections,
        {
          name: "inline-widget",
          projection: ({ currentValue }) => {
            const key = currentValue.slice(1, currentValue.length);
            console.log(preComputedHistgrams[key]);
            // const
            return (
              <div>
                {currentValue} <div></div>
              </div>
            );
          },
          hasInternalState: false,
          type: "inline",
          query: {
            type: "index",
            query: [
              "marks",
              0,
              "encode",
              "enter",
              "*",
              "field",
              "field___value",
            ],
          },
        },
      ]}
    />
  );
}

export default InSituFigure1;
