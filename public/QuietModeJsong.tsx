import React from "react";
import Editor from "../components/Editor";
import { produceSchema } from "./example-data";

const coloring: Record<string, string> = {
  String: "#0551A5",
  Number: "#17885C",
  Boolean: "#0551A5",
  PropertyName: "#A21615",
  Null: "#0551A5",
};
const nodeTypes = ["PropertyName", "Number", "String", "Null", "False", "True"];

const trim = (x: string) =>
  x.at(0) === '"' && x.at(-1) === '"' ? x.slice(1, x.length - 1) : x;

const QuietModeJSONG = (props: {
  onChange: (code: string) => void;
  code: string;
}) => (
  <Editor
    schema={produceSchema}
    code={props.code}
    onChange={props.onChange}
    projections={[
      {
        type: "inline",
        mode: "replace",
        query: { type: "nodeType", query: nodeTypes },
        projection: (props) => (
          <div style={{ color: coloring[props.node.type.name] || "black" }}>
            {trim(props.currentValue).length ? trim(props.currentValue) : '""'}
          </div>
        ),
        hasInternalState: false,
      },
    ]}
  />
);

export default QuietModeJSONG;
