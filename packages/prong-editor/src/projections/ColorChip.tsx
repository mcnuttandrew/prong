import { Projection } from "../lib/projections";
import { colorNames, colorRegex, maybeTrim } from "../lib/utils";

const colorNameSet = new Set(Object.keys(colorNames));
const ColorChip: Projection = {
  //   query: { type: "regex", query: colorRegex },
  query: {
    type: "function",
    query: (value, type) => {
      if (type !== "String") {
        return false;
      }
      const val = maybeTrim(value.toLowerCase());
      return !!(colorNameSet.has(val) || val.match(colorRegex));
    },
  },
  type: "inline",
  mode: "prefix",
  name: "color chip",
  projection: (props) => {
    const value = maybeTrim(props.currentValue);
    return (
      <div className="cm-color-widget" style={{ background: value }}></div>
    );
  },
  hasInternalState: false,
};

export default ColorChip;
