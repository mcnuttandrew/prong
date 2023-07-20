import { Projection } from "../lib/projections";
const Debugger: Projection = {
  type: "tooltip",
  name: "debug",
  group: "Utils",
  projection: (props) => {
    const types = (props.typings || [])
      .flatMap((typ) => [typ.$$labeledType, typ.type, typ.$$refName])
      .filter((x) => x);
    return (
      <div>
        Node Type: "{props.node.type.name}"
        {`, Schema Types: ${JSON.stringify(types)}, `}
        KeyPath: {JSON.stringify(props.keyPath)}
      </div>
    );
  },
  query: { type: "function", query: () => true },
};

export default Debugger;
