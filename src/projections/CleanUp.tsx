import React from "react";
import { Projection } from "../lib/projections";
import prettifier from "../lib/vendored/prettifier";
import { simpleParse } from "../lib/utils";

const CleanUp: Projection = {
  query: { type: "nodeType", query: ["Object", "Array", "[", "]", "{", "}"] },
  type: "tooltip",
  projection: (props) => {
    return (
      <button
        onClick={() => {
          const parsed = simpleParse(props.fullCode, false);
          let payload = props.fullCode;
          if (parsed) {
            console.log("did parse");
            payload = prettifier(parsed, { maxLength: 60 });
          }
          console.log(payload);
          props.setCode(payload);
        }}
      >
        Clean Up
      </button>
    );
  },
  name: "Utils",
};

export default CleanUp;
