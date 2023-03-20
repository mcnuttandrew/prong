import React from "react";
import { Projection } from "../lib/projections";
import { colorNames } from "../lib/utils";
import { maybeTrim } from "../examples/example-utils";

// https://gist.github.com/olmokramer/82ccce673f86db7cda5e#gistcomment-2029233
const colorRegex =
  // eslint-disable-next-line no-useless-escape
  /(#(?:[0-9a-f]{2}){2,4}|#[0-9a-f]{3}|(?:rgba?|hsla?)\((?:\d+%?(?:deg|rad|grad|turn)?(?:,|\s)+){2,3}[\s\/]*[\d\.]+%?\))/i;
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
  projection: (props) => {
    const value = maybeTrim(props.currentValue);
    return (
      <div className="cm-color-widget" style={{ background: value }}></div>
    );
  },
  hasInternalState: false,
};

export default ColorChip;
