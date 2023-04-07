import React from "react";
import { Projection } from "../lib/projections";
const Debugger: Projection = {
  type: "tooltip",
  name: "debug",
  projection: (props) => {
    const types = (props.typings || [])
      .flatMap((typ) => [typ.$$labeledType, typ.type, typ.$$refName])
      .filter((x) => x);
    return (
      <div>
        nodetype: {props.node.type.name} types: {JSON.stringify(types)} keypath:{" "}
        {JSON.stringify(props.keyPath)}
      </div>
    );
  },
  query: { type: "function", query: () => true },
};

export default Debugger;
