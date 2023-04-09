import React from "react";
import { format, applyEdits } from "jsonc-parser";
import { Projection } from "../lib/projections";

const CleanUp: Projection = {
  query: { type: "nodeType", query: ["Object", "Array", "[", "]", "{", "}"] },
  type: "tooltip",
  projection: (props) => {
    return (
      <button
        onClick={() => {
          const edits = format(
            props.fullCode,
            {
              offset: props.node.from,
              length: props.node.to - props.node.from,
            },
            { tabSize: 4, insertSpaces: true, eol: "\n" }
          );
          const payload = applyEdits(props.fullCode, edits);
          props.setCode(payload);
        }}
      >
        Clean up target
      </button>
    );
  },
  name: "Utils",
};

export default CleanUp;
