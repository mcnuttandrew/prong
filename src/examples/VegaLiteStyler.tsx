import React, { useState, FC, useEffect } from "react";
import StandardProjections from "../projections/standard-bundle";

import "../stylesheets/vega-lite-example.css";
import Editor from "../components/Editor";

import VegaLiteV5Schema from "../constants/vega-lite-v5-schema.json";
const updatedSchema = {
  ...VegaLiteV5Schema,
  $ref: "#/definitions/Config",
};

function VegaLiteExampleApp() {
  const [currentCode, setCurrentCode] = useState("{}");

  return (
    <div className="App">
      <Editor
        schema={updatedSchema}
        code={currentCode}
        onChange={(x) => setCurrentCode(x)}
        projections={StandardProjections}
      />
    </div>
  );
}

export default VegaLiteExampleApp;
