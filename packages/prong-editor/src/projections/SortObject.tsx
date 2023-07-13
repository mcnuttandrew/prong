import { Projection } from "../lib/projections";
import prettifier from "../lib/vendored/prettifier";
import { simpleParse, setIn } from "../lib/utils";

const SortObject: Projection = {
  query: { type: "nodeType", query: ["Object"] },
  type: "tooltip",
  projection: (props) => {
    const value = simpleParse(props.currentValue, {});
    if (value.length === 2) {
      return <></>;
    }
    return (
      <button
        onClick={() => {
          const entries = Object.entries(value).sort(([aKey], [bKey]) =>
            aKey.localeCompare(bKey)
          );
          const result = prettifier(Object.fromEntries(entries), {
            maxLength: 80,
          });
          props.setCode(setIn(props.keyPath, result, props.fullCode));
        }}
      >
        Sort keys in this object
      </button>
    );
  },
  name: "Utils",
};

export default SortObject;
