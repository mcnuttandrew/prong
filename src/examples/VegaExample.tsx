import React, { useState, useEffect } from "react";

import VegaSchema from "../constants/vega-schema.json";
import Editor from "../components/Editor";
import StandardProjections from "../projections/standard-bundle";
import { vegaCode } from "./example-data";
import { isDataTable } from "./example-utils";

import { setIn, simpleParse } from "../lib/utils";
import { analyzeVegaCode } from "./example-utils";
import { ProjectionProps } from "../lib/projections";
import VegaExpressionEditor from "./VegaExpressionEditor";

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

function extractScaleNames(currentCode: string): string[] {
  const code = simpleParse(currentCode, { scales: [] });
  return Array.from(
    (code.scales || []).reduce((acc: Set<string>, { name }: any) => {
      if (name) {
        acc.add(name);
      }
      return acc;
    }, new Set<string>([]))
  );
}

export const buttonListProjection =
  (list: string[], currentCode: string) => (props: ProjectionProps) => {
    return (
      <div>
        {list.map((item) => {
          return (
            <button
              key={item}
              onClick={() =>
                props.setCode(setIn(props.keyPath, `"${item}"`, currentCode))
              }
            >
              {item}
            </button>
          );
        })}
      </div>
    );
  };

interface EditorProps extends ProjectionProps {
  signals: any;
}
function ExpressionEditorProjection(props: EditorProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<null | string>(null);
  useEffect(() => {
    setCode(props.currentValue.slice(1, props.currentValue.length - 1));
  }, [props.currentValue]);
  return (
    <div style={{ width: "405px" }}>
      <div style={{ display: "flex", flexWrap: "wrap" }}>
        {Object.entries(props.signals).map(([key, value]) => (
          <div key={key} style={{ marginRight: "5px" }}>
            <b>{key}</b>: {JSON.stringify(value)}
          </div>
        ))}
      </div>
      <div style={{ display: "flex" }}>
        <button
          onClick={() => {
            props.setCode(setIn(props.keyPath, `"${code}"`, props.fullCode));
          }}
        >
          UPDATE
        </button>
        {error && <div style={{ color: "red" }}>{error}</div>}
      </div>
      <VegaExpressionEditor
        onChange={(update) => setCode(update)}
        code={code}
        terms={Object.keys(props.signals)}
        onError={(e) => setError(e)}
      />
    </div>
  );
}

function VegaExampleApp() {
  const [currentCode, setCurrentCode] = useState(vegaCode);
  const [fieldNames, setFieldNames] = useState<string[]>([]);
  const [scaleNames, setScales] = useState<string[]>([]);
  const [signals, setSignals] = useState<any>({});
  useEffect(() => {
    analyzeVegaCode(currentCode, ({ data, signals }) => {
      setFieldNames(extractFieldNames(data || {}));
      setSignals(signals);
    });
    setScales(extractScaleNames(currentCode));
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
          query: { type: "schemaMatch", query: ["exprString", "signal"] },
          name: "Signal Editor",
          projection: (props) => {
            return <ExpressionEditorProjection {...props} signals={signals} />;
          },
        },
        {
          type: "tooltip",
          query: {
            type: "schemaMatch",
            query: ["field", "stringOrSignal"],
          },
          name: "Switch to",
          projection: buttonListProjection(fieldNames, currentCode),
        },
        {
          type: "tooltip",
          query: {
            type: "schemaMatch",
            query: ["scale"],
          },
          name: "Switch to",
          projection: buttonListProjection(scaleNames, currentCode),
        },
      ]}
    />
  );
}

export default VegaExampleApp;
