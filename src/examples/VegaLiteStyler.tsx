import React, { useState } from "react";
import StandardProjections from "../projections/standard-bundle";
import { vegaLiteCode, vegaLiteScatterPlot } from "./example-data";

import { buttonListProjection } from "./VegaExample";

import { VegaLite } from "react-vega";

import { simpleParse } from "../lib/utils";
import "../stylesheets/vega-lite-example.css";
import Editor from "../components/Editor";

import VegaLiteV5Schema from "../constants/vega-lite-v5-schema.json";
const updatedSchema = {
  ...VegaLiteV5Schema,
  $ref: "#/definitions/Config",
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
      <Editor
        schema={updatedSchema}
        code={currentCode}
        onChange={(x) => setCurrentCode(x)}
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
      <div className="flex-down">
        {[vegaLiteScatterPlot, vegaLiteCode].map((spec, idx) => {
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
