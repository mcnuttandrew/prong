import React, { useState, useEffect } from "react";
import Editor from "../components/Editor";
import StandardProjections from "../projections/standard-bundle";
import VegaSchema from "../constants/vega-schema.json";
import { bin } from "d3-array";
import { scaleBand, scaleLinear } from "d3-scale";
import { SyntaxNode } from "@lezer/common";
import { ProjectionProps } from "../lib/projections";
import { isDataTable } from "./example-utils";

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
function getDataSetName(node: SyntaxNode, fullCode: string): string | false {
  const x =
    node?.parent?.parent?.parent?.parent?.parent?.parent?.parent?.parent;
  if (!x) {
    return false;
  }
  const parsedCode = simpleParse(fullCode.slice(x.from, x.to), false);
  if (!parsedCode) {
    return false;
  }
  const target = parsedCode?.from?.data;
  return target || false;
}

function buildHistogramProjection(
  preComputedHistograms: PreComputedHistograms
) {
  return function HistogramProjection(props: ProjectionProps) {
    const [selectedBin, setSelectedBin] = useState<d3.Bin<
      number,
      number
    > | null>(null);
    const { currentValue, node, fullCode } = props;
    const key = currentValue.slice(1, currentValue.length - 1);
    const datasetName = getDataSetName(node, fullCode);
    if (!datasetName) {
      return <div></div>;
    }
    const histogram: d3.Bin<number, number>[] =
      preComputedHistograms?.[datasetName]?.[key];
    if (!histogram) {
      return <div></div>;
    }
    const height = 15;
    const width = 150;
    const xScale = scaleBand()
      .domain(histogram.map((d) => d.x0) as any)
      .range([0, width]);
    const yScale = scaleLinear()
      .domain([0, Math.max(...histogram.map((el) => el.length))])
      .range([0, height]);
    const textProps = {
      fontSize: 8,
      textAnchor: "middle",
      pointerEvents: "none",
      x:
        xScale.bandwidth() / 2 +
        (!!selectedBin ? xScale(selectedBin.x0 as any) || 0 : 0),
    };
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg height={height} width={width} style={{ overflow: "visible" }}>
          <g transform="translate(0, 2.5)">
            <rect
              width={width}
              height={height}
              stroke="gray"
              strokeDasharray="4 1"
              fill="ghostwhite"
            ></rect>
            {histogram.map((bin, idx) => {
              const isSelected =
                selectedBin &&
                selectedBin.x0 === bin.x0 &&
                selectedBin?.x1 === bin.x1;

              return (
                <g key={idx} transform={`translate(${xScale(bin.x0 as any)})`}>
                  <rect
                    x={0}
                    stroke="white"
                    width={xScale.bandwidth()}
                    y={height - yScale(bin.length)}
                    fill="#9BCF63"
                    height={yScale(bin.length)}
                    opacity={isSelected ? 1 : 0.8}
                  ></rect>

                  <rect
                    onMouseEnter={() => setSelectedBin(bin)}
                    onMouseLeave={() => setSelectedBin(null)}
                    x={0}
                    width={xScale.bandwidth()}
                    y={0}
                    fill="white"
                    height={height}
                    opacity={0}
                  ></rect>
                </g>
              );
            })}
            {selectedBin && (
              <text y={-2} {...textProps} pointerEvents="none">
                {selectedBin.length}
              </text>
            )}
            {selectedBin && (
              <text y={height + 2} {...textProps} pointerEvents="none">
                {`[${selectedBin.x0} - ${selectedBin.x1}]`}
              </text>
            )}
          </g>
        </svg>
      </div>
    );
  };
}

type PreComputedHistograms = Record<
  string,
  Record<string, d3.Bin<number, number>[]>
>;
function InSituFigure1() {
  const [currentCode, setCurrentCode] = useState(connectedScatterPlotSpec);
  const [preComputedHistograms, setPrecomputedHistograms] =
    useState<PreComputedHistograms>({});

  useEffect(() => {
    try {
      const view = new View(
        parse(simpleParse(currentCode, {}), {})
      ).initialize();
      view.runAsync().then(() => {
        const x = view.getState({
          signals: vega.falsy,
          data: vega.truthy,
          recurse: true,
        });
        const namedPairs = Object.entries(x.data)
          .filter(([key, dataSet]) => isDataTable(dataSet))
          .map(([key, data]) => [key, createHistograms(data as DataTable)]);
        setPrecomputedHistograms(Object.fromEntries(namedPairs));
      });
    } catch (err) {
      console.log(err);
    }
  }, [currentCode]);

  return (
    <Editor
      schema={VegaSchema}
      code={currentCode}
      onChange={(x) => setCurrentCode(x)}
      projections={[
        ...StandardProjections,
        {
          name: "inline-widget",
          projection: buildHistogramProjection(preComputedHistograms),
          hasInternalState: false,
          type: "inline",
          mode: "suffix",
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
