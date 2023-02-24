import React, { useState } from "react";
import StandardProjections from "../projections/standard-bundle";
import {
  dark,
  excel,
  fivethirtyeight,
  ggplot2,
  googlecharts,
  latimes,
  powerbi,
  quartz,
  urbaninstitute,
} from "vega-themes";
import {
  vegaLiteCode,
  vegaLiteScatterPlot,
  vegaLiteHeatmap,
  vegaLiteStreamgraph,
  vegaLiteLinechart,
} from "./example-data";

import { buttonListProjection } from "./VegaExample";

import { VegaLite } from "react-vega";

import { simpleParse } from "../lib/utils";
import "../stylesheets/vega-lite-example.css";
import Editor from "../components/Editor";
import prettifier from "../lib/vendored/prettifier";

import VegaLiteV5Schema from "../constants/vega-lite-v5-schema.json";
const updatedSchema = {
  ...VegaLiteV5Schema,
  $ref: "#/definitions/Config",
};

const themes = {
  dark,
  excel,
  fivethirtyeight,
  ggplot2,
  googlecharts,
  latimes,
  powerbi,
  quartz,
  urbaninstitute,
  empty: {},
};

const fonts = [
  "Arial",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Times New Roman",
  "Georgia",
  "Garamond",
  "Courier New",
  "Brush Script MT",
];

function VegaLiteExampleApp() {
  const [currentCode, setCurrentCode] = useState("{ }");

  return (
    <div className="styler-app flex">
      <div className="flex-down">
        <h5>Predefined Themes</h5>
        <div className="flex">
          {Object.entries(themes).map(([themeName, theme]) => {
            return (
              <button
                key={themeName}
                onClick={() => setCurrentCode(prettifier(theme))}
              >
                {themeName}
              </button>
            );
          })}
        </div>

        <Editor
          schema={updatedSchema}
          code={currentCode}
          onChange={(x) => setCurrentCode(x)}
          height={"800px"}
          projections={[
            ...StandardProjections,
            {
              type: "tooltip",
              name: "Switch to",
              query: { type: "schemaMatch", query: ["font"] },
              projection: buttonListProjection(fonts, currentCode),
            },
          ]}
        />
      </div>
      <div className="chart-container">
        {[
          vegaLiteScatterPlot,
          vegaLiteCode,
          vegaLiteHeatmap,
          vegaLiteStreamgraph,
          vegaLiteLinechart,
        ].map((spec, idx) => {
          return (
            <VegaLite
              key={idx}
              spec={JSON.parse(spec)}
              config={simpleParse(currentCode, {})}
            />
          );
        })}
      </div>
    </div>
  );
}

export default VegaLiteExampleApp;
