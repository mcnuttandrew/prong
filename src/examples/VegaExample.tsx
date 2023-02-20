import React, { useState, useEffect } from "react";

import VegaSchema from "../constants/vega-schema.json";
import Editor from "../components/Editor";
import StandardProjections from "../projections/standard-bundle";
import { vegaCode } from "./example-data";
import { isDataTable } from "./example-utils";

import { simpleParse } from "../lib/utils";

import * as vega from "vega";
import { parse, View } from "vega";

function extractFieldNames(dataSets: Record<string, any>) {
  const fieldNames = new Set<string>([]);
  Object.values(dataSets).forEach((data) => {
    if (!isDataTable(data)) {
      return;
    }
    data.forEach((row: Record<string, any>) => {
      Object.keys(row).forEach((fieldName) => fieldNames.add(fieldName));
    });
  });
  return Array.from(fieldNames);
}

function VegaExampleApp() {
  const [currentCode, setCurrentCode] = useState(vegaCode);
  const [fieldNames, setFieldNames] = useState<string[]>([]);

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
        setFieldNames(extractFieldNames(x.data || {}));
        console.log(x);
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
          type: "full-tooltip",
          query: { type: "schemaMatch", query: ["exprString"] },
          name: "signal-editor",
          projection: () => {
            return <div>hi</div>;
          },
        },
        // {
        //   type: "tooltip",
        //   query: {
        //     type: "schemaMatch",
        //     query: ["field", "stringOrSignal"],
        //   },
        //   name: "Field Picker",
        //   projectionLiteral: fieldNames.map(x => x)
        //   // projection: () => {
        //   //   return <div>{fieldNames}</div>;
        //   // },
        // },
      ]}
    />
  );
}

export default VegaExampleApp;
