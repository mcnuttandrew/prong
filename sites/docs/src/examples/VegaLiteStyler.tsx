import { useState, useReducer } from "react";
import {
  StandardBundle,
  Projection,
  Editor,
  utils,
} from "../../../../packages/prong-editor/src/index";
import merge from "lodash.merge";
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

import "../stylesheets/vega-lite-example.css";

import traverse from "@json-schema-tools/traverse";

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

const pathsEqual = (a: (string | number)[], b: (string | number)[]) => {
  if (a.length !== b.length) {
    return false;
  }
  for (let idx = 0; idx < a.length; idx++) {
    if (a[idx] !== b[idx]) {
      return false;
    }
  }
  return true;
};

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
  string: "",
};
function pickSimpleType(schemas: any[]) {
  const enums = schemas.flatMap((x) => x.enum).filter((x) => x);
  if (enums.length) {
    return enums[0];
  }
  const types = schemas.flatMap((x) => x.type).filter((x) => x);
  const foundType = types.find((type) => type in simpleValues);
  return foundType ? simpleValues[foundType] : "";
}

const pathToFragment = (schema: any, path: string) => {
  const stages = path.replace("$.properties.", "").split(".");

  const simpleType = pickSimpleType(flattenAnyOf(schema));
  let newObject: any = undefined;
  [...stages]
    .reverse()
    .filter((x) => x !== "properties")
    .filter((x) => !x.startsWith("anyOf["))
    .forEach((stage) => {
      if (!newObject) {
        newObject = { [stage]: simpleType };
      } else {
        newObject = { [stage]: newObject };
      }
    });
  return newObject;
};

function synthesizeSuggestions(
  query: string,
  currentCode: string,
  keyPath: (string | number)[]
) {
  if (!query.length) {
    return [];
  }
  const matches: any[] = [];
  traverse(updatedSchema, (schema, _isCycle, path, parent) => {
    const queryMatches = [
      schema?.description,
      schema?.$$labeledType,
      schema?.$$refName,
      ...(schema?.enum || []),
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
  const suggestions = matches
    // hack, just remove all the array ones
    .filter((x) => {
      const suggestedKeyPath = pathToKeyPath(x.path);
      // intentional that keyPath can be shorter than suggestedKeyPath and get through
      for (let idx = 0; idx < keyPath.length; idx++) {
        if (keyPath[idx] !== suggestedKeyPath[idx]) {
          return false;
        }
      }
      return true;
    })
    .map(({ schema, path }) => {
      const parsedRoot = utils.simpleParse(currentCode, {});
      const key = JSON.stringify(parsedRoot);
      const suggestion = pathToFragment(schema, path);
      const suggestionResult = merge(parsedRoot, suggestion);
      // if it doesn't do anything do dont include it
      if (JSON.stringify(suggestionResult) === key) {
        return false;
      }
      return {
        schema,
        path,
        suggestion,
        suggestionResult,
      };
    })
    .filter((x) => x);
  const pathSeen = new Set<string>([]);
  return suggestions.filter((x: any) => {
    const path = JSON.stringify(pathToKeyPath(x.path));
    if (pathSeen.has(path)) {
      return false;
    }
    pathSeen.add(path);
    return true;
  });
}

function QueryBar(props: {
  executeSearch: (search: string) => void;
  children: JSX.Element;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  return (
    <div>
      <b>Doc Search</b>
      <div className="flex">
        <div className="doc-search-query-bar">
          <input
            aria-label="Search query"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                props.executeSearch(searchQuery);
              }
            }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          onClick={() => {
            props.executeSearch(searchQuery);
          }}
        >
          run search
        </button>
        {props.children}
      </div>
    </div>
  );
}

function pathToKeyPath(path: string) {
  const stages = path.replace("$.properties.", "").split(".");
  return stages
    .filter((x) => x !== "properties")
    .filter((x) => !x.startsWith("anyOf["));
}

function materializeSuggestions(currentCode: string, suggestions: any[]) {
  const parsedRoot = utils.simpleParse(currentCode, {});
  const allCombined = utils.prettifier(
    suggestions.reduce(
      (acc, { suggestion }) => merge(acc, { ...suggestion }),
      parsedRoot
    )
  );
  return allCombined;
}

function filterSuggestion(suggestions: any[], keyPath: (number | string)[]) {
  const targetSuggestion = suggestions.find((sug) =>
    pathsEqual(pathToKeyPath(sug.path), keyPath)
  );
  return {
    filteredSugs: suggestions.filter(
      (sug) => targetSuggestion.path !== sug.path
    ),
    targetSuggestion,
  };
}

const initialState = {
  currentCode: "{ }",
  searchQuery: "",
  suggestions: [] as any[],
  // materializedSuggestion: "",
  checkPointedCode: "",
  keyPath: [] as (string | number)[],
};
type ReducerState = typeof initialState;

type ActionAcceptSuggestion = {
  type: "acceptSuggestion";
  payload: (string | number)[];
};
type ActionRejectSuggestion = {
  type: "rejectSuggestion";
  payload: (string | number)[];
};
type ActionSetCode = { type: "setCode"; payload: string };
type ActionSetSuggestion = { type: "setSuggestion"; payload: any[] };
type ActionSetQuery = { type: "setQuery"; payload: string };
type ActionSetKeyPath = { type: "setKeyPath"; payload: (string | number)[] };
type Action =
  | ActionAcceptSuggestion
  | ActionRejectSuggestion
  | ActionSetCode
  | ActionSetSuggestion
  | ActionSetQuery
  | ActionSetKeyPath;

const acceptSuggestion = (
  state: ReducerState,
  action: ActionAcceptSuggestion
): ReducerState => {
  const newSugs = filterSuggestion(state.suggestions, action.payload);
  const newCode = materializeSuggestions(state.checkPointedCode, [
    newSugs.targetSuggestion,
  ]);
  return {
    ...state,
    suggestions: newSugs.filteredSugs,
    checkPointedCode: newCode,
  };
};
const rejectSuggestion = (
  state: ReducerState,
  action: ActionRejectSuggestion
): ReducerState => {
  const newSugs = filterSuggestion(state.suggestions, action.payload);
  const newCode = materializeSuggestions(
    state.checkPointedCode,
    newSugs.filteredSugs
  );

  return {
    ...state,
    suggestions: newSugs.filteredSugs,
    currentCode: newCode,
  };
};
const setCode = (state: ReducerState, action: ActionSetCode): ReducerState => {
  // if there are suggestions then make modification without suggestions on and then add them back???
  if (state.suggestions.length) {
    return {
      ...state,
      // currentCode: state.checkPointedCode,
      // suggestions: [],
      // searchQuery: "",
    };
  }
  return { ...state, currentCode: action.payload };
};
const setQuery = (
  state: ReducerState,
  action: ActionSetQuery
): ReducerState => {
  const searchQuery = action.payload;
  if (!searchQuery.length) {
    return {
      ...state,
      searchQuery,
      suggestions: [],
    };
  }
  const code = state.suggestions.length
    ? state.checkPointedCode
    : state.currentCode;
  const suggestions = synthesizeSuggestions(searchQuery, code, state.keyPath);
  return {
    ...state,
    searchQuery,
    suggestions,
    currentCode: materializeSuggestions(state.currentCode, suggestions),
    checkPointedCode: code,
  };
};
const setSuggestion = (
  state: ReducerState,
  action: ActionSetSuggestion
): ReducerState => {
  const newSuggestions = action.payload;
  const newCode = materializeSuggestions(
    state.checkPointedCode,
    newSuggestions
  );
  if (newSuggestions.length) {
    const checkPointedCode = state.suggestions.length
      ? state.checkPointedCode
      : state.currentCode;
    return {
      ...state,
      suggestions: newSuggestions,
      currentCode: newCode,
      checkPointedCode,
    };
  }
  return {
    ...state,
    suggestions: [],
    currentCode: state.checkPointedCode,
  };
};
const setKeyPath = (state: ReducerState, action: ActionSetKeyPath) => {
  return {
    ...state,
    keyPath: action.payload.filter((x) => x !== undefined),
  };
};
const actionTable = {
  acceptSuggestion,
  rejectSuggestion,
  setCode,
  setQuery,
  setSuggestion,
  setKeyPath,
};
function reducer(state: ReducerState, action: Action): ReducerState {
  if (actionTable[action.type]) {
    return actionTable[action.type](state, action as any);
  }
  return state;
}

function BuildSuggestionProjection(
  state: ReducerState,
  dispatch: any
): Projection {
  return {
    type: "inline",
    mode: "replace-multiline",
    hasInternalState: false,
    query: {
      type: "multi-index",
      query: state.suggestions.map((x) => pathToKeyPath(x.path)),
    },
    projection: (props) => {
      return (
        <div className="suggestion-taker">
          <div className="accept-area">
            <button
              className="accept-button"
              onClick={() => {
                dispatch({
                  type: "acceptSuggestion",
                  payload: props.keyPath,
                });
              }}
            >
              ✓
            </button>
          </div>
          {props.currentValue}
          <div className="reject-area">
            <button
              className="reject-button"
              onClick={() =>
                dispatch({
                  type: "rejectSuggestion",
                  payload: props.keyPath,
                })
              }
            >
              ╳
            </button>
          </div>
        </div>
      );
    },
  };
}

function VegaLiteExampleApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
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
                onClick={() =>
                  dispatch({
                    type: "setCode",
                    payload: utils.prettifier(theme),
                  })
                }
              >
                {themeName}
              </button>
            );
          })}
        </div>
        <QueryBar
          executeSearch={(query) =>
            dispatch({
              type: "setQuery",
              payload: query,
            })
          }
        >
          {!!state.suggestions.length ? (
            <div>
              <button
                onClick={() =>
                  dispatch({
                    type: "setSuggestion",
                    payload: [],
                  })
                }
              >
                Dismiss Suggestions
              </button>
            </div>
          ) : (
            <></>
          )}
        </QueryBar>

        <b>Current Style</b>
        <Editor
          schema={updatedSchema}
          code={state.currentCode}
          onTargetNodeChanged={(newKeyPath) => {
            dispatch({
              type: "setKeyPath",
              payload: newKeyPath,
            });
          }}
          onChange={(newCode) =>
            dispatch({
              type: "setCode",
              payload: newCode,
            })
          }
          height={"400px"}
          projections={
            [
              ...Object.entries(StandardBundle)
                .filter(([x]) => {
                  const skipSet = new Set<keyof typeof StandardBundle>([
                    "Debugger",
                    "TooltipColorNamePicker",
                  ]);
                  return !skipSet.has(x);
                })
                .map(([_, x]) => x),
              {
                type: "tooltip",
                name: "Switch to",
                query: {
                  type: "schemaMatch",
                  query: ["font"],
                },
                projection: buttonListProjection(fonts, state.currentCode),
              },
              state.suggestions.length &&
                BuildSuggestionProjection(state, dispatch),
            ].filter((x) => x) as Projection[]
          }
        />
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
                config={utils.simpleParse(state.currentCode, {})}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default VegaLiteExampleApp;
