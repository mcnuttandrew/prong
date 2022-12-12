import React, { useState } from "react";

import VegaSchema from "../constants/vega-schema.json";
import Editor from "../components/Editor";
import StandardProjections from "../projections/standard-bundle";
import { vegaCode } from "./example-data";

function VegaExampleApp() {
  const [currentCode, setCurrentCode] = useState(vegaCode);

  return (
    <Editor
      schema={VegaSchema}
      code={currentCode}
      onChange={(x) => setCurrentCode(x)}
      projections={StandardProjections}
    />
  );
}

export default VegaExampleApp;
