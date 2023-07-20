import { Projection } from "../lib/projections";
import prettifier from "../lib/vendored/prettifier";
import { simpleParse } from "../lib/utils";

const CleanUp: Projection = {
  query: { type: "nodeType", query: ["Object", "Array", "[", "]", "{", "}"] },
  type: "tooltip",
  name: "Clean Up",
  group: "Utils",
  projection: (props) => {
    return (
      <button
        onClick={() => {
          const parsed = simpleParse(props.fullCode, false);
          let payload = props.fullCode;
          if (parsed) {
            payload = prettifier(parsed, { maxLength: 60 });
          }
          props.setCode(payload);
        }}
      >
        Clean Up
      </button>
    );
  },
};

export default CleanUp;
