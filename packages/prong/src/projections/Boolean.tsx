import { Projection } from "../lib/projections";
import { setIn } from "../lib/utils";
const BooleanTarget: Projection = {
  query: { type: "nodeType", query: ["True", "False"] },
  type: "inline",
  mode: "prefix",
  projection: (props) => {
    const isChecked = props.node.type.name === "True";
    return (
      <div className="cm-bool-widget">
        <input
          className="cm-bool-checkbox-widget"
          checked={isChecked}
          type="checkbox"
          onChange={() => {
            props.setCode(
              setIn(props.keyPath, isChecked ? "false" : "true", props.fullCode)
            );
          }}
        />
      </div>
    );
  },
  hasInternalState: false,
};

export default BooleanTarget;
