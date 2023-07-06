import { useState } from "react";
import { Editor, StandardBundle, Projection, utils } from "prong";
import { produceSchema, produceExample } from "./example-data";

const blue = "#0551A5";
const green = "#17885C";
const red = "#A21615";
const coloring: Record<string, string> = {
  String: blue,
  Number: green,
  Boolean: blue,
  PropertyName: red,
  Null: blue,
};

const DestringProjection: Projection = {
  type: "inline",
  mode: "replace",
  query: {
    type: "nodeType",
    query: ["PropertyName", "Number", "String", "Null", "False", "True"],
  },
  projection: (props) => {
    const val = utils.maybeTrim(props.currentValue);
    return (
      <div
        style={{
          color: coloring[props.node.type.name] || "black",
          background: props.diagnosticErrors.length ? "lightsalmon" : "none",
        }}
      >
        {val.length ? val : '""'}
      </div>
    );
  },
  hasInternalState: false,
};

const HideMeta: Projection = {
  type: "inline",
  mode: "replace",
  query: { type: "index", query: ["meta"] },
  projection: () => <div></div>,
  hasInternalState: false,
};

function ProduceExample() {
  const [currentCode, setCurrentCode] = useState(produceExample);
  const [numRows, setNumRows] = useState(0);

  return (
    <div>
      {[...new Array(numRows)].map(() => (
        <h1>ha ha fruit</h1>
      ))}
      <Editor
        schema={produceSchema}
        code={currentCode}
        onChange={(x) => setCurrentCode(x)}
        projections={[
          ...Object.values(StandardBundle),
          DestringProjection,
          HideMeta,
        ]}
      />
      <button onClick={() => setNumRows(numRows + 1)}>Add row</button>
    </div>
  );
}

export default ProduceExample;
