import React, { useState, useEffect } from "react";
import StandardProjections from "../projections/standard-bundle";
import merge from "lodash.merge";
import { Projection } from "../lib/projections";
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

import { buttonListProjection } from "./example-utils";

import { VegaLite } from "react-vega";

import { simpleParse } from "../lib/utils";
import "../stylesheets/vega-lite-example.css";
import Editor from "../components/Editor";
import prettifier from "../lib/vendored/prettifier";

import traverse from "@json-schema-tools/traverse";

import VegaLiteV5Schema from "../constants/vega-lite-v5-schema.json";
let updatedSchema = {
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

function flattenAnyOf(schema: any) {
  if (!schema || !schema.anyOf) {
    return [schema];
  }
  return [schema, ...schema.anyOf.flatMap((x: any) => flattenAnyOf(x))];
}

const simpleValues: Record<string, any> = {
  object: {},
  array: [],
  number: 0,
  boolean: true,
  string: "Test",
};
function pickSimpleType(schemas: any[]) {
  const types = schemas.map((x) => x.type).filter((x) => x);
  const foundType = types.find((type) => type in simpleValues);
  console.log(types);
  return foundType ? simpleValues[foundType] : "";
}

const pathToFragment = (schema: any, path: string) => {
  const stages = path.replace("$.properties.", "").split(".");

  // const flattenededSchema = flattenAnyOf(schema);
  const simpleType = pickSimpleType(flattenAnyOf(schema));
  let newObject: any = undefined;
  [...stages]
    .reverse()
    .filter((x) => x !== "properties")
    .forEach((stage) => {
      // console.log(stage);
      //TODO: this doesn't handle array keys right
      if (!newObject) {
        newObject = { [stage]: simpleType };
      } else {
        newObject = { [stage]: newObject };
      }
    });
  // console.log(newObject);
  return newObject;
};

function synthesizeSuggestions(query: string, currentCode: string) {
  if (!query.length) {
    return [];
  }
  const matches: any[] = [];
  traverse(updatedSchema, (schema, isCycle, path, parent) => {
    let queryMatches = [
      schema?.description,
      schema?.$$labeledType,
      schema?.$$refName,
    ].filter((x) => {
      if (!x || !x.length) {
        return false;
      }
      return x.toLowerCase().includes(query.toLowerCase());
    });
    if (queryMatches.length) {
      matches.push({ schema: parent, path });
    }
  });
  const parsedRoot = simpleParse(currentCode, {});
  const suggestions = matches
    // hack, just remove all the array ones
    .filter((x) => !x.path.includes("["))
    .map(({ schema, path }) => {
      const suggestion = pathToFragment(schema, path);
      return {
        schema,
        path,
        suggestion,
        suggestionResult: merge(parsedRoot, suggestion),
      };
    });
  return suggestions;
}

function QueryBar(props: { executeSearch: (search: string) => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  return (
    <div>
      <b>Doc Search</b>
      <div className="doc-search-query-bar">
        <input
          aria-label="Search query"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <button onClick={() => props.executeSearch(searchQuery)}>
        run search
      </button>
    </div>
  );
}

function VegaLiteExampleApp() {
  const [currentCode, setCurrentCode] = useState("{ }");
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showingSuggestions, setShowingSuggestions] = useState<boolean>(false);
  const [materializedSuggestion, setMaterializedSuggestions] =
    useState<string>("");
  useEffect(() => {
    if (!searchQuery.length) {
      setSuggestions([]);
      setShowingSuggestions(false);
      return;
    }
    const sugs = synthesizeSuggestions(searchQuery, currentCode);
    setSuggestions(sugs);
    setShowingSuggestions(true);
    const parsedRoot = simpleParse(currentCode, {});
    const allCombined = prettifier(
      sugs.reduce((acc, { suggestion }) => {
        return merge(acc, suggestion);
      }, parsedRoot)
    );
    setMaterializedSuggestions(allCombined);
    console.log(allCombined);
  }, [searchQuery]);

  return (
    <div className="styler-app flex">
      <div className="flex-down">
        <h1>Style Builder</h1>
        <b>Predefined Themes</b>
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

        <b>Current Style</b>
        <Editor
          schema={updatedSchema}
          code={showingSuggestions ? materializedSuggestion : currentCode}
          onChange={(x) => {
            showingSuggestions
              ? setMaterializedSuggestions(x)
              : setCurrentCode(x);
          }}
          height={"400px"}
          projections={
            [
              ...Object.values(StandardProjections),
              {
                type: "tooltip",
                name: "Switch to",
                query: { type: "schemaMatch", query: ["font"] },
                projection: buttonListProjection(fonts, currentCode),
              },
              {
                type: "inline",
                mode: "prefix",
                hasInternalState: true,
                query: { type: "schemaMatch", query: ["font"] },
                projection: (props) => {
                  return <div>HI</div>;
                },
              },
            ]
            // .filter((x) => x) as Projection[]
          }
        />
        {showingSuggestions && (
          <div>
            <button onClick={() => setShowingSuggestions(false)}>
              Dismiss Suggestions
            </button>
          </div>
        )}
        <QueryBar executeSearch={(query) => setSearchQuery(query)} />
      </div>
      <div>
        <h3>Style Examples</h3>
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
    </div>
  );
}

export default VegaLiteExampleApp;
